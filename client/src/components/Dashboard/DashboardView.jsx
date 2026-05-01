import { useEffect, useState } from 'react';
import api from '../../services/api.js';
import MetricsCard from './MetricsCard.jsx';
import CompletionChart from './CompletionChart.jsx';
import PriorityBreakdown from './PriorityBreakdown.jsx';

/**
 * DashboardView — fetches dashboard metrics and renders the analytics page.
 *
 * Renders:
 *   - A row of MetricsCard components (one per board)
 *   - A CompletionChart with the weekly trend data
 *   - A row of PriorityBreakdown charts (one per board)
 */
function DashboardView() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMetrics() {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get('/dashboard');
        if (!cancelled) {
          setMetrics(response.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Failed to load dashboard metrics.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchMetrics();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <main aria-label="Dashboard" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading dashboard…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main aria-label="Dashboard" style={{ padding: '2rem' }}>
        <p role="alert" style={{ color: '#e53e3e' }}>
          {error}
        </p>
      </main>
    );
  }

  const boards = metrics?.boards ?? [];
  const weeklyTrend = metrics?.weeklyTrend ?? [];

  return (
    <main aria-label="Dashboard" style={{ width: '100%', maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
        Dashboard
      </h1>

      {/* Metrics cards row */}
      {boards.length > 0 ? (
        <section aria-label="Board metrics" style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Board Overview
          </h2>
          <div
            className="dashboard-cards-grid"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            {boards.map((board) => (
              <MetricsCard
                key={board.boardId}
                boardName={board.boardName}
                totalTasks={board.totalTasks}
                completedTasks={board.completedTasks}
                overdueTasks={board.overdueTasks}
                myTasks={board.myTasks}
              />
            ))}
          </div>
        </section>
      ) : (
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          No boards found. Create a board to see metrics here.
        </p>
      )}

      {/* Weekly completion trend chart */}
      <section
        aria-label="Weekly completion trend"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: 8,
          padding: '1.25rem 1.5rem',
          boxShadow: 'var(--shadow)',
          marginBottom: '2rem',
        }}
      >
        <CompletionChart weeklyTrend={weeklyTrend} />
      </section>

      {/* Priority breakdown charts row */}
      {boards.length > 0 && (
        <section aria-label="Priority breakdown by board">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Priority Breakdown
          </h2>
          <div
            className="dashboard-cards-grid"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            {boards.map((board) => (
              <PriorityBreakdown
                key={board.boardId}
                boardName={board.boardName}
                priorityBreakdown={board.priorityBreakdown}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default DashboardView;
