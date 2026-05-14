// routes/taskRoutes.js
const express = require('express');
const authMiddleware = require('../middleware/auth');
const { taskValidators, handleValidationErrors } = require('../middleware/validators');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask
} = require('../controllers/taskController');

const router = express.Router();

/**
 * GET /api/tasks/:profileId
 * Get all tasks for a profile
 * Protected route - requires valid JWT token
 */
router.get(
  '/:profileId',
  authMiddleware,
  ...taskValidators.listTasks,
  handleValidationErrors,
  getTasks
);

/**
 * GET /api/tasks/:profileId/:taskId
 * Get a single task by ID
 * Protected route - requires valid JWT token
 */
router.get(
  '/:profileId/:taskId',
  authMiddleware,
  ...taskValidators.getSingleTask,
  handleValidationErrors,
  getTask
);

/**
 * POST /api/tasks/:profileId
 * Create a new task
 * Protected route - requires valid JWT token
 * Body: { title, description?, priority?, points_value?, due_date? }
 */
router.post(
  '/:profileId',
  authMiddleware,
  ...taskValidators.create,
  handleValidationErrors,
  createTask
);

/**
 * PUT /api/tasks/:profileId/:taskId
 * Update a task
 * Protected route - requires valid JWT token
 * Body: { title?, description?, status?, priority?, points_value?, due_date? }
 */
router.put(
  '/:profileId/:taskId',
  authMiddleware,
  ...taskValidators.update,
  handleValidationErrors,
  updateTask
);

/**
 * DELETE /api/tasks/:profileId/:taskId
 * Delete a task
 * Protected route - requires valid JWT token
 */
router.delete(
  '/:profileId/:taskId',
  authMiddleware,
  ...taskValidators.delete,
  handleValidationErrors,
  deleteTask
);

/**
 * PATCH /api/tasks/:profileId/:taskId/complete
 * Mark a task as complete
 * Protected route - requires valid JWT token
 */
router.patch(
  '/:profileId/:taskId/complete',
  authMiddleware,
  ...taskValidators.complete,
  handleValidationErrors,
  completeTask
);

module.exports = router;
