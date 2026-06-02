#!/bin/bash

set -e

echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm is not installed"
    exit 1
fi

echo "Installing dependencies..."
pnpm install

echo "Checking for .env file..."
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please update .env with your configuration"
fi

echo "Starting Docker services..."
docker compose up -d

echo "Waiting for services to be healthy (up to 120 seconds)..."
TIMEOUT=120
START_TIME=$(date +%s)

wait_for_service() {
    local service=$1
    local port=$2
    while ! nc -z localhost $port 2>/dev/null; do
        CURRENT_TIME=$(date +%s)
        ELAPSED=$((CURRENT_TIME - START_TIME))
        if [ $ELAPSED -ge $TIMEOUT ]; then
            echo "Timeout waiting for $service"
            return 1
        fi
        sleep 2
    done
    echo "$service is ready"
}

wait_for_service "PostgreSQL" 5432
wait_for_service "Valkey" 6379
wait_for_service "ClickHouse" 8123
wait_for_service "Qdrant" 6333
wait_for_service "LiteLLM" 4000
wait_for_service "Infisical" 8080
wait_for_service "Ollama" 11434

echo ""
echo "==================================="
echo "RA1 Stack Started Successfully"
echo "==================================="
echo ""
echo "Services:"
echo "  - API:        http://localhost:3001"
echo "  - LiteLLM:    http://localhost:4000"
echo "  - PostgreSQL: localhost:5432"
echo "  - Valkey:     localhost:6379"
echo "  - ClickHouse: localhost:8123"
echo "  - Qdrant:     localhost:6333"
echo "  - Infisical:  http://localhost:8080"
echo "  - Ollama:     localhost:11434"
echo ""
echo "To pull the embedding model, run:"
echo "  docker exec -it ra1-ollama ollama pull nomic-embed-text"
echo ""