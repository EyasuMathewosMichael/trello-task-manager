import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import TaskCard from './TaskCard.jsx';

/**
 * ListColumn
 *
 * Props:
 *   list        - List object
 *   tasks       - Array of Task objects for this list
 *   onTaskClick - Called with a task object when a card is clicked
 *   onAddTask   - Called with list._id when "Add task" is clicked
 */
function ListColumn({ list, tasks = [], onTaskClick, onAddTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: list._id });

  const taskIds = tasks.map((t) => t._id);

  const columnStyle = {
    ...styles.column,
    ...(isOver ? styles.columnOver : {}),
  };

  return (
    <div
      className="board-column-item"
      style={styles.wrapper}
      aria-label={`List: ${list.name}`}
    >
      {/* Column header */}
      <div style={styles.header}>
        <span style={styles.listName}>{list.name}</span>
        <span style={styles.taskCount} aria-label={`${tasks.length} tasks`}>
          {tasks.length}
        </span>
      </div>

      {/* Droppable + sortable task area */}
      <div ref={setNodeRef} style={columnStyle}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} onClick={onTaskClick} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <p style={styles.emptyText}>No tasks yet</p>
        )}
      </div>

      {/* Add task button */}
      <button
        style={styles.addBtn}
        onClick={() => onAddTask?.(list._id)}
        aria-label={`Add task to ${list.name}`}
      >
        + Add task
      </button>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    width: '272px',
    flexShrink: 0,
    background: 'var(--bg-secondary)',
    borderRadius: '8px',
    padding: '0.75rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.625rem',
  },
  listName: {
    fontWeight: 700,
    fontSize: '0.9rem',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  taskCount: {
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    background: 'var(--border-color)',
    borderRadius: '12px',
    padding: '0.1rem 0.5rem',
    marginLeft: '0.5rem',
    flexShrink: 0,
  },
  column: {
    flex: 1,
    overflowY: 'auto',
    minHeight: '40px',
    borderRadius: '4px',
    transition: 'background 0.15s',
    paddingBottom: '0.25rem',
  },
  columnOver: {
    background: 'rgba(0, 82, 204, 0.06)',
  },
  emptyText: {
    fontSize: '0.8rem',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    padding: '1rem 0',
  },
  addBtn: {
    marginTop: '0.5rem',
    width: '100%',
    padding: '0.5rem',
    background: 'transparent',
    border: '1px dashed var(--border-color)',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: '0.85rem',
    textAlign: 'left',
    transition: 'background 0.15s',
  },
};

export default ListColumn;
