import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const styles = {
  container: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-secondary)', padding: '1rem' },
  card: { background: 'var(--card-bg)', borderRadius: '8px', boxShadow: 'var(--shadow)', padding: '2rem', width: '100%', maxWidth: '440px', textAlign: 'center' },
  spinner: { width: '40px', height: '40px', border: '4px solid var(--border-color)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' },
  heading: { fontSize: '1.25rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.75rem' },
  body: { fontSize: '0.9375rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: '1.5' },
  link: { display: 'inline-block', padding: '0.5rem 1.25rem', background: 'var(--accent)', color: '#fff', borderRadius: '4px', textDecoration: 'none', fontSize: '0.9375rem', fontWeight: '500' },
  btn: { display: 'inline-block', padding: '0.5rem 1.25rem', background: 'var(--accent)', color: '#fff', borderRadius: '4px', border: 'none', fontSize: '0.9375rem', fontWeight: '500', cursor: 'pointer' },
  secondaryLink: { color: 'var(--accent)', textDecoration: 'none', fontSize: '0.875rem' },
};

if (typeof document !== 'undefined') {
  const styleId = 'invite-accept-spin';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(styleEl);
  }
}

function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [status, setStatus] = useState('loading');
  const [boardId, setBoardId] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    // Wait for auth state to resolve before deciding which request to make
    if (authLoading) return;

    // Use authenticated api if logged in, plain axios if not
    const request = user
      ? api.get(`/invite/${token}`)
      : axios.get(`/api/invite/${token}`);

    request
      .then((response) => {
        const data = response.data;

        if (data.message === 'Joined board successfully') {
          setBoardId(data.boardId);
          setStatus('success');
          return;
        }

        if (data.requiresRegistration) {
          if (user) {
            // Logged-in user with a different email — show join prompt
            setInviteEmail(data.email);
            setStatus('needsJoin');
          } else {
            // Not logged in — redirect to register
            const params = new URLSearchParams({ token });
            if (data.email) params.set('email', data.email);
            navigate(`/register?${params.toString()}`, { replace: true });
          }
          return;
        }

        setBoardId(data.boardId ?? null);
        setStatus('success');
      })
      .catch((err) => {
        if (err?.response?.status === 410) {
          setStatus('expired');
        } else {
          setStatus('error');
        }
      });
  }, [token, navigate, user, authLoading]);

  // Logged-in user accepting invite manually
  async function handleJoin() {
    setJoining(true);
    try {
      const res = await api.get(`/invite/${token}`);
      setBoardId(res.data.boardId ?? null);
      setStatus('success');
    } catch (err) {
      if (err?.response?.status === 410) setStatus('expired');
      else setStatus('error');
    } finally {
      setJoining(false);
    }
  }

  if (status === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.spinner} aria-hidden="true" />
          <p role="status" style={styles.body}>Processing your invitation…</p>
        </div>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.heading}>Invitation expired</h1>
          <p role="alert" style={styles.body}>This invitation has expired or already been used.</p>
          <Link to="/login" style={styles.link}>Go to login</Link>
        </div>
      </div>
    );
  }

  if (status === 'needsJoin') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.heading}>Board Invitation</h1>
          <p style={styles.body}>
            You were invited as <strong>{inviteEmail}</strong>.<br />
            Click below to join the board with your current account.
          </p>
          <button style={styles.btn} onClick={handleJoin} disabled={joining}>
            {joining ? 'Joining…' : 'Join Board'}
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.heading}>You&apos;re in!</h1>
          <p role="status" style={styles.body}>You have successfully joined the board.</p>
          {boardId
            ? <Link to={`/boards/${boardId}`} style={styles.link}>Go to board</Link>
            : <Link to="/boards" style={styles.link}>View all boards</Link>
          }
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Something went wrong</h1>
        <p role="alert" style={styles.body}>We couldn&apos;t process your invitation. Please try again or contact the board owner.</p>
        <Link to="/login" style={styles.secondaryLink}>Back to login</Link>
      </div>
    </div>
  );
}

export default InviteAccept;
