# Docker Setup for Matsak API

This document explains how to run the Matsak API using Docker and Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your system
- Git (to clone the repository)

## Environment Setup

1. Copy the environment variables file:
```bash
cp .env.sample .env
```

2. Update the `.env` file with your specific configuration values, especially:
   - `JWT_SECRET`: A secure secret key for JWT tokens
   - AWS credentials if using S3 for image storage
   - OAuth credentials for Google/Facebook login

## Running with Docker Compose

### Production Environment

1. Build and start all services:
```bash
docker-compose up -d
```

2. View logs:
```bash
docker-compose logs -f api
```

3. Stop services:
```bash
docker-compose down
```

### Development Environment

For development with hot reload:

1. Use the development compose file:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

2. The API will automatically restart when you make changes to the source code.

## Services

The Docker Compose setup includes:

### MongoDB (mongodb)
- **Port**: 27017
- **Database**: matsak  
- **Volume**: `mongodb_data` for data persistence
- **Health check**: Ensures MongoDB is ready before starting the API

### API (api)
- **Port**: 8080 
- **Health check**: Verifies the API is responding
- **Volumes**: 
  - `./uploads` for file uploads
- **Auto-migration**: Runs database migrations on startup

## API Endpoints

Once running, the API is available at:
- **Base URL**: http://localhost:8080/api
- **Health check**: http://localhost:8080/api (should return API status)

## Frontend Integration

The API is configured to accept CORS requests from common Vue.js development ports:
- http://localhost:3000 (Vue CLI default)
- http://localhost:8080 (Alternative Vue port)
- http://localhost:8081 (Alternative Vue port)  
- http://localhost:5173 (Vite default)

## Database Migrations

Migrations are automatically executed when the API container starts. The system uses `migrate-mongo` to manage database schema changes.

### Manual Migration Commands

If you need to run migrations manually:

```bash
# Check migration status
docker-compose exec api npm run migrate-mongo:status

# Run pending migrations  
docker-compose exec api npm run migrate-mongo:up

# Rollback last migration
docker-compose exec api npm run migrate-mongo:down
```

## Troubleshooting

### View container logs
```bash
docker-compose logs api
docker-compose logs mongodb
```

### Access container shell
```bash
docker-compose exec api sh
docker-compose exec mongodb mongosh matsak
```

### Reset database
```bash
docker-compose down -v  # This will remove the volume and all data
docker-compose up -d
```

### Rebuild containers
```bash
docker-compose build --no-cache
docker-compose up -d
```

## File Structure

- `Dockerfile`: Production container configuration
- `Dockerfile.dev`: Development container configuration  
- `docker-compose.yml`: Production services orchestration
- `docker-compose.dev.yml`: Development services orchestration
- `.dockerignore`: Files excluded from Docker build context
- `scripts/docker-entrypoint.sh`: Container startup script