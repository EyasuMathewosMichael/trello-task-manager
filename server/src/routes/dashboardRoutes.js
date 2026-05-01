// Feature: trello-task-manager, Dashboard Routes
import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import dashboardService from '../services/dashboardService.js';

const router = Router();

/**
 * GET /api/dashboard
 * Returns aggregated dashboard metrics for the authenticated user.
 * Results are served from Redis cache when available (5 min TTL).
 */
router.get('/dashboard', authMiddleware, async (req, res, next) => {
  try {
    const metrics = await dashboardService.getMetrics(req.user.userId);
    return res.status(200).json(metrics);
  } catch (err) {
    return next(err);
  }
});

export default router;
