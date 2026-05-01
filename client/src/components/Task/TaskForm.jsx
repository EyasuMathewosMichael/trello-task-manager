import { useState, useEffect } from 'react';
import api from '../../services/api.js';

/**
 * TaskForm
 *
 * Props:
 *   task     - Task object for edit mode; null for create mode
 *   listId   - Required when task is null (create mode)
 *   boardId  - Used to fetch board members for assignee selection
 *   onSave   - Called with the saved task object
 *   onCancel - Called when the user cancels
 */
function TaskForm({ task, listId, boardId, onSave, onCancel }) {
  const isEdit = task != null;

  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''
  );
  const [priority, setPriority] = useState(task?.priority ?? 'Medium');
  const [labels, setLabels] = useState((task?.labels ?? []).join(', '));
  const [assignees, setAssignees] = useState(
    (task?.assignees ?? []).map((a) => (typeof a === 'object' ? a._id ?? a : a).toString())
  );
  const [members, setMembers] = useState([]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fetch board members for the assignee picker
  useEffect(() => {
    const id = boardId ?? task?.boardId;
    if (!id) return;
    api.get(`/boards/${id}`)
      .then((res) => {
        const populated = (res.data.members ?? []).map((m) => ({
          id: (m.userId?._id ?? m.userId).toString(),
          name: m.userId?.displayName ?? m.userId?.email ?? 'Unknown',
        }));
        setMembers(populated);
      })
      .catch(() => {}); // non-fatal
  }, [boardId, task?.boardId]);

  function toggleAssignee(memberId) {
    setAssignees((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Title is required.');
      return;
    }

    const payload = {
      title: trimmedTitle,
      description: description.trim(),
      priority,
      dueDate: dueDate || null,
      labels: labels
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean),
      assignees,
    };

    setSaving(true);
    try {
      let response;
      if (isEdit) {
        response = await api.put(`/tasks/${task._id}`, payload);
      } else {
        response = await api.post(`/lists/${listId}/tasks`, payload);
      }
      onSave?.(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save task.');
    } finally {
      setSaving(false);
    }
  }

  const titleId = 'task-form-title';
  const descId = 'task-form-desc';
  const dueDateId = 'task-form-due';
  const priorityId = 'task-form-priority';
  const labelsId = 'task-form-labels';
  const errorId = 'task-form-error';

  return (
    <form
      style={styles.form}
      onSubmit={handleSubmit}
      aria-label={isEdit ? 'Edit task' : 'Create task'}
      noValidate
    >
      <h2 style={styles.heading}>{isEdit ? 'Edit Task' : 'New Task'}</h2>

      {/* Title */}
      <div style={styles.field}>
        <label htmlFor={titleId} style={styles.label}>
          Title <span aria-hidden="true" style={styles.required}>*</span>
        </label>
        <input
          id={titleId}
          style={styles.input}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
          aria-required="true"
          aria-describedby={error ? errorId : undefined}
          disabled={saving}
          autoFocus
        />
      </div>

      {/* Description */}
      <div style={styles.field}>
        <label htmlFor={descId} style={styles.label}>
          Description
        </label>
        <textarea
          id={descId}
          style={styles.textarea}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          disabled={saving}
        />
      </div>

      {/* Due date */}
      <div style={styles.field}>
        <label htmlFor={dueDateId} style={styles.label}>
          Due Date
        </label>
        <input
          id={dueDateId}
          style={styles.input}
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          disabled={saving}
        />
      </div>

      {/* Priority */}
      <div style={styles.field}>
        <label htmlFor={priorityId} style={styles.label}>
          Priority
        </label>
        <select
          id={priorityId}
          style={styles.select}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          disabled={saving}
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      {/* Labels */}
      <div style={styles.field}>
        <label htmlFor={labelsId} style={styles.label}>
          Labels
          <span style={styles.hint}> (comma-separated)</span>
        </label>
        <input
          id={labelsId}
          style={styles.input}
          type="text"
          value={labels}
          onChange={(e) => setLabels(e.target.value)}
          placeholder="e.g. bug, frontend, urgent"
          disabled={saving}
        />
      </div>

      {/* Assignees */}
      {members.length > 0 && (
        <div style={styles.field}>
          <span style={styles.label}>Assignees</span>
          <div style={styles.assigneeList}>
            {members.map((member) => {
              const checked = assignees.includes(member.id);
              return (
                <label key={member.id} style={styles.assigneeOption}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAssignee(member.id)}
                    disabled={saving}
                    style={{ marginRight: '0.4rem', accentColor: 'var(--accent)' }}
                  />
                  {member.name}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p id={errorId} style={styles.errorText} role="alert">
          {error}
        </p>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <button
          type="submit"
          style={styles.primaryBtn}
          disabled={saving}
          aria-busy={saving}
        >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
        </button>
        <button
          type="button"
          style={styles.cancelBtn}
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  heading: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '0.25rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  required: {
    color: '#e53e3e',
  },
  hint: {
    fontWeight: 400,
    color: 'var(--text-secondary)',
  },
  input: {
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
  },
  textarea: {
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  select: {
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  errorText: {
    color: '#e53e3e',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.25rem',
  },
  primaryBtn: {
    padding: '0.5rem 1.25rem',
    background: 'var(--accent)',
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
  assigneeList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    background: 'var(--bg-secondary)',
    maxHeight: '140px',
    overflowY: 'auto',
  },
  assigneeOption: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    cursor: 'pointer',
  },
};

export default TaskForm;
