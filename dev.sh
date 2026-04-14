#!/bin/sh
# Feedo - Pull images, build, and start containers
# Run from project root: ./dev.sh or npm run dev

set -e

echo "==> Pulling images from Docker Hub (if not already present)..."
docker compose pull 2>/dev/null || true

echo "==> Building images (pulling base images if needed)..."
docker compose build --pull

echo "==> Starting containers..."
docker compose up -d

echo ""
echo "==> Feedo is running!"
echo "    Frontend:  http://localhost:3000"
echo "    API:       http://localhost:5001"
echo ""
