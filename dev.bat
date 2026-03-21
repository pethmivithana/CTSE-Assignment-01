@echo off
REM Feedo - Pull images, build, and start containers
REM Run from project root: dev.bat or npm run dev

echo ==^> Pulling images from Docker Hub (if not already present)...
docker compose pull 2>nul

echo ==^> Building images (pulling base images if needed)...
docker compose build --pull

echo ==^> Starting containers...
docker compose up -d

echo.
echo ==^> Feedo is running!
echo     Frontend:  http://localhost:3000
echo     API:       http://localhost:3001
echo.
