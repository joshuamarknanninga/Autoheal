import { useEffect, useMemo, useState } from 'react';
import { applyFix, getFixes, getHistory, getIssues, getSummary, simulateFix, triggerScan } from './api';
import SummaryCards from './components/SummaryCards';
import IssueList from './components/IssueList';
import FixList from './components/FixList';
import SimulationPanel from './components/SimulationPanel';
import HistoryPanel from './components/HistoryPanel';

const initialSummary = {
  totalFiles: 0,
  totalLines: 0,
  totalIssues: 0,
  autoApplicableFixes: 0,
  highOrCriticalIssues: 0,
  snapshotsTracked: 0
};

export default function App() {
  const [summary, setSummary] = useState(initialSummary);
  const [issues, setIssues] = useState([]);
  const [fixes, setFixes] = useState([]);
  const [history, setHistory] = useState(null);
  const [simulation, setSimulation] = useState(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [busyFixId, setBusyFixId] = useState(null);
  const [error, setError] = useState('');

  const repeatedRiskSummary = useMemo(() => {
    if (!summary.repeatedRiskTypes || summary.repeatedRiskTypes.length === 0) return 'No repeating risk patterns tracked yet.';
    return summary.repeatedRiskTypes.map((entry) => `${entry.type} (${entry.count})`).join(', ');
  }, [summary.repeatedRiskTypes]);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [summaryData, issueData, fixData, historyData] = await Promise.all([
        getSummary(),
        getIssues(),
        getFixes(),
        getHistory()
      ]);
      setSummary(summaryData ?? initialSummary);
      setIssues(issueData ?? []);
      setFixes(fixData ?? []);
      setHistory(historyData ?? null);
    } catch (err) {
      setError(err.message || 'Failed to load AutoHeal data.');
    } finally {
      setLoading(false);
    }
  }

  async function handleScan() {
    setActionLoading(true);
    setError('');
    try {
      await triggerScan();
      await loadAll();
      setSimulation(null);
    } catch (err) {
      setError(err.message || 'Scan failed.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSimulate(fixId) {
    setBusyFixId(fixId);
    setError('');
    try {
      const result = await simulateFix(fixId);
      setSimulation(result);
      await loadAll();
    } catch (err) {
      setError(err.message || 'Simulation failed.');
    } finally {
      setBusyFixId(null);
    }
  }

  async function handleApply(fixId) {
    setBusyFixId(fixId);
    setError('');
    try {
      const result = await applyFix(fixId);
      setSimulation((previous) => previous ?? null);
      if (result?.dryRunPatch) {
        setSimulation((previous) =>
          previous
            ? previous
            : {
                fixId,
                projectedRiskReduction: 0,
                projectedMaintainabilityDelta: 0,
                confidence: 0,
                summary: result.message
              }
        );
      }
      await loadAll();
    } catch (err) {
      setError(err.message || 'Apply action failed.');
    } finally {
      setBusyFixId(null);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <div className="app-shell">
      <header className="header">
        <div>
          <h1>AutoHeal</h1>
          <p className="subtitle">Local-first autonomous codebase maintenance engine</p>
        </div>
        <button onClick={handleScan} className="primary" disabled={actionLoading || loading}>
          {actionLoading ? 'Scanning…' : 'Run Full Scan'}
        </button>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading">Loading AutoHeal state…</div>
      ) : (
        <>
          <SummaryCards summary={summary} />

          <section className="card status-panel">
            <h2>Risk Pattern Memory</h2>
            <p>{repeatedRiskSummary}</p>
          </section>

          <section className="grid two-col">
            <IssueList issues={issues} />
            <FixList fixes={fixes} onSimulate={handleSimulate} onApply={handleApply} busyFixId={busyFixId} />
          </section>

          <section className="grid two-col">
            <SimulationPanel simulation={simulation} />
            <HistoryPanel history={history} />
          </section>
        </>
      )}
    </div>
  );
}
