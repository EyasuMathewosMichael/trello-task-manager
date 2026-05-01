import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../../services/api.js';
import TaskForm from './TaskForm.jsx';
import CommentThread from './CommentThread.jsx';
import AttachmentList from './AttachmentList.jsx';

/**
 * TaskModal
 *
 * Props:
 *   task          - Task object to display
 *   onClose       - Called when the modal should close
 *   onTaskUpdated - Called with the updated task after an edit
 *   onTaskDeleted - Called with the task._id after deletion
 */
function TaskModal({ task, onClose, onTaskUpdated, onTaskDeleted }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentTask, setCurrentTask] = useState(task);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [togglingComplete, setTogglingComplete] = useState(false);
  const [memberMap, setMemberMap] = useState({});

  const closeButtonRef = useRef(null);
  const modalRef = useRef(null);

  // Fetch board members to resolve assignee IDs → names
  useEffect(() => {
    const boardId = task?.boardId?._id ?? task?.boardId;
    if (!boardId) return;
    api.get(`/boards/${boardId}`)
      .then((res) => {
        const map = {};
        for (const m of res.data.members ?? []) {
          const id = (m.userId?._id ?? m.userId).toString();
          map[id] = m.userId?.displayName ?? m.userId?.email ?? id;
        }
        setMemberMap(map);
      })
      .catch(() => {});
  }, [task?.boardId]);

  // Focus the close button when the modal opens
  useEffect(() => {
    closeButtonRef.current?.focus({ preventScroll: true });
  }, []);

  // Keep currentTask in sync if the parent updates the task prop
  useEffect(() => {
    setCurrentTask(task);
  }, [task]);

  // Escape key closes the modal; Tab key is trapped inside
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusable = modal.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
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

  function handleSave(updatedTask) {
    setCurrentTask(updatedTask);
    setIsEditing(false);
    onTaskUpdated?.(updatedTask);
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete(`/tasks/${currentTask._id}`);
      onTaskDeleted?.(currentTask._id);
      onClose?.();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to delete task.');
      setDeleting(false);
    }
  }

  async function handleToggleComplete() {
    setTogglingComplete(true);
    try {
      const res = await api.put(`/tasks/${currentTask._id}`, {
        isComplete: !currentTask.isComplete,
      });
      const updated = res.data;
      setCurrentTask(updated);
      onTaskUpdated?.(updated);
    } catch {
      // silently ignore — user can retry
    } finally {
      setTogglingComplete(false);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  const priorityColors = {
    Low: { background: '#c6f6d5', color: '#276749' },
    Medium: { background: '#fefcbf', color: '#744210' },
    High: { background: '#fed7d7', color: '#9b2c2c' },
  };
  const priorityStyle =
    priorityColors[currentTask.priority] ?? priorityColors.Medium;

  return (
    // Backdrop — click outside to close
    <div
      style={styles.backdrop}
      onClick={onClose}
      aria-hidden="true"
    >
      {/* Modal panel */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Task: ${currentTask.title}`}
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title} id="task-modal-title">
            {currentTask.title}
          </h2>
          <button
            ref={closeButtonRef}
            style={styles.closeBtn}
            onClick={onClose}
            aria-label="Close task modal"
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={styles.body}>
          {isEditing ? (
            <TaskForm
              task={currentTask}
              boardId={currentTask.boardId?._id ?? currentTask.boardId}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          ) : (
            <>
              {/* Task details */}
              <div style={styles.detailsGrid}>
                {/* Priority */}
                <div style={styles.detailRow}>
                  <span style={styles.detailLabel}>Priority</span>
                  <span style={{ ...styles.priorityBadge, ...priorityStyle }}>
                    {currentTask.priority ?? 'Medium'}
                  </span>
                </div>

                {/* Due date */}
                {currentTask.dueDate && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Due Date</span>
                    <span
                      style={{
                        ...styles.detailValue,
                        ...(currentTask.isOverdue ? styles.overdueText : {}),
                      }}
                    >
                      {formatDate(currentTask.dueDate)}
                      {currentTask.isOverdue && ' ⚠ Overdue'}
                    </span>
                  </div>
                )}

                {/* Assignees */}
                {currentTask.assignees?.length > 0 && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Assignees</span>
                    <span style={styles.detailValue}>
                      {currentTask.assignees
                        .map((a) => {
                          const id = typeof a === 'object' ? (a?._id ?? a).toString() : a.toString();
                          return memberMap[id] ?? a?.displayName ?? a?.email ?? id;
                        })
                        .join(', ')}
                    </span>
                  </div>
                )}

                {/* Labels */}
                {currentTask.labels?.length > 0 && (
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Labels</span>
                    <div style={styles.labelList}>
                      {currentTask.labels.map((label) => (
                        <span key={label} style={styles.labelChip}>
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {currentTask.description && (
                <div style={styles.descriptionSection}>
                  <h3 style={styles.sectionHeading}>Description</h3>
                  <p style={styles.description}>{currentTask.description}</p>
                </div>
              )}

              {/* Action buttons */}
              <div style={styles.actionRow}>
                <button
                  style={{
                    ...styles.completeBtn,
                    ...(currentTask.isComplete ? styles.completeBtnDone : {}),
                  }}
                  onClick={handleToggleComplete}
                  disabled={togglingComplete}
                  aria-label={currentTask.isComplete ? 'Mark task as incomplete' : 'Mark task as complete'}
                >
                  {togglingComplete
                    ? '…'
                    : currentTask.isComplete
                    ? '✓ Completed'
                    : '○ Mark Complete'}
                </button>
                <button
                  style={styles.editBtn}
                  onClick={() => setIsEditing(true)}
                  aria-label="Edit task"
                >
                  ✏ Edit
                </button>
                {!confirmDelete ? (
                  <button
                    style={styles.deleteBtn}
                    onClick={() => setConfirmDelete(true)}
                    aria-label="Delete task"
                  >
                    🗑 Delete
                  </button>
                ) : (
                  <div style={styles.confirmBox} role="alert">
                    <span style={styles.confirmText}>Delete this task?</span>
                    <button
                      style={styles.confirmDeleteBtn}
                      onClick={handleDelete}
                      disabled={deleting}
                      aria-label="Confirm delete task"
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
                )}
              </div>

              {deleteError && (
                <p style={styles.errorText} role="alert">
                  {deleteError}
                </p>
              )}

              {/* Comments */}
              <CommentThread taskId={currentTask._id} />

              {/* Attachments */}
              <AttachmentList task={currentTask} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    background: 'var(--card-bg)',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    width: '100%',
    maxWidth: '640px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '0.75rem',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid var(--border-color)',
    flexShrink: 0,
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.4,
    flex: 1,
    wordBreak: 'break-word',
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
    flexShrink: 0,
  },
  body: {
    overflowY: 'auto',
    padding: '1.25rem 1.5rem',
    flex: 1,
  },
  detailsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    marginBottom: '1rem',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  detailLabel: {
    fontSize: '0.8rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--text-secondary)',
    minWidth: '80px',
  },
  detailValue: {
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
  },
  overdueText: {
    color: '#e53e3e',
    fontWeight: 600,
  },
  priorityBadge: {
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  labelList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem',
  },
  labelChip: {
    fontSize: '0.75rem',
    padding: '0.15rem 0.5rem',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
  },
  descriptionSection: {
    marginBottom: '1rem',
  },
  sectionHeading: {
    fontSize: '0.85rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--text-secondary)',
    marginBottom: '0.4rem',
  },
  description: {
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  actionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginBottom: '0.5rem',
  },
  editBtn: {
    padding: '0.4rem 0.9rem',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  deleteBtn: {
    padding: '0.4rem 0.9rem',
    background: 'transparent',
    border: '1px solid #e53e3e',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#e53e3e',
  },
  confirmBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
    background: '#fff5f5',
    border: '1px solid #fed7d7',
    borderRadius: '6px',
    padding: '0.5rem 0.75rem',
  },
  confirmText: {
    fontSize: '0.875rem',
    color: '#c53030',
    fontWeight: 500,
  },
  confirmDeleteBtn: {
    padding: '0.35rem 0.75rem',
    background: '#e53e3e',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.8rem',
  },
  cancelBtn: {
    padding: '0.35rem 0.75rem',
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },
  errorText: {
    fontSize: '0.85rem',
    color: '#e53e3e',
    fontWeight: 500,
    marginTop: '0.25rem',
  },
  completeBtn: {
    padding: '0.4rem 0.9rem',
    background: 'transparent',
    border: '1px solid #38a169',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#38a169',
  },
  completeBtnDone: {
    background: '#38a169',
    color: '#fff',
  },
};

export default TaskModal;
