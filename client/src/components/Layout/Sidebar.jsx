import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

function Sidebar({ onClose }) {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const linkStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1rem',
    borderRadius: 4,
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: isActive ? 600 : 400,
    color: isActive ? 'var(--accent)' : 'var(--text-primary)',
    background: isActive ? 'rgba(0,82,204,0.1)' : 'transparent',
    transition: 'background 0.15s',
  });

  return (
    <nav
      className={onClose ? 'sidebar-nav-mobile' : 'sidebar'}
      aria-label="Main navigation"
    >
      {/* Mobile close button */}
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Close navigation menu"
          style={{ alignSelf: 'flex-end', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary)', padding: '0.25rem 0.5rem', marginBottom: '0.5rem' }}
        >
          ✕
        </button>
      )}

      {/* User display name */}
      {user && (
        <div style={{ padding: '0.5rem 1rem 1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }} aria-hidden="true">
            {user.displayName?.[0]?.toUpperCase() || '?'}
          </div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.displayName}
          </div>
        </div>
      )}

      {/* Navigation links */}
      <NavLink to="/boards" end style={linkStyle} onClick={onClose}>
        <span aria-hidden="true">📋</span>
        {!collapsed && 'Boards'}
      </NavLink>

      <NavLink to="/dashboard" style={linkStyle} onClick={onClose}>
        <span aria-hidden="true">📊</span>
        {!collapsed && 'Dashboard'}
      </NavLink>

      {/* Collapse toggle — desktop only */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{ marginTop: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        <span aria-hidden="true">{collapsed ? '→' : '←'}</span>
        {!collapsed && 'Collapse'}
      </button>
    </nav>
  );
}

export default Sidebar;
