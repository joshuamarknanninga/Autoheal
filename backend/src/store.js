import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_FILES = {
  snapshots: 'snapshots.json',
  issues: 'issues.json',
  fixes: 'fixes.json',
  simulations: 'simulations.json',
  applied: 'applied.json',
  memory: 'memory.json'
};

async function ensureFile(filePath, defaultValue) {
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
  }
}

export class JsonStore {
  constructor(dataDirectory) {
    this.dataDirectory = path.resolve(dataDirectory);
  }

  filePath(name) {
    if (!DATA_FILES[name]) {
      throw new Error(`Unknown data bucket: ${name}`);
    }
    return path.join(this.dataDirectory, DATA_FILES[name]);
  }

  async init() {
    await fs.mkdir(this.dataDirectory, { recursive: true });

    await Promise.all([
      ensureFile(this.filePath('snapshots'), []),
      ensureFile(this.filePath('issues'), []),
      ensureFile(this.filePath('fixes'), []),
      ensureFile(this.filePath('simulations'), []),
      ensureFile(this.filePath('applied'), []),
      ensureFile(this.filePath('memory'), {
        repository: null,
        firstSeenAt: null,
        lastUpdatedAt: null,
        snapshots: [],
        files: {},
        repeatedRisks: {},
        repeatedFixes: {},
        issueCountsByType: {},
        fixCountsByType: {}
      })
    ]);
  }

  async read(name) {
    const filePath = this.filePath(name);
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  }

  async write(name, value) {
    const filePath = this.filePath(name);
    await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
  }

  async append(name, value, max = 200) {
    const current = await this.read(name);
    current.push(value);
    const sliced = current.slice(-max);
    await this.write(name, sliced);
    return sliced;
  }
}
