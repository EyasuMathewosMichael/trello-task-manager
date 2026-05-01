import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/**
 * CompletionChart — weekly task completion bar chart.
 *
 * Props:
 *   weeklyTrend {Array<{ week: string, count: number }>}
 *     Array of objects with ISO week label (e.g. '2024-W01') and completion count.
 */
function CompletionChart({ weeklyTrend = [] }) {
  // Format week labels for display: '2024-W01' → 'W01'
  const data = weeklyTrend.map((entry) => ({
    ...entry,
    label: entry.week ? entry.week.split('-').pop() : entry.week,
  }));

  return (
    <div
      aria-label="Weekly task completion trend"
      style={{ width: '100%', minHeight: 260 }}
    >
      <h3
        style={{
          fontSize: '1rem',
          fontWeight: 600,
          marginBottom: '1rem',
          color: 'var(--text-primary)',
        }}
      >
        Weekly Completion Trend
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
          aria-label="Weekly task completion trend"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              color: 'var(--text-primary)',
            }}
            formatter={(value) => [value, 'Completed']}
            labelFormatter={(label) => `Week ${label}`}
          />
          <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Completed" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default CompletionChart;
