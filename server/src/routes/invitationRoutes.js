// Feature: trello-task-manager, Invitation Routes
import { Router } from 'express';
import { body } from 'express-validator';
import authMiddleware from '../middleware/authMiddleware.js';
import requireBoardRole from '../middleware/roleMiddleware.js';
import validateRequest from '../middleware/validateRequest.js';
import notificationService from '../services/notificationService.js';
import Invitation from '../models/Invitation.js';
import User from '../models/User.js';
import Board from '../models/Board.js';
import { emitToBoard } from '../socket/socketServer.js';

const router = Router();

// ─── POST /api/boards/:id/invite ──────────────────────────────────────────────
// Sends an invitation email to the given address. Requires Admin role on the board.
router.post(
  '/:id/invite',
  authMiddleware,
  requireBoardRole('Admin'),
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('A valid email address is required'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { inviteLink, emailSent } = await notificationService.sendInvitation(
        req.params.id,
        req.user.userId,
        req.body.email
      );

      if (emailSent) {
        return res.status(200).json({ message: 'Invitation sent' });
      } else {
        // Email failed but invitation was saved — return the link so admin can share it
        return res.status(200).json({
          message: 'Invitation created but email could not be sent. Share this link manually:',
          inviteLink,
        });
      }
    } catch (err) {
      return next(err);
    }
  }
);

// ─── GET /api/invite/:token ───────────────────────────────────────────────────
// Accepts an invitation token. No authentication required.
// If the user already exists, adds them to the board as Member and marks token used.
// If the user does not exist, returns requiresRegistration: true so the frontend
// can redirect to the registration page.
const inviteRouter = Router();

inviteRouter.get('/:token', async (req, res, next) => {
  try {
    const { token } = req.params;
    const now = new Date();

    // Optionally extract logged-in user from JWT (no hard auth requirement)
    let loggedInUserId = null;
    const authHeader = req.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(authHeader.slice(7), process.env.JWT_SECRET);
        loggedInUserId = decoded.userId;
      } catch {
        // Invalid/expired token — treat as unauthenticated
      }
    }

    // Look up the invitation
    const invitation = await Invitation.findOne({ token });

    if (!invitation || invitation.used === true) {
      return res.status(410).json({ error: 'Invitation expired or already used' });
    }

    if (invitation.expiresAt < now) {
      return res.status(410).json({ error: 'Invitation expired or already used' });
    }

    // Find user: prefer logged-in user, fall back to email match
    let user = null;
    if (loggedInUserId) {
      user = await User.findById(loggedInUserId);
    }
    if (!user) {
      user = await User.findOne({ email: invitation.email });
    }

    if (!user) {
      return res.status(200).json({
        requiresRegistration: true,
        email: invitation.email,
        token,
      });
    }

    // Add the user to the board as Member (if not already a member)
    const board = await Board.findById(invitation.boardId);

    if (!board) {
      return res.status(410).json({ error: 'Invitation expired or already used' });
    }

    const alreadyMember = board.members.some(
      (m) => m.userId.toString() === user._id.toString()
    );

    if (!alreadyMember) {
      board.members.push({ userId: user._id, role: 'Member' });
      await board.save();
    }

    // Mark the invitation as used
    invitation.used = true;
    await invitation.save();

    emitToBoard(invitation.boardId, 'member:joined', {
      userId: user._id,
      boardId: invitation.boardId,
    });

    return res.status(200).json({
      message: 'Joined board successfully',
      boardId: invitation.boardId,
    });
  } catch (err) {
    return next(err);
  }
});

export { inviteRouter };
export default router;
