import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import api from '../../services/api.js';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [priority, setPriority] = useState('');
  const [dueDateStart, setDueDateStart] = useState('');
  const [dueDateEnd, setDueDateEnd] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 768);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef(null);

  const runSearch = useCallback(async (q, filters) => {
    if (!q.trim() && !filters.priority && !filters.dueDateStart && !filters.dueDateEnd && !filters.assigneeId) {
      setResults([]);
      setShowResults(false);
      return;
    }
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.dueDateStart) params.set('dueDateStart', filters.dueDateStart);
      if (filters.dueDateEnd) params.set('dueDateEnd', filters.dueDateEnd);
      if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
      const response = await api.get(`/search?${params.toString()}`);
      setResults(response.data || []);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    runSearch(debouncedQuery, { priority, dueDateStart, dueDateEnd, assigneeId });
  }, [debouncedQuery, priority, dueDateStart, dueDateEnd, assigneeId, runSearch]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
        setShowFilters(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleResultClick(boardId) {
    setShowResults(false);
    setQuery('');
    navigate(`/boards/${boardId}`);
  }

  function formatDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString();
  }

  return (
    <header className="navbar" role="banner">
      {/* Hamburger — mobile only */}
      <button
        className="hamburger-btn"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: 'var(--text-primary)', padding: '0.25rem', flexShrink: 0 }}
      >
        ☰
      </button>

      {/* Logo */}
      <Link to="/boards" style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)', textDecoration: 'none', flexShrink: 0 }}>
        TaskFlow
      </Link>

      {/* Search */}
      <div ref={searchRef} role="search" className="navbar-search" style={{ position: 'relative', flex: 1, maxWidth: 480 }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder={isMobile ? 'Search' : 'Search tasks'}
          aria-label="Search tasks"
          style={{ width: '100%', padding: '0.4rem 2rem 0.4rem 0.75rem', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.9rem' }}
        />
        <button
          onClick={() => setShowFilters((v) => !v)}
          aria-label="Toggle filters"
          aria-expanded={showFilters}
          style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '0 4px' }}
        >
          ⚙
        </button>

        {showFilters && (
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 4, padding: '0.75rem', zIndex: 200, display: 'flex', flexDirection: 'column', gap: '0.5rem', boxShadow: 'var(--shadow)' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value)} aria-label="Filter by priority" style={{ display: 'block', width: '100%', marginTop: 2, padding: '0.3rem', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                <option value="">All</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </label>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Due date from
              <input type="date" value={dueDateStart} onChange={(e) => setDueDateStart(e.target.value)} aria-label="Due date start" style={{ display: 'block', width: '100%', marginTop: 2, padding: '0.3rem', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </label>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Due date to
              <input type="date" value={dueDateEnd} onChange={(e) => setDueDateEnd(e.target.value)} aria-label="Due date end" style={{ display: 'block', width: '100%', marginTop: 2, padding: '0.3rem', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </label>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Assignee ID
              <input type="text" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} placeholder="User ID" aria-label="Filter by assignee ID" style={{ display: 'block', width: '100%', marginTop: 2, padding: '0.3rem', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </label>
          </div>
        )}

        {showResults && (
          <ul role="listbox" aria-label="Search results" style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 4, listStyle: 'none', margin: 0, padding: 0, zIndex: 201, maxHeight: 320, overflowY: 'auto', boxShadow: 'var(--shadow)' }}>
            {searching && <li style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Searching…</li>}
            {!searching && results.length === 0 && <li style={{ padding: '0.5rem 0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No results found</li>}
            {!searching && results.map((task) => (
              <li key={task._id} role="option" aria-selected="false"
                onClick={() => handleResultClick(task.boardId?._id || task.boardId)}
                style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{task.title}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {task.boardId?.name || 'Unknown board'}
                  {task.dueDate && ` · Due ${formatDate(task.dueDate)}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Desktop nav links — hidden on mobile via CSS */}
      <nav className="navbar-nav-links" aria-label="Top navigation" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <Link to="/boards" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>Boards</Link>
        <Link to="/dashboard" style={{ color: 'var(--text-primary)', textDecoration: 'none', fontSize: '0.9rem' }}>Dashboard</Link>
      </nav>

      {/* Right side: theme + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', flexShrink: 0 }}>
        <ThemeToggle />
        {user && (
          <>
            <span className="navbar-user-name" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.displayName}
            </span>
            <button onClick={logout} aria-label="Log out" style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 4, padding: '0.25rem 0.6rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span className="navbar-logout-text">Logout</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}

export default Navbar;
