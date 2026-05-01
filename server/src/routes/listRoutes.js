// Feature: trello-task-manager, List Routes
import { Router } from 'express';
import { body, param } from 'express-validator';
import authMiddleware from '../middleware/authMiddleware.js';
import requireBoardRole from '../middleware/roleMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';
import listService from '../services/listService.js';

const router = Router({ mergeParams: true });

// ─── GET /api/boards/:id/lists ────────────────────────────────────────────────
// Returns all lists for a board in position order.
router.get(
  '/:id/lists',
  authMiddleware,
  requireBoardRole('Member'),
  async (req, res, next) => {
    try {
      const lists = await listService.getLists(req.params.id);
      return res.status(200).json(lists);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── POST /api/boards/:id/lists ───────────────────────────────────────────────
// Creates a new list on the board.
router.post(
  '/:id/lists',
  authMiddleware,
  requireBoardRole('Member'),
  [
    body('name')
      .isString()
      .trim()
      .isLength({ min: 1 })
      .withMessage('List name must be a non-empty string'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const list = await listService.createList(
        req.params.id,
        req.user.userId,
        req.body.name
      );
      return res.status(201).json(list);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── PUT /api/boards/:id/lists/reorder ────────────────────────────────────────
// Reorders a list within the board.
// IMPORTANT: This route must be defined BEFORE /:id/lists/:listId to prevent
// Express from treating "reorder" as a :listId param value.
router.put(
  '/:id/lists/reorder',
  authMiddleware,
  requireBoardRole('Member'),
  [
    body('listId')
      .isString()
      .trim()
      .isLength({ min: 1 })
      .withMessage('listId must be a non-empty string'),
    body('newIndex')
      .isInt({ min: 0 })
      .withMessage('newIndex must be a non-negative integer'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const lists = await listService.reorderList(
        req.params.id,
        req.body.listId,
        req.body.newIndex
      );
      return res.status(200).json(lists);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── PUT /api/boards/:id/lists/:listId ───────────────────────────────────────
// Renames a list.
router.put(
  '/:id/lists/:listId',
  authMiddleware,
  requireBoardRole('Member'),
  [
    body('name')
      .isString()
      .trim()
      .isLength({ min: 1 })
      .withMessage('List name must be a non-empty string'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const list = await listService.renameList(
        req.params.listId,
        req.user.userId,
        req.body.name
      );
      return res.status(200).json(list);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── DELETE /api/boards/:id/lists/:listId ─────────────────────────────────────
// Deletes a list and cascades to tasks and comments; requires Admin role.
router.delete(
  '/:id/lists/:listId',
  authMiddleware,
  requireBoardRole('Admin'),
  async (req, res, next) => {
    try {
      await listService.deleteList(req.params.listId, req.user.userId);
      return res.status(200).json({ message: 'List deleted' });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
