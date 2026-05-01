import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api.js';

const PRIORITY_COLORS = {
  High: '#e53e3e',
  Medium: '#dd6b20',
  Low: '#38a169',
};

function SearchPage() {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const q = searchParams.get('q') || '';

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    api
      .get(`/search?q=${encodeURIComponent(q)}`)
      .then((res) => setResults(res.data || []))
      .catch(() => setError('Search failed. Please try again.'))
      .finally(() => setLoading(false));
  }, [q]);

  function formatDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString();
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>
        {q ? `Search results for "${q}"` : 'Search'}
      </h1>

      {loading && <p style={{ color: 'var(--text-secondary)' }}>Searching…</p>}
      {error && <p style={{ color: '#e53e3e' }}>{error}</p>}

      {!loading && !error && results.length === 0 && q && (
        <p style={{ color: 'var(--text-secondary)' }}>No tasks found matching "{q}".</p>
      )}

      {!loading && results.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {results.map((task) => {
            const boardId = task.boardId?._id || task.boardId;
            const boardName = task.boardId?.name || 'Unknown board';
            const listName = task.listId?.name || 'Unknown list';

            return (
              <li
                key={task._id}
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  padding: '1rem',
                  boxShadow: 'var(--shadow)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <Link
                      to={`/boards/${boardId}`}
                      style={{
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        fontSize: '1rem',
                      }}
                    >
                      {task.title}
                    </Link>

                    <div
                      style={{
                        marginTop: '0.35rem',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span>
                        Board:{' '}
                        <Link
                          to={`/boards/${boardId}`}
                          style={{ color: 'var(--accent)', textDecoration: 'none' }}
                        >
                          {boardName}
                        </Link>
                      </span>
                      <span>List: {listName}</span>
                      {task.dueDate && <span>Due: {formatDate(task.dueDate)}</span>}
                    </div>
                  </div>

                  {task.priority && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '0.2rem 0.5rem',
                        borderRadius: 12,
                        background: PRIORITY_COLORS[task.priority] + '22',
                        color: PRIORITY_COLORS[task.priority],
                        flexShrink: 0,
                      }}
                    >
                      {task.priority}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default SearchPage;
