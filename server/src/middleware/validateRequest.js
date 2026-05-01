// Feature: trello-task-manager, Request Validation Middleware
import { validationResult } from 'express-validator';

/**
 * Express middleware that checks express-validator results.
 * Returns 400 with error details if validation failed; otherwise calls next().
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  return next();
}

export default validateRequest;
