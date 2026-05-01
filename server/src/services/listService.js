// Feature: trello-task-manager, List Service
import List from '../models/List.js';
import Task from '../models/Task.js';
import Comment from '../models/Comment.js';
import activityLogService from './activityLogService.js';

/**
 * Creates a new list at the end of the board's list order.
 * Position is set to maxPosition + 1 (or 1 if no lists exist yet).
 *
 * @param {string|ObjectId} boardId - The board to add the list to
 * @param {string|ObjectId} userId  - The user creating the list
 * @param {string}          name    - The list name
 * @returns {Promise<List>}
 */
async function createList(boardId, userId, name) {
  // Find the current max position among lists in this board
  const lastList = await List.findOne({ boardId }).sort({ position: -1 }).lean();
  const maxPosition = lastList ? lastList.position : 0;

  const list = await List.create({
    boardId,
    name,
    position: maxPosition + 1,
  });

  await activityLogService.logActivity(
    boardId,
    userId,
    'list:created',
    list._id,
    'List'
  );

  return list;
}

/**
 * Returns all lists for a board sorted by position ascending.
 *
 * @param {string|ObjectId} boardId
 * @returns {Promise<List[]>}
 */
async function getLists(boardId) {
  return List.find({ boardId }).sort({ position: 1 });
}

/**
 * Reorders a list within a board.
 * Removes the target list from its current position, inserts it at newIndex (0-based),
 * then reassigns contiguous integer positions starting from 1.
 *
 * @param {string|ObjectId} boardId  - The board containing the lists
 * @param {string|ObjectId} listId   - The list to reorder
 * @param {number}          newIndex - The 0-based target index
 * @returns {Promise<List[]>} The updated lists array
 */
async function reorderList(boardId, listId, newIndex) {
  // Fetch all lists for the board sorted by position
  const lists = await List.find({ boardId }).sort({ position: 1 });

  // Find the index of the target list
  const currentIndex = lists.findIndex(
    (l) => l._id.toString() === listId.toString()
  );

  if (currentIndex === -1) {
    const err = new Error('List not found');
    err.status = 404;
    throw err;
  }

  // Remove the target list from its current position
  const [targetList] = lists.splice(currentIndex, 1);

  // Clamp newIndex to valid range
  const clampedIndex = Math.max(0, Math.min(newIndex, lists.length));

  // Insert it at newIndex
  lists.splice(clampedIndex, 0, targetList);

  // Reassign positions as contiguous integers starting from 1
  const savePromises = lists.map((list, idx) => {
    list.position = idx + 1;
    list.updatedAt = new Date();
    return list.save();
  });

  const updatedLists = await Promise.all(savePromises);

  await activityLogService.logActivity(
    boardId,
    targetList._id.toString() === listId.toString()
      ? targetList.boardId
      : boardId,
    'list:reordered',
    listId,
    'List'
  );

  return updatedLists;
}

/**
 * Renames a list and logs the activity.
 *
 * @param {string|ObjectId} listId - The list to rename
 * @param {string|ObjectId} userId - The user performing the rename
 * @param {string}          name   - The new name
 * @returns {Promise<List>}
 */
async function renameList(listId, userId, name) {
  const list = await List.findById(listId);

  if (!list) {
    const err = new Error('List not found');
    err.status = 404;
    throw err;
  }

  const oldName = list.name;
  const newName = name;

  list.name = newName;
  list.updatedAt = new Date();
  await list.save();

  await activityLogService.logActivity(
    list.boardId,
    userId,
    'list:renamed',
    listId,
    'List',
    { oldName, newName }
  );

  return list;
}

/**
 * Deletes a list and cascades the deletion to all tasks and their comments.
 * Deletion order: Comments (for tasks in list) → Tasks → List
 *
 * @param {string|ObjectId} listId - The list to delete
 * @param {string|ObjectId} userId - The user performing the deletion
 * @returns {Promise<void>}
 */
async function deleteList(listId, userId) {
  const list = await List.findById(listId);

  if (!list) {
    const err = new Error('List not found');
    err.status = 404;
    throw err;
  }

  const boardId = list.boardId;

  // Find all tasks in this list to get their IDs for comment deletion
  const tasks = await Task.find({ listId }).lean();
  const taskIds = tasks.map((t) => t._id);

  // Delete all comments where taskId is in tasks belonging to this list
  if (taskIds.length > 0) {
    await Comment.deleteMany({ taskId: { $in: taskIds } });
  }

  // Delete all tasks where listId === listId
  await Task.deleteMany({ listId });

  // Delete the list itself
  await List.findByIdAndDelete(listId);

  await activityLogService.logActivity(
    boardId,
    userId,
    'list:deleted',
    listId,
    'List'
  );
}

export default { createList, getLists, reorderList, renameList, deleteList };
