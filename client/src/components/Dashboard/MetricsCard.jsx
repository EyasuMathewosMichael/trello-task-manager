/**
 * MetricsCard — displays per-board summary statistics.
 *
 * Props:
 *   boardName      {string}  Name of the board
 *   totalTasks     {number}  Total task count
 *   completedTasks {number}  Completed task count
 *   overdueTasks   {number}  Overdue task count (shown in red when > 0)
 *   myTasks        {number}  Tasks assigned to the current user
 */
function MetricsCard({ boardName, totalTasks, completedTasks, overdueTasks, myTasks }) {
  const overdueStyle = overdueTasks > 0 ? { color: '#e53e3e', fontWeight: 700 } : {};

  return (
    <div
      role="region"
      aria-label={`Metrics for ${boardName}`}
      className="dashboard-card"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        padding: '1.25rem 1.5rem',
        boxShadow: 'var(--shadow)',
        minWidth: 200,
        flex: '1 1 200px',
      }}
    >
      <h3
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          marginBottom: '1rem',
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={boardName}
      >
        {boardName}
      </h3>

      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1rem' }}>
        <div>
          <dt style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
            Total
          </dt>
          <dd style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {totalTasks}
          </dd>
        </div>

        <div>
          <dt style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
            Completed
          </dt>
          <dd style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38a169' }}>
            {completedTasks}
          </dd>
        </div>

        <div>
          <dt style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
            Overdue
          </dt>
          <dd style={{ fontSize: '1.5rem', ...overdueStyle, color: overdueStyle.color || 'var(--text-primary)' }}>
            {overdueTasks}
          </dd>
        </div>

        <div>
          <dt style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 2 }}>
            My Tasks
          </dt>
          <dd style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>
            {myTasks}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export default MetricsCard;
