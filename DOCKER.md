# Docker Setup for Matsak API

This document explains how to run the Matsak API using Docker and Docker Compose with secure MongoDB authentication.

## Prerequisites

- Docker and Docker Compose installed on your system
- Git (to clone the repository)

## Environment Setup

### Security-First Configuration

1. **For Production**: Copy the production template:
```bash
cp .env.docker.production .env
```

2. **For Development**: Copy the sample file:
```bash
cp .env.sample .env
```

3. **REQUIRED**: Update the `.env` file with secure values:
   - `JWT_SECRET`: A secure secret key (minimum 64 characters)
   - `MONGO_ROOT_PASSWORD`: Secure MongoDB admin password
   - `MONGO_APP_PASSWORD`: Secure MongoDB application password
   - AWS credentials if using S3 for image storage
   - OAuth credentials for Google/Facebook login

### Security Features

- **MongoDB Authentication**: Both root admin and application users with minimal permissions
- **Network Isolation**: MongoDB not exposed to host in production
- **JWT Security**: No default fallback secrets - must be explicitly set
- **User Separation**: Application uses dedicated database user, not root

## Running with Docker Compose

### Production Environment

1. **Set up environment** (REQUIRED):
```bash
cp .env.docker.production .env
# Edit .env with your secure passwords and secrets
```

2. **Build and start services**:
```bash
docker-compose up -d
```

3. **View logs**:
```bash
docker-compose logs -f api
```

4. **Stop services**:
```bash
docker-compose down
```

### Development Environment

For development with hot reload:

1. **Set up environment**:
```bash
cp .env.sample .env
# Default dev passwords are provided, but change them for security
```

2. **Start development services**:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

3. **MongoDB access**: In development, MongoDB port 27017 is exposed for debugging.

## Services

### MongoDB (mongodb)
- **Authentication**: Root admin + dedicated application user
- **Database**: matsak
- **Volume**: `mongodb_data` for data persistence  
- **Health check**: Authenticated connection verification
- **Production**: No external port exposure
- **Development**: Port 27017 exposed for debugging

### API (api)
- **Port**: 8080
- **Authentication**: Uses dedicated MongoDB user
- **Volumes**: `./uploads` for file uploads
- **Auto-migration**: Runs authenticated database migrations on startup

## Database Security

### User Management

The system creates two MongoDB users:

1. **Root Admin** (`matsak_admin`): Full administrative access
2. **Application User** (`matsak_user`): Read/write access only to `matsak` database

### Connection Strings

- **Production**: `mongodb://matsak_user:password@mongodb:27017/matsak?authSource=matsak`
- **Development**: Same format with development credentials

## API Endpoints

Once running, the API is available at:
- **Base URL**: http://localhost:8080/api
- **Health check**: http://localhost:8080/api

## Database Migrations

Migrations run automatically with authenticated connections.

### Manual Migration Commands

```bash
# Check migration status
docker-compose exec api pnpm run migrate-mongo:status

# Run pending migrations  
docker-compose exec api pnpm run migrate-mongo:up

# Rollback last migration
docker-compose exec api pnpm run migrate-mongo:down
```

## Troubleshooting

### Authentication Issues

If you get MongoDB authentication errors:

1. **Check credentials**:
```bash
docker-compose logs mongodb | grep -i auth
```

2. **Reset MongoDB data** (WARNING: Deletes all data):
```bash
docker-compose down -v
docker-compose up -d
```

### Access MongoDB Shell

```bash
# Using root admin credentials
docker-compose exec mongodb mongosh -u matsak_admin -p your-admin-password --authenticationDatabase admin

# Using application credentials  
docker-compose exec mongodb mongosh -u matsak_user -p your-app-password --authenticationDatabase matsak matsak
```

### View Container Logs
```bash
docker-compose logs api
docker-compose logs mongodb
```

### Rebuild Containers
```bash
docker-compose build --no-cache
docker-compose up -d
```

## Security Best Practices

1. **Always set strong passwords** - Use 20+ character random passwords
2. **Keep .env files secure** - Never commit them to version control
3. **Regular updates** - Keep MongoDB and application images updated
4. **Network isolation** - Don't expose MongoDB port in production
5. **Monitor logs** - Check for authentication failures regularly

## File Structure

- `Dockerfile`: Production container configuration
- `Dockerfile.dev`: Development container configuration  
- `docker-compose.yml`: Production services with authentication
- `docker-compose.dev.yml`: Development services with authentication
- `.env.docker.production`: Production environment template
- `scripts/mongo-init.js`: MongoDB user initialization script
- `scripts/docker-entrypoint.sh`: Container startup script