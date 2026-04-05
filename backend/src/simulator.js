import { clamp, severityScore } from './utils.js';

const SAFETY_MULTIPLIER = {
  low: 0.9,
  medium: 0.75,
  high: 0.55
};

export function simulateFix(fix, sourceIssue) {
  const severityFactor = severityScore(sourceIssue?.severity ?? 'medium');
  const confidence = clamp((sourceIssue?.confidence ?? 0.5) * 0.85 + (fix.appliesAutomatically ? 0.1 : 0));
  const fileSpreadFactor = clamp((fix.affectedFiles.length || 1) / 6, 0.15, 1);
  const safetyFactor = SAFETY_MULTIPLIER[fix.safetyLevel] ?? 0.7;

  const projectedRiskReduction = Math.round(clamp(0.2 + severityFactor * safetyFactor * confidence, 0, 0.95) * 100);
  const projectedMaintainabilityDelta = Math.round(
    clamp(0.15 + fileSpreadFactor * 0.3 + confidence * 0.4, 0, 0.98) * 100
  );

  const summary = `${fix.title} is projected to reduce risk by ${projectedRiskReduction}% and improve maintainability by ${projectedMaintainabilityDelta}% with ${(confidence * 100).toFixed(0)}% confidence.`;

  return {
    fixId: fix.id,
    projectedRiskReduction,
    projectedMaintainabilityDelta,
    confidence: Number(confidence.toFixed(2)),
    summary
  };
}
