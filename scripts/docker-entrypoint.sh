#!/bin/sh

# Check if MONGO_URI is set
if [ -z "$MONGO_URI" ]; then
  echo "Error: MONGO_URI environment variable is not set"
  exit 1
fi

# Extract MongoDB host from connection string for basic connectivity check
# This is optional - the app will handle connection errors gracefully
MONGO_HOST=$(echo "$MONGO_URI" | sed -n 's/.*@\([^:\/]*\).*/\1/p')

if [ -n "$MONGO_HOST" ]; then
  echo "MongoDB host detected: $MONGO_HOST"
  echo "Note: Connection will be established by the application"
else
  echo "Warning: Could not parse MongoDB host from MONGO_URI"
  echo "Proceeding anyway - application will handle connection"
fi

# Run migrations
echo "Running database migrations..."
pnpm run migrate-mongo:up || echo "Warning: Migration failed, continuing anyway..."

# Start the application
echo "Starting the application on port ${PORT:-8080}..."
exec pnpm run start:prod