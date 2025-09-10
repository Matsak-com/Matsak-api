#!/bin/sh

# Simple wait for MongoDB using netcat (available in alpine)
echo "Waiting for MongoDB to be ready..."
while ! nc -z mongodb 27017; do
  echo "MongoDB is unavailable - sleeping"
  sleep 2
done

echo "MongoDB is ready!"

# Run migrations
echo "Running database migrations..."
npm run migrate-mongo:up

# Start the application
echo "Starting the application..."
exec npm run start:prod