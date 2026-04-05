import path from 'node:path';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';

import { scanRepository } from './scanner.js';
import { analyzeIssues } from './reasoner.js';
import { generateFixes, applyFix } from './healer.js';
import { simulateFix } from './simulator.js';
import { JsonStore } from './store.js';
import { mergeMemory, deriveSummary } from './memory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 5050);
const defaultRepoPath = process.env.AUTOHEAL_REPO_PATH
  ? path.resolve(process.env.AUTOHEAL_REPO_PATH)
  : path.resolve(__dirname, '../../');
const store = new JsonStore(path.resolve(__dirname, '../data'));

app.use(cors());
app.use(express.json());

function sanitizeSnapshot(snapshot) {
  return {
    ...snapshot,
    files: snapshot.files.map((file) => ({
      path: file.path,
      size: file.size,
      lines: file.lines,
      createdAt: file.createdAt,
      updatedAt: file.updatedAt
    }))
  };
}

async function runAnalysisCycle(repositoryPath = defaultRepoPath) {
  const scan = await scanRepository(repositoryPath);
  const existingMemory = await store.read('memory');
  const issues = analyzeIssues(scan, existingMemory ?? { files: {} });
  const fixes = generateFixes(issues);
  const memory = mergeMemory(existingMemory, sanitizeSnapshot(scan), issues, fixes);

  await store.append('snapshots', sanitizeSnapshot(scan));
  await store.append('issues', { scannedAt: scan.scannedAt, issues });
  await store.append('fixes', { scannedAt: scan.scannedAt, fixes });
  await store.write('memory', memory);

  return { scan, issues, fixes, memory };
}

async function getLatestBucketValue(bucket, key) {
  const rows = await store.read(bucket);
  return rows.length > 0 ? rows[rows.length - 1][key] : [];
}

async function getCurrentState() {
  const [snapshots, issuesRows, fixesRows, memory] = await Promise.all([
    store.read('snapshots'),
    store.read('issues'),
    store.read('fixes'),
    store.read('memory')
  ]);

  const snapshot = snapshots[snapshots.length - 1] ?? null;
  const issues = issuesRows[issuesRows.length - 1]?.issues ?? [];
  const fixes = fixesRows[fixesRows.length - 1]?.fixes ?? [];

  return { snapshot, issues, fixes, memory };
}

app.get('/api/summary', async (_req, res) => {
  try {
    const { snapshot, issues, fixes, memory } = await getCurrentState();
    const summary = deriveSummary(memory ?? { files: {}, repeatedRisks: {}, snapshots: [] }, snapshot, issues, fixes);

    res.json({ ok: true, data: summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/issues', async (_req, res) => {
  try {
    const issues = await getLatestBucketValue('issues', 'issues');
    res.json({ ok: true, data: issues });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/fixes', async (_req, res) => {
  try {
    const fixes = await getLatestBucketValue('fixes', 'fixes');
    res.json({ ok: true, data: fixes });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/history', async (_req, res) => {
  try {
    const [snapshots, issues, fixes, simulations, applied, memory] = await Promise.all([
      store.read('snapshots'),
      store.read('issues'),
      store.read('fixes'),
      store.read('simulations'),
      store.read('applied'),
      store.read('memory')
    ]);

    res.json({
      ok: true,
      data: {
        snapshots: snapshots.slice(-10),
        issueHistory: issues.slice(-10),
        fixHistory: fixes.slice(-10),
        simulationHistory: simulations.slice(-15),
        appliedHistory: applied.slice(-20),
        repeatedRisks: memory?.repeatedRisks ?? {},
        repeatedFixes: memory?.repeatedFixes ?? {}
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/scan', async (req, res) => {
  try {
    const repositoryPath = req.body?.repositoryPath ? path.resolve(req.body.repositoryPath) : defaultRepoPath;
    const result = await runAnalysisCycle(repositoryPath);

    res.json({
      ok: true,
      data: {
        scannedAt: result.scan.scannedAt,
        totals: result.scan.totals,
        issuesCount: result.issues.length,
        fixesCount: result.fixes.length
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/simulate/:fixId', async (req, res) => {
  try {
    const fixes = await getLatestBucketValue('fixes', 'fixes');
    const issues = await getLatestBucketValue('issues', 'issues');
    const fix = fixes.find((item) => item.id === req.params.fixId);

    if (!fix) {
      return res.status(404).json({ ok: false, error: 'Fix not found.' });
    }

    const sourceIssue = issues.find((issue) => issue.id === fix.metadata?.sourceIssueId);
    const simulation = simulateFix(fix, sourceIssue);
    const row = {
      simulatedAt: new Date().toISOString(),
      ...simulation
    };

    await store.append('simulations', row);

    return res.json({ ok: true, data: row });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/apply/:fixId', async (req, res) => {
  try {
    const fixes = await getLatestBucketValue('fixes', 'fixes');
    const fix = fixes.find((item) => item.id === req.params.fixId);
    const result = await applyFix({ fix, repositoryPath: defaultRepoPath });

    const historyRecord = {
      fixId: req.params.fixId,
      title: fix?.title ?? 'Unknown fix',
      recordedAt: new Date().toISOString(),
      ...result
    };

    await store.append('applied', historyRecord);

    res.status(result.status === 'not_found' ? 404 : 200).json({ ok: result.status !== 'not_found', data: historyRecord });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

async function bootstrap() {
  await store.init();

  const existingSnapshots = await store.read('snapshots');
  if (existingSnapshots.length === 0) {
    await runAnalysisCycle(defaultRepoPath);
  }

  app.listen(port, () => {
    console.log(`AutoHeal backend running on http://localhost:${port}`);
    console.log(`Scanning target path: ${defaultRepoPath}`);
  });
}

bootstrap();
