import test from 'node:test';
import assert from 'node:assert/strict';

import { generateFixes } from '../src/healer.js';
import { analyzeIssues } from '../src/reasoner.js';

test('generateFixes returns actionable fix objects with required shape', () => {
  const issues = [
    {
      id: 'issue-1',
      type: 'unstable_hotspot',
      severity: 'medium',
      explanation: 'hotspot',
      confidence: 0.8,
      affectedFiles: ['src/a.js']
    }
  ];

  const fixes = generateFixes(issues);
  assert.equal(fixes.length, 1);

  const [fix] = fixes;
  assert.equal(typeof fix.id, 'string');
  assert.equal(typeof fix.title, 'string');
  assert.equal(typeof fix.rationale, 'string');
  assert.deepEqual(fix.affectedFiles, ['src/a.js']);
  assert.equal(typeof fix.expectedOutcome, 'string');
  assert.equal(typeof fix.safetyLevel, 'string');
  assert.equal(typeof fix.dryRunPatch, 'string');
  assert.equal(typeof fix.appliesAutomatically, 'boolean');
});

test('analyzeIssues returns compliant issue shape for oversized files', () => {
  const snapshot = {
    files: [
      {
        path: 'src/huge.js',
        lines: 560,
        size: 1000,
        content: 'export const x = 1;'
      }
    ]
  };

  const memory = { files: { 'src/huge.js': { trend: { growthRate: 0, lineDelta: 0 }, issueHits: 0 } } };
  const issues = analyzeIssues(snapshot, memory);

  assert.ok(issues.length >= 1);
  const target = issues.find((issue) => issue.type === 'oversized_file');
  assert.ok(target);

  assert.equal(typeof target.id, 'string');
  assert.equal(typeof target.type, 'string');
  assert.equal(typeof target.severity, 'string');
  assert.equal(typeof target.explanation, 'string');
  assert.equal(typeof target.confidence, 'number');
  assert.ok(Array.isArray(target.affectedFiles));
});
