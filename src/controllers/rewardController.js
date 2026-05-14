const { pool } = require('../config/db');

/**
 * Get all rewards for a profile
 * GET /api/rewards/:profileId
 */
const getRewards = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { claimed } = req.query; // Filter: all, claimed, available

    let query = `SELECT id, title, description, points_required, is_claimed, claimed_at, created_at
                 FROM rewards
                 WHERE profile_id = $1`;
    const params = [profileId];

    // Apply filter if specified
    if (claimed === 'true') {
      query += ` AND is_claimed = true`;
    } else if (claimed === 'false') {
      query += ` AND is_claimed = false`;
    }

    query += ` ORDER BY is_claimed ASC, points_required ASC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      count: result.rows.length,
      rewards: result.rows
    });
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rewards'
    });
  }
};

/**
 * Get single reward by ID
 * GET /api/rewards/:profileId/:rewardId
 */
const getReward = async (req, res) => {
  try {
    const { profileId, rewardId } = req.params;

    const result = await pool.query(
      `SELECT * FROM rewards WHERE id = $1 AND profile_id = $2`,
      [rewardId, profileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Reward not found'
      });
    }

    res.json({
      success: true,
      reward: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching reward:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reward'
    });
  }
};

/**
 * Create new reward
 * POST /api/rewards/:profileId
 * Body: { title, description?, points_required }
 */
const createReward = async (req, res) => {
  try {
    const { profileId } = req.params;
    const { title, description, points_required } = req.body;

    // Validation
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Reward title is required'
      });
    }

    if (title.length > 255) {
      return res.status(400).json({
        success: false,
        error: 'Reward title must be less than 255 characters'
      });
    }

    if (points_required < 1) {
      return res.status(400).json({
        success: false,
        error: 'Points required must be at least 1'
      });
    }

    const result = await pool.query(
      `INSERT INTO rewards (profile_id, title, description, points_required)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, points_required, is_claimed, claimed_at, created_at`,
      [profileId, title.trim(), description || null, points_required]
    );

    res.status(201).json({
      success: true,
      message: 'Reward created successfully',
      reward: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating reward:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create reward'
    });
  }
};

/**
 * Update reward
 * PUT /api/rewards/:profileId/:rewardId
 * Body: { title?, description?, points_required? }
 */
const updateReward = async (req, res) => {
  try {
    const { profileId, rewardId } = req.params;
    const { title, description, points_required } = req.body;

    // Validate reward exists
    const existing = await pool.query(
      'SELECT id FROM rewards WHERE id = $1 AND profile_id = $2',
      [rewardId, profileId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Reward not found'
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
          error: 'Reward title cannot be empty'
        });
      }
      updates.push(`title = $${paramCount++}`);
      values.push(title.trim());
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description || null);
    }

    if (points_required !== undefined) {
      if (points_required < 1) {
        return res.status(400).json({
          success: false,
          error: 'Points required must be at least 1'
        });
      }
      updates.push(`points_required = $${paramCount++}`);
      values.push(points_required);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    values.push(rewardId);
    values.push(profileId);

    const query = `UPDATE rewards
                   SET ${updates.join(', ')}
                   WHERE id = $${paramCount + 1} AND profile_id = $${paramCount + 2}
                   RETURNING id, title, description, points_required, is_claimed, claimed_at`;

    const result = await pool.query(query, values);

    res.json({
      success: true,
      message: 'Reward updated successfully',
      reward: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating reward:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update reward'
    });
  }
};

/**
 * Delete reward
 * DELETE /api/rewards/:profileId/:rewardId
 */
const deleteReward = async (req, res) => {
  try {
    const { profileId, rewardId } = req.params;

    const result = await pool.query(
      'DELETE FROM rewards WHERE id = $1 AND profile_id = $2 RETURNING id, title',
      [rewardId, profileId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Reward not found'
      });
    }

    res.json({
      success: true,
      message: 'Reward deleted successfully',
      reward: result.rows[0]
    });
  } catch (error) {
    console.error('Error deleting reward:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete reward'
    });
  }
};

/**
 * Claim reward (deduct points from user_stats)
 * POST /api/rewards/:profileId/:rewardId/claim
 */
const claimReward = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { profileId, rewardId } = req.params;

    // Get reward details
    const rewardResult = await client.query(
      'SELECT id, title, points_required, is_claimed FROM rewards WHERE id = $1 AND profile_id = $2',
      [rewardId, profileId]
    );

    if (rewardResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Reward not found'
      });
    }

    const reward = rewardResult.rows[0];

    // Check if already claimed
    if (reward.is_claimed) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Reward already claimed'
      });
    }

    // Check if user has enough points
    const statsResult = await client.query(
      'SELECT total_points FROM user_stats WHERE profile_id = $1',
      [profileId]
    );

    if (statsResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'User stats not found'
      });
    }

    const userStats = statsResult.rows[0];

    if (userStats.total_points < reward.points_required) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: `Insufficient points. You have ${userStats.total_points}, need ${reward.points_required}`
      });
    }

    // Claim reward
    const claimResult = await client.query(
      `UPDATE rewards
       SET is_claimed = true, claimed_at = NOW()
       WHERE id = $1 AND profile_id = $2
       RETURNING id, title, points_required, claimed_at`,
      [rewardId, profileId]
    );

    // Deduct points from user_stats
    await client.query(
      `UPDATE user_stats
       SET total_points = total_points - $1,
           updated_at = NOW()
       WHERE profile_id = $2`,
      [reward.points_required, profileId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Reward claimed successfully',
      reward: {
        ...claimResult.rows[0],
        points_deducted: reward.points_required
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error claiming reward:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to claim reward'
    });
  } finally {
    client.release();
  }
};

module.exports = {
  getRewards,
  getReward,
  createReward,
  updateReward,
  deleteReward,
  claimReward
};
