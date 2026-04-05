export default function HistoryPanel({ history }) {
  const snapshots = history?.snapshots ?? [];
  const applied = history?.appliedHistory ?? [];

  return (
    <section className="card panel">
      <h2>History & Outcomes</h2>
      <div className="history-grid">
        <div>
          <h3>Recent Scans</h3>
          {snapshots.length === 0 ? (
            <p className="empty-state">No scans recorded.</p>
          ) : (
            <ul className="stacked-list compact">
              {snapshots.slice(-5).map((scan) => (
                <li key={scan.scannedAt} className="list-item compact-item">
                  <span>{new Date(scan.scannedAt).toLocaleString()}</span>
                  <span>{scan.totals.fileCount} files</span>
                  <span>{scan.totals.totalLines} lines</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3>Applied Decisions</h3>
          {applied.length === 0 ? (
            <p className="empty-state">No applied fixes or dry-run decisions yet.</p>
          ) : (
            <ul className="stacked-list compact">
              {applied.slice(-5).reverse().map((entry) => (
                <li key={`${entry.fixId}-${entry.recordedAt}`} className="list-item compact-item">
                  <span>{entry.title}</span>
                  <span className="muted">{entry.status}</span>
                  <span>{new Date(entry.recordedAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
