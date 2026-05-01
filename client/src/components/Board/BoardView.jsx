import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api.js';
import { useSocket } from '../../context/SocketContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import DragDropBoard from './DragDropBoard.jsx';
import BoardSettingsPanel from './BoardSettingsPanel.jsx';
import TaskModal from '../Task/TaskModal.jsx';
import TaskForm from '../Task/TaskForm.jsx';

/**
 * BoardView
 *
 * Main board canvas. Fetches lists and tasks, subscribes to Socket.io events,
 * and renders the drag-and-drop board.
 */
function BoardView() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useAuth();

  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [tasksByList, setTasksByList] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Task modal / form state
  const [selectedTask, setSelectedTask] = useState(null);
  const [addingToListId, setAddingToListId] = useState(null);

  // Add list state
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [addingList, setAddingList] = useState(false);

  // Determine if current user is Admin on this board
  const currentMember = board?.members?.find(
    (m) => m.userId === user?._id || m.userId?._id === user?._id
  );
  const isAdmin = currentMember?.role === 'Admin';

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchBoard = useCallback(async () => {
    try {
      const response = await api.get(`/boards/${boardId}`);
      setBoard(response.data);
    } catch {
      // Board metadata fetch failure is non-fatal; board name may be unavailable
    }
  }, [boardId]);

  const fetchListsAndTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const listsResponse = await api.get(`/boards/${boardId}/lists`);
      const fetchedLists = listsResponse.data ?? [];
      setLists(fetchedLists);

      // Fetch tasks for each list in parallel
      const taskResults = await Promise.all(
        fetchedLists.map((list) =>
          api
            .get(`/lists/${list._id}/tasks`)
            .then((r) => ({ listId: list._id, tasks: r.data ?? [] }))
            .catch(() => ({ listId: list._id, tasks: [] }))
        )
      );

      const byList = {};
      taskResults.forEach(({ listId, tasks }) => {
        byList[listId] = tasks;
      });
      setTasksByList(byList);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    fetchBoard();
    fetchListsAndTasks();
  }, [fetchBoard, fetchListsAndTasks]);

  // ── Socket.io subscription ─────────────────────────────────────────────────

  useEffect(() => {
    socket.joinBoard(boardId);

    function handleTaskCreated(task) {
      setTasksByList((prev) => {
        const listTasks = prev[task.listId] ?? [];
        // Avoid duplicates
        if (listTasks.some((t) => t._id === task._id)) return prev;
        return { ...prev, [task.listId]: [...listTasks, task] };
      });
    }

    function handleTaskUpdated(task) {
      setTasksByList((prev) => {
        const listTasks = prev[task.listId] ?? [];
        const exists = listTasks.some((t) => t._id === task._id);
        if (exists) {
          return {
            ...prev,
            [task.listId]: listTasks.map((t) => (t._id === task._id ? task : t)),
          };
        }
        // Task may have moved lists; update across all lists
        const updated = {};
        for (const [lid, tasks] of Object.entries(prev)) {
          updated[lid] = tasks.filter((t) => t._id !== task._id);
        }
        updated[task.listId] = [...(updated[task.listId] ?? []), task];
        return updated;
      });
    }

    function handleTaskMoved({ taskId, listId, position }) {
      setTasksByList((prev) => {
        // Find and remove task from its current list
        let movedTask = null;
        const updated = {};
        for (const [lid, tasks] of Object.entries(prev)) {
          const idx = tasks.findIndex((t) => t._id === taskId);
          if (idx !== -1) {
            movedTask = { ...tasks[idx], listId, position };
            updated[lid] = tasks.filter((t) => t._id !== taskId);
          } else {
            updated[lid] = [...tasks];
          }
        }
        if (!movedTask) return prev;
        const targetTasks = [...(updated[listId] ?? [])];
        targetTasks.splice(position, 0, movedTask);
        updated[listId] = targetTasks;
        return updated;
      });
    }

    function handleTaskDeleted({ taskId }) {
      setTasksByList((prev) => {
        const updated = {};
        for (const [lid, tasks] of Object.entries(prev)) {
          updated[lid] = tasks.filter((t) => t._id !== taskId);
        }
        return updated;
      });
    }

    function handleCommentAdded(comment) {
      // Comments are managed by TaskModal; no board-level state change needed
      // but we could update a comment count badge in the future
      void comment;
    }

    function handleMemberJoined({ userId, boardId: eventBoardId }) {
      if (eventBoardId === boardId) {
        // Refresh board metadata to get updated members list
        fetchBoard();
      }
      void userId;
    }

    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:moved', handleTaskMoved);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('comment:added', handleCommentAdded);
    socket.on('member:joined', handleMemberJoined);

    return () => {
      socket.leaveBoard(boardId);
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:moved', handleTaskMoved);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('comment:added', handleCommentAdded);
      socket.off('member:joined', handleMemberJoined);
    };
  }, [boardId, socket, fetchBoard]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleTaskClick(task) {
    setSelectedTask(task);
  }

  function handleAddTask(listId) {
    setAddingToListId(listId);
  }

  async function handleAddList(e) {
    e.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    setAddingList(true);
    try {
      const response = await api.post(`/boards/${boardId}/lists`, { name });
      const newList = response.data;
      setLists((prev) => [...prev, newList]);
      setTasksByList((prev) => ({ ...prev, [newList._id]: [] }));
      setNewListName('');
      setShowAddList(false);
    } catch (err) {
      console.error('Failed to add list:', err);
    } finally {
      setAddingList(false);
    }
  }

  function handleTaskUpdated(updatedTask) {
    setTasksByList((prev) => {
      const updated = {};
      for (const [lid, tasks] of Object.entries(prev)) {
        updated[lid] = tasks.filter((t) => t._id !== updatedTask._id);
      }
      const targetList = updatedTask.listId ?? selectedTask?.listId;
      if (targetList) {
        updated[targetList] = [...(updated[targetList] ?? []), updatedTask];
      }
      return updated;
    });
    setSelectedTask(updatedTask);
  }

  function handleTaskDeleted(taskId) {
    setTasksByList((prev) => {
      const updated = {};
      for (const [lid, tasks] of Object.entries(prev)) {
        updated[lid] = tasks.filter((t) => t._id !== taskId);
      }
      return updated;
    });
    setSelectedTask(null);
  }

  function handleTaskCreated(newTask) {
    setTasksByList((prev) => {
      const listTasks = prev[newTask.listId] ?? [];
      if (listTasks.some((t) => t._id === newTask._id)) return prev;
      return { ...prev, [newTask.listId]: [...listTasks, newTask] };
    });
    setAddingToListId(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={styles.centered} aria-live="polite" aria-busy="true">
        Loading board…
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered} role="alert">
        {error}
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Board header */}
      <div style={styles.header}>
        <h1 style={styles.boardName}>{board?.name ?? 'Board'}</h1>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {/* Add list button — in header, same size as Settings */}
          {showAddList ? (
            <form
              onSubmit={handleAddList}
              style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}
            >
              <input
                autoFocus
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="List name"
                maxLength={100}
                aria-label="New list name"
                style={{
                  padding: '0.35rem 0.6rem',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  width: '140px',
                }}
              />
              <button
                type="submit"
                disabled={addingList || !newListName.trim()}
                style={styles.settingsBtn}
              >
                {addingList ? '…' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddList(false); setNewListName(''); }}
                style={{ ...styles.settingsBtn, padding: '0.4rem 0.6rem' }}
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowAddList(true)}
              aria-label="Add a new list"
              style={styles.settingsBtn}
            >
              + Add list
            </button>
          )}

          {isAdmin && (
            <button
              style={styles.settingsBtn}
              onClick={() => setShowSettings(true)}
              aria-label="Open board settings"
            >
              ⚙ Settings
            </button>
          )}
        </div>
      </div>

      {/* Drag-and-drop board */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        <DragDropBoard
          lists={lists}
          tasksByList={tasksByList}
          setTasksByList={setTasksByList}
          onTaskClick={handleTaskClick}
          onAddTask={handleAddTask}
        />
      </div>

      {/* Board settings panel (Admin only) */}
      {showSettings && board && (
        <BoardSettingsPanel
          board={board}
          onClose={() => setShowSettings(false)}
          onBoardUpdated={(updated) => setBoard(updated)}
          onBoardDeleted={() => navigate('/boards')}
        />
      )}

      {/* Task detail modal */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={handleTaskUpdated}
          onTaskDeleted={handleTaskDeleted}
        />
      )}

      {/* Create task modal */}
      {addingToListId && (
        <div style={styles.formBackdrop} onClick={() => setAddingToListId(null)} aria-hidden="true">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Create task"
            style={styles.formModal}
            onClick={(e) => e.stopPropagation()}
          >
            <TaskForm
              task={null}
              listId={addingToListId}
              boardId={boardId}
              onSave={handleTaskCreated}
              onCancel={() => setAddingToListId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '1rem',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
    flexShrink: 0,
  },
  boardName: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  settingsBtn: {
    padding: '0.4rem 0.9rem',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  centered: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    color: 'var(--text-secondary)',
    fontSize: '1rem',
  },
  formBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  formModal: {
    background: 'var(--card-bg)',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto',
    padding: '1.5rem',
  },
};

export default BoardView;
