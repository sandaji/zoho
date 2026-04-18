#!/bin/bash
# Test the refresh token endpoint
# This script tests the complete auth flow including token refresh

API_BASE="http://localhost:5000"

echo "🔐 Testing Auth & Token Refresh Flow"
echo "=================================="

# Step 1: Login and get initial token
echo -e "\n1️⃣ Logging in with test credentials..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}')

echo "Response: $LOGIN_RESPONSE"

# Extract token from response
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token. Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Got token: ${TOKEN:0:20}..."

# Step 2: Verify token works with /auth/me
echo -e "\n2️⃣ Verifying token with GET /v1/auth/me..."
ME_RESPONSE=$(curl -s -X GET "$API_BASE/v1/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $ME_RESPONSE"

# Step 3: Test token refresh
echo -e "\n3️⃣ Testing token refresh with POST /v1/auth/refresh..."
REFRESH_RESPONSE=$(curl -s -X POST "$API_BASE/v1/auth/refresh" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $REFRESH_RESPONSE"

# Extract new token
NEW_TOKEN=$(echo "$REFRESH_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$NEW_TOKEN" ]; then
  echo "❌ Failed to refresh token. Response: $REFRESH_RESPONSE"
  exit 1
fi

echo "✅ Got refreshed token: ${NEW_TOKEN:0:20}..."

# Step 4: Verify new token works
echo -e "\n4️⃣ Verifying refreshed token with GET /v1/auth/me..."
ME_RESPONSE_2=$(curl -s -X GET "$API_BASE/v1/auth/me" \
  -H "Authorization: Bearer $NEW_TOKEN" \
  -H "Content-Type: application/json")

echo "Response: $ME_RESPONSE_2"

if echo "$ME_RESPONSE_2" | grep -q '"success":true'; then
  echo -e "\n✅ ✅ ✅ Token refresh flow works perfectly!"
else
  echo -e "\n❌ New token failed verification"
  exit 1
fi
