// Feature: trello-task-manager, Auth Service
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User, RefreshToken } from '../models/index.js';

const BCRYPT_COST = 12;

/**
 * Creates an error with a given HTTP status code.
 * @param {string} message
 * @param {number} status
 * @returns {Error}
 */
function createError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

/**
 * Issues a JWT access token for the given user.
 * @param {{ _id: string, email: string }} user
 * @returns {string}
 */
function issueAccessToken(user) {
  const secret = process.env.JWT_SECRET;
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign({ userId: user._id, email: user.email }, secret, { expiresIn });
}

/**
 * Issues a refresh token and persists it to the database.
 * @param {string} userId
 * @returns {Promise<string>} the raw refresh token string
 */
async function issueRefreshToken(userId) {
  const token = crypto.randomUUID();
  const expiresInMs = parseExpiry(process.env.JWT_REFRESH_EXPIRES_IN || '7d');
  const expiresAt = new Date(Date.now() + expiresInMs);

  await RefreshToken.create({ userId, token, expiresAt });
  return token;
}

/**
 * Parses a duration string like '7d', '24h', '60m' into milliseconds.
 * @param {string} str
 * @returns {number}
 */
function parseExpiry(str) {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[unit];
}

/**
 * Registers a new user.
 * @param {string} email
 * @param {string} displayName
 * @param {string} password
 * @returns {Promise<import('../models/User.js').default>}
 */
async function register(email, displayName, password) {
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    throw createError('Email already in use', 409);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  const user = await User.create({ email, displayName, passwordHash });
  return user;
}

/**
 * Logs in a user and returns access + refresh tokens.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
 */
async function login(email, password) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    throw createError('Invalid credentials', 401);
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw createError('Invalid credentials', 401);
  }

  const accessToken = issueAccessToken(user);
  const refreshToken = await issueRefreshToken(user._id);

  return { accessToken, refreshToken, user };
}

/**
 * Rotates a refresh token: validates the old one, marks it used, issues new tokens.
 * @param {string} refreshToken
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
async function refreshTokens(refreshToken) {
  const tokenDoc = await RefreshToken.findOne({ token: refreshToken });
  if (!tokenDoc) {
    throw createError('Invalid refresh token', 401);
  }

  if (tokenDoc.used || tokenDoc.expiresAt <= new Date()) {
    throw createError('Invalid refresh token', 401);
  }

  // Mark old token as used (rotation)
  tokenDoc.used = true;
  await tokenDoc.save();

  const user = await User.findById(tokenDoc.userId);
  if (!user) {
    throw createError('Invalid refresh token', 401);
  }

  const newAccessToken = issueAccessToken(user);
  const newRefreshToken = await issueRefreshToken(user._id);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Revokes a refresh token by marking it as used.
 * @param {string} refreshToken
 * @returns {Promise<void>}
 */
async function revokeRefreshToken(refreshToken) {
  await RefreshToken.findOneAndUpdate({ token: refreshToken }, { used: true });
}

export default { register, login, refreshTokens, revokeRefreshToken };
