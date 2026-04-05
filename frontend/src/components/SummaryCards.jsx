export default function SummaryCards({ summary }) {
  const items = [
    { label: 'Tracked Files', value: summary?.totalFiles ?? 0 },
    { label: 'Total Lines', value: summary?.totalLines ?? 0 },
    { label: 'Detected Issues', value: summary?.totalIssues ?? 0 },
    { label: 'Auto-safe Fixes', value: summary?.autoApplicableFixes ?? 0 },
    { label: 'High/Critical Risks', value: summary?.highOrCriticalIssues ?? 0 },
    { label: 'Snapshots', value: summary?.snapshotsTracked ?? 0 }
  ];

  return (
    <section className="grid cards-grid">
      {items.map((item) => (
        <article key={item.label} className="card summary-card">
          <p className="label">{item.label}</p>
          <p className="value">{item.value}</p>
        </article>
      ))}
    </section>
  );
}
