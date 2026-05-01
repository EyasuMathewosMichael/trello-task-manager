// Feature: trello-task-manager, JWT Auth Middleware
import jwt from 'jsonwebtoken';

/**
 * Express middleware that validates a Bearer JWT from the Authorization header.
 * On success, attaches `req.user = { userId, email }` and calls next().
 * On failure, returns 401 with an appropriate error message.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const secret = process.env.JWT_SECRET;
    const decoded = jwt.verify(token, secret);
    req.user = { userId: decoded.userId, email: decoded.email };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

export default authMiddleware;
