const { pool } = require('../config/db');

/**
 * Get all routines for a profile
 * GET /api/routines/:profileId
 */
const getRoutines = async (req, res) => {
  try {
    const { profileId } = req.params;

    const result = await pool.query(
      `SELECT id, title, description, frequency, time_of_day, days_of_week,
              is_active, points_value, created_at, updated_at
       FROM routines
       WHERE profile_id = $1
       ORDER BY time_of_day ASC, created_at DESC`,
      [profileId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      routines: result.rows
    });
  } catch (error) {
    console.error('Error fetching routines:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch routines'
    });
  }
};

/**
 * Get single routine by ID
 * GET /api/routines/:profileId/:routineId
 */
const getRoutine = async (req, res) => {
  try {
    const { profileId, routineId } = req.params;

    const result = await pool.query(
      `SELECT * FROM routines WHERE id = $1 AND profile_id = $2`,
      [routineId, profileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Routine not found'
      });
    }

    res.json({
      success: true,
      routine: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching routine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch routine'
    });
  }
};

/**
 * Create new routine
 * POST /api/routines/:profileId
 * Body: { title, description?, frequency?, time_of_day?, days_of_week?, points_value? }
 */
const createRoutine = async (req, res) => {
  try {
    const { profileId } = req.params;
    const {
      title,
      description,
      frequency = 'daily',
      time_of_day,
      days_of_week = [1, 2, 3, 4, 5], // Default: weekdays
      points_value = 5
    } = req.body;

    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Routine title is required'
      });
    }

    if (title.length > 255) {
      return res.status(400).json({
        success: false,
        error: 'Routine title must be less than 255 characters'
      });
    }

    // Validate frequency
    const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'custom'];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({
        success: false,
        error: `Frequency must be one of: ${validFrequencies.join(', ')}`
      });
    }

    // Validate days_of_week
    if (Array.isArray(days_of_week)) {
      const validDays = days_of_week.every(day => day >= 1 && day <= 7 && Number.isInteger(day));
      if (!validDays || days_of_week.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Days of week must be array of integers 1-7 (1=Monday, 7=Sunday)'
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO routines (profile_id, title, description, frequency, time_of_day, days_of_week, points_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, frequency, time_of_day, days_of_week, is_active, points_value, created_at`,
      [profileId, title.trim(), description || null, frequency, time_of_day || null, days_of_week, points_value]
    );

    res.status(201).json({
      success: true,
      message: 'Routine created successfully',
      routine: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating routine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create routine'
    });
  }
};

/**
 * Update routine
 * PUT /api/routines/:profileId/:routineId
 * Body: { title?, description?, frequency?, time_of_day?, days_of_week?, is_active?, points_value? }
 */
const updateRoutine = async (req, res) => {
  try {
    const { profileId, routineId } = req.params;
    const { title, description, frequency, time_of_day, days_of_week, is_active, points_value } = req.body;

    // Validate routine exists
    const existing = await pool.query(
      'SELECT id FROM routines WHERE id = $1 AND profile_id = $2',
      [routineId, profileId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Routine not found'
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
          error: 'Routine title cannot be empty'
        });
      }
      updates.push(`title = $${paramCount++}`);
      values.push(title.trim());
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description || null);
    }

    if (frequency !== undefined) {
      const validFrequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'custom'];
      if (!validFrequencies.includes(frequency)) {
        return res.status(400).json({
          success: false,
          error: `Frequency must be one of: ${validFrequencies.join(', ')}`
        });
      }
      updates.push(`frequency = $${paramCount++}`);
      values.push(frequency);
    }

    if (time_of_day !== undefined) {
      updates.push(`time_of_day = $${paramCount++}`);
      values.push(time_of_day || null);
    }

    if (days_of_week !== undefined) {
      if (Array.isArray(days_of_week) && days_of_week.length > 0) {
        const validDays = days_of_week.every(day => day >= 1 && day <= 7 && Number.isInteger(day));
        if (!validDays) {
          return res.status(400).json({
            success: false,
            error: 'Days of week must be array of integers 1-7'
          });
        }
      }
      updates.push(`days_of_week = $${paramCount++}`);
      values.push(days_of_week || null);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(Boolean(is_active));
    }

    if (points_value !== undefined) {
      if (points_value < 0) {
        return res.status(400).json({
          success: false,
          error: 'Points value must be non-negative'
        });
      }
      updates.push(`points_value = $${paramCount++}`);
      values.push(points_value);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updates.push(`updated_at = $${paramCount++}`);
    values.push(new Date());

    values.push(routineId);
    values.push(profileId);

    const query = `UPDATE routines
                   SET ${updates.join(', ')}
                   WHERE id = $${paramCount + 1} AND profile_id = $${paramCount + 2}
                   RETURNING id, title, description, frequency, time_of_day, days_of_week, is_active, points_value, updated_at`;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Routine updated successfully',
      routine: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating routine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update routine'
    });
  }
};

/**
 * Delete routine
 * DELETE /api/routines/:profileId/:routineId
 * Also deletes all routine logs associated with it
 */
const deleteRoutine = async (req, res) => {
  try {
    const { profileId, routineId } = req.params;

    const result = await pool.query(
      'DELETE FROM routines WHERE id = $1 AND profile_id = $2 RETURNING id, title',
      [routineId, profileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Routine not found'
      });
    }

    res.json({
      success: true,
      message: 'Routine deleted successfully',
      routine: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting routine:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete routine'
    });
  }
};

/**
 * Log routine completion (mark routine as done)
 * POST /api/routines/:profileId/:routineId/complete
 * Body: { notes? }
 */
const logRoutineCompletion = async (req, res) => {
  try {
    const { profileId, routineId } = req.params;
    const { notes } = req.body;

    // Verify routine exists
    const routineCheck = await pool.query(
      'SELECT id, points_value FROM routines WHERE id = $1 AND profile_id = $2',
      [routineId, profileId]
    );

    if (routineCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Routine not found'
      });
    }

    const routine = routineCheck.rows[0];

    // Log the completion
    const logResult = await pool.query(
      `INSERT INTO routine_logs (routine_id, profile_id, notes)
       VALUES ($1, $2, $3)
       RETURNING id, routine_id, completed_at, notes`,
      [routineId, profileId, notes || null]
    );

    // Update user_stats to increment routines_completed
    await pool.query(
      `UPDATE user_stats
       SET routines_completed = routines_completed + 1,
           total_points = total_points + $1,
           updated_at = NOW()
       WHERE profile_id = $2`,
      [routine.points_value, profileId]
    );

    res.status(201).json({
      success: true,
      message: 'Routine completion logged',
      log: {
        ...logResult.rows[0],
        points_awarded: routine.points_value
      }
    });
  } catch (error) {
    console.error('Error logging routine completion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log routine completion'
    });
  }
};

/**
 * Get routine completion logs
 * GET /api/routines/:profileId/:routineId/logs
 * Returns all times this routine was completed
 */
const getRoutineLogs = async (req, res) => {
  try {
    const { profileId, routineId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify routine exists
    const routineCheck = await pool.query(
      'SELECT id FROM routines WHERE id = $1 AND profile_id = $2',
      [routineId, profileId]
    );

    if (routineCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Routine not found'
      });
    }

    // Get logs
    const result = await pool.query(
      `SELECT id, routine_id, completed_at, notes
       FROM routine_logs
       WHERE routine_id = $1 AND profile_id = $2
       ORDER BY completed_at DESC
       LIMIT $3 OFFSET $4`,
      [routineId, profileId, parseInt(limit), parseInt(offset)]
    );

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) as total FROM routine_logs WHERE routine_id = $1 AND profile_id = $2',
      [routineId, profileId]
    );

    res.json({
      success: true,
      count: result.rows.length,
      total: parseInt(countResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset),
      logs: result.rows
    });
  } catch (error) {
    console.error('Error fetching routine logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch routine logs'
    });
  }
};

/**
 * Get routine statistics (completion rate, streak, etc)
 * GET /api/routines/:profileId/:routineId/stats
 */
const getRoutineStats = async (req, res) => {
  try {
    const { profileId, routineId } = req.params;

    // Verify routine exists
    const routineCheck = await pool.query(
      'SELECT id FROM routines WHERE id = $1 AND profile_id = $2',
      [routineId, profileId]
    );

    if (routineCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Routine not found'
      });
    }

    // Get completion stats
    const statsResult = await pool.query(
      `SELECT
         COUNT(*) as total_completions,
         DATE(MAX(completed_at)) as last_completion_date,
         COUNT(DISTINCT DATE(completed_at)) as unique_days_completed
       FROM routine_logs
       WHERE routine_id = $1 AND profile_id = $2`,
      [routineId, profileId]
    );

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      stats: {
        totalCompletions: parseInt(stats.total_completions),
        lastCompletionDate: stats.last_completion_date,
        uniqueDaysCompleted: parseInt(stats.unique_days_completed),
        completionRate: stats.total_completions > 0 ? 'calculated on frontend' : 0
      }
    });
  } catch (error) {
    console.error('Error fetching routine stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch routine stats'
    });
  }
};

module.exports = {
  getRoutines,
  getRoutine,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  logRoutineCompletion,
  getRoutineLogs,
  getRoutineStats
};
