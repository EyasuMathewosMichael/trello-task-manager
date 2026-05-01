// Feature: trello-task-manager, Search Routes
import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import searchService from '../services/searchService.js';

const router = Router();

/**
 * GET /api/search
 * Searches tasks accessible to the authenticated user.
 *
 * Query parameters:
 *   q            {string}  - Full-text search string (title + description)
 *   priority     {string}  - 'Low' | 'Medium' | 'High'
 *   dueDateStart {string}  - ISO 8601 date string (inclusive lower bound)
 *   dueDateEnd   {string}  - ISO 8601 date string (inclusive upper bound)
 *   assigneeId   {string}  - ObjectId of an assignee
 */
router.get('/search', authMiddleware, async (req, res, next) => {
  try {
    const { q, priority, dueDateStart, dueDateEnd, assigneeId } = req.query;

    // Build filters object — only include defined, non-empty values
    const filters = {};

    if (priority) {
      filters.priority = priority;
    }

    if (dueDateStart) {
      const parsed = new Date(dueDateStart);
      if (!isNaN(parsed.getTime())) {
        filters.dueDateStart = parsed;
      }
    }

    if (dueDateEnd) {
      const parsed = new Date(dueDateEnd);
      if (!isNaN(parsed.getTime())) {
        filters.dueDateEnd = parsed;
      }
    }

    if (assigneeId) {
      filters.assigneeId = assigneeId;
    }

    const tasks = await searchService.search(req.user.userId, q || '', filters);
    return res.status(200).json(tasks);
  } catch (err) {
    return next(err);
  }
});

export default router;
