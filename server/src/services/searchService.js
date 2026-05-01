// Feature: trello-task-manager, Search Service
import Board from '../models/Board.js';
import Task from '../models/Task.js';

/**
 * Searches tasks accessible to the given user, applying optional full-text
 * search and/or filter criteria.
 *
 * All filter conditions are combined with AND logic (single query object).
 * Results are scoped to boards where the user has a membership record.
 *
 * @param {string|ObjectId} userId
 * @param {string} [query]   - Optional full-text search string (title + description)
 * @param {object} [filters] - Optional filter object
 * @param {string} [filters.priority]      - 'Low' | 'Medium' | 'High'
 * @param {Date}   [filters.dueDateStart]  - Inclusive lower bound for dueDate
 * @param {Date}   [filters.dueDateEnd]    - Inclusive upper bound for dueDate
 * @param {string} [filters.assigneeId]    - ObjectId string of an assignee
 * @returns {Promise<Task[]>}
 */
async function search(userId, query, filters = {}) {
  // ── Scope to boards the user is a member of ──────────────────────────────────
  const boards = await Board.find({ 'members.userId': userId }).lean();
  const boardIds = boards.map((b) => b._id);

  if (boardIds.length === 0) {
    return [];
  }

  // ── Build query object ───────────────────────────────────────────────────────
  const queryObj = {
    boardId: { $in: boardIds },
  };

  // Full-text search on title + description (uses the text index)
  if (query && query.trim().length > 0) {
    queryObj.$text = { $search: query.trim() };
  }

  // Priority filter
  if (filters.priority) {
    queryObj.priority = filters.priority;
  }

  // Due date range filter
  if (filters.dueDateStart || filters.dueDateEnd) {
    queryObj.dueDate = {};
    if (filters.dueDateStart) {
      queryObj.dueDate.$gte = filters.dueDateStart;
    }
    if (filters.dueDateEnd) {
      queryObj.dueDate.$lte = filters.dueDateEnd;
    }
  }

  // Assignee filter
  if (filters.assigneeId) {
    queryObj.assignees = filters.assigneeId;
  }

  // ── Execute query ────────────────────────────────────────────────────────────
  const tasks = await Task.find(queryObj);
  return tasks;
}

export default { search };
