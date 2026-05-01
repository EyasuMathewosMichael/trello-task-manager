// Feature: trello-task-manager, Activity Log Routes
import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import requireBoardRole from '../middleware/roleMiddleware.js';
import activityLogService from '../services/activityLogService.js';

const router = Router();

// ─── GET /api/boards/:id/activity ─────────────────────────────────────────────
// Returns paginated activity log entries for a board in descending chronological order.
// Requires at least Member role on the board.
router.get(
  '/:id/activity',
  authMiddleware,
  requireBoardRole('Member'),
  async (req, res, next) => {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const result = await activityLogService.getActivityLog(req.params.id, page);
      return res.status(200).json(result);
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
