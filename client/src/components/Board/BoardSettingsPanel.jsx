import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * BoardSettingsPanel
 *
 * Props:
 *   board          - The board object (with members array)
 *   onClose        - Called when the panel should close
 *   onBoardUpdated - Called with the updated board after a rename
 *   onBoardDeleted - Called after the board is deleted
 */
function BoardSettingsPanel({ board, onClose, onBoardUpdated, onBoardDeleted }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Determine if the current user is an Admin on this board
  const currentMember = board?.members?.find(
    (m) => m.userId === user?._id || m.userId?._id === user?._id
  );
  const isAdmin = currentMember?.role === 'Admin';

  // ── Rename board ──────────────────────────────────────────────────────────
  const [boardName, setBoardName] = useState(board?.name ?? '');
  const [renaming, setRenaming] = useState(false);

  async function handleRename(e) {
    e.preventDefault();
    const name = boardName.trim();
    if (!name || name === board.name) return;
    setRenaming(true);
    try {
      const response = await api.put(`/boards/${board._id}`, { name });
      onBoardUpdated?.(response.data);
      toast.success('Board renamed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to rename board');
    } finally {
      setRenaming(false);
    }
  }

  // ── Member management ─────────────────────────────────────────────────────
  const [members, setMembers] = useState(board?.members ?? []);

  // Keep local members in sync if board prop changes
  useEffect(() => {
    setMembers(board?.members ?? []);
  }, [board?.members]);

  async function handleRoleChange(memberId, newRole) {
    try {
      const response = await api.put(`/boards/${board._id}/members/${memberId}`, {
        role: newRole,
      });
      setMembers(response.data.members ?? members);
      toast.success('Role updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update role');
    }
  }

  async function handleRemoveMember(memberId) {
    try {
      const response = await api.delete(`/boards/${board._id}/members/${memberId}`);
      setMembers(response.data.members ?? members.filter((m) => m.userId !== memberId && m.userId?._id !== memberId));
      toast.success('Member removed');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove member');
    }
  }

  // ── Invite by email ───────────────────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  async function handleInvite(e) {
    e.preventDefault();
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true);
    setInviteLink('');
    setLinkCopied(false);
    try {
      const response = await api.post(`/boards/${board._id}/invite`, { email });
      setInviteEmail('');
      if (response.data.inviteLink) {
        // Email failed — show the link persistently in the panel
        setInviteLink(response.data.inviteLink);
      } else {
        toast.success(`Invitation sent to ${email}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  }

  function handleCopyLink() {
    navigator.clipboard?.writeText(inviteLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  // ── Delete board ──────────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/boards/${board._id}`);
      toast.success('Board deleted');
      onBoardDeleted?.();
      onClose?.();
      navigate('/boards');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete board');
      setDeleting(false);
    }
  }

  // ── Focus trap ────────────────────────────────────────────────────────────
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);

  // Focus the close button when the panel opens
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  // Trap focus within the panel
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const focusable = panel.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    },
    [onClose]
  );

  if (!isAdmin) {
    return null;
  }

  return (
    // Backdrop
    <div style={styles.backdrop} onClick={onClose} aria-hidden="true">
      {/* Panel — stop click propagation so clicking inside doesn't close */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Board settings"
        style={styles.panel}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>Board Settings</h2>
          <button
            ref={closeButtonRef}
            style={styles.closeBtn}
            onClick={onClose}
            aria-label="Close board settings"
          >
            ✕
          </button>
        </div>

        {/* ── Section 1: Rename board ── */}
        <section style={styles.section} aria-labelledby="rename-heading">
          <h3 id="rename-heading" style={styles.sectionTitle}>
            Rename Board
          </h3>
          <form style={styles.row} onSubmit={handleRename}>
            <input
              style={styles.input}
              type="text"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              maxLength={100}
              aria-label="Board name"
              disabled={renaming}
            />
            <button
              style={styles.primaryBtn}
              type="submit"
              disabled={renaming || !boardName.trim() || boardName.trim() === board.name}
            >
              {renaming ? 'Saving…' : 'Save'}
            </button>
          </form>
        </section>

        {/* ── Section 2: Members list ── */}
        <section style={styles.section} aria-labelledby="members-heading">
          <h3 id="members-heading" style={styles.sectionTitle}>
            Members
          </h3>
          {members.length === 0 && (
            <p style={styles.emptyText}>No members found.</p>
          )}
          <ul style={styles.memberList} aria-label="Board members">
            {members.map((member) => {
              const memberId = member.userId?._id ?? member.userId;
              const displayName =
                member.userId?.displayName ?? member.userId?.email ?? memberId;
              const isSelf = memberId === user?._id;

              return (
                <li key={memberId} style={styles.memberItem}>
                  <span style={styles.memberName} title={displayName}>
                    {displayName}
                    {isSelf && (
                      <span style={styles.youBadge}> (you)</span>
                    )}
                  </span>
                  <div style={styles.memberActions}>
                    {/* Role selector — Admin can change roles of others */}
                    {!isSelf && (
                      <select
                        style={styles.roleSelect}
                        value={member.role}
                        onChange={(e) => handleRoleChange(memberId, e.target.value)}
                        aria-label={`Change role for ${displayName}`}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Member">Member</option>
                      </select>
                    )}
                    {isSelf && (
                      <span style={styles.roleBadge}>{member.role}</span>
                    )}
                    {/* Remove button — Admin can remove others */}
                    {!isSelf && (
                      <button
                        style={styles.dangerBtnSmall}
                        onClick={() => handleRemoveMember(memberId)}
                        aria-label={`Remove ${displayName} from board`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── Section 3: Invite by email ── */}
        <section style={styles.section} aria-labelledby="invite-heading">
          <h3 id="invite-heading" style={styles.sectionTitle}>
            Invite Member
          </h3>
          <form style={styles.row} onSubmit={handleInvite}>
            <input
              style={styles.input}
              type="email"
              placeholder="Email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              aria-label="Email address to invite"
              disabled={inviting}
            />
            <button
              style={styles.primaryBtn}
              type="submit"
              disabled={inviting || !inviteEmail.trim()}
            >
              {inviting ? 'Sending…' : 'Invite'}
            </button>
          </form>

          {/* Show invite link when email fails */}
          {inviteLink && (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Email could not be sent. Share this link manually:
              </p>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input
                  readOnly
                  value={inviteLink}
                  style={{ ...styles.input, fontSize: '0.75rem', flex: 1 }}
                  onFocus={(e) => e.target.select()}
                  aria-label="Invitation link"
                />
                <button
                  style={{ ...styles.primaryBtn, whiteSpace: 'nowrap', fontSize: '0.8rem' }}
                  onClick={handleCopyLink}
                  type="button"
                >
                  {linkCopied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── Section 4: Delete board ── */}
        <section style={styles.section} aria-labelledby="delete-heading">
          <h3 id="delete-heading" style={styles.sectionTitle}>
            Danger Zone
          </h3>
          {!confirmDelete ? (
            <button
              style={styles.dangerBtn}
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete this board"
            >
              Delete Board
            </button>
          ) : (
            <div style={styles.confirmBox} role="alert">
              <p style={styles.confirmText}>
                Are you sure? This will permanently delete the board and all its
                lists, tasks, and comments.
              </p>
              <div style={styles.confirmActions}>
                <button
                  style={styles.dangerBtn}
                  onClick={handleDelete}
                  disabled={deleting}
                  aria-label="Confirm delete board"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  style={styles.cancelBtn}
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  panel: {
    width: '100%',
    maxWidth: '420px',
    height: '100vh',
    overflowY: 'auto',
    background: 'var(--card-bg)',
    boxShadow: '-4px 0 16px rgba(0,0,0,0.2)',
    display: 'flex',
    flexDirection: 'column',
    padding: '0',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--border-color)',
    position: 'sticky',
    top: 0,
    background: 'var(--card-bg)',
    zIndex: 1,
  },
  panelTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.1rem',
    color: 'var(--text-secondary)',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    lineHeight: 1,
  },
  section: {
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--border-color)',
  },
  sectionTitle: {
    fontSize: '0.85rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-secondary)',
    marginBottom: '0.75rem',
  },
  row: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
  },
  primaryBtn: {
    padding: '0.5rem 1rem',
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.875rem',
    whiteSpace: 'nowrap',
  },
  memberList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  memberItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
    padding: '0.5rem 0',
    borderBottom: '1px solid var(--border-color)',
  },
  memberName: {
    flex: 1,
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  youBadge: {
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
  },
  memberActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexShrink: 0,
  },
  roleSelect: {
    padding: '0.25rem 0.5rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  roleBadge: {
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    background: '#ebf8ff',
    color: '#2b6cb0',
  },
  dangerBtnSmall: {
    padding: '0.25rem 0.6rem',
    background: 'transparent',
    color: '#e53e3e',
    border: '1px solid #e53e3e',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  emptyText: {
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
  },
  dangerBtn: {
    padding: '0.5rem 1.25rem',
    background: '#e53e3e',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  cancelBtn: {
    padding: '0.5rem 1rem',
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
  },
  confirmBox: {
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: '6px',
    padding: '1rem',
  },
  confirmText: {
    color: '#c53030',
    fontSize: '0.875rem',
    marginBottom: '0.75rem',
    lineHeight: 1.5,
  },
  confirmActions: {
    display: 'flex',
    gap: '0.5rem',
  },
};

export default BoardSettingsPanel;
