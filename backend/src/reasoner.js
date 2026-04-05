import { shortHash, clamp } from './utils.js';

const LIMITS = {
  oversizedLines: 450,
  hotspotIssueHits: 4,
  growthRiskRate: 0.35,
  dependencyHeavyImports: 12,
  refactorLineThreshold: 220
};

function detectImports(content) {
  const importMatches = content.match(/\bimport\b|\brequire\s*\(/g);
  return importMatches ? importMatches.length : 0;
}

export function analyzeIssues(snapshot, memory) {
  const issues = [];

  for (const file of snapshot.files) {
    const fileMemory = memory.files[file.path];

    if (file.lines >= LIMITS.oversizedLines) {
      issues.push({
        id: `issue-${shortHash(`${file.path}-oversized`)}`,
        type: 'oversized_file',
        severity: file.lines > 700 ? 'critical' : 'high',
        explanation: `${file.path} has ${file.lines} lines, exceeding the maintainability threshold of ${LIMITS.oversizedLines}.`,
        confidence: clamp(0.7 + Math.min(0.25, file.lines / 2000)),
        affectedFiles: [file.path],
        metrics: { lines: file.lines }
      });
    }

    if (fileMemory?.trend?.growthRate > LIMITS.growthRiskRate && file.lines > LIMITS.refactorLineThreshold) {
      issues.push({
        id: `issue-${shortHash(`${file.path}-growth`)}`,
        type: 'high_growth_risk',
        severity: fileMemory.trend.growthRate > 0.65 ? 'high' : 'medium',
        explanation: `${file.path} grew by ${(fileMemory.trend.growthRate * 100).toFixed(1)}% across recent scans.`,
        confidence: clamp(0.58 + fileMemory.trend.growthRate / 2),
        affectedFiles: [file.path],
        metrics: {
          growthRate: fileMemory.trend.growthRate,
          lineDelta: fileMemory.trend.lineDelta
        }
      });
    }

    if ((fileMemory?.issueHits ?? 0) >= LIMITS.hotspotIssueHits) {
      issues.push({
        id: `issue-${shortHash(`${file.path}-hotspot`)}`,
        type: 'unstable_hotspot',
        severity: fileMemory.issueHits > 9 ? 'high' : 'medium',
        explanation: `${file.path} has repeatedly appeared in risk detection (${fileMemory.issueHits} hits).`,
        confidence: clamp(0.62 + (fileMemory.issueHits - LIMITS.hotspotIssueHits) * 0.05),
        affectedFiles: [file.path],
        metrics: { issueHits: fileMemory.issueHits }
      });
    }
  }

  const sortedByLines = [...snapshot.files].sort((a, b) => b.lines - a.lines);
  const candidateRefactors = sortedByLines.slice(0, 3).filter((file) => file.lines >= LIMITS.refactorLineThreshold);

  if (candidateRefactors.length >= 2) {
    issues.push({
      id: `issue-${shortHash('refactor-cluster')}`,
      type: 'possible_refactor_target',
      severity: 'medium',
      explanation: `Top large files indicate a likely cluster that should be split into domain-specific modules.`,
      confidence: 0.64,
      affectedFiles: candidateRefactors.map((file) => file.path),
      metrics: { candidateCount: candidateRefactors.length }
    });
  }

  const importHeavy = snapshot.files
    .filter((file) => typeof file.content === 'string')
    .map((file) => ({ file, importCount: detectImports(file.content) }))
    .filter(({ importCount }) => importCount >= LIMITS.dependencyHeavyImports)
    .sort((a, b) => b.importCount - a.importCount);

  if (importHeavy.length > 0) {
    const top = importHeavy[0];
    issues.push({
      id: `issue-${shortHash(`${top.file.path}-dependency`)}`,
      type: 'concentrated_dependency_influence',
      severity: top.importCount > 20 ? 'high' : 'medium',
      explanation: `${top.file.path} imports ${top.importCount} modules, indicating concentrated dependency influence.`,
      confidence: clamp(0.6 + top.importCount / 50),
      affectedFiles: [top.file.path],
      metrics: { importCount: top.importCount }
    });
  }

  return issues;
}
