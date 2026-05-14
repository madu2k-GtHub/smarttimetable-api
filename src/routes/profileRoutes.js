const express = require('express');
const authMiddleware = require('../middleware/auth');
const { profileValidators, handleValidationErrors } = require('../middleware/validators');
const { syncProfile, getProfile } = require('../controllers/profileController');

const router = express.Router();

/**
 * POST /api/profiles/sync
 * Sync profile data from mobile app to cloud
 * Protected route - requires valid JWT token
 * Body: { profileId, data, deviceId?, deviceName? }
 */
router.post(
  '/sync',
  authMiddleware,
  ...profileValidators.sync,
  handleValidationErrors,
  syncProfile
);

/**
 * GET /api/profiles/:id
 * Get profile by ID
 * Protected route - requires valid JWT token
 */
router.get(
  '/:id',
  authMiddleware,
  ...profileValidators.getProfile,
  handleValidationErrors,
  getProfile
);

module.exports = router;