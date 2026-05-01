// Feature: trello-task-manager, Attachment Routes
import { Router } from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/authMiddleware.js';
import attachmentService from '../services/attachmentService.js';
import Task from '../models/Task.js';
import Board from '../models/Board.js';

const router = Router();

// ─── Multer configuration ─────────────────────────────────────────────────────
// Use memoryStorage so the file buffer is available in req.file.buffer.
// The limit is set slightly above 25 MB so the service layer can return a
// meaningful 413 error rather than multer's own error.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 26 * 1024 * 1024 }, // 26 MB — service validates ≤ 25 MB
});

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

// ─── POST /api/tasks/:id/attachments ─────────────────────────────────────────
// Uploads a file and attaches it to the specified task.
// Requires the user to be a board member.
router.post(
  '/tasks/:id/attachments',
  authMiddleware,
  requireTaskAccess,
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const attachment = await attachmentService.uploadAttachment(
        req.params.id,
        req.user.userId,
        req.file
      );

      return res.status(201).json(attachment);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── DELETE /api/attachments/:id ─────────────────────────────────────────────
// Deletes an attachment by its subdocument _id.
// Searches across all tasks to find which task owns this attachment.
// Only the uploader may delete their own attachment.
router.delete(
  '/attachments/:id',
  authMiddleware,
  async (req, res, next) => {
    try {
      const attachmentId = req.params.id;
      const userId = req.user.userId;

      // Find the task that contains this attachment subdocument
      const task = await Task.findOne({ 'attachments._id': attachmentId }).lean();
      if (!task) {
        return res.status(404).json({ error: 'Attachment not found' });
      }

      await attachmentService.deleteAttachment(task._id, attachmentId, userId);

      return res.status(200).json({ message: 'Attachment deleted' });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
