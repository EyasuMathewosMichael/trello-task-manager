import { useState, useEffect, useRef } from 'react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

function CommentThread({ taskId }) {
  const { user } = useAuth();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const listEndRef = useRef(null);
  const justPosted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError('');
    api.get(`/tasks/${taskId}/comments`)
      .then((res) => { if (!cancelled) setComments(res.data ?? []); })
      .catch((err) => { if (!cancelled) setFetchError(err.response?.data?.error || 'Failed to load comments.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [taskId]);

  useEffect(() => {
    if (justPosted.current) {
      justPosted.current = false;
      listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments]);

  async function handleAddComment(e) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await api.post(`/tasks/${taskId}/comments`, { text });
      justPosted.current = true;
      setComments((prev) => [...prev, res.data]);
      setCommentText('');
    } catch (err) {
      setSubmitError(err.response?.data?.error || 'Failed to add comment.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      await api.delete(`/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      setFetchError(err.response?.data?.error || 'Failed to delete comment.');
    }
  }

  function startEdit(comment) {
    setEditingId(comment._id);
    setEditText(comment.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText('');
  }

  async function handleSaveEdit(commentId) {
    const text = editText.trim();
    if (!text) return;
    setEditSaving(true);
    try {
      const res = await api.put(`/comments/${commentId}`, { text });
      setComments((prev) => prev.map((c) => (c._id === commentId ? res.data : c)));
      setEditingId(null);
      setEditText('');
    } catch (err) {
      setFetchError(err.response?.data?.error || 'Failed to edit comment.');
    } finally {
      setEditSaving(false);
    }
  }

  function formatTimestamp(dateStr) {
    return new Date(dateStr).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  function getAuthorName(comment) {
    if (comment.authorId?.displayName) return comment.authorId.displayName;
    if (comment.authorId?.email) return comment.authorId.email;
    return 'Unknown';
  }

  function isOwnComment(comment) {
    const authorId = comment.authorId?._id ?? comment.authorId;
    return String(authorId) === String(user?._id);
  }

  return (
    <section style={styles.section} aria-labelledby="comments-heading">
      <h3 id="comments-heading" style={styles.heading}>Comments</h3>

      {loading ? (
        <p style={styles.statusText} aria-live="polite">Loading comments…</p>
      ) : fetchError ? (
        <p style={styles.errorText} role="alert">{fetchError}</p>
      ) : (
        <ul style={styles.list} aria-label="Comments" aria-live="polite">
          {comments.length === 0 && (
            <li style={styles.emptyText}>No comments yet. Be the first!</li>
          )}
          {comments.map((comment) => (
            <li key={comment._id} style={styles.commentItem}>
              <div style={styles.commentHeader}>
                <span style={styles.authorName}>{getAuthorName(comment)}</span>
                <span style={styles.timestamp}>{formatTimestamp(comment.createdAt)}</span>
              </div>

              {editingId === comment._id ? (
                <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <textarea
                    style={styles.textarea}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    rows={2}
                    autoFocus
                    aria-label="Edit comment text"
                  />
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button style={styles.saveBtn} onClick={() => handleSaveEdit(comment._id)} disabled={editSaving || !editText.trim()}>
                      {editSaving ? 'Saving…' : 'Save'}
                    </button>
                    <button style={styles.cancelBtn} onClick={cancelEdit}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p style={styles.commentText}>{comment.text}</p>
                  {isOwnComment(comment) && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                      <button style={styles.editBtn} onClick={() => startEdit(comment)} aria-label="Edit comment">
                        Edit
                      </button>
                      <button style={styles.deleteBtn} onClick={() => handleDeleteComment(comment._id)} aria-label="Delete comment">
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
          <li ref={listEndRef} aria-hidden="true" />
        </ul>
      )}

      <form style={styles.form} onSubmit={handleAddComment} aria-label="Add a comment">
        <label htmlFor="comment-textarea" style={styles.srOnly}>Write a comment</label>
        <textarea
          id="comment-textarea"
          style={styles.textarea}
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Write a comment…"
          rows={3}
          disabled={submitting}
          aria-describedby={submitError ? 'comment-error' : undefined}
        />
        {submitError && <p id="comment-error" style={styles.errorText} role="alert">{submitError}</p>}
        <button
          type="submit"
          style={styles.submitBtn}
          disabled={submitting || !commentText.trim()}
          aria-busy={submitting}
        >
          {submitting ? 'Posting…' : 'Post Comment'}
        </button>
      </form>
    </section>
  );
}

const styles = {
  section: { marginTop: '1.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' },
  heading: { fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' },
  list: { listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto', marginBottom: '1rem', paddingRight: '0.25rem' },
  commentItem: { background: 'var(--bg-secondary)', borderRadius: '6px', padding: '0.625rem 0.75rem' },
  commentHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' },
  authorName: { fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' },
  timestamp: { fontSize: '0.75rem', color: 'var(--text-secondary)', flex: 1 },
  editBtn: { background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem 0.3rem', borderRadius: '3px', fontWeight: 500 },
  deleteBtn: { background: 'transparent', border: 'none', color: '#e53e3e', cursor: 'pointer', fontSize: '0.75rem', padding: '0.1rem 0.3rem', borderRadius: '3px', fontWeight: 500 },
  saveBtn: { padding: '0.3rem 0.75rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 },
  cancelBtn: { padding: '0.3rem 0.75rem', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' },
  commentText: { fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  textarea: { padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' },
  submitBtn: { alignSelf: 'flex-start', padding: '0.45rem 1rem', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' },
  statusText: { fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' },
  errorText: { fontSize: '0.85rem', color: '#e53e3e', fontWeight: 500 },
  emptyText: { fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic' },
  srOnly: { position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 },
};

export default CommentThread;
