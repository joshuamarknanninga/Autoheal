export default function SimulationPanel({ simulation }) {
  return (
    <section className="card panel">
      <h2>Simulation</h2>
      {!simulation ? (
        <p className="empty-state">Select a fix and run simulation to view projected outcomes.</p>
      ) : (
        <div className="simulation-content">
          <p>{simulation.summary}</p>
          <div className="metrics-inline">
            <span>Risk Reduction: {simulation.projectedRiskReduction}%</span>
            <span>Maintainability Delta: +{simulation.projectedMaintainabilityDelta}%</span>
            <span>Confidence: {(simulation.confidence * 100).toFixed(0)}%</span>
          </div>
        </div>
      )}
    </section>
  );
}
