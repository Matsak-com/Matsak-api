#!/bin/sh

# Check if MONGO_URI is set
if [ -z "$MONGO_URI" ]; then
  echo "Error: MONGO_URI environment variable is not set"
  exit 1
fi

echo "MONGO_URI is configured"
echo "Starting application..."

# Run migrations (optional - fails gracefully)
echo "Attempting to run database migrations..."
pnpm run migrate-mongo:up 2>&1 || echo "Note: Migrations skipped or failed - continuing with startup"

# Start the application
echo "Starting NestJS application on port ${PORT:-8080}..."
exec pnpm run start:prod