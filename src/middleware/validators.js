// middleware/validators.js
/**
 * Centralized validation rules and middleware
 * Provides consistent validation across all routes
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation Result Handler
 * Formats validation errors into consistent response
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format errors for clear feedback
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      value: error.value,
      message: error.msg,
      location: error.location
    }));

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: formattedErrors,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

/**
 * Authentication Validators
 */
const authValidators = {
  register: [
    body('email')
      .isEmail().withMessage('Email must be a valid email address')
      .normalizeEmail()
      .toLowerCase(),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    body('username')
      .trim()
      .isLength({ min: 3 }).withMessage('Username must be at least 3 characters long')
      .isLength({ max: 50 }).withMessage('Username must be less than 50 characters')
      .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens')
      .escape(),
    body('profile_id')
      .optional()
      .isUUID().withMessage('profile_id must be a valid UUID')
  ],

  login: [
    body('email')
      .isEmail().withMessage('Email must be a valid email address')
      .normalizeEmail()
      .toLowerCase(),
    body('password')
      .notEmpty().withMessage('Password is required')
  ]
};

/**
 * Profile Validators
 */
const profileValidators = {
  sync: [
    body('profileId')
      .notEmpty().withMessage('profileId is required')
      .isUUID().withMessage('profileId must be a valid UUID'),
    body('data')
      .notEmpty().withMessage('data is required')
      .isObject().withMessage('data must be an object'),
    body('deviceId')
      .optional()
      .trim()
      .isString().withMessage('deviceId must be a string')
      .isLength({ max: 255 }).withMessage('deviceId must be less than 255 characters'),
    body('deviceName')
      .optional()
      .trim()
      .isString().withMessage('deviceName must be a string')
      .isLength({ max: 255 }).withMessage('deviceName must be less than 255 characters')
  ],

  getProfile: [
    param('id')
      .isUUID().withMessage('Profile ID must be a valid UUID')
  ]
};

/**
 * Task Validators
 */
const taskValidators = {
  listTasks: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID')
  ],

  getSingleTask: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('taskId')
      .isInt().withMessage('Task ID must be a valid integer')
      .toInt()
  ],

  create: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    body('title')
      .trim()
      .notEmpty().withMessage('Task title is required')
      .isLength({ max: 255 }).withMessage('Task title must be less than 255 characters'),
    body('description')
      .optional()
      .trim(),
    body('priority')
      .optional()
      .isInt({ min: 0, max: 10 }).withMessage('Priority must be between 0 and 10'),
    body('points_value')
      .optional()
      .isInt({ min: 0 }).withMessage('Points value must be a non-negative integer'),
    body('due_date')
      .optional()
      .isISO8601().withMessage('Due date must be in ISO 8601 format (e.g., 2026-05-14T18:00:00Z)')
  ],

  update: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('taskId')
      .isInt().withMessage('Task ID must be a valid integer')
      .toInt(),
    body('title')
      .optional()
      .trim()
      .notEmpty().withMessage('Task title cannot be empty')
      .isLength({ max: 255 }).withMessage('Task title must be less than 255 characters'),
    body('description')
      .optional()
      .trim(),
    body('status')
      .optional()
      .isIn(['pending', 'in_progress', 'completed'])
      .withMessage('Status must be one of: pending, in_progress, completed'),
    body('priority')
      .optional()
      .isInt({ min: 0, max: 10 }).withMessage('Priority must be between 0 and 10'),
    body('points_value')
      .optional()
      .isInt({ min: 0 }).withMessage('Points value must be a non-negative integer'),
    body('due_date')
      .optional()
      .isISO8601().withMessage('Due date must be in ISO 8601 format')
  ],

  delete: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('taskId')
      .isInt().withMessage('Task ID must be a valid integer')
      .toInt()
  ],

  complete: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('taskId')
      .isInt().withMessage('Task ID must be a valid integer')
      .toInt()
  ]
};

/**
 * Routine Validators
 */
const routineValidators = {
  listRoutines: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID')
  ],

  getSingleRoutine: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('routineId')
      .isInt().withMessage('Routine ID must be a valid integer')
      .toInt()
  ],

  create: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    body('title')
      .trim()
      .notEmpty().withMessage('Routine title is required')
      .isLength({ max: 255 }).withMessage('Routine title must be less than 255 characters'),
    body('description')
      .optional()
      .trim(),
    body('frequency')
      .optional()
      .isIn(['daily', 'weekly', 'biweekly', 'monthly', 'custom'])
      .withMessage('Frequency must be one of: daily, weekly, biweekly, monthly, custom'),
    body('time_of_day')
      .optional()
      .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Time of day must be in HH:mm format (24-hour, e.g., 06:30)'),
    body('days_of_week')
      .optional()
      .isArray().withMessage('Days of week must be an array')
      .custom((value) => {
        if (Array.isArray(value)) {
          if (value.length === 0) {
            throw new Error('Days of week array cannot be empty');
          }
          const valid = value.every(day => Number.isInteger(day) && day >= 1 && day <= 7);
          if (!valid) {
            throw new Error('Each day must be an integer between 1-7 (1=Monday, 7=Sunday)');
          }
        }
        return true;
      }),
    body('points_value')
      .optional()
      .isInt({ min: 0 }).withMessage('Points value must be a non-negative integer')
  ],

  update: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('routineId')
      .isInt().withMessage('Routine ID must be a valid integer')
      .toInt(),
    body('title')
      .optional()
      .trim()
      .notEmpty().withMessage('Routine title cannot be empty')
      .isLength({ max: 255 }).withMessage('Routine title must be less than 255 characters'),
    body('description')
      .optional()
      .trim(),
    body('frequency')
      .optional()
      .isIn(['daily', 'weekly', 'biweekly', 'monthly', 'custom'])
      .withMessage('Frequency must be one of: daily, weekly, biweekly, monthly, custom'),
    body('time_of_day')
      .optional()
      .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Time of day must be in HH:mm format (24-hour)'),
    body('days_of_week')
      .optional()
      .isArray().withMessage('Days of week must be an array')
      .custom((value) => {
        if (Array.isArray(value) && value.length > 0) {
          const valid = value.every(day => Number.isInteger(day) && day >= 1 && day <= 7);
          if (!valid) {
            throw new Error('Each day must be an integer between 1-7');
          }
        }
        return true;
      }),
    body('is_active')
      .optional()
      .isBoolean().withMessage('is_active must be true or false'),
    body('points_value')
      .optional()
      .isInt({ min: 0 }).withMessage('Points value must be a non-negative integer')
  ],

  delete: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('routineId')
      .isInt().withMessage('Routine ID must be a valid integer')
      .toInt()
  ],

  complete: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('routineId')
      .isInt().withMessage('Routine ID must be a valid integer')
      .toInt(),
    body('notes')
      .optional()
      .trim()
      .isString().withMessage('Notes must be a string')
  ],

  getLogs: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('routineId')
      .isInt().withMessage('Routine ID must be a valid integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 }).withMessage('Offset must be a non-negative integer')
  ],

  getStats: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('routineId')
      .isInt().withMessage('Routine ID must be a valid integer')
      .toInt()
  ]
};

/**
 * Reward Validators
 */
const rewardValidators = {
  listRewards: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    query('claimed')
      .optional()
      .isIn(['true', 'false']).withMessage('Claimed filter must be true or false')
  ],

  getSingleReward: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('rewardId')
      .isInt().withMessage('Reward ID must be a valid integer')
      .toInt()
  ],

  create: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    body('title')
      .trim()
      .notEmpty().withMessage('Reward title is required')
      .isLength({ max: 255 }).withMessage('Reward title must be less than 255 characters'),
    body('description')
      .optional()
      .trim(),
    body('points_required')
      .isInt({ min: 1 }).withMessage('Points required must be at least 1')
  ],

  update: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('rewardId')
      .isInt().withMessage('Reward ID must be a valid integer')
      .toInt(),
    body('title')
      .optional()
      .trim()
      .notEmpty().withMessage('Reward title cannot be empty')
      .isLength({ max: 255 }).withMessage('Reward title must be less than 255 characters'),
    body('description')
      .optional()
      .trim(),
    body('points_required')
      .optional()
      .isInt({ min: 1 }).withMessage('Points required must be at least 1')
  ],

  delete: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('rewardId')
      .isInt().withMessage('Reward ID must be a valid integer')
      .toInt()
  ],

  claim: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('rewardId')
      .isInt().withMessage('Reward ID must be a valid integer')
      .toInt()
  ]
};

/**
 * Achievement Validators
 */
const achievementValidators = {
  listAchievements: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    query('unlocked')
      .optional()
      .isIn(['true', 'false']).withMessage('Unlocked filter must be true or false'),
    query('category')
      .optional()
      .isIn(['milestone', 'streak', 'progress', 'special', 'custom'])
      .withMessage('Category must be one of: milestone, streak, progress, special, custom')
  ],

  getSingleAchievement: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('achievementId')
      .isInt().withMessage('Achievement ID must be a valid integer')
      .toInt()
  ],

  create: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    body('title')
      .trim()
      .notEmpty().withMessage('Achievement title is required')
      .isLength({ max: 255 }).withMessage('Achievement title must be less than 255 characters'),
    body('description')
      .optional()
      .trim(),
    body('category')
      .optional()
      .isIn(['milestone', 'streak', 'progress', 'special', 'custom'])
      .withMessage('Category must be one of: milestone, streak, progress, special, custom'),
    body('badge_icon')
      .optional()
      .isString().withMessage('Badge icon must be a string')
  ],

  update: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('achievementId')
      .isInt().withMessage('Achievement ID must be a valid integer')
      .toInt(),
    body('title')
      .optional()
      .trim()
      .notEmpty().withMessage('Achievement title cannot be empty')
      .isLength({ max: 255 }).withMessage('Achievement title must be less than 255 characters'),
    body('description')
      .optional()
      .trim(),
    body('category')
      .optional()
      .isIn(['milestone', 'streak', 'progress', 'special', 'custom'])
      .withMessage('Category must be one of: milestone, streak, progress, special, custom'),
    body('badge_icon')
      .optional()
      .isString().withMessage('Badge icon must be a string')
  ],

  delete: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('achievementId')
      .isInt().withMessage('Achievement ID must be a valid integer')
      .toInt()
  ],

  unlock: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('achievementId')
      .isInt().withMessage('Achievement ID must be a valid integer')
      .toInt()
  ],

  getByCategory: [
    param('profileId')
      .isUUID().withMessage('Profile ID must be a valid UUID'),
    param('categoryName')
      .isIn(['milestone', 'streak', 'progress', 'special', 'custom'])
      .withMessage('Category must be one of: milestone, streak, progress, special, custom')
  ]
};

/**
 * Common Query Validators
 */
const queryValidators = {
  pagination: [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 }).withMessage('Offset must be a non-negative integer')
  ],

  searchFilter: [
    query('search')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Search term must be less than 100 characters')
  ],

  sorting: [
    query('sort')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Sort must be either asc or desc')
  ]
};

/**
 * Email Verification Validators
 */
const emailVerificationValidators = {
  verifyOTP: [
    body('email')
      .isEmail().withMessage('Email must be a valid email address')
      .normalizeEmail()
      .toLowerCase(),
    body('otp')
      .trim()
      .matches(/^\d{6}$/).withMessage('OTP must be exactly 6 digits'),
    body('username')
      .trim()
      .notEmpty().withMessage('Username is required'),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
      .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain at least one number')
  ],

  resendOTP: [
    body('email')
      .isEmail().withMessage('Email must be a valid email address')
      .normalizeEmail()
      .toLowerCase(),
    body('username')
      .optional()
      .trim()
  ]
};

module.exports = {
  // Error handler
  handleValidationErrors,

  // Validator groups
  authValidators,
  emailVerificationValidators,
  profileValidators,
  taskValidators,
  routineValidators,
  queryValidators,

  // Export express-validator for custom use
  body,
  param,
  query,
  validationResult
};
