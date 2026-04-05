function SafetyBadge({ level }) {
  return <span className={`badge safety-${level}`}>{level} safety</span>;
}

export default function FixList({ fixes, onSimulate, onApply, busyFixId }) {
  return (
    <section className="card panel">
      <h2>Fix Recommendations</h2>
      {fixes.length === 0 ? (
        <p className="empty-state">No fixes generated yet. Trigger a scan first.</p>
      ) : (
        <ul className="stacked-list">
          {fixes.map((fix) => (
            <li key={fix.id} className="list-item">
              <div className="list-row">
                <strong>{fix.title}</strong>
                <SafetyBadge level={fix.safetyLevel} />
              </div>
              <p>{fix.rationale}</p>
              <div className="meta-row">
                <span>{fix.expectedOutcome}</span>
              </div>
              <div className="action-row">
                <button onClick={() => onSimulate(fix.id)} disabled={busyFixId === fix.id}>
                  Simulate
                </button>
                <button
                  onClick={() => onApply(fix.id)}
                  className={fix.appliesAutomatically ? 'primary' : 'secondary'}
                  disabled={busyFixId === fix.id}
                >
                  {fix.appliesAutomatically ? 'Apply Safe Fix' : 'Store Dry-Run Plan'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
