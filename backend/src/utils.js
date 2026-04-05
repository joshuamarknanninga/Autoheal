import crypto from 'node:crypto';
import path from 'node:path';

export const IGNORED_DIRS = new Set(['node_modules', 'dist', 'build', '.git', 'coverage']);
export const CODE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

export function normalizeToPosix(inputPath) {
  return inputPath.split(path.sep).join('/');
}

export function nowIso() {
  return new Date().toISOString();
}

export function shortHash(value) {
  return crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 10);
}

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function severityScore(severity) {
  switch (severity) {
    case 'critical':
      return 1;
    case 'high':
      return 0.8;
    case 'medium':
      return 0.55;
    default:
      return 0.35;
  }
}

export function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}
