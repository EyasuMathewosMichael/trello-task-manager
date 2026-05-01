// Feature: trello-task-manager, Role-Based Access Control Middleware
import Board from '../models/Board.js';

/**
 * Role hierarchy: Admin > Member
 * Admin can do everything Member can, plus admin-only actions.
 */
const ROLE_HIERARCHY = {
  Member: 1,
  Admin: 2,
};

/**
 * Factory function that returns Express middleware enforcing a minimum board role.
 *
 * Usage:
 *   router.put('/boards/:id', authMiddleware, requireBoardRole('Admin'), handler);
 *   router.get('/boards/:id/lists', authMiddleware, requireBoardRole('Member'), handler);
 *
 * Prerequisites:
 *   - Must be used AFTER authMiddleware (which sets req.user.userId)
 *   - boardId must be available as req.params.id or req.params.boardId
 *
 * On success: attaches req.boardRole = userRole and calls next()
 * On failure: returns 403 { error: 'Forbidden' }
 *
 * @param {string} minRole - Minimum required role: 'Member' or 'Admin'
 * @returns {Function} Express middleware
 */
function requireBoardRole(minRole) {
  return async function roleMiddleware(req, res, next) {
    try {
      // Extract boardId from params — try both :id and :boardId
      const boardId = req.params.id || req.params.boardId;

      if (!boardId) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const userId = req.user.userId;

      // Look up the board and find the requesting user's membership entry
      const board = await Board.findById(boardId).lean();

      if (!board) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const memberEntry = board.members.find(
        (m) => m.userId.toString() === userId.toString()
      );

      if (!memberEntry) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const userRole = memberEntry.role;
      const userLevel = ROLE_HIERARCHY[userRole] ?? 0;
      const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0;

      if (userLevel < requiredLevel) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Attach the resolved role for downstream handlers
      req.boardRole = userRole;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export default requireBoardRole;
