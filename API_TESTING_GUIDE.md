# SmartTimetable API Testing Guide

**Date:** May 13, 2026  
**API Version:** 1.0.0  
**Status:** Ready for testing

---

## 📋 Quick Start

### Prerequisites
- Node.js running with `npm run dev` (server on port 5000)
- `curl` command-line tool (or Postman/Insomnia)
- A terminal/command prompt
- `.env` file configured with:
  ```
  DATABASE_URL=postgresql://user:password@localhost/smarttimetable
  JWT_SECRET=your-secret-key-here
  NODE_ENV=development
  PORT=5000
  ```

### Health Check
Before testing authentication, verify the server is running:

```bash
curl http://localhost:5000/health
```

**Expected Response:**
```json
{
  "status": "OK",
  "timestamp": "2026-05-13T12:30:45.123Z"
}
```

---

## 🔐 Authentication Flow (User Registration & Login)

### 1️⃣ Register a New User

**Endpoint:** `POST /api/auth/register`

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!",
    "username": "johndoe"
  }'
```

**Successful Response (201 Created):**
```json
{
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInByb2ZpbGVJZCI6MSwiZXhwIjoxNjI5Njk5NjAwfQ.signature",
  "user": {
    "id": 1,
    "email": "john.doe@example.com",
    "username": "johndoe",
    "profile_id": 1
  }
}
```

**⚠️ Save the token!** You'll need it for all subsequent authenticated requests.

---

### ✅ Validation Examples: User Registration

#### ❌ Missing Required Fields
```bash
# Missing email
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "password": "SecurePass123!",
    "username": "johndoe"
  }'
```

**Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "type": "field",
      "value": undefined,
      "msg": "Invalid value",
      "path": "email",
      "location": "body"
    }
  ]
}
```

#### ❌ Invalid Email Format
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "not-an-email",
    "password": "SecurePass123!",
    "username": "johndoe"
  }'
```

**Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "type": "field",
      "value": "not-an-email",
      "msg": "Invalid value",
      "path": "email",
      "location": "body"
    }
  ]
}
```

#### ❌ Password Too Short (minimum 6 characters)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "short",
    "username": "johndoe"
  }'
```

**Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "type": "field",
      "value": "short",
      "msg": "Invalid value",
      "path": "password",
      "location": "body"
    }
  ]
}
```

#### ❌ Username Too Short (minimum 3 characters)
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "username": "ab"
  }'
```

**Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "type": "field",
      "value": "ab",
      "msg": "Invalid value",
      "path": "username",
      "location": "body"
    }
  ]
}
```

#### ❌ User Already Exists
If you try to register with an email that's already in the database:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "DifferentPass123!",
    "username": "differentuser"
  }'
```

**Response (400 Bad Request):**
```json
{
  "error": "User already exists"
}
```

---

### 2️⃣ Login to Get Token

**Endpoint:** `POST /api/auth/login`

**Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "SecurePass123!"
  }'
```

**Successful Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInByb2ZpbGVJZCI6MSwiZXhwIjoxNjI5Njk5NjAwfQ.signature",
  "user": {
    "id": 1,
    "email": "john.doe@example.com",
    "username": "johndoe",
    "profile_id": 1
  }
}
```

#### ❌ Invalid Email
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "wrong@example.com",
    "password": "SecurePass123!"
  }'
```

**Response (401 Unauthorized):**
```json
{
  "error": "Invalid credentials"
}
```

#### ❌ Wrong Password
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "WrongPassword123!"
  }'
```

**Response (401 Unauthorized):**
```json
{
  "error": "Invalid credentials"
}
```

---

### 3️⃣ Get Current User (Protected Route)

**Endpoint:** `GET /api/auth/me`

**Request:**
```bash
# Replace TOKEN with your actual JWT from registration or login
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Successful Response (200 OK):**
```json
{
  "id": 1,
  "email": "john.doe@example.com",
  "username": "johndoe",
  "profile_id": 1,
  "created_at": "2026-05-13T12:30:45.123Z"
}
```

#### ❌ Missing Token
```bash
curl -X GET http://localhost:5000/api/auth/me
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "No token provided"
}
```

#### ❌ Invalid Token
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer invalid.token.here"
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "Token verification failed"
}
```

#### ❌ Malformed Authorization Header
```bash
# Missing "Bearer " prefix
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Response (401 Unauthorized):**
```json
{
  "success": false,
  "error": "No token provided"
}
```

---

## 📝 Task CRUD Operations

All task endpoints require authentication. Use the JWT token from registration/login.

### Setup: Store Token for Easy Testing

In bash, you can save the token to a variable:
```bash
# Register and save token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "username": "testuser"
  }' | jq -r '.token')

echo $TOKEN
# Output: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Now use $TOKEN in all subsequent requests
```

---

### 1️⃣ Create a Task

**Endpoint:** `POST /api/tasks/:profileId`

**Request:**
```bash
curl -X POST http://localhost:5000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Finish Math Homework",
    "description": "Complete chapters 5-7 problems",
    "priority": 8,
    "points_value": 25,
    "due_date": "2026-05-14T18:00:00Z"
  }'
```

**Successful Response (201 Created):**
```json
{
  "success": true,
  "message": "Task created successfully",
  "task": {
    "id": 1,
    "title": "Finish Math Homework",
    "description": "Complete chapters 5-7 problems",
    "status": "pending",
    "priority": 8,
    "points_value": 25,
    "due_date": "2026-05-14T18:00:00Z",
    "created_at": "2026-05-13T12:30:45.123Z"
  }
}
```

---

### ✅ Validation Examples: Create Task

#### ❌ Missing Required Title
```bash
curl -X POST http://localhost:5000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "description": "This task has no title",
    "priority": 5
  }'
```

**Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "type": "field",
      "value": "",
      "msg": "Task title is required",
      "path": "title",
      "location": "body"
    }
  ]
}
```

#### ❌ Empty Title (only whitespace)
```bash
curl -X POST http://localhost:5000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "   ",
    "description": "Just whitespace",
    "priority": 5
  }'
```

**Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "type": "field",
      "value": "",
      "msg": "Task title is required",
      "path": "title",
      "location": "body"
    }
  ]
}
```

#### ❌ Title Too Long (max 255 characters)
```bash
curl -X POST http://localhost:5000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "This is a very long title that exceeds the maximum allowed length of 255 characters. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    "priority": 5
  }'
```

**Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "type": "field",
      "value": "This is a very long title...",
      "msg": "Task title must be less than 255 characters",
      "path": "title",
      "location": "body"
    }
  ]
}
```

#### ❌ Invalid Priority (must be 0-10)
```bash
curl -X POST http://localhost:5000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Task with invalid priority",
    "priority": 15
  }'
```

**Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "type": "field",
      "value": "15",
      "msg": "Priority must be between 0 and 10",
      "path": "priority",
      "location": "body"
    }
  ]
}
```

#### ❌ Negative Points Value
```bash
curl -X POST http://localhost:5000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Task with negative points",
    "points_value": -10
  }'
```

**Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "type": "field",
      "value": "-10",
      "msg": "Points value must be a positive integer",
      "path": "points_value",
      "location": "body"
    }
  ]
}
```

#### ❌ Invalid Date Format
```bash
curl -X POST http://localhost:5000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Task with bad date",
    "due_date": "May 14, 2026"
  }'
```

**Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "type": "field",
      "value": "May 14, 2026",
      "msg": "Due date must be a valid ISO 8601 date",
      "path": "due_date",
      "location": "body"
    }
  ]
}
```

---

### 2️⃣ Get All Tasks for a Profile

**Endpoint:** `GET /api/tasks/:profileId`

**Request:**
```bash
curl -X GET http://localhost:5000/api/tasks/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Successful Response (200 OK):**
```json
{
  "success": true,
  "count": 3,
  "tasks": [
    {
      "id": 1,
      "title": "Finish Math Homework",
      "description": "Complete chapters 5-7 problems",
      "status": "pending",
      "priority": 8,
      "points_value": 25,
      "due_date": "2026-05-14T18:00:00Z",
      "completed_at": null,
      "created_at": "2026-05-13T12:30:45.123Z",
      "updated_at": "2026-05-13T12:30:45.123Z"
    },
    {
      "id": 2,
      "title": "Read Chapter 3",
      "description": null,
      "status": "in_progress",
      "priority": 5,
      "points_value": 15,
      "due_date": null,
      "completed_at": null,
      "created_at": "2026-05-13T11:00:00.123Z",
      "updated_at": "2026-05-13T11:00:00.123Z"
    }
  ]
}
```

---

### 3️⃣ Get Single Task

**Endpoint:** `GET /api/tasks/:profileId/:taskId`

**Request:**
```bash
curl -X GET http://localhost:5000/api/tasks/1/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Successful Response (200 OK):**
```json
{
  "success": true,
  "task": {
    "id": 1,
    "title": "Finish Math Homework",
    "description": "Complete chapters 5-7 problems",
    "status": "pending",
    "priority": 8,
    "points_value": 25,
    "due_date": "2026-05-14T18:00:00Z",
    "completed_at": null,
    "created_at": "2026-05-13T12:30:45.123Z",
    "updated_at": "2026-05-13T12:30:45.123Z"
  }
}
```

#### ❌ Task Not Found
```bash
curl -X GET http://localhost:5000/api/tasks/1/999 \
  -H "Authorization: Bearer $TOKEN"
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Task not found"
}
```

---

### 4️⃣ Update a Task

**Endpoint:** `PUT /api/tasks/:profileId/:taskId`

You can update any combination of fields (title, description, status, priority, points_value, due_date).

#### Example 1: Update Status to In Progress
```bash
curl -X PUT http://localhost:5000/api/tasks/1/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "in_progress"
  }'
```

**Successful Response (200 OK):**
```json
{
  "success": true,
  "message": "Task updated successfully",
  "task": {
    "id": 1,
    "title": "Finish Math Homework",
    "description": "Complete chapters 5-7 problems",
    "status": "in_progress",
    "priority": 8,
    "points_value": 25,
    "due_date": "2026-05-14T18:00:00Z",
    "completed_at": null,
    "updated_at": "2026-05-13T12:31:00.123Z"
  }
}
```

#### Example 2: Update Status to Completed
When you set status to "completed", the API automatically sets `completed_at` to the current timestamp.

```bash
curl -X PUT http://localhost:5000/api/tasks/1/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "completed"
  }'
```

**Successful Response (200 OK):**
```json
{
  "success": true,
  "message": "Task updated successfully",
  "task": {
    "id": 1,
    "title": "Finish Math Homework",
    "description": "Complete chapters 5-7 problems",
    "status": "completed",
    "priority": 8,
    "points_value": 25,
    "due_date": "2026-05-14T18:00:00Z",
    "completed_at": "2026-05-13T12:31:15.123Z",
    "updated_at": "2026-05-13T12:31:15.123Z"
  }
}
```

#### Example 3: Update Multiple Fields
```bash
curl -X PUT http://localhost:5000/api/tasks/1/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Finish Math Homework - Extended",
    "description": "Complete chapters 5-8 problems (extended)",
    "priority": 9,
    "points_value": 35,
    "due_date": "2026-05-15T18:00:00Z"
  }'
```

**Successful Response (200 OK):**
```json
{
  "success": true,
  "message": "Task updated successfully",
  "task": {
    "id": 1,
    "title": "Finish Math Homework - Extended",
    "description": "Complete chapters 5-8 problems (extended)",
    "status": "completed",
    "priority": 9,
    "points_value": 35,
    "due_date": "2026-05-15T18:00:00Z",
    "completed_at": "2026-05-13T12:31:15.123Z",
    "updated_at": "2026-05-13T12:31:30.123Z"
  }
}
```

---

### ✅ Validation Examples: Update Task

#### ❌ Empty Title
```bash
curl -X PUT http://localhost:5000/api/tasks/1/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": ""
  }'
```

**Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "type": "field",
      "value": "",
      "msg": "Task title cannot be empty",
      "path": "title",
      "location": "body"
    }
  ]
}
```

#### ❌ Invalid Status Value
```bash
curl -X PUT http://localhost:5000/api/tasks/1/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "archived"
  }'
```

**Response (400 Bad Request):**
```json
{
  "errors": [
    {
      "type": "field",
      "value": "archived",
      "msg": "Status must be one of: pending, in_progress, completed",
      "path": "status",
      "location": "body"
    }
  ]
}
```

#### ❌ Task Not Found
```bash
curl -X PUT http://localhost:5000/api/tasks/1/999 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title": "Updated Title"}'
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Task not found"
}
```

---

### 5️⃣ Complete a Task (Convenience Endpoint)

**Endpoint:** `PATCH /api/tasks/:profileId/:taskId/complete`

This is a shorthand for marking a task as complete. Equivalent to `PUT` with `"status": "completed"`.

**Request:**
```bash
curl -X PATCH http://localhost:5000/api/tasks/1/1/complete \
  -H "Authorization: Bearer $TOKEN"
```

**Successful Response (200 OK):**
```json
{
  "success": true,
  "message": "Task marked as complete",
  "task": {
    "id": 1,
    "title": "Finish Math Homework",
    "status": "completed",
    "completed_at": "2026-05-13T12:32:00.123Z"
  }
}
```

---

### 6️⃣ Delete a Task

**Endpoint:** `DELETE /api/tasks/:profileId/:taskId`

**Request:**
```bash
curl -X DELETE http://localhost:5000/api/tasks/1/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Successful Response (200 OK):**
```json
{
  "success": true,
  "message": "Task deleted successfully",
  "task": {
    "id": 1,
    "title": "Finish Math Homework"
  }
}
```

#### ❌ Task Not Found
```bash
curl -X DELETE http://localhost:5000/api/tasks/1/999 \
  -H "Authorization: Bearer $TOKEN"
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Task not found"
}
```

---

## 🧪 Complete Testing Workflow

Here's a step-by-step workflow to test the entire system:

### Step 1: Register a User
```bash
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "AlicePassword123!",
    "username": "alice"
  }' | jq -r '.token')

echo "Token saved: $TOKEN"
```

### Step 2: Get Current User Info
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

Save the `profile_id` from the response. Let's call it `PROFILE_ID`.

### Step 3: Create Multiple Tasks
```bash
# Task 1
curl -X POST http://localhost:5000/api/tasks/PROFILE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Complete Math Homework",
    "description": "Chapters 5-7",
    "priority": 8,
    "points_value": 25
  }' | jq '.'

# Task 2
curl -X POST http://localhost:5000/api/tasks/PROFILE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Read English Book",
    "priority": 6,
    "points_value": 15
  }' | jq '.'

# Task 3
curl -X POST http://localhost:5000/api/tasks/PROFILE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Practice Piano",
    "description": "30 minutes of scales",
    "priority": 5,
    "points_value": 10
  }' | jq '.'
```

### Step 4: List All Tasks
```bash
curl -X GET http://localhost:5000/api/tasks/PROFILE_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Step 5: Get Single Task
```bash
# Get task 1 (replace with actual task ID from step 3)
curl -X GET http://localhost:5000/api/tasks/PROFILE_ID/1 \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Step 6: Update Task (Change Status)
```bash
curl -X PUT http://localhost:5000/api/tasks/PROFILE_ID/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status": "in_progress"
  }' | jq '.'
```

### Step 7: Complete Task
```bash
curl -X PATCH http://localhost:5000/api/tasks/PROFILE_ID/1/complete \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Step 8: Update Multiple Fields
```bash
curl -X PUT http://localhost:5000/api/tasks/PROFILE_ID/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Read English Book (Extended)",
    "description": "Read chapters 1-5",
    "priority": 7,
    "points_value": 20,
    "status": "completed"
  }' | jq '.'
```

### Step 9: Delete a Task
```bash
curl -X DELETE http://localhost:5000/api/tasks/PROFILE_ID/3 \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Step 10: Verify Tasks Remaining
```bash
curl -X GET http://localhost:5000/api/tasks/PROFILE_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## 🐛 Common Issues & Troubleshooting

### Issue: "Cannot POST /api/tasks/..."

**Cause:** Task routes not mounted in server.js

**Solution:** Make sure `server.js` includes:
```javascript
const taskRoutes = require('./routes/taskRoutes');
app.use('/api/tasks', taskRoutes);
```

### Issue: "No token provided" or "401 Unauthorized"

**Cause:** Missing or improperly formatted Authorization header

**Solutions:**
- Make sure token is from a successful register/login
- Use format: `Authorization: Bearer [TOKEN]`
- Don't forget the `Bearer ` prefix
- Token may have expired (tokens expire in 7 days)

### Issue: "Task not found" (404)

**Cause:** Using wrong profile_id or task_id

**Solution:**
- Verify task_id from GET /api/tasks/:profileId response
- Verify profile_id from GET /api/auth/me response
- Make sure you're using integer IDs, not strings

### Issue: "Validation failed" (400)

**Cause:** Invalid input data

**Solution:**
- Check error message for specific field
- Ensure dates are ISO 8601 format: "YYYY-MM-DDTHH:mm:ssZ"
- Ensure priority is 0-10, points_value is positive
- Ensure title is not empty and under 255 chars
- Ensure status is one of: pending, in_progress, completed

### Issue: "Server error" (500)

**Cause:** Database connection issue or unexpected error

**Solution:**
- Check that DATABASE_URL in .env is correct
- Check that PostgreSQL is running
- Check server console for error details
- Ensure all tables are created (users, profiles, tasks, user_stats)

---

## 📊 Response Format Reference

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "task": { /* task object */ },
  "count": 5,
  "timestamp": "2026-05-13T12:30:45.123Z"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Validation Error Response
```json
{
  "errors": [
    {
      "type": "field",
      "value": "actual-value",
      "msg": "Error message",
      "path": "field-name",
      "location": "body"
    }
  ]
}
```

---

## 🎯 Test Coverage

- ✅ User Registration with validation
- ✅ User Login
- ✅ Get Current User (protected route)
- ✅ Create Task with validation
- ✅ Get All Tasks
- ✅ Get Single Task
- ✅ Update Task (single and multiple fields)
- ✅ Complete Task (convenience endpoint)
- ✅ Delete Task
- ✅ Authentication (token required)
- ✅ Authorization (profile_id validation)
- ✅ Input Validation (all fields)
- ✅ Error Handling (404, 400, 401, 500)

---

## 🚀 Next Steps

After testing CRUD endpoints, implement:

1. **Routine Controller & Routes** - Similar structure to tasks
2. **Reward Controller & Routes** - Simple point-based rewards
3. **Achievement Controller & Routes** - Milestone tracking
4. **User Stats Controller** - Aggregate stats, points, achievements
5. **Database Transactions** - For multi-step operations
6. **Input Validation** - Use express-validator consistently
7. **API Documentation** - Swagger/OpenAPI spec

---

**Document:** API_TESTING_GUIDE.md  
**Created:** May 13, 2026  
**By:** Claude AI  
**Status:** Complete and ready for testing
