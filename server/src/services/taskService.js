// Feature: trello-task-manager, Task Service
import Task from '../models/Task.js';
import List from '../models/List.js';
import Comment from '../models/Comment.js';
import activityLogService from './activityLogService.js';
import dashboardService from './dashboardService.js';
import { emitToBoard } from '../socket/socketServer.js';

/**
 * Creates a new task in the given list.
 * Position is set to maxPosition + 1 (or 1 if no tasks exist in the list).
 *
 * @param {string|ObjectId} listId  - The list to add the task to
 * @param {string|ObjectId} userId  - The user creating the task
 * @param {string}          title   - The task title
 * @param {object}          [opts]  - Optional fields: description, dueDate, priority, assignees, labels
 * @returns {Promise<Task>}
 */
async function createTask(listId, userId, title, opts = {}) {
  // Find the list to get its boardId
  const list = await List.findById(listId).lean();
  if (!list) {
    const err = new Error('List not found');
    err.status = 404;
    throw err;
  }

  const boardId = list.boardId;

  // Find max position among tasks in this list
  const lastTask = await Task.findOne({ listId }).sort({ position: -1 }).lean();
  const maxPosition = lastTask ? lastTask.position : 0;

  const { description, dueDate, priority, assignees, labels } = opts;

  const task = await Task.create({
    listId,
    boardId,
    title,
    position: maxPosition + 1,
    createdBy: userId,
    ...(description !== undefined && { description }),
    ...(dueDate !== undefined && { dueDate }),
    ...(priority !== undefined && { priority }),
    ...(assignees !== undefined && { assignees }),
    ...(labels !== undefined && { labels }),
  });

  await activityLogService.logActivity(
    boardId,
    userId,
    'task:created',
    task._id,
    'Task'
  );

  try {
    emitToBoard(boardId, 'task:created', task);
  } catch (emitErr) {
    // Socket.io emit is best-effort; do not fail the request
    console.error('Socket emit error (task:created):', emitErr);
  }

  return task;
}

/**
 * Partially updates a task. Only fields present in patch are applied.
 * Allowed patch fields: title, description, dueDate, priority, assignees, labels, isComplete.
 *
 * @param {string|ObjectId} taskId  - The task to update
 * @param {string|ObjectId} userId  - The user performing the update
 * @param {object}          patch   - Fields to update
 * @returns {Promise<Task>}
 */
async function updateTask(taskId, userId, patch) {
  const task = await Task.findById(taskId);
  if (!task) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }

  const allowedFields = ['title', 'description', 'dueDate', 'priority', 'assignees', 'labels', 'isComplete'];

  const prevIsComplete = task.isComplete;
  const prevIsOverdue = task.isOverdue;

  for (const field of allowedFields) {
    if (patch[field] !== undefined) {
      task[field] = patch[field];
    }
  }

  task.updatedAt = new Date();
  await task.save();

  // Invalidate dashboard cache if completion or overdue status changed
  if (task.isComplete !== prevIsComplete || task.isOverdue !== prevIsOverdue) {
    try {
      await dashboardService.invalidateCache(task.boardId);
    } catch (cacheErr) {
      console.error('Dashboard cache invalidation error:', cacheErr);
    }
  }

  await activityLogService.logActivity(
    task.boardId,
    userId,
    'task:updated',
    task._id,
    'Task'
  );

  try {
    emitToBoard(task.boardId, 'task:updated', task);
  } catch (emitErr) {
    console.error('Socket emit error (task:updated):', emitErr);
  }

  return task;
}

/**
 * Moves a task to a different list and/or position.
 *
 * @param {string|ObjectId} taskId        - The task to move
 * @param {string|ObjectId} userId        - The user performing the move
 * @param {string|ObjectId} targetListId  - The destination list
 * @param {number}          position      - The new position in the target list
 * @returns {Promise<Task>}
 */
async function moveTask(taskId, userId, targetListId, position) {
  const task = await Task.findById(taskId);
  if (!task) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }

  // Find the target list to get its boardId
  const targetList = await List.findById(targetListId).lean();
  if (!targetList) {
    const err = new Error('Target list not found');
    err.status = 404;
    throw err;
  }

  const fromListId = task.listId;
  const boardId = targetList.boardId;

  task.listId = targetListId;
  task.boardId = boardId;
  task.position = position;
  task.updatedAt = new Date();
  await task.save();

  await activityLogService.logActivity(
    boardId,
    userId,
    'task:moved',
    task._id,
    'Task',
    { fromListId, toListId: targetListId, position }
  );

  try {
    emitToBoard(boardId, 'task:moved', { taskId: task._id, listId: targetListId, position });
  } catch (emitErr) {
    console.error('Socket emit error (task:moved):', emitErr);
  }

  return task;
}

/**
 * Deletes a task and all its associated comments.
 *
 * @param {string|ObjectId} taskId  - The task to delete
 * @param {string|ObjectId} userId  - The user performing the deletion
 * @returns {Promise<void>}
 */
async function deleteTask(taskId, userId) {
  const task = await Task.findById(taskId).lean();
  if (!task) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }

  const boardId = task.boardId;

  // Delete all comments for this task
  await Comment.deleteMany({ taskId });

  // Delete the task
  await Task.findByIdAndDelete(taskId);

  await activityLogService.logActivity(
    boardId,
    userId,
    'task:deleted',
    taskId,
    'Task'
  );

  try {
    emitToBoard(boardId, 'task:deleted', { taskId });
  } catch (emitErr) {
    console.error('Socket emit error (task:deleted):', emitErr);
  }
}

export default { createTask, updateTask, moveTask, deleteTask };
