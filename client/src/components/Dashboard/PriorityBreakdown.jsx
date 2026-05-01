import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';

const PRIORITY_COLORS = {
  Low: '#48bb78',
  Medium: '#ecc94b',
  High: '#fc8181',
};

/**
 * PriorityBreakdown — pie chart showing task distribution by priority for a board.
 *
 * Props:
 *   boardName         {string}  Name of the board
 *   priorityBreakdown {object}  { Low: N, Medium: N, High: N }
 */
function PriorityBreakdown({ boardName, priorityBreakdown = {} }) {
  const data = Object.entries(priorityBreakdown)
    .filter(([, value]) => value > 0)
    .map(([name, value]) => ({ name, value }));

  const isEmpty = data.length === 0;

  return (
    <div
      aria-label={`Priority breakdown for ${boardName}`}
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
          marginBottom: '0.75rem',
          color: 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={boardName}
      >
        {boardName}
      </h3>

      {isEmpty ? (
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
          No tasks
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart aria-label={`Priority breakdown for ${boardName}`}>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              outerRadius={70}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={PRIORITY_COLORS[entry.name] || '#a0aec0'}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                color: 'var(--text-primary)',
              }}
              formatter={(value, name) => [value, name]}
            />
            <Legend
              iconType="circle"
              iconSize={10}
              formatter={(value) => (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default PriorityBreakdown;
