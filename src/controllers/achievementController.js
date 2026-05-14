const { pool } = require('../config/db');

/**
 * Get all achievements for a profile
 * GET /api/achievements/:profileId
 */
const getAchievements = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { unlocked, category } = req.query; // Filters

    let query = `SELECT id, title, description, category, badge_icon, is_unlocked, unlocked_at, created_at
                 FROM achievements
                 WHERE profile_id = $1`;
    const params = [profileId];

    // Apply filters if specified
    if (unlocked === 'true') {
      query += ` AND is_unlocked = true`;
    } else if (unlocked === 'false') {
      query += ` AND is_unlocked = false`;
    }

    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    query += ` ORDER BY is_unlocked DESC, created_at ASC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      achievements: result.rows
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievements'
    });
  }
};

/**
 * Get single achievement by ID
 * GET /api/achievements/:profileId/:achievementId
 */
const getAchievement = async (req, res) => {
  try {
    const { profileId, achievementId } = req.params;

    const result = await pool.query(
      `SELECT * FROM achievements WHERE id = $1 AND profile_id = $2`,
      [achievementId, profileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Achievement not found'
      });
    }

    res.json({
      success: true,
      achievement: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching achievement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievement'
    });
  }
};

/**
 * Create new achievement
 * POST /api/achievements/:profileId
 * Body: { title, description?, category?, badge_icon? }
 */
const createAchievement = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { title, description, category, badge_icon } = req.body;

    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Achievement title is required'
      });
    }

    if (title.length > 255) {
      return res.status(400).json({
        success: false,
        error: 'Achievement title must be less than 255 characters'
      });
    }

    const validCategories = ['milestone', 'streak', 'progress', 'special', 'custom'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: `Category must be one of: ${validCategories.join(', ')}`
      });
    }

    const result = await pool.query(
      `INSERT INTO achievements (profile_id, title, description, category, badge_icon)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, description, category, badge_icon, is_unlocked, unlocked_at, created_at`,
      [profileId, title.trim(), description || null, category || null, badge_icon || null]
    );

    res.status(201).json({
      success: true,
      message: 'Achievement created successfully',
      achievement: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating achievement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create achievement'
    });
  }
};

/**
 * Update achievement
 * PUT /api/achievements/:profileId/:achievementId
 * Body: { title?, description?, category?, badge_icon? }
 */
const updateAchievement = async (req, res) => {
  try {
    const { profileId, achievementId } = req.params;
    const { title, description, category, badge_icon } = req.body;

    // Validate achievement exists
    const existing = await pool.query(
      'SELECT id FROM achievements WHERE id = $1 AND profile_id = $2',
      [achievementId, profileId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Achievement not found'
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
          error: 'Achievement title cannot be empty'
        });
      }
      updates.push(`title = $${paramCount++}`);
      values.push(title.trim());
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description || null);
    }

    if (category !== undefined) {
      const validCategories = ['milestone', 'streak', 'progress', 'special', 'custom'];
      if (category && !validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: `Category must be one of: ${validCategories.join(', ')}`
        });
      }
      updates.push(`category = $${paramCount++}`);
      values.push(category || null);
    }

    if (badge_icon !== undefined) {
      updates.push(`badge_icon = $${paramCount++}`);
      values.push(badge_icon || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(achievementId);
    values.push(profileId);

    const query = `UPDATE achievements
                   SET ${updates.join(', ')}
                   WHERE id = $${paramCount + 1} AND profile_id = $${paramCount + 2}
                   RETURNING id, title, description, category, badge_icon, is_unlocked, unlocked_at`;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Achievement updated successfully',
      achievement: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating achievement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update achievement'
    });
  }
};

/**
 * Delete achievement
 * DELETE /api/achievements/:profileId/:achievementId
 */
const deleteAchievement = async (req, res) => {
  try {
    const { profileId, achievementId } = req.params;

    const result = await pool.query(
      'DELETE FROM achievements WHERE id = $1 AND profile_id = $2 RETURNING id, title',
      [achievementId, profileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Achievement not found'
      });
    }

    res.json({
      success: true,
      message: 'Achievement deleted successfully',
      achievement: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete achievement'
    });
  }
};

/**
 * Unlock achievement
 * POST /api/achievements/:profileId/:achievementId/unlock
 */
const unlockAchievement = async (req, res) => {
  try {
    const { profileId, achievementId } = req.params;

    // Get achievement details
    const achievementResult = await pool.query(
      'SELECT id, title, is_unlocked FROM achievements WHERE id = $1 AND profile_id = $2',
      [achievementId, profileId]
    );

    if (achievementResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Achievement not found'
      });
    }

    const achievement = achievementResult.rows[0];

    // Check if already unlocked
    if (achievement.is_unlocked) {
      return res.status(400).json({
        success: false,
        error: 'Achievement already unlocked'
      });
    }

    // Unlock achievement
    const unlockResult = await pool.query(
      `UPDATE achievements
       SET is_unlocked = true, unlocked_at = NOW()
       WHERE id = $1 AND profile_id = $2
       RETURNING id, title, category, badge_icon, unlocked_at`,
      [achievementId, profileId]
    );

    res.status(201).json({
      success: true,
      message: 'Achievement unlocked successfully',
      achievement: unlockResult.rows[0]
    });
  } catch (error) {
    console.error('Error unlocking achievement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unlock achievement'
    });
  }
};

/**
 * Get achievements by category
 * GET /api/achievements/:profileId/category/:categoryName
 */
const getAchievementsByCategory = async (req, res) => {
  try {
    const { profileId, categoryName } = req.params;

    const validCategories = ['milestone', 'streak', 'progress', 'special', 'custom'];
    if (!validCategories.includes(categoryName)) {
      return res.status(400).json({
        success: false,
        error: `Category must be one of: ${validCategories.join(', ')}`
      });
    }

    const result = await pool.query(
      `SELECT id, title, description, category, badge_icon, is_unlocked, unlocked_at, created_at
       FROM achievements
       WHERE profile_id = $1 AND category = $2
       ORDER BY is_unlocked DESC, created_at ASC`,
      [profileId, categoryName]
    );

    res.json({
      success: true,
      category: categoryName,
      count: result.rows.length,
      achievements: result.rows
    });
  } catch (error) {
    console.error('Error fetching achievements by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch achievements by category'
    });
  }
};

module.exports = {
  getAchievements,
  getAchievement,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  unlockAchievement,
  getAchievementsByCategory
};
