// Feature: trello-task-manager, Activity Log Service
import ActivityLog from '../models/ActivityLog.js';

const PAGE_SIZE = 50;

/**
 * Logs an activity event to the ActivityLog collection.
 *
 * @param {string|ObjectId} boardId    - The board this activity belongs to
 * @param {string|ObjectId} userId     - The user who performed the action
 * @param {string}          action     - Action string, e.g. 'board:created', 'task:moved'
 * @param {string|ObjectId} entityId   - The ID of the affected entity
 * @param {string}          entityType - Entity type: 'Board' | 'List' | 'Task' | 'Comment' | 'Member'
 * @param {object}          [meta]     - Optional additional context (old name, new name, etc.)
 * @returns {Promise<ActivityLog>}
 */
async function logActivity(boardId, userId, action, entityId, entityType, meta) {
  return ActivityLog.create({
    boardId,
    userId,
    action,
    entityId,
    entityType,
    meta: meta || null,
  });
}

/**
 * Returns paginated activity log entries for a board in descending chronological order.
 *
 * @param {string|ObjectId} boardId - The board to fetch activity for
 * @param {number}          [page=1] - 1-based page number
 * @returns {Promise<{ entries: ActivityLog[], total: number, page: number, totalPages: number }>}
 */
async function getActivityLog(boardId, page = 1) {
  const skip = (page - 1) * PAGE_SIZE;

  const [entries, total] = await Promise.all([
    ActivityLog.find({ boardId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(PAGE_SIZE),
    ActivityLog.countDocuments({ boardId }),
  ]);

  return {
    entries,
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

export default { logActivity, getActivityLog };
