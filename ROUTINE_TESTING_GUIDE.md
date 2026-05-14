# Routine CRUD Testing Guide

**Date:** May 13, 2026  
**API Version:** 1.0.0  
**Status:** Ready for testing  

---

## 📋 Quick Start

All routine endpoints require:
- ✅ Valid JWT token in `Authorization: Bearer` header
- ✅ Valid profile UUID for the profile
- ✅ Server running on port 5000

---

## 🔐 Setup: Save Your Token

From earlier testing:
```bash
TOKEN="your_jwt_token"
PROFILE_ID="550e8400-e29b-41d4-a716-446655440000"  # Your profile UUID
```

---

## 📝 Routine CRUD Operations

### 1️⃣ Create a Routine

**Endpoint:** `POST /api/routines/:profileId`

**Simple Request (minimal fields):**
```bash
curl -X POST http://localhost:5000/api/routines/$PROFILE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Morning Exercise"
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Routine created successfully",
  "routine": {
    "id": 1,
    "title": "Morning Exercise",
    "description": null,
    "frequency": "daily",
    "time_of_day": null,
    "days_of_week": [1, 2, 3, 4, 5],
    "is_active": true,
    "points_value": 5,
    "created_at": "2026-05-13T12:30:45.123Z"
  }
}
```

**Complete Request (all optional fields):**
```bash
curl -X POST http://localhost:5000/api/routines/$PROFILE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Morning Jog",
    "description": "30 minutes of jogging",
    "frequency": "daily",
    "time_of_day": "06:30",
    "days_of_week": [1, 2, 3, 4, 5],
    "points_value": 15
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Routine created successfully",
  "routine": {
    "id": 1,
    "title": "Morning Jog",
    "description": "30 minutes of jogging",
    "frequency": "daily",
    "time_of_day": "06:30:00",
    "days_of_week": [1, 2, 3, 4, 5],
    "is_active": true,
    "points_value": 15,
    "created_at": "2026-05-13T12:30:45.123Z"
  }
}
```

---

### ✅ Validation Examples: Create Routine

#### ❌ Missing Title
```bash
curl -X POST http://localhost:5000/api/routines/$PROFILE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "description": "No title here",
    "points_value": 10
  }'
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "msg": "Routine title is required",
      "path": "title",
      "location": "body"
    }
  ]
}
```

#### ❌ Title Too Long
```bash
curl -X POST http://localhost:5000/api/routines/$PROFILE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.",
    "points_value": 10
  }'
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "msg": "Routine title must be less than 255 characters",
      "path": "title",
      "location": "body"
    }
  ]
}
```

#### ❌ Invalid Frequency
```bash
curl -X POST http://localhost:5000/api/routines/$PROFILE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Morning Jog",
    "frequency": "hourly"
  }'
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "msg": "Frequency must be one of: daily, weekly, biweekly, monthly, custom",
      "path": "frequency",
      "location": "body"
    }
  ]
}
```

#### ❌ Invalid Time Format (not HH:mm)
```bash
curl -X POST http://localhost:5000/api/routines/$PROFILE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Morning Jog",
    "time_of_day": "6:30"
  }'
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "msg": "Time of day must be in HH:mm format (24-hour)",
      "path": "time_of_day",
      "location": "body"
    }
  ]
}
```

#### ❌ Invalid Days of Week (outside 1-7)
```bash
curl -X POST http://localhost:5000/api/routines/$PROFILE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Morning Jog",
    "days_of_week": [1, 2, 3, 8, 9]
  }'
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "msg": "Each day must be integer 1-7 (1=Monday, 7=Sunday)",
      "path": "days_of_week",
      "location": "body"
    }
  ]
}
```

#### ❌ Negative Points Value
```bash
curl -X POST http://localhost:5000/api/routines/$PROFILE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Morning Jog",
    "points_value": -10
  }'
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "type": "field",
      "msg": "Points value must be a non-negative integer",
      "path": "points_value",
      "location": "body"
    }
  ]
}
```

---

### 2️⃣ Get All Routines

**Endpoint:** `GET /api/routines/:profileId`

**Request:**
```bash
curl -X GET http://localhost:5000/api/routines/$PROFILE_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "count": 3,
  "routines": [
    {
      "id": 1,
      "title": "Morning Jog",
      "description": "30 minutes of jogging",
      "frequency": "daily",
      "time_of_day": "06:30:00",
      "days_of_week": [1, 2, 3, 4, 5],
      "is_active": true,
      "points_value": 15,
      "created_at": "2026-05-13T12:30:45.123Z",
      "updated_at": "2026-05-13T12:30:45.123Z"
    },
    {
      "id": 2,
      "title": "Evening Study",
      "description": "Study for 2 hours",
      "frequency": "daily",
      "time_of_day": "19:00:00",
      "days_of_week": [1, 2, 3, 4, 5],
      "is_active": true,
      "points_value": 20,
      "created_at": "2026-05-13T12:31:00.123Z",
      "updated_at": "2026-05-13T12:31:00.123Z"
    }
  ]
}
```

---

### 3️⃣ Get Single Routine

**Endpoint:** `GET /api/routines/:profileId/:routineId`

**Request:**
```bash
curl -X GET http://localhost:5000/api/routines/$PROFILE_ID/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "routine": {
    "id": 1,
    "title": "Morning Jog",
    "description": "30 minutes of jogging",
    "frequency": "daily",
    "time_of_day": "06:30:00",
    "days_of_week": [1, 2, 3, 4, 5],
    "is_active": true,
    "points_value": 15,
    "created_at": "2026-05-13T12:30:45.123Z",
    "updated_at": "2026-05-13T12:30:45.123Z"
  }
}
```

#### ❌ Routine Not Found
```bash
curl -X GET http://localhost:5000/api/routines/$PROFILE_ID/999 \
  -H "Authorization: Bearer $TOKEN"
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Routine not found"
}
```

---

### 4️⃣ Update a Routine

**Endpoint:** `PUT /api/routines/:profileId/:routineId`

#### Update Single Field
```bash
curl -X PUT http://localhost:5000/api/routines/$PROFILE_ID/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "is_active": false
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Routine updated successfully",
  "routine": {
    "id": 1,
    "title": "Morning Jog",
    "description": "30 minutes of jogging",
    "frequency": "daily",
    "time_of_day": "06:30:00",
    "days_of_week": [1, 2, 3, 4, 5],
    "is_active": false,
    "points_value": 15,
    "updated_at": "2026-05-13T12:35:00.123Z"
  }
}
```

#### Update Multiple Fields
```bash
curl -X PUT http://localhost:5000/api/routines/$PROFILE_ID/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Extended Morning Jog",
    "description": "45 minutes of jogging",
    "time_of_day": "06:00",
    "points_value": 20
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Routine updated successfully",
  "routine": {
    "id": 1,
    "title": "Extended Morning Jog",
    "description": "45 minutes of jogging",
    "frequency": "daily",
    "time_of_day": "06:00:00",
    "days_of_week": [1, 2, 3, 4, 5],
    "is_active": true,
    "points_value": 20,
    "updated_at": "2026-05-13T12:36:00.123Z"
  }
}
```

#### Update Days of Week
```bash
curl -X PUT http://localhost:5000/api/routines/$PROFILE_ID/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "days_of_week": [1, 3, 5, 7]
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Routine updated successfully",
  "routine": {
    "id": 1,
    "title": "Extended Morning Jog",
    "description": "45 minutes of jogging",
    "frequency": "daily",
    "time_of_day": "06:00:00",
    "days_of_week": [1, 3, 5, 7],
    "is_active": true,
    "points_value": 20,
    "updated_at": "2026-05-13T12:37:00.123Z"
  }
}
```

#### ❌ Routine Not Found
```bash
curl -X PUT http://localhost:5000/api/routines/$PROFILE_ID/999 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"is_active": false}'
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Routine not found"
}
```

---

### 5️⃣ Delete a Routine

**Endpoint:** `DELETE /api/routines/:profileId/:routineId`

**Request:**
```bash
curl -X DELETE http://localhost:5000/api/routines/$PROFILE_ID/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Routine deleted successfully",
  "routine": {
    "id": 1,
    "title": "Extended Morning Jog"
  }
}
```

---

## 🔔 Routine Completion (Logging & Tracking)

### 6️⃣ Log Routine Completion

**Endpoint:** `POST /api/routines/:profileId/:routineId/complete`

When you mark a routine as complete, it:
- ✅ Creates a log entry
- ✅ Adds points to user_stats
- ✅ Increments routines_completed counter

**Request:**
```bash
curl -X POST http://localhost:5000/api/routines/$PROFILE_ID/1/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "notes": "Jogged 35 minutes, felt great!"
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Routine completion logged",
  "log": {
    "id": 1,
    "routine_id": 1,
    "completed_at": "2026-05-13T06:35:00.123Z",
    "notes": "Jogged 35 minutes, felt great!",
    "points_awarded": 15
  }
}
```

#### Without Notes
```bash
curl -X POST http://localhost:5000/api/routines/$PROFILE_ID/1/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{}'
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Routine completion logged",
  "log": {
    "id": 2,
    "routine_id": 1,
    "completed_at": "2026-05-13T19:00:00.123Z",
    "notes": null,
    "points_awarded": 15
  }
}
```

---

### 7️⃣ Get Routine Completion Logs

**Endpoint:** `GET /api/routines/:profileId/:routineId/logs`

Returns all times a routine was marked as complete.

**Request:**
```bash
curl -X GET http://localhost:5000/api/routines/$PROFILE_ID/1/logs?limit=10&offset=0 \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "count": 2,
  "total": 2,
  "limit": 10,
  "offset": 0,
  "logs": [
    {
      "id": 2,
      "routine_id": 1,
      "completed_at": "2026-05-13T19:00:00.123Z",
      "notes": null
    },
    {
      "id": 1,
      "routine_id": 1,
      "completed_at": "2026-05-13T06:35:00.123Z",
      "notes": "Jogged 35 minutes, felt great!"
    }
  ]
}
```

**Pagination:**
```bash
# Get second batch (next 10 logs)
curl -X GET http://localhost:5000/api/routines/$PROFILE_ID/1/logs?limit=10&offset=10 \
  -H "Authorization: Bearer $TOKEN"
```

---

### 8️⃣ Get Routine Statistics

**Endpoint:** `GET /api/routines/:profileId/:routineId/stats`

Returns completion statistics for a routine.

**Request:**
```bash
curl -X GET http://localhost:5000/api/routines/$PROFILE_ID/1/stats \
  -H "Authorization: Bearer $TOKEN"
```

**Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "totalCompletions": 2,
    "lastCompletionDate": "2026-05-13",
    "uniqueDaysCompleted": 1,
    "completionRate": "calculated on frontend"
  }
}
```

---

## 📊 Complete Testing Workflow

### Step 1: Create Multiple Routines
```bash
# Routine 1: Morning Jog
curl -X POST http://localhost:5000/api/routines/$PROFILE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Morning Jog",
    "description": "30 minutes",
    "frequency": "daily",
    "time_of_day": "06:30",
    "days_of_week": [1,2,3,4,5],
    "points_value": 15
  }' | jq '.routine.id' > routine1.id

# Routine 2: Evening Study
curl -X POST http://localhost:5000/api/routines/$PROFILE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Evening Study",
    "description": "2 hours of study",
    "frequency": "daily",
    "time_of_day": "19:00",
    "days_of_week": [1,2,3,4,5],
    "points_value": 20
  }' | jq '.routine.id' > routine2.id

# Routine 3: Weekend Hike
curl -X POST http://localhost:5000/api/routines/$PROFILE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Weekend Hike",
    "description": "Nature walk",
    "frequency": "weekly",
    "days_of_week": [6,7],
    "points_value": 30
  }' | jq '.routine.id' > routine3.id
```

### Step 2: List All Routines
```bash
curl -X GET http://localhost:5000/api/routines/$PROFILE_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Step 3: Update Routine
```bash
ROUTINE_ID=$(cat routine1.id)

curl -X PUT http://localhost:5000/api/routines/$PROFILE_ID/$ROUTINE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "points_value": 20
  }' | jq '.'
```

### Step 4: Log Completions
```bash
ROUTINE_ID=$(cat routine1.id)

# Log it 3 times
for i in 1 2 3; do
  curl -X POST http://localhost:5000/api/routines/$PROFILE_ID/$ROUTINE_ID/complete \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"notes": "Completion '"$i"'"}' | jq '.'
  sleep 1
done
```

### Step 5: Get Logs
```bash
ROUTINE_ID=$(cat routine1.id)

curl -X GET http://localhost:5000/api/routines/$PROFILE_ID/$ROUTINE_ID/logs \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Step 6: Get Stats
```bash
ROUTINE_ID=$(cat routine1.id)

curl -X GET http://localhost:5000/api/routines/$PROFILE_ID/$ROUTINE_ID/stats \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

### Step 7: Delete Routine
```bash
ROUTINE_ID=$(cat routine3.id)

curl -X DELETE http://localhost:5000/api/routines/$PROFILE_ID/$ROUTINE_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## 📋 Days of Week Reference

| Number | Day |
|--------|-----|
| 1 | Monday |
| 2 | Tuesday |
| 3 | Wednesday |
| 4 | Thursday |
| 5 | Friday |
| 6 | Saturday |
| 7 | Sunday |

**Examples:**
- `[1,2,3,4,5]` = Weekdays
- `[6,7]` = Weekends
- `[1,3,5]` = Monday, Wednesday, Friday
- `[1,2,3,4,5,6,7]` = Every day

---

## 📋 Frequency Values

| Value | Meaning |
|-------|---------|
| `daily` | Every day |
| `weekly` | Once per week |
| `biweekly` | Every 2 weeks |
| `monthly` | Once per month |
| `custom` | Custom schedule (set days_of_week manually) |

---

## 🧪 Test Coverage Checklist

### CRUD Operations
- [ ] Create routine with all fields
- [ ] Create routine with minimal fields
- [ ] Get all routines (empty list, multiple)
- [ ] Get single routine
- [ ] Update single field
- [ ] Update multiple fields
- [ ] Update days of week
- [ ] Delete routine

### Completion Logging
- [ ] Log completion without notes
- [ ] Log completion with notes
- [ ] Get completion logs
- [ ] Get completion stats
- [ ] Multiple completions same day
- [ ] Verify points awarded

### Validation
- [ ] Missing title (400)
- [ ] Title too long (400)
- [ ] Invalid frequency (400)
- [ ] Invalid time format (400)
- [ ] Invalid days of week (400)
- [ ] Negative points (400)
- [ ] Routine not found (404)

### Authentication
- [ ] No token (401)
- [ ] Invalid token (401)
- [ ] Valid token (success)

---

**Document:** ROUTINE_TESTING_GUIDE.md  
**Created:** May 13, 2026  
**Status:** Complete and ready for testing
