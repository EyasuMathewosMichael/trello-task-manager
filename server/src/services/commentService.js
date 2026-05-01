// Feature: trello-task-manager, Comment Service
import Comment from '../models/Comment.js';
import Task from '../models/Task.js';
import activityLogService from './activityLogService.js';
import { emitToBoard } from '../socket/socketServer.js';

/**
 * Adds a comment to a task.
 * Logs activity and emits a Socket.io event to the board room.
 *
 * @param {string|ObjectId} taskId  - The task to comment on
 * @param {string|ObjectId} userId  - The user adding the comment (becomes authorId)
 * @param {string}          text    - The comment text
 * @returns {Promise<Comment>}
 */
async function getComments(taskId) {
  return Comment.find({ taskId })
    .sort({ createdAt: 1 })
    .populate('authorId', 'displayName email');
}

async function addComment(taskId, userId, text) {
  const task = await Task.findById(taskId).lean();
  if (!task) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }

  const boardId = task.boardId;

  const comment = await Comment.create({
    taskId,
    boardId,
    authorId: userId,
    text,
    createdAt: new Date(),
  });

  // Populate author before emitting/returning
  await comment.populate('authorId', 'displayName email');

  await activityLogService.logActivity(boardId, userId, 'comment:added', comment._id, 'Comment');

  try {
    emitToBoard(boardId, 'comment:added', comment);
  } catch (emitErr) {
    console.error('Socket emit error (comment:added):', emitErr);
  }

  return comment;
}

/**
 * Deletes a comment. Only the comment's author may delete it.
 * Throws a 403 error if the requesting user is not the author.
 *
 * @param {string|ObjectId} commentId - The comment to delete
 * @param {string|ObjectId} userId    - The user requesting deletion
 * @returns {Promise<void>}
 */
async function deleteComment(commentId, userId) {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    const err = new Error('Comment not found');
    err.status = 404;
    throw err;
  }

  if (comment.authorId.toString() !== userId.toString()) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  await Comment.findByIdAndDelete(commentId);
}

async function editComment(commentId, userId, text) {
  const comment = await Comment.findById(commentId);
  if (!comment) {
    const err = new Error('Comment not found');
    err.status = 404;
    throw err;
  }

  if (comment.authorId.toString() !== userId.toString()) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  comment.text = text;
  await comment.save();
  await comment.populate('authorId', 'displayName email');
  return comment;
}

export default { addComment, getComments, deleteComment, editComment };
