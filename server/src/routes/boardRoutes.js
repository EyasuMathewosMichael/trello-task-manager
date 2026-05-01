// Feature: trello-task-manager, Board Routes
import { Router } from 'express';
import { body } from 'express-validator';
import authMiddleware from '../middleware/authMiddleware.js';
import requireBoardRole from '../middleware/roleMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';
import boardService from '../services/boardService.js';

const router = Router();

// ─── GET /api/boards ──────────────────────────────────────────────────────────
// Returns all boards the authenticated user is a member of.
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const boards = await boardService.listBoards(req.user.userId);
    return res.status(200).json(boards);
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/boards ─────────────────────────────────────────────────────────
// Creates a new board; the creator is automatically assigned the Admin role.
router.post(
  '/',
  authMiddleware,
  [
    body('name')
      .isString()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Board name must be a non-empty string'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const board = await boardService.createBoard(req.user.userId, req.body.name);
      return res.status(201).json(board);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── GET /api/boards/:id ──────────────────────────────────────────────────────
// Returns a single board by ID; requires membership.
router.get(
  '/:id',
  authMiddleware,
  requireBoardRole('Member'),
  async (req, res, next) => {
    try {
      const board = await boardService.getBoardById(req.params.id);
      if (!board) {
        return res.status(404).json({ error: 'Board not found' });
      }
      return res.status(200).json(board);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── PUT /api/boards/:id ──────────────────────────────────────────────────────
// Renames a board; requires Admin role on the board.
router.put(
  '/:id',
  authMiddleware,
  requireBoardRole('Admin'),
  [
    body('name')
      .isString()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Board name must be a non-empty string'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const board = await boardService.updateBoard(
        req.params.id,
        req.user.userId,
        { name: req.body.name }
      );
      return res.status(200).json(board);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── DELETE /api/boards/:id ───────────────────────────────────────────────────
// Deletes a board and all related data; requires Admin role on the board.
router.delete(
  '/:id',
  authMiddleware,
  requireBoardRole('Admin'),
  async (req, res, next) => {
    try {
      await boardService.deleteBoard(req.params.id, req.user.userId);
      return res.status(200).json({ message: 'Board deleted' });
    } catch (err) {
      return next(err);
    }
  }
);

// ─── PUT /api/boards/:id/members/:memberId ────────────────────────────────────
// Changes a member's role; requires Admin role on the board.
router.put(
  '/:id/members/:memberId',
  authMiddleware,
  requireBoardRole('Admin'),
  [body('role').isIn(['Admin', 'Member']).withMessage('Role must be Admin or Member')],
  validateRequest,
  async (req, res, next) => {
    try {
      const board = await boardService.getBoardById(req.params.id);
      if (!board) return res.status(404).json({ error: 'Board not found' });

      const member = board.members.find(
        (m) => (m.userId?._id ?? m.userId).toString() === req.params.memberId
      );
      if (!member) return res.status(404).json({ error: 'Member not found' });

      member.role = req.body.role;
      board.updatedAt = new Date();
      await board.save();
      await board.populate('members.userId', 'displayName email');
      return res.status(200).json(board);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── DELETE /api/boards/:id/members/:memberId ─────────────────────────────────
// Removes a member from the board; requires Admin role.
router.delete(
  '/:id/members/:memberId',
  authMiddleware,
  requireBoardRole('Admin'),
  async (req, res, next) => {
    try {
      const board = await boardService.getBoardById(req.params.id);
      if (!board) return res.status(404).json({ error: 'Board not found' });

      board.members = board.members.filter(
        (m) => (m.userId?._id ?? m.userId).toString() !== req.params.memberId
      );
      board.updatedAt = new Date();
      await board.save();
      await board.populate('members.userId', 'displayName email');
      return res.status(200).json(board);
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
