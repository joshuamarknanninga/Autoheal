function SeverityBadge({ severity }) {
  return <span className={`badge severity-${severity}`}>{severity}</span>;
}

export default function IssueList({ issues }) {
  return (
    <section className="card panel">
      <h2>Detected Risks</h2>
      {issues.length === 0 ? (
        <p className="empty-state">No issues detected in the latest scan.</p>
      ) : (
        <ul className="stacked-list">
          {issues.map((issue) => (
            <li key={issue.id} className="list-item">
              <div className="list-row">
                <strong>{issue.type}</strong>
                <SeverityBadge severity={issue.severity} />
              </div>
              <p>{issue.explanation}</p>
              <div className="meta-row">
                <span>Confidence: {(issue.confidence * 100).toFixed(0)}%</span>
                <span>Affected: {issue.affectedFiles.join(', ')}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
