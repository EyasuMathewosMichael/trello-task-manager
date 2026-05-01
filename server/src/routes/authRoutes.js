// Feature: trello-task-manager, Auth Routes
import { Router } from 'express';
import { body } from 'express-validator';
import authService from '../services/authService.js';
import validateRequest from '../middleware/validateRequest.js';

const router = Router();

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('displayName')
      .isString()
      .trim()
      .isLength({ min: 1 })
      .withMessage('Display name must be at least 1 character'),
    body('password')
      .isString()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { email, displayName, password } = req.body;
      const user = await authService.register(email, displayName, password);

      // Return user without passwordHash
      const userObj = user.toObject();
      delete userObj.passwordHash;

      return res.status(201).json(userObj);
    } catch (err) {
      return next(err);
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const { accessToken, refreshToken, user } = await authService.login(email, password);

      // Return user without passwordHash
      const userObj = user.toObject();
      delete userObj.passwordHash;

      return res.status(200).json({ accessToken, refreshToken, user: userObj });
    } catch (err) {
      return next(err);
    }
  }
);

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post(
  '/refresh',
  [
    body('refreshToken').isString().notEmpty().withMessage('Refresh token is required'),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshTokens(refreshToken);
      return res.status(200).json(tokens);
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
