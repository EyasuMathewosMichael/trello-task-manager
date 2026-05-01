// Feature: trello-task-manager, Dashboard Service
import Board from '../models/Board.js';
import Task from '../models/Task.js';
import * as redisClient from '../cache/redisClient.js';

const CACHE_TTL = 300; // 5 minutes in seconds

/**
 * Returns dashboard metrics for the given user.
 * Results are cached in Redis under `dashboard:user:{userId}` for 5 minutes.
 *
 * Metrics shape:
 * {
 *   boards: [
 *     {
 *       boardId, boardName,
 *       totalTasks, completedTasks, overdueTasks, myTasks,
 *       priorityBreakdown: { Low, Medium, High }
 *     }
 *   ],
 *   weeklyTrend: [ { week: 'YYYY-WW', count: N }, ... ]  // 12 entries
 * }
 *
 * @param {string|ObjectId} userId
 * @returns {Promise<object>} DashboardMetrics
 */
async function getMetrics(userId) {
  const cacheKey = `dashboard:user:${userId}`;

  // ── Cache check ──────────────────────────────────────────────────────────────
  const cached = await redisClient.get(cacheKey);
  if (cached !== null) {
    return cached;
  }

  // ── Find all boards the user is a member of ──────────────────────────────────
  const boards = await Board.find({ 'members.userId': userId }).lean();
  const boardIds = boards.map((b) => b._id);

  // ── Per-board aggregation ────────────────────────────────────────────────────
  const boardMetrics = await Promise.all(
    boards.map(async (board) => {
      const [totalTasks, completedTasks, overdueTasks, myTasks] = await Promise.all([
        Task.countDocuments({ boardId: board._id }),
        Task.countDocuments({ boardId: board._id, isComplete: true }),
        Task.countDocuments({ boardId: board._id, isOverdue: true }),
        Task.countDocuments({ boardId: board._id, assignees: userId }),
      ]);

      // Priority breakdown for this board
      const priorityAgg = await Task.aggregate([
        { $match: { boardId: board._id } },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]);

      const priorityBreakdown = { Low: 0, Medium: 0, High: 0 };
      for (const entry of priorityAgg) {
        if (entry._id in priorityBreakdown) {
          priorityBreakdown[entry._id] = entry.count;
        }
      }

      return {
        boardId: board._id,
        boardName: board.name,
        totalTasks,
        completedTasks,
        overdueTasks,
        myTasks,
        priorityBreakdown,
      };
    })
  );

  // ── Weekly completion trend (past 12 calendar weeks) ─────────────────────────
  const twelveWeeksAgo = new Date();
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7);

  const weeklyAgg = await Task.aggregate([
    {
      $match: {
        boardId: { $in: boardIds },
        isComplete: true,
        updatedAt: { $gte: twelveWeeksAgo },
      },
    },
    {
      $group: {
        _id: {
          year: { $isoWeekYear: '$updatedAt' },
          week: { $isoWeek: '$updatedAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': 1, '_id.week': 1 } },
  ]);

  // Build a map of all 12 weeks (including weeks with zero completions)
  const weeklyMap = new Map();
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i * 7);
    const year = getISOWeekYear(d);
    const week = getISOWeek(d);
    const key = `${year}-W${String(week).padStart(2, '0')}`;
    weeklyMap.set(key, 0);
  }

  for (const entry of weeklyAgg) {
    const key = `${entry._id.year}-W${String(entry._id.week).padStart(2, '0')}`;
    if (weeklyMap.has(key)) {
      weeklyMap.set(key, entry.count);
    }
  }

  const weeklyTrend = Array.from(weeklyMap.entries()).map(([week, count]) => ({
    week,
    count,
  }));

  // ── Assemble result ──────────────────────────────────────────────────────────
  const metrics = {
    boards: boardMetrics,
    weeklyTrend,
  };

  // ── Store in cache ───────────────────────────────────────────────────────────
  await redisClient.set(cacheKey, metrics, CACHE_TTL);

  return metrics;
}

/**
 * Invalidates the dashboard cache for all members of the given board.
 * Called whenever a task changes on a board (e.g. isComplete changes).
 *
 * @param {string|ObjectId} boardId
 * @returns {Promise<void>}
 */
async function invalidateCache(boardId) {
  try {
    const board = await Board.findById(boardId).lean();
    if (!board) return;

    await Promise.all(
      board.members.map((member) =>
        redisClient.del(`dashboard:user:${member.userId}`)
      )
    );
  } catch (err) {
    // Cache invalidation errors must not surface to callers
    console.error('Dashboard cache invalidation error:', err.message);
  }
}

// ── ISO week helpers (avoids external dependency) ────────────────────────────

/**
 * Returns the ISO week number (1–53) for a given date.
 * @param {Date} date
 * @returns {number}
 */
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // Mon=1 … Sun=7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/**
 * Returns the ISO week-year for a given date (may differ from calendar year
 * for dates in the first/last week of the year).
 * @param {Date} date
 * @returns {number}
 */
function getISOWeekYear(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  return d.getUTCFullYear();
}

export default { getMetrics, invalidateCache };
