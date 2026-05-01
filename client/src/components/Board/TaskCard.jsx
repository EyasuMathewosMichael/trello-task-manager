import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * TaskCard
 *
 * Props:
 *   task    - Task object
 *   onClick - Called when the card is clicked/activated
 */
function TaskCard({ task, onClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(task);
    }
  }

  const priorityColors = {
    Low: { background: '#c6f6d5', color: '#276749' },
    Medium: { background: '#fefcbf', color: '#744210' },
    High: { background: '#fed7d7', color: '#9b2c2c' },
  };

  const priorityStyle = priorityColors[task.priority] ?? priorityColors.Medium;

  const cardStyle = {
    ...styles.card,
    ...(task.isOverdue ? styles.overdueCard : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={{ ...cardStyle, ...style }}
      role="button"
      tabIndex={0}
      aria-label={`Task: ${task.title}${task.isOverdue ? ' (overdue)' : ''}`}
      onClick={() => onClick?.(task)}
      onKeyDown={handleKeyDown}
      {...attributes}
      {...listeners}
    >
      {/* Title */}
      <p style={styles.title}>{task.title}</p>

      {/* Footer row */}
      <div style={styles.footer}>
        {/* Priority badge */}
        <span style={{ ...styles.priorityBadge, ...priorityStyle }}>
          {task.priority ?? 'Medium'}
        </span>

        {/* Due date */}
        {task.dueDate && (
          <span
            style={{
              ...styles.dueDate,
              ...(task.isOverdue ? styles.overdueDueDate : {}),
            }}
            aria-label={`Due ${new Date(task.dueDate).toLocaleDateString()}`}
          >
            📅 {new Date(task.dueDate).toLocaleDateString()}
          </span>
        )}

        {/* Assignee count */}
        {task.assignees?.length > 0 && (
          <span style={styles.assigneeBadge} aria-label={`${task.assignees.length} assignee(s)`}>
            👤 {task.assignees.length}
          </span>
        )}
      </div>
    </div>
  );
}

const styles = {
  card: {
    background: 'var(--card-bg)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    padding: '0.625rem 0.75rem',
    marginBottom: '0.5rem',
    cursor: 'grab',
    boxShadow: 'var(--shadow)',
    userSelect: 'none',
    outline: 'none',
  },
  overdueCard: {
    borderColor: '#e53e3e',
    background: '#fff5f5',
  },
  title: {
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    marginBottom: '0.5rem',
    lineHeight: 1.4,
    wordBreak: 'break-word',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.375rem',
  },
  priorityBadge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '0.15rem 0.5rem',
    borderRadius: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  dueDate: {
    fontSize: '0.72rem',
    color: 'var(--text-secondary)',
  },
  overdueDueDate: {
    color: '#e53e3e',
    fontWeight: 600,
  },
  assigneeBadge: {
    fontSize: '0.72rem',
    color: 'var(--text-secondary)',
  },
};

export default TaskCard;
