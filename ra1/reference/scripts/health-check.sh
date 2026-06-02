#!/bin/bash

API_URL="${API_URL:-http://localhost:3001}"

if ! command -v curl &> /dev/null; then
    echo "Error: curl is required"
    exit 1
fi

response=$(curl -s -w "\n%{http_code}" "$API_URL/health" 2>/dev/null)
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

if [ "$http_code" != "200" ]; then
    echo "❌ Health check failed (HTTP $http_code)"
    echo "$body"
    exit 1
fi

echo "✅ API Health: $API_URL/health"

services=$(echo "$body" | grep -o '"services":\[.*\]' | sed 's/\\"status\\":/"status":/g')

echo ""
echo "Service Status:"
echo "$body" | grep -oP '"name":"[^"]+"|"status":"[^"]+"' | while read -r line; do
    if echo "$line" | grep -q '"name"'; then
        name=$(echo "$line" | cut -d'"' -f4)
    elif echo "$line" | grep -q '"status"'; then
        status=$(echo "$line" | cut -d'"' -f4)
        if [ "$status" = "healthy" ]; then
            echo "  ✅ $name: $status"
        else
            echo "  ❌ $name: $status"
        fi
    fi
done

overall_status=$(echo "$body" | grep -oP '"status":"[^"]+"' | head -1 | cut -d'"' -f4)

if [ "$overall_status" = "healthy" ]; then
    echo ""
    echo "✅ All services healthy"
    exit 0
else
    echo ""
    echo "❌ Some services unhealthy"
    exit 1
fi