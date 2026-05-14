const { pool } = require('../config/db');

/**
 * Get all tasks for a profile
 * GET /api/tasks/:profileId
 */
const getTasks = async (req, res) => {
  try {
    const { profileId } = req.params;

    const result = await pool.query(
      `SELECT id, title, description, status, priority, points_value, due_date, completed_at, created_at, updated_at
       FROM tasks
       WHERE profile_id = $1
       ORDER BY created_at DESC`,
      [profileId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      tasks: result.rows
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks'
    });
  }
};

/**
 * Get single task by ID
 * GET /api/tasks/:profileId/:taskId
 */
const getTask = async (req, res) => {
  try {
    const { profileId, taskId } = req.params;

    const result = await pool.query(
      `SELECT * FROM tasks WHERE id = $1 AND profile_id = $2`,
      [taskId, profileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task'
    });
  }
};

/**
 * Create new task
 * POST /api/tasks/:profileId
 * Body: { title, description?, priority?, points_value?, due_date? }
 */
const createTask = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { title, description, priority = 0, points_value = 10, due_date } = req.body;

    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Task title is required'
      });
    }

    if (title.length > 255) {
      return res.status(400).json({
        success: false,
        error: 'Task title must be less than 255 characters'
      });
    }

    const result = await pool.query(
      `INSERT INTO tasks (profile_id, title, description, priority, points_value, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING id, title, description, status, priority, points_value, due_date, created_at`,
      [profileId, title.trim(), description || null, priority, points_value, due_date || null]
    );

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task'
    });
  }
};

/**
 * Update task
 * PUT /api/tasks/:profileId/:taskId
 * Body: { title?, description?, status?, priority?, points_value?, due_date? }
 */
const updateTask = async (req, res) => {
  try {
    const { profileId, taskId } = req.params;
    const { title, description, status, priority, points_value, due_date } = req.body;

    // Validate task exists
    const existing = await pool.query(
      'SELECT id FROM tasks WHERE id = $1 AND profile_id = $2',
      [taskId, profileId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      if (title.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Task title cannot be empty'
        });
      }
      updates.push(`title = $${paramCount++}`);
      values.push(title.trim());
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description || null);
    }

    if (status !== undefined) {
      const validStatuses = ['pending', 'in_progress', 'completed'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: `Status must be one of: ${validStatuses.join(', ')}`
        });
      }
      updates.push(`status = $${paramCount++}`);
      values.push(status);

      // If completing task, set completed_at timestamp
      if (status === 'completed') {
        updates.push(`completed_at = $${paramCount++}`);
        values.push(new Date());
      }
    }

    if (priority !== undefined) {
      updates.push(`priority = $${paramCount++}`);
      values.push(priority);
    }

    if (points_value !== undefined) {
      updates.push(`points_value = $${paramCount++}`);
      values.push(points_value);
    }

    if (due_date !== undefined) {
      updates.push(`due_date = $${paramCount++}`);
      values.push(due_date || null);
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    values.push(taskId);
    values.push(profileId);

    const query = `UPDATE tasks
                   SET ${updates.join(', ')}
                   WHERE id = $${paramCount + 1} AND profile_id = $${paramCount + 2}
                   RETURNING id, title, description, status, priority, points_value, due_date, completed_at, updated_at`;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task'
    });
  }
};

/**
 * Delete task
 * DELETE /api/tasks/:profileId/:taskId
 */
const deleteTask = async (req, res) => {
  try {
    const { profileId, taskId } = req.params;

    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND profile_id = $2 RETURNING id, title',
      [taskId, profileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully',
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task'
    });
  }
};

/**
 * Complete task (mark as complete and set completion date)
 * PATCH /api/tasks/:profileId/:taskId/complete
 */
const completeTask = async (req, res) => {
  try {
    const { profileId, taskId } = req.params;

    const result = await pool.query(
      `UPDATE tasks
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND profile_id = $2
       RETURNING id, title, status, completed_at`,
      [taskId, profileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task marked as complete',
      task: result.rows[0]
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete task'
    });
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask
};
