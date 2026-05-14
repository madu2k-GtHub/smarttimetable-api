const { pool } = require('../config/db');

/**
 * Sync profile data from mobile app to cloud
 * Receives: profileId, data (activities, tasks, routines, achievements, stats, etc.)
 * Stores: Full profile snapshot for backup/restore
 * Handles: Conflict detection and resolution
 */
const syncProfile = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { profileId, data, deviceId, deviceName } = req.body;

    // ============================================
    // 1. VALIDATION
    // ============================================
    if (!profileId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: profileId'
      });
    }

    if (!data || typeof data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: data (must be an object)'
      });
    }

    // Validate data has at least some content
    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Sync data cannot be empty'
      });
    }

    // ============================================
    // 2. CHECK PROFILE EXISTS
    // ============================================
    const profileCheck = await client.query(
      'SELECT id FROM profiles WHERE id = $1',
      [profileId]
    );

    if (profileCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    // ============================================
    // 3. GET PREVIOUS SYNC DATA (for conflict detection)
    // ============================================
    const previousSync = await client.query(
      `SELECT id, sync_data, synced_at, sync_version
       FROM profile_syncs
       WHERE profile_id = $1`,
      [profileId]
    );

    const hasPreviousSync = previousSync.rows.length > 0;
    let conflictDetected = false;
    let previousSyncAt = null;
    let newSyncVersion = 1;

    if (hasPreviousSync) {
      previousSyncAt = previousSync.rows[0].synced_at;
      newSyncVersion = previousSync.rows[0].sync_version + 1;

      // ============================================
      // 4. CONFLICT DETECTION LOGIC
      // ============================================
      // Detect conflicts if:
      // - Data was synced recently (within last 5 minutes) from different device
      // - Multiple fields changed significantly
      // - Timestamps suggest concurrent modifications

      const lastSyncData = previousSync.rows[0].sync_data;
      const timeSinceLastSync = Date.now() - new Date(previousSyncAt).getTime();
      const recentSync = timeSinceLastSync < 5 * 60 * 1000; // 5 minutes

      // Check if device is different
      const isDifferentDevice = deviceId &&
        lastSyncData.deviceId &&
        lastSyncData.deviceId !== deviceId &&
        recentSync;

      // Check if major data changed
      const tasksChanged = JSON.stringify(data.tasks || []) !==
                          JSON.stringify(lastSyncData.tasks || []);
      const routinesChanged = JSON.stringify(data.routines || []) !==
                             JSON.stringify(lastSyncData.routines || []);
      const rewardsChanged = JSON.stringify(data.rewards || []) !==
                            JSON.stringify(lastSyncData.rewards || []);

      const multipleChanges = [tasksChanged, routinesChanged, rewardsChanged]
        .filter(Boolean).length >= 2;

      conflictDetected = isDifferentDevice || (multipleChanges && recentSync);
    }

    // ============================================
    // 5. STORE/UPDATE SYNC DATA
    // ============================================
    const syncData = {
      ...data,
      deviceId,
      deviceName,
      syncedAtClient: new Date(data.syncedAt || Date.now()).toISOString()
    };

    let syncResult;

    if (hasPreviousSync) {
      // UPDATE existing sync
      syncResult = await client.query(
        `UPDATE profile_syncs
         SET sync_data = $1,
             sync_version = $2,
             conflict_detected = $3,
             previous_sync_at = $4,
             device_id = $5,
             device_name = $6,
             updated_at = NOW()
         WHERE profile_id = $7
         RETURNING id, sync_version, synced_at, conflict_detected`,
        [
          JSON.stringify(syncData),
          newSyncVersion,
          conflictDetected,
          previousSyncAt,
          deviceId || null,
          deviceName || null,
          profileId
        ]
      );
    } else {
      // INSERT new sync
      syncResult = await client.query(
        `INSERT INTO profile_syncs
         (profile_id, sync_data, sync_version, conflict_detected, device_id, device_name)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, sync_version, synced_at, conflict_detected`,
        [
          profileId,
          JSON.stringify(syncData),
          newSyncVersion,
          conflictDetected,
          deviceId || null,
          deviceName || null
        ]
      );
    }

    const sync = syncResult.rows[0];

    // ============================================
    // 6. UPDATE PROFILE STATS
    // ============================================
    // Count tasks, routines, achievements from sync data
    const tasksCount = (data.tasks || []).length;
    const routinesCount = (data.routines || []).length;
    const completedTasksCount = (data.tasks || []).filter(t => t.status === 'completed').length;
    const completedRoutinesCount = data.completedRoutines || 0;

    // Update user_stats with synced counts
    if (tasksCount > 0 || routinesCount > 0) {
      await client.query(
        `UPDATE user_stats
         SET tasks_completed = $1,
             routines_completed = $2,
             updated_at = NOW()
         WHERE profile_id = $3`,
        [completedTasksCount, completedRoutinesCount, profileId]
      );
    }

    await client.query('COMMIT');

    // ============================================
    // 7. RETURN SYNC CONFIRMATION
    // ============================================
    res.status(200).json({
      success: true,
      message: hasPreviousSync ? 'Profile synced successfully' : 'Profile created and synced',
      sync: {
        id: sync.id,
        profileId,
        version: sync.sync_version,
        syncedAt: sync.synced_at,
        previousSyncAt,
        conflictDetected,
        conflictResolution: conflictDetected ? 'latest_wins' : 'no_conflict',
        itemsReceived: {
          tasks: (data.tasks || []).length,
          routines: (data.routines || []).length,
          rewards: (data.rewards || []).length,
          achievements: (data.achievements || []).length,
          stats: !!data.stats
        }
      },
      serverTime: new Date().toISOString()
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Sync error:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to sync profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });

  } finally {
    client.release();
  }
};

const getProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM profiles WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Profile not found'
      });
    }

    res.json({
      success: true,
      profile: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  syncProfile,
  getProfile
};