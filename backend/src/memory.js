import { nowIso } from './utils.js';

function trendFromHistory(history) {
  if (history.length < 2) {
    return { growthRate: 0, sizeDelta: 0, lineDelta: 0 };
  }

  const first = history[0];
  const last = history[history.length - 1];
  const sizeDelta = last.size - first.size;
  const lineDelta = last.lines - first.lines;
  const baseline = Math.max(1, first.lines);
  const growthRate = lineDelta / baseline;

  return { growthRate, sizeDelta, lineDelta };
}

export function mergeMemory(previousMemory, snapshot, issues, fixes) {
  const timestamp = nowIso();

  const memory = previousMemory && typeof previousMemory === 'object'
    ? structuredClone(previousMemory)
    : {
        repository: snapshot.targetPath,
        firstSeenAt: timestamp,
        lastUpdatedAt: timestamp,
        snapshots: [],
        files: {},
        repeatedRisks: {},
        repeatedFixes: {},
        issueCountsByType: {},
        fixCountsByType: {}
      };

  memory.repository ??= snapshot.targetPath;
  memory.firstSeenAt ??= timestamp;
  memory.lastUpdatedAt = timestamp;

  const snapshotInfo = {
    scannedAt: snapshot.scannedAt,
    totals: snapshot.totals,
    issueCount: issues.length,
    fixCount: fixes.length
  };

  memory.snapshots.push(snapshotInfo);
  memory.snapshots = memory.snapshots.slice(-120);

  for (const file of snapshot.files) {
    const record = memory.files[file.path] ?? {
      firstSeenAt: snapshot.scannedAt,
      lastSeenAt: snapshot.scannedAt,
      scans: 0,
      history: [],
      trend: { growthRate: 0, sizeDelta: 0, lineDelta: 0 },
      issueHits: 0,
      fixHits: 0
    };

    record.lastSeenAt = snapshot.scannedAt;
    record.scans += 1;
    record.history.push({
      scannedAt: snapshot.scannedAt,
      lines: file.lines,
      size: file.size,
      updatedAt: file.updatedAt
    });
    record.history = record.history.slice(-40);
    record.trend = trendFromHistory(record.history);

    memory.files[file.path] = record;
  }

  for (const issue of issues) {
    memory.repeatedRisks[issue.type] = (memory.repeatedRisks[issue.type] ?? 0) + 1;
    memory.issueCountsByType[issue.type] = (memory.issueCountsByType[issue.type] ?? 0) + 1;

    for (const filePath of issue.affectedFiles) {
      const fileRecord = memory.files[filePath];
      if (fileRecord) {
        fileRecord.issueHits += 1;
      }
    }
  }

  for (const fix of fixes) {
    const fixType = fix.metadata?.sourceIssueType ?? 'general';
    memory.repeatedFixes[fixType] = (memory.repeatedFixes[fixType] ?? 0) + 1;
    memory.fixCountsByType[fixType] = (memory.fixCountsByType[fixType] ?? 0) + 1;

    for (const filePath of fix.affectedFiles) {
      const fileRecord = memory.files[filePath];
      if (fileRecord) {
        fileRecord.fixHits += 1;
      }
    }
  }

  return memory;
}

export function deriveSummary(memory, snapshot, issues, fixes) {
  const repeatedRiskTypes = Object.entries(memory.repeatedRisks)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => ({ type, count }));

  return {
    scannedAt: snapshot?.scannedAt ?? null,
    targetPath: memory.repository,
    totalFiles: snapshot?.totals?.fileCount ?? 0,
    totalLines: snapshot?.totals?.totalLines ?? 0,
    totalIssues: issues.length,
    totalFixes: fixes.length,
    highOrCriticalIssues: issues.filter((issue) => ['high', 'critical'].includes(issue.severity)).length,
    autoApplicableFixes: fixes.filter((fix) => fix.appliesAutomatically).length,
    repeatedRiskTypes,
    trackedFiles: Object.keys(memory.files).length,
    snapshotsTracked: memory.snapshots.length
  };
}
