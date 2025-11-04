#!/bin/bash
# Test script for webhook security features
# Usage: ./test-webhook-security.sh <webhook-url>

WEBHOOK_URL="${1:-http://localhost:3000/inbound}"
VALID_SECRET="${INBOUND_WEBHOOK_SECRET:-test-secret-123}"

echo "🔐 Testing Webhook Security"
echo "URL: $WEBHOOK_URL"
echo "Expected Secret: $VALID_SECRET"
echo ""

echo "Test 1: Missing X-Webhook-Secret header (expect 401)"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  -w "\nStatus: %{http_code}\n\n"

echo "Test 2: Invalid X-Webhook-Secret header (expect 401)"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: wrong-secret" \
  -d '{"test": "data"}' \
  -w "\nStatus: %{http_code}\n\n"

echo "Test 3: Missing Content-Type header (expect 415)"
curl -X POST "$WEBHOOK_URL" \
  -H "X-Webhook-Secret: $VALID_SECRET" \
  -d '{"test": "data"}' \
  -w "\nStatus: %{http_code}\n\n"

echo "Test 4: Wrong HTTP method (expect 404 - route not found)"
curl -X GET "$WEBHOOK_URL" \
  -H "X-Webhook-Secret: $VALID_SECRET" \
  -w "\nStatus: %{http_code}\n\n"

echo "Test 5: Payload too large (expect 413)"
LARGE_PAYLOAD=$(python3 -c "import json; print(json.dumps({'data': 'x' * 300000}))")
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $VALID_SECRET" \
  -d "$LARGE_PAYLOAD" \
  -w "\nStatus: %{http_code}\n\n"

echo "Test 6: Valid request with valid secret (expect 200 or 500 if no Convex)"
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: $VALID_SECRET" \
  -d '{"from": "test@example.com", "subject": "Test", "messageId": "test-123"}' \
  -w "\nStatus: %{http_code}\n\n"

echo "Test 7: Rate limit test (60+ requests, expect 429 eventually)"
echo "Sending 65 requests in quick succession..."
for i in {1..65}; do
  RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -H "X-Webhook-Secret: $VALID_SECRET" \
    -d "{\"messageId\": \"rate-test-$i\"}" \
    -w "%{http_code}")
  if [[ "$RESPONSE" == *"429"* ]]; then
    echo "✓ Rate limit hit at request $i (Status 429)"
    break
  fi
  if [ $i -eq 65 ]; then
    echo "⚠ No rate limit hit after 65 requests"
  fi
done

echo ""
echo "✅ Security tests complete"
