#!/bin/bash

# SmartTimetable API Test Script

echo "🧪 Testing SmartTimetable API..."
echo ""

# Test 1: Health Check
echo "1️⃣  Health Check"
curl -s http://localhost:5000/health | jq '.'
echo ""

# Test 2: API Welcome
echo "2️⃣  API Welcome"
curl -s http://localhost:5000/api | jq '.'
echo ""

# Test 3: Register User
echo "3️⃣  Register User"
curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPass123!",
    "username": "testuser123"
  }' | jq '.'
echo ""

# Test 4: Login (will use registered user)
echo "4️⃣  Login"
curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPass123!"
  }' | jq '.'
echo ""

echo "✅ Tests complete!"
