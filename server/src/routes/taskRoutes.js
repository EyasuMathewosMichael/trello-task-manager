// Feature: trello-task-manager, Task Routes
import { Router } from 'express';
import { body, param } from 'express-validator';
import authMiddleware from '../middleware/authMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';
import taskService from '../services/taskService.js';
import List from '../models/List.js';
import Task from '../models/Task.js';
import Board from '../models/Board.js';

const router = Router();

// ─── Access-control helpers ───────────────────────────────────────────────────

/**
 * Middleware that verifies the authenticated user is a member of the board
 * that contains the given list (:listId param).
 * Attaches req.boardId and req.boardRole on success.
 */
async function requireListAccess(req, res, next) {
  try {
    const { listId } = req.params;
    const userId = req.user.userId;

    const list = await List.findById(listId).lean();
    if (!list) {
      return res.status(404).json({ error: 'List not found' });
    }

    const board = await Board.findById(list.boardId).lean();
    if (!board) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const memberEntry = board.members.find(
      (m) => m.userId.toString() === userId.toString()
    );

    if (!memberEntry) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.boardId = list.boardId;
    req.boardRole = memberEntry.role;
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Middleware that verifies the authenticated user is a member of the board
 * that contains the given task (:id param).
 * Attaches req.boardId and req.boardRole on success.
 */
async function requireTaskAccess(req, res, next) {
  try {
    const taskId = req.params.id;
    const userId = req.user.userId;

    const task = await Task.findById(taskId).lean();
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const board = await Board.findById(task.boardId).lean();
    if (!board) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const memberEntry = board.members.find(
      (m) => m.userId.toString() === userId.toString()
    );

    if (!memberEntry) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    req.boardId = task.boardId;
    req.boardRole = memberEntry.role;
    return next();
  } catch (err) {
    return next(err);
  }
}

// ─── GET /api/lists/:listId/tasks ─────────────────────────────────────────────
// Returns all tasks for a list sorted by position ascending.
router.get(
  '/lists/:listId/tasks',
  authMiddleware,
  requireListAccess,
  async (req, res, next) => {
    try {
      const tasks = await Task.find({ listId: req.params.listId }).sort({ position: 1 });
      return res.status(200).json(tasks);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── POST /api/lists/:listId/tasks ────────────────────────────────────────────
// Creates a new task in the given list.
router.post(
  '/lists/:listId/tasks',
  authMiddleware,
  requireListAccess,
  [
    body('title')
      .isString()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Task title must be a non-empty string'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { title, description, dueDate, priority, assignees, labels } = req.body;
      const task = await taskService.createTask(
        req.params.listId,
        req.user.userId,
        title,
        { description, dueDate, priority, assignees, labels }
      );
      return res.status(201).json(task);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── PUT /api/tasks/:id ───────────────────────────────────────────────────────
// Partially updates a task.
router.put(
  '/tasks/:id',
  authMiddleware,
  requireTaskAccess,
  async (req, res, next) => {
    try {
      const task = await taskService.updateTask(
        req.params.id,
        req.user.userId,
        req.body
      );
      return res.status(200).json(task);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── PUT /api/tasks/:id/move ──────────────────────────────────────────────────
// Moves a task to a different list and/or position.
router.put(
  '/tasks/:id/move',
  authMiddleware,
  requireTaskAccess,
  [
    body('targetListId')
      .isString()
      .trim()
      .isLength({ min: 1 })
      .withMessage('targetListId must be a non-empty string'),
    body('position')
      .isInt({ min: 0 })
      .withMessage('position must be a non-negative integer'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const task = await taskService.moveTask(
        req.params.id,
        req.user.userId,
        req.body.targetListId,
        req.body.position
      );
      return res.status(200).json(task);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────
// Deletes a task and its associated comments.
router.delete(
  '/tasks/:id',
  authMiddleware,
  requireTaskAccess,
  async (req, res, next) => {
    try {
      await taskService.deleteTask(req.params.id, req.user.userId);
      return res.status(200).json({ message: 'Task deleted' });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
