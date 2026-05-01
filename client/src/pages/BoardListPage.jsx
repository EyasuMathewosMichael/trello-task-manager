import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useBoard } from '../hooks/useBoard.js';

/**
 * Returns the current user's role on a given board.
 * @param {object} board
 * @param {string} userId
 * @returns {'Admin'|'Member'|null}
 */
function getUserRole(board, userId) {
  if (!board.members || !userId) return null;
  const member = board.members.find((m) => m.userId === userId || m.userId?._id === userId);
  return member?.role ?? null;
}

function BoardListPage() {
  const { user } = useAuth();
  const { boards, loading, error, createBoard, refetch } = useBoard();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const [createError, setCreateError] = useState(null);
  const [creating, setCreating] = useState(false);

  async function handleCreateBoard(e) {
    e.preventDefault();
    const name = newBoardName.trim();
    if (!name) return;

    setCreating(true);
    setCreateError(null);
    try {
      await createBoard(name);
      setNewBoardName('');
      setShowCreateForm(false);
    } catch (err) {
      setCreateError(err.response?.data?.error || err.message || 'Failed to create board');
    } finally {
      setCreating(false);
    }
  }

  function handleCancelCreate() {
    setShowCreateForm(false);
    setNewBoardName('');
    setCreateError(null);
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>My Boards</h1>
        {!showCreateForm && (
          <button
            style={styles.createBtn}
            onClick={() => setShowCreateForm(true)}
            aria-label="Create a new board"
          >
            + Create board
          </button>
        )}
      </header>

      {showCreateForm && (
        <form style={styles.createForm} onSubmit={handleCreateBoard} aria-label="Create board form">
          <input
            style={styles.input}
            type="text"
            placeholder="Board name"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            autoFocus
            maxLength={100}
            aria-label="New board name"
            disabled={creating}
          />
          <button
            style={styles.submitBtn}
            type="submit"
            disabled={creating || !newBoardName.trim()}
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
          <button
            style={styles.cancelBtn}
            type="button"
            onClick={handleCancelCreate}
            disabled={creating}
          >
            Cancel
          </button>
          {createError && <p style={styles.errorText}>{createError}</p>}
        </form>
      )}

      {loading && (
        <p style={styles.statusText} aria-live="polite">
          Loading boards…
        </p>
      )}

      {!loading && error && (
        <div style={styles.errorBox} role="alert">
          <p>{error}</p>
          <button style={styles.retryBtn} onClick={refetch}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && boards.length === 0 && (
        <p style={styles.statusText}>
          No boards yet. Create your first board to get started!
        </p>
      )}

      {!loading && !error && boards.length > 0 && (
        <div style={styles.grid} role="list" aria-label="Boards">
          {boards.map((board) => {
            const role = getUserRole(board, user?._id);
            return (
              <Link
                key={board._id}
                to={`/boards/${board._id}`}
                style={styles.cardLink}
                role="listitem"
                aria-label={`${board.name}${role ? `, ${role}` : ''}`}
              >
                <div style={styles.card}>
                  <h2 style={styles.cardTitle}>{board.name}</h2>
                  {role && (
                    <span
                      style={{
                        ...styles.roleBadge,
                        ...(role === 'Admin' ? styles.adminBadge : styles.memberBadge),
                      }}
                      aria-label={`Role: ${role}`}
                    >
                      {role}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    width: '100%',
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '1.5rem 1rem',
    color: 'var(--text-primary)',
    boxSizing: 'border-box',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '0.75rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  createBtn: {
    padding: '0.5rem 1.25rem',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  createForm: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginBottom: '1.5rem',
    padding: '1rem',
    background: 'var(--bg-secondary)',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
  },
  input: {
    flex: '1 1 200px',
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    background: 'var(--card-bg)',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
  },
  submitBtn: {
    padding: '0.5rem 1rem',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  cancelBtn: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  errorText: {
    width: '100%',
    color: '#e53e3e',
    fontSize: '0.875rem',
    marginTop: '0.25rem',
  },
  statusText: {
    color: 'var(--text-secondary)',
    fontSize: '1rem',
    marginTop: '1rem',
  },
  errorBox: {
    padding: '1rem',
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: '6px',
    color: '#c53030',
    marginTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  retryBtn: {
    padding: '0.35rem 0.75rem',
    background: '#c53030',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
    marginTop: '0.5rem',
  },
  cardLink: {
    textDecoration: 'none',
    color: 'inherit',
  },
  card: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '1.25rem 1rem',
    boxShadow: 'var(--shadow)',
    minHeight: '90px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    transition: 'box-shadow 0.15s, border-color 0.15s',
    cursor: 'pointer',
  },
  cardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
    wordBreak: 'break-word',
  },
  roleBadge: {
    display: 'inline-block',
    marginTop: '0.5rem',
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    alignSelf: 'flex-start',
  },
  adminBadge: {
    background: '#ebf8ff',
    color: '#2b6cb0',
  },
  memberBadge: {
    background: '#f0fff4',
    color: '#276749',
  },
};

export default BoardListPage;
