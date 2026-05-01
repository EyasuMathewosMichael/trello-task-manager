import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import toast from 'react-hot-toast';
import api from '../../services/api.js';
import ListColumn from './ListColumn.jsx';
import TaskCard from './TaskCard.jsx';

/**
 * DragDropBoard
 *
 * Wraps the board columns in DndContext and handles drag-and-drop logic.
 *
 * Props:
 *   lists        - Array of list objects (sorted by position)
 *   tasksByList  - { [listId]: Task[] } — tasks per list sorted by position
 *   setTasksByList - State setter for tasksByList
 *   onTaskClick  - Called with a task when a card is clicked
 *   onAddTask    - Called with listId when "Add task" is clicked
 */
function DragDropBoard({ lists, tasksByList, setTasksByList, onTaskClick, onAddTask }) {
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function findListIdForTask(taskId) {
    for (const [listId, tasks] of Object.entries(tasksByList)) {
      if (tasks.some((t) => t._id === taskId)) {
        return listId;
      }
    }
    return null;
  }

  function handleDragStart(event) {
    const { active } = event;
    const sourceListId = findListIdForTask(active.id);
    if (!sourceListId) return;
    const task = tasksByList[sourceListId]?.find((t) => t._id === active.id);
    setActiveTask(task ?? null);
  }

  function handleDragOver(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const sourceListId = findListIdForTask(active.id);
    if (!sourceListId) return;

    // Determine target list: over could be a list id or a task id
    let targetListId = null;
    if (tasksByList[over.id] !== undefined) {
      // Dropped directly onto a list column
      targetListId = over.id;
    } else {
      targetListId = findListIdForTask(over.id);
    }

    if (!targetListId || sourceListId === targetListId) return;

    // Move task between lists in local state (preview)
    setTasksByList((prev) => {
      const sourceTasks = [...(prev[sourceListId] ?? [])];
      const targetTasks = [...(prev[targetListId] ?? [])];

      const taskIndex = sourceTasks.findIndex((t) => t._id === active.id);
      if (taskIndex === -1) return prev;

      const [movedTask] = sourceTasks.splice(taskIndex, 1);

      // Insert before the over task if over is a task, else append
      const overIndex = targetTasks.findIndex((t) => t._id === over.id);
      if (overIndex >= 0) {
        targetTasks.splice(overIndex, 0, movedTask);
      } else {
        targetTasks.push(movedTask);
      }

      return {
        ...prev,
        [sourceListId]: sourceTasks,
        [targetListId]: targetTasks,
      };
    });
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const sourceListId = findListIdForTask(active.id);
    if (!sourceListId) return;

    // Determine target list
    let targetListId = null;
    if (tasksByList[over.id] !== undefined) {
      targetListId = over.id;
    } else {
      targetListId = findListIdForTask(over.id);
    }

    if (!targetListId) return;

    // Snapshot state before optimistic update for rollback
    const snapshot = { ...tasksByList };
    Object.keys(snapshot).forEach((k) => {
      snapshot[k] = [...snapshot[k]];
    });

    // Compute new position (1-indexed, based on current order in target list)
    const targetTasks = tasksByList[targetListId] ?? [];
    const newPosition = targetTasks.findIndex((t) => t._id === active.id);
    const position = newPosition >= 0 ? newPosition : targetTasks.length;

    // Optimistic update: reorder within same list if needed
    if (sourceListId === targetListId) {
      const tasks = [...(tasksByList[sourceListId] ?? [])];
      const oldIndex = tasks.findIndex((t) => t._id === active.id);
      const overIndex = tasks.findIndex((t) => t._id === over.id);

      if (oldIndex !== -1 && overIndex !== -1 && oldIndex !== overIndex) {
        const [moved] = tasks.splice(oldIndex, 1);
        tasks.splice(overIndex, 0, moved);
        setTasksByList((prev) => ({ ...prev, [sourceListId]: tasks }));
      }
    }
    // Cross-list move was already applied in handleDragOver

    try {
      await api.put(`/tasks/${active.id}/move`, {
        targetListId,
        position,
      });
    } catch (err) {
      // Rollback on failure
      setTasksByList(snapshot);
      toast.error(
        err.response?.data?.error || 'Failed to move task. Changes reverted.'
      );
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {/* Use CSS class for responsive column layout */}
      <div className="board-columns">
        {lists.map((list) => (
          <ListColumn
            key={list._id}
            list={list}
            tasks={tasksByList[list._id] ?? []}
            onTaskClick={onTaskClick}
            onAddTask={onAddTask}
          />
        ))}
      </div>

      {/* Ghost card shown while dragging */}
      <DragOverlay>
        {activeTask ? (
          <div style={{ opacity: 0.9, transform: 'rotate(2deg)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', borderRadius: '6px', width: '272px' }}>
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default DragDropBoard;
