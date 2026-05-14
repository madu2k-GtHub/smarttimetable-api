# Input Validation & Data Sanitization Guide

**Date:** May 13, 2026  
**Status:** ✅ Complete & Applied Globally  
**Coverage:** All 18 API endpoints  

---

## 📋 Overview

The SmartTimetable API now has comprehensive, centralized input validation using `express-validator`. All routes enforce consistent validation rules with helpful error messages.

### What's Validated

- ✅ **All authentication inputs** (email, password, username)
- ✅ **All profile IDs** (UUID format)
- ✅ **All resource IDs** (integer format)
- ✅ **All body parameters** (type, length, range, format)
- ✅ **All query parameters** (limit, offset, sort)
- ✅ **Data sanitization** (trim, lowercase, escape)

---

## 🏗️ Architecture

### Centralized Validators Module

**File:** `src/middleware/validators.js`

Provides:
- ✅ Reusable validation rule sets
- ✅ Consistent error handling
- ✅ Shared validation logic
- ✅ Easy to maintain and extend

### Implementation Pattern

```javascript
// routes/example.js
const { authValidators, handleValidationErrors } = require('../middleware/validators');

router.post('/route',
  authMiddleware,
  ...authValidators.register,    // Spread validator rules
  handleValidationErrors,         // Handle any errors
  controller
);
```

---

## 📝 Validation Rules by Feature

### Authentication

#### Register
```javascript
body('email')
  - Valid email format ✅
  - Normalized (lowercase) ✅
  
body('password')
  - Minimum 6 characters ✅
  - At least one uppercase letter ✅
  - At least one lowercase letter ✅
  - At least one number ✅
  
body('username')
  - Minimum 3 characters ✅
  - Maximum 50 characters ✅
  - Only letters, numbers, underscores, hyphens ✅
  - HTML escaped ✅
  
body('profile_id') (optional)
  - Must be valid UUID if provided ✅
```

**Example Validation Errors:**

```bash
# Invalid email format
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"notanemail","password":"Pass123","username":"user"}'
```

Response:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email address",
      "location": "body"
    }
  ]
}
```

#### Login
```javascript
body('email')
  - Valid email format ✅
  - Normalized ✅
  
body('password')
  - Required ✅
```

---

### Profile Routes

#### Sync
```javascript
body('profileId')
  - Required ✅
  - Must be valid UUID ✅
  
body('data')
  - Required ✅
  - Must be object ✅
  
body('deviceId') (optional)
  - Must be string if provided ✅
  - Maximum 255 characters ✅
  - Trimmed ✅
  
body('deviceName') (optional)
  - Must be string ✅
  - Maximum 255 characters ✅
```

#### Get Profile
```javascript
param('id')
  - Must be valid UUID ✅
```

---

### Task Routes

#### Create Task
```javascript
param('profileId')
  - Must be valid UUID ✅
  
body('title')
  - Required ✅
  - Trimmed ✅
  - Maximum 255 characters ✅
  
body('description') (optional)
  - Trimmed if provided ✅
  
body('priority') (optional)
  - Integer 0-10 ✅
  
body('points_value') (optional)
  - Non-negative integer ✅
  
body('due_date') (optional)
  - ISO 8601 format ✅
  - Example: 2026-05-14T18:00:00Z ✅
```

#### Update Task
```javascript
param('profileId')
  - Must be valid UUID ✅
  
param('taskId')
  - Must be integer ✅
  
body('title') (optional)
  - Can't be empty if provided ✅
  - Max 255 characters ✅
  
body('status') (optional)
  - One of: pending, in_progress, completed ✅
  
body('priority') (optional)
  - Integer 0-10 ✅
  
body('points_value') (optional)
  - Non-negative integer ✅
  
body('due_date') (optional)
  - ISO 8601 format ✅
```

---

### Routine Routes

#### Create Routine
```javascript
body('title')
  - Required ✅
  - Trimmed ✅
  - Max 255 characters ✅
  
body('frequency') (optional)
  - One of: daily, weekly, biweekly, monthly, custom ✅
  
body('time_of_day') (optional)
  - HH:mm format (24-hour) ✅
  - Example: 06:30 ✅
  
body('days_of_week') (optional)
  - Array of integers ✅
  - Each 1-7 (1=Monday, 7=Sunday) ✅
  - Cannot be empty array ✅
  
body('points_value') (optional)
  - Non-negative integer ✅
```

#### Update Routine
```javascript
body('title') (optional)
  - Can't be empty if provided ✅
  - Max 255 characters ✅
  
body('frequency') (optional)
  - One of: daily, weekly, biweekly, monthly, custom ✅
  
body('time_of_day') (optional)
  - HH:mm format ✅
  
body('days_of_week') (optional)
  - Array validation ✅
  
body('is_active') (optional)
  - Boolean (true/false) ✅
  
body('points_value') (optional)
  - Non-negative integer ✅
```

#### Log Completion
```javascript
body('notes') (optional)
  - String if provided ✅
  - Trimmed ✅
```

#### Get Logs
```javascript
query('limit') (optional)
  - Integer 1-100 ✅
  - Default: 50 ✅
  
query('offset') (optional)
  - Non-negative integer ✅
  - Default: 0 ✅
```

---

## 🔐 Data Sanitization

All inputs are automatically sanitized:

### Trimming
```javascript
body('title').trim()           // Removes leading/trailing whitespace
```

**Example:**
```javascript
Input:  "  Morning Jog  "
Output: "Morning Jog"
```

### Normalization
```javascript
body('email').normalizeEmail().toLowerCase()
```

**Example:**
```javascript
Input:  "JohnDoe@EXAMPLE.COM"
Output: "johndoe@example.com"
```

### Escaping
```javascript
body('username').escape()      // Escapes HTML special characters
```

**Example:**
```javascript
Input:  "user<script>"
Output: "user&lt;script&gt;"
```

### Type Conversion
```javascript
param('taskId').toInt()        // Converts to integer
```

---

## 📊 Error Response Format

All validation errors follow consistent format:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "value": "invalid",
      "message": "Email must be a valid email address",
      "location": "body"
    },
    {
      "field": "password",
      "value": "pass",
      "message": "Password must be at least 6 characters long",
      "location": "body"
    }
  ],
  "timestamp": "2026-05-13T12:30:45.123Z"
}
```

---

## 🧪 Testing Validation

### Test 1: Missing Required Field

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"password":"Pass123","username":"user"}'
```

Response:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ]
}
```

### Test 2: Invalid Format

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"notanemail",
    "password":"Pass123",
    "username":"user"
  }'
```

Response:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Email must be a valid email address"
    }
  ]
}
```

### Test 3: Weak Password

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"john@example.com",
    "password":"weakpass",
    "username":"user"
  }'
```

Response:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "password",
      "message": "Password must contain at least one uppercase letter"
    }
  ]
}
```

### Test 4: Out of Range

```bash
curl -X POST http://localhost:5000/api/tasks/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Task","priority":15}'
```

Response:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "priority",
      "value": "15",
      "message": "Priority must be between 0 and 10"
    }
  ]
}
```

### Test 5: Invalid UUID

```bash
curl -X GET http://localhost:5000/api/tasks/not-a-uuid \
  -H "Authorization: Bearer $TOKEN"
```

Response:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "profileId",
      "message": "Profile ID must be a valid UUID"
    }
  ]
}
```

### Test 6: Invalid Array Values

```bash
curl -X POST http://localhost:5000/api/routines/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"Routine","days_of_week":[1,2,8,9]}'
```

Response:
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "days_of_week",
      "message": "Each day must be an integer between 1-7"
    }
  ]
}
```

---

## 🔒 Security Features

### Protection Against

#### SQL Injection
- ✅ Parameterized queries (backend)
- ✅ Input type validation (frontend)

#### XSS Attacks
- ✅ HTML escaping (escape())
- ✅ No HTML rendering from user input

#### Data Tampering
- ✅ UUID validation
- ✅ Integer type checking
- ✅ Enum whitelisting

#### Brute Force
- ✅ Password strength requirements
- ✅ Rate limiting (future enhancement)

---

## 📚 Validation Rules Reference

### String Rules
```javascript
.trim()                              // Remove whitespace
.isLength({ min, max })              // Length range
.escape()                            // HTML escape
.toLowerCase()                       // Convert to lowercase
.normalizeEmail()                    // Normalize email
.matches(/regex/)                    // Regex match
```

### Number Rules
```javascript
.isInt()                             // Integer check
.isInt({ min, max })                 // Range check
.isFloat()                           // Float check
```

### UUID & ID Rules
```javascript
.isUUID()                            // UUID format
.isInt()                             // Integer ID
```

### Date Rules
```javascript
.isISO8601()                         // ISO 8601 format
```

### Array Rules
```javascript
.isArray()                           // Must be array
.custom((value) => { ... })          // Custom validation
```

### Boolean Rules
```javascript
.isBoolean()                         // true/false
```

### Email Rules
```javascript
.isEmail()                           // Valid email
.normalizeEmail()                    // Normalize format
```

---

## 🛠️ Extending Validators

### Add New Route Validation

```javascript
// In src/middleware/validators.js
const rewardValidators = {
  create: [
    param('profileId').isUUID().withMessage('Profile ID must be valid UUID'),
    body('title')
      .trim()
      .notEmpty().withMessage('Reward title is required')
      .isLength({ max: 255 }).withMessage('Max 255 chars'),
    body('points_required')
      .isInt({ min: 1 }).withMessage('Points must be positive'),
    // ... more rules
  ]
};

module.exports = {
  // ... existing exports
  rewardValidators
};
```

### Use in Routes

```javascript
// In src/routes/rewardRoutes.js
const { rewardValidators, handleValidationErrors } = require('../middleware/validators');

router.post('/:profileId',
  authMiddleware,
  ...rewardValidators.create,
  handleValidationErrors,
  createReward
);
```

---

## 📊 Coverage

### Authentication (2 endpoints)
- ✅ register - 4 input fields validated
- ✅ login - 2 input fields validated

### Profiles (2 endpoints)
- ✅ sync - 4 input fields validated
- ✅ get - 1 parameter validated

### Tasks (6 endpoints)
- ✅ list - 1 parameter validated
- ✅ get - 2 parameters validated
- ✅ create - 5 fields validated
- ✅ update - 6 fields validated
- ✅ delete - 2 parameters validated
- ✅ complete - 2 parameters validated

### Routines (8 endpoints)
- ✅ list - 1 parameter validated
- ✅ get - 2 parameters validated
- ✅ create - 5 fields validated
- ✅ update - 6 fields validated
- ✅ delete - 2 parameters validated
- ✅ complete - 3 fields validated
- ✅ getLogs - 4 fields validated
- ✅ getStats - 2 parameters validated

**Total Validations: 50+ rules applied globally**

---

## ✅ Quality Checklist

- ✅ All inputs validated
- ✅ All error messages clear and helpful
- ✅ All data sanitized
- ✅ Consistent error format
- ✅ Centralized maintenance
- ✅ Easy to extend
- ✅ Security best practices
- ✅ Type safety
- ✅ Range validation
- ✅ Format validation

---

## 🚀 Next Steps

### Implement Additional Validation
- [ ] Rate limiting (prevent brute force)
- [ ] Request size limits
- [ ] CORS validation
- [ ] Custom validators for business logic

### Enhanced Sanitization
- [ ] XSS prevention filters
- [ ] SQL injection prevention (already done)
- [ ] Path traversal prevention
- [ ] Command injection prevention

### Error Messages
- [ ] Internationalization (i18n)
- [ ] Error codes for frontend mapping
- [ ] Logging for analytics

---

**Document:** VALIDATION_SYSTEM_GUIDE.md  
**Created:** May 13, 2026  
**Status:** Complete - Validation applied to all 18 endpoints
