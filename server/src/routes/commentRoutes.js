// Feature: trello-task-manager, Comment Routes
import { Router } from 'express';
import { body } from 'express-validator';
import authMiddleware from '../middleware/authMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';
import commentService from '../services/commentService.js';
import Task from '../models/Task.js';
import Board from '../models/Board.js';

const router = Router();

// ─── Access-control helper ────────────────────────────────────────────────────

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

// ─── GET /api/tasks/:id/comments ─────────────────────────────────────────────
// Returns all comments for a task sorted by createdAt ascending (oldest first).
router.get(
  '/tasks/:id/comments',
  authMiddleware,
  requireTaskAccess,
  async (req, res, next) => {
    try {
      const comments = await commentService.getComments(req.params.id);
      return res.status(200).json(comments);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── POST /api/tasks/:id/comments ────────────────────────────────────────────
// Adds a comment to a task.
router.post(
  '/tasks/:id/comments',
  authMiddleware,
  requireTaskAccess,
  [
    body('text')
      .isString()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Comment text must be a non-empty string'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const comment = await commentService.addComment(
        req.params.id,
        req.user.userId,
        req.body.text
      );
      return res.status(201).json(comment);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── DELETE /api/comments/:id ─────────────────────────────────────────────────
// Deletes a comment. Only the comment's author may delete it.
router.delete(
  '/comments/:id',
  authMiddleware,
  async (req, res, next) => {
    try {
      await commentService.deleteComment(req.params.id, req.user.userId);
      return res.status(200).json({ message: 'Comment deleted' });
    } catch (err) {
      return next(err);
    }
  }
);

// ─── PUT /api/comments/:id ────────────────────────────────────────────────────
// Edits a comment. Only the comment's author may edit it.
router.put(
  '/comments/:id',
  authMiddleware,
  [
    body('text')
      .isString()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Comment text must be a non-empty string'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const comment = await commentService.editComment(req.params.id, req.user.userId, req.body.text);
      return res.status(200).json(comment);
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
