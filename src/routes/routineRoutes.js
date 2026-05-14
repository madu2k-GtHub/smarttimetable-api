// routes/routineRoutes.js
const express = require('express');
const authMiddleware = require('../middleware/auth');
const { routineValidators, handleValidationErrors } = require('../middleware/validators');
const {
  getRoutines,
  getRoutine,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  logRoutineCompletion,
  getRoutineLogs,
  getRoutineStats
} = require('../controllers/routineController');

const router = express.Router();

/**
 * GET /api/routines/:profileId
 * Get all routines for a profile
 * Protected route - requires valid JWT token
 */
router.get(
  '/:profileId',
  authMiddleware,
  ...routineValidators.listRoutines,
  handleValidationErrors,
  getRoutines
);

/**
 * GET /api/routines/:profileId/:routineId
 * Get a single routine by ID
 * Protected route - requires valid JWT token
 */
router.get(
  '/:profileId/:routineId',
  authMiddleware,
  ...routineValidators.getSingleRoutine,
  handleValidationErrors,
  getRoutine
);

/**
 * POST /api/routines/:profileId
 * Create a new routine
 * Protected route - requires valid JWT token
 * Body: { title, description?, frequency?, time_of_day?, days_of_week?, points_value? }
 */
router.post(
  '/:profileId',
  authMiddleware,
  ...routineValidators.create,
  handleValidationErrors,
  createRoutine
);

/**
 * PUT /api/routines/:profileId/:routineId
 * Update a routine
 * Protected route - requires valid JWT token
 * Body: { title?, description?, frequency?, time_of_day?, days_of_week?, is_active?, points_value? }
 */
router.put(
  '/:profileId/:routineId',
  authMiddleware,
  ...routineValidators.update,
  handleValidationErrors,
  updateRoutine
);

/**
 * DELETE /api/routines/:profileId/:routineId
 * Delete a routine
 * Protected route - requires valid JWT token
 * Also deletes all routine logs associated with it (CASCADE)
 */
router.delete(
  '/:profileId/:routineId',
  authMiddleware,
  ...routineValidators.delete,
  handleValidationErrors,
  deleteRoutine
);

/**
 * POST /api/routines/:profileId/:routineId/complete
 * Log routine completion (mark routine as done)
 * Protected route - requires valid JWT token
 * Body: { notes? }
 */
router.post(
  '/:profileId/:routineId/complete',
  authMiddleware,
  ...routineValidators.complete,
  handleValidationErrors,
  logRoutineCompletion
);

/**
 * GET /api/routines/:profileId/:routineId/logs
 * Get routine completion logs
 * Protected route - requires valid JWT token
 * Query params: limit (default 50), offset (default 0)
 */
router.get(
  '/:profileId/:routineId/logs',
  authMiddleware,
  ...routineValidators.getLogs,
  handleValidationErrors,
  getRoutineLogs
);

/**
 * GET /api/routines/:profileId/:routineId/stats
 * Get routine completion statistics
 * Protected route - requires valid JWT token
 */
router.get(
  '/:profileId/:routineId/stats',
  authMiddleware,
  ...routineValidators.getStats,
  handleValidationErrors,
  getRoutineStats
);

module.exports = router;
