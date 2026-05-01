// Feature: trello-task-manager, Board Service
import Board from '../models/Board.js';
import List from '../models/List.js';
import Task from '../models/Task.js';
import Comment from '../models/Comment.js';
import ActivityLog from '../models/ActivityLog.js';
import Invitation from '../models/Invitation.js';
import activityLogService from './activityLogService.js';

/**
 * Creates a new board, assigns the creator as Admin, and logs the event.
 *
 * @param {string|ObjectId} userId - The ID of the user creating the board
 * @param {string}          name   - The board name
 * @returns {Promise<Board>}
 */
async function createBoard(userId, name) {
  const board = await Board.create({
    name,
    createdBy: userId,
    members: [{ userId, role: 'Admin' }],
  });

  await activityLogService.logActivity(
    board._id,
    userId,
    'board:created',
    board._id,
    'Board'
  );

  return board;
}

/**
 * Returns a single board by ID.
 *
 * @param {string|ObjectId} boardId
 * @returns {Promise<Board|null>}
 */
async function getBoardById(boardId) {
  return Board.findById(boardId).populate('members.userId', 'displayName email');
}

/**
 * Returns all boards where the given user has a membership record.
 *
 * @param {string|ObjectId} userId
 * @returns {Promise<Board[]>}
 */
async function listBoards(userId) {
  return Board.find({ 'members.userId': userId });
}

/**
 * Updates the board name and logs the rename event.
 * Only the `name` field is allowed to be patched.
 *
 * @param {string|ObjectId} boardId
 * @param {string|ObjectId} userId
 * @param {{ name: string }} patch
 * @returns {Promise<Board>}
 */
async function updateBoard(boardId, userId, patch) {
  const board = await Board.findById(boardId);

  if (!board) {
    const err = new Error('Board not found');
    err.status = 404;
    throw err;
  }

  const oldName = board.name;
  const newName = patch.name;

  board.name = newName;
  board.updatedAt = new Date();
  await board.save();

  await activityLogService.logActivity(
    boardId,
    userId,
    'board:renamed',
    boardId,
    'Board',
    { oldName, newName }
  );

  return board;
}

/**
 * Deletes a board and cascades the deletion to all related documents.
 * Deletion order: Comments → Tasks → Lists → ActivityLog → Invitations → Board
 *
 * @param {string|ObjectId} boardId
 * @param {string|ObjectId} userId
 * @returns {Promise<void>}
 */
async function deleteBoard(boardId, userId) {
  // Cascade: delete comments for all tasks on this board
  await Comment.deleteMany({ boardId });

  // Cascade: delete all tasks on this board
  await Task.deleteMany({ boardId });

  // Cascade: delete all lists on this board
  await List.deleteMany({ boardId });

  // Cascade: delete all activity log entries for this board
  await ActivityLog.deleteMany({ boardId });

  // Cascade: delete all invitations for this board
  await Invitation.deleteMany({ boardId });

  // Finally, delete the board itself
  await Board.findByIdAndDelete(boardId);
}

export default { getBoardById, createBoard, listBoards, updateBoard, deleteBoard };
