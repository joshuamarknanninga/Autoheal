import fs from 'node:fs/promises';
import path from 'node:path';
import { CODE_EXTENSIONS, IGNORED_DIRS, normalizeToPosix, nowIso } from './utils.js';

async function readFileContent(filePath, size) {
  if (size > 200_000) {
    return null;
  }

  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

function countLines(content) {
  if (!content) return 0;
  return content.split(/\r?\n/).length;
}

function isCodeFile(fileName) {
  return CODE_EXTENSIONS.has(path.extname(fileName));
}

async function walk(directory, rootDir, collector) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }
      await walk(absolutePath, rootDir, collector);
      continue;
    }

    if (!entry.isFile() || !isCodeFile(entry.name)) {
      continue;
    }

    const stats = await fs.stat(absolutePath);
    const relativePath = normalizeToPosix(path.relative(rootDir, absolutePath));
    const content = await readFileContent(absolutePath, stats.size);
    const lines = countLines(content);

    collector.push({
      path: relativePath,
      size: stats.size,
      lines,
      createdAt: stats.birthtime.toISOString(),
      updatedAt: stats.mtime.toISOString(),
      content
    });
  }
}

export async function scanRepository(targetPath) {
  const resolvedTarget = path.resolve(targetPath);
  const startedAt = nowIso();
  const files = [];

  await walk(resolvedTarget, resolvedTarget, files);

  const totals = files.reduce(
    (acc, file) => {
      acc.fileCount += 1;
      acc.totalLines += file.lines;
      acc.totalSize += file.size;
      return acc;
    },
    { fileCount: 0, totalLines: 0, totalSize: 0 }
  );

  return {
    targetPath: resolvedTarget,
    scannedAt: nowIso(),
    startedAt,
    durationMs: new Date().getTime() - new Date(startedAt).getTime(),
    files,
    totals
  };
}
