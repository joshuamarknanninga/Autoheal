import fs from 'node:fs/promises';
import path from 'node:path';
import { nowIso, shortHash, uniqueById } from './utils.js';

const FIX_TEMPLATES = {
  oversized_file: {
    title: 'Split oversized file into focused modules',
    rationale: 'Large files increase cognitive overhead and merge conflict risk.',
    expectedOutcome: 'Lower complexity per module and safer iteration velocity.',
    safetyLevel: 'medium',
    appliesAutomatically: false
  },
  high_growth_risk: {
    title: 'Extract function clusters into bounded modules',
    rationale: 'Fast-growing files trend toward unstable architecture without boundaries.',
    expectedOutcome: 'Reduced growth pressure and clearer ownership boundaries.',
    safetyLevel: 'medium',
    appliesAutomatically: false
  },
  unstable_hotspot: {
    title: 'Isolate shared utilities from hotspot file',
    rationale: 'Repeatedly risky files likely combine unrelated responsibilities.',
    expectedOutcome: 'Lower hotspot churn and narrower blast radius for edits.',
    safetyLevel: 'low',
    appliesAutomatically: true
  },
  concentrated_dependency_influence: {
    title: 'Reduce dependency concentration by introducing facades',
    rationale: 'Heavy import concentration couples change to many modules.',
    expectedOutcome: 'Stabilized interfaces and reduced transitive risk exposure.',
    safetyLevel: 'high',
    appliesAutomatically: false
  },
  possible_refactor_target: {
    title: 'Create refactor roadmap for large-file cluster',
    rationale: 'Largest files indicate candidate domains for decomposition.',
    expectedOutcome: 'Incremental modularization plan with measurable milestones.',
    safetyLevel: 'low',
    appliesAutomatically: true
  }
};

function dryRunPatchFor(issue) {
  const files = issue.affectedFiles.join(', ');
  return [
    `# AutoHeal dry-run patch plan`,
    `Issue: ${issue.type}`,
    `Files: ${files}`,
    `1) Create module boundary proposal.`,
    `2) Move cohesive function groups to new modules.`,
    `3) Add compatibility exports to preserve API surface.`,
    `4) Run targeted tests and static checks.`
  ].join('\n');
}

export function generateFixes(issues) {
  const fixes = issues.map((issue) => {
    const template = FIX_TEMPLATES[issue.type] ?? {
      title: 'Apply targeted maintenance action',
      rationale: 'Generalized recovery action for detected architecture risk.',
      expectedOutcome: 'Reduced risk trend and improved maintainability.',
      safetyLevel: 'medium',
      appliesAutomatically: false
    };

    return {
      id: `fix-${shortHash(`${issue.id}-${template.title}`)}`,
      title: template.title,
      rationale: template.rationale,
      affectedFiles: issue.affectedFiles,
      expectedOutcome: template.expectedOutcome,
      safetyLevel: template.safetyLevel,
      dryRunPatch: dryRunPatchFor(issue),
      appliesAutomatically: template.appliesAutomatically,
      metadata: {
        sourceIssueId: issue.id,
        sourceIssueType: issue.type,
        generatedAt: nowIso()
      }
    };
  });

  return uniqueById(fixes);
}

async function appendPlanComment(filePath, planId) {
  const original = await fs.readFile(filePath, 'utf8');
  if (original.includes(`AutoHeal plan: ${planId}`)) {
    return false;
  }

  const comment = `\n// AutoHeal plan: ${planId} (safe scaffolding marker)\n`;
  await fs.writeFile(filePath, `${original}${comment}`, 'utf8');
  return true;
}

export async function applyFix({ fix, repositoryPath }) {
  const appliedAt = nowIso();

  if (!fix) {
    return {
      status: 'not_found',
      applied: false,
      appliedAt,
      message: 'Fix not found.'
    };
  }

  if (!fix.appliesAutomatically) {
    return {
      status: 'dry_run_only',
      applied: false,
      appliedAt,
      message: 'Automatic application is not safe for this fix.',
      dryRunPatch: fix.dryRunPatch
    };
  }

  const firstFile = fix.affectedFiles[0];
  if (!firstFile) {
    return {
      status: 'dry_run_only',
      applied: false,
      appliedAt,
      message: 'No target file available for safe automatic application.',
      dryRunPatch: fix.dryRunPatch
    };
  }

  const absoluteFile = path.join(repositoryPath, firstFile);

  try {
    const changed = await appendPlanComment(absoluteFile, fix.id);

    if (!changed) {
      return {
        status: 'already_applied',
        applied: false,
        appliedAt,
        message: 'Safe marker already exists, no new changes made.',
        dryRunPatch: fix.dryRunPatch
      };
    }

    return {
      status: 'applied',
      applied: true,
      appliedAt,
      message: `Applied safe marker to ${firstFile}.`,
      changedFiles: [firstFile],
      dryRunPatch: fix.dryRunPatch
    };
  } catch {
    return {
      status: 'dry_run_only',
      applied: false,
      appliedAt,
      message: 'Unable to apply safely; returning dry-run patch plan.',
      dryRunPatch: fix.dryRunPatch
    };
  }
}
