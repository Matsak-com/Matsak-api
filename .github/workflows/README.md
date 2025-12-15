# GitHub Actions Workflows

This repository contains two GitHub Actions workflows for CI/CD:

## 1. CI - Tests (`ci.yml`)

Runs automatically on:
- Pull requests to `dev` branch
- Pushes to `dev` branch

### What it does:
- **Unit & E2E Tests**: Runs all tests with Node.js 18.x and 20.x
- **Linting**: Checks code style and formatting
- **Test Coverage**: Generates and uploads coverage reports to Codecov
- **Security Scan**: Runs Trivy vulnerability scanner
- **Dockerfile Lint**: Validates Dockerfile with Hadolint

### Services:
- MongoDB 7.0
- Elasticsearch 8.11.0
- Redis 7

## 2. Deploy to Scaleway (`deploy-scaleway.yml`)

**Production deployment workflow for Scaleway Serverless Containers**

Runs automatically on:
- Pushes to `main` branch
- Manual trigger via workflow dispatch

### Architecture Overview

⚠️ **Important**: Scaleway Serverless Containers only support HTTP/HTTPS protocols. Raw TCP services (MongoDB, Redis, Elasticsearch) cannot be deployed as serverless containers.

**Deployment Strategy:**
- **API Application**: Deployed as Scaleway Serverless Container
- **Databases & Services**: External managed services (MongoDB Atlas, Redis Cloud, Elastic Cloud, etc.)

### What it does:

1. **Validate Secrets**: Ensures all required database connection strings are configured
2. **Build Docker Image**: Builds production image using `Dockerfile` (not `Dockerfile.dev`)
3. **Push to Registry**: Pushes image to Scaleway Container Registry with tags (`latest`, `main`, `sha-short`)
4. **Setup Namespaces**: Auto-creates Container Registry and Serverless Container namespaces if needed
5. **Delete Old Container**: Removes existing container to force fresh image pull
6. **Deploy Container**: Creates new container with updated environment variables
7. **Health Check**: Waits for container to be ready and healthy

### Deployed Configuration:

**API Container (Production):**
- **Name**: `matsak-api-prod`
- **CPU**: 1000m (1 vCPU)
- **Memory**: 2048MB (2GB)
- **Port**: 8080 (auto-injected by Scaleway)
- **Timeout**: 300s
- **Auto-scaling**: 1-5 instances
- **Region**: fr-par (Paris, France)
- **Image**: Production build (`Dockerfile`)
- **Update Strategy**: Delete & recreate (forces fresh image)

## Required GitHub Secrets

Add these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### Scaleway Credentials:
```
SCW_ACCESS_KEY                    # Scaleway API access key
SCW_SECRET_KEY                    # Scaleway API secret key
SCW_ORGANIZATION_ID               # Scaleway organization ID
SCW_PROJECT_ID                    # Scaleway project ID
SCW_CONTAINER_NAMESPACE           # Container registry namespace name
SCW_SERVERLESS_NAMESPACE_NAME     # Serverless namespace (default: prod-matsak)
```

### External Database Services:

⚠️ **Required**: Since Scaleway Serverless Containers don't support raw TCP, you must use external managed services:

**MongoDB** (Required):
```
MONGO_URI                         # Full connection string with auth
                                  # Example: mongodb+srv://user:pass@cluster.mongodb.net/matsak?retryWrites=true&w=majority
                                  # Providers: MongoDB Atlas, Scaleway Managed Database
```

**Redis** (Required):
```
REDIS_URL                         # Full Redis connection URL
                                  # Example: redis://default:password@hostname:port
                                  # Providers: Redis Cloud, Scaleway Managed Database
```

**Elasticsearch** (Required):
```
ELASTICSEARCH_NODE                # Full URL with protocol
ELASTICSEARCH_USER                # Elasticsearch username
ELASTICSEARCH_PASSWORD            # Elasticsearch password
                                  # Example: https://cluster-id.es.region.aws.cloud.es.io:9243
                                  # Providers: Elastic Cloud, Scaleway Managed Database
```

### Application Configuration:

**Security:**
```
JWT_SECRET                        # JWT signing secret (generate secure random string)
CORS_ORIGIN                       # Allowed CORS origins
                                  # Example: ["https://yourdomain.com","https://app.yourdomain.com"]
```

**Redis:**
```
REDIS_URL                         # Full Redis connection URL or hostname
                                  # Example: redis://hostname:6379 or just hostname
```

**Email/SMTP:**
```
MAIL_HOST                         # SMTP server host
MAIL_PORT                         # SMTP port (usually 587 or 465)
MAIL_USER                         # SMTP username
MAIL_PASSWORD                     # SMTP password
MAIL_FROM                         # Sender email address
```

**AWS S3 (for file uploads):**
```
AWS_ACCESS_KEY_ID                 # AWS access key
AWS_SECRET_ACCESS_KEY             # AWS secret key
AWS_REGION                        # AWS region (e.g., eu-west-1)
AWS_S3_BUCKET                     # S3 bucket name
```

## Getting Scaleway Credentials

1. **Create Scaleway Account**:
   - Sign up at [Scaleway Console](https://console.scaleway.com/)
   - Complete email verification

2. **Generate API Keys**: 
   - Navigate to: `Project > API Keys`
   - Click **Generate API Key**
   - Copy `Access Key` and `Secret Key`
   - Add to GitHub secrets as `SCW_ACCESS_KEY` and `SCW_SECRET_KEY`

3. **Get Organization & Project IDs**:
   - In Scaleway Console, go to `Organization Settings`
   - Copy **Organization ID**
   - Go to `Project Settings` → Copy **Project ID**
   - Add to GitHub secrets

4. **Container Registry Namespace**:
   - The workflow auto-creates the namespace if it doesn't exist
   - Choose a name (e.g., `matsak`) and add as `SCW_CONTAINER_NAMESPACE`
   - Or create manually: `Containers > Container Registry > Create namespace`

5. **Serverless Container Namespace**:
   - Default: `prod-matsak`
   - The workflow auto-creates it if needed
   - Add as `SCW_SERVERLESS_NAMESPACE_NAME` (or use default)

## Setting Up External Services

### MongoDB Atlas (Free Tier Available):
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free M0 cluster
3. Create database user with password
4. Whitelist IP: `0.0.0.0/0` (allow all) or specific Scaleway IPs
5. Get connection string: `mongodb+srv://user:password@cluster.mongodb.net/matsak`
6. Add as `MONGO_URI` secret

### Redis Cloud (Free Tier Available):
1. Create account at [Redis Cloud](https://redis.com/cloud/)
2. Create free database (30MB)
3. Get connection URL from database details
4. Add as `REDIS_URL` secret (format: `redis://default:password@hostname:port`)

### Elastic Cloud (Free Trial):
1. Create account at [Elastic Cloud](https://cloud.elastic.co/)
2. Create deployment (14-day trial)
3. Get Elasticsearch endpoint and credentials
4. Add as `ELASTICSEARCH_NODE`, `ELASTICSEARCH_USER`, `ELASTICSEARCH_PASSWORD`

### Alternative: Scaleway Managed Databases
Scaleway offers managed PostgreSQL, MySQL, and Redis:
- Go to: `Managed Databases > Create Instance`
- Choose your database type and plan
- Get connection details after provisioning

## Local Development vs Production

### Local Development (docker-compose.yml):
```bash
# Start all services locally
docker-compose up -d
```

**Includes:**
- MongoDB 7.0 (local container)
- Elasticsearch 8.10.0 (local container)
- API (built from Dockerfile)

**Use for:**
- Local development and testing
- Running migrations
- Testing with real databases
- Debugging

### Production (Scaleway):
**API Only** deployed as serverless container + **External managed services**

**Advantages:**
- Auto-scaling (1-5 instances)
- High availability
- Managed infrastructure
- Pay-per-use pricing
- Better security (managed databases with backups, monitoring)

## Environment Variables Reference

The production container receives these environment variables:

**Auto-injected by Scaleway:**
- `PORT=8080` (cannot be changed)

**From GitHub Secrets:**
- `NODE_ENV=production`
- `MONGO_URI` - MongoDB connection string
- `DB_URI` - Same as MONGO_URI (for compatibility)
- `REDIS_URL` - Redis connection URL
- `ELASTICSEARCH_NODE` - Elasticsearch endpoint
- `ELASTICSEARCH_USER` - Elasticsearch username
- `ELASTICSEARCH_PASSWORD` - Elasticsearch password
- `CORS_ORIGIN` - Allowed origins
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_FROM` - SMTP config
- `JWT_SECRET` - JWT signing key
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET` - AWS S3 config

## Container Lifecycle

1. **Push to main** → Workflow triggered
2. **Validate secrets** → Ensures all required secrets exist
3. **Build image** → Docker build from `Dockerfile`
4. **Push to registry** → Tags: `latest`, `main`, `sha-short`
5. **Delete old container** → Forces fresh image pull
6. **Create new container** → With updated environment variables
7. **Deploy** → Container starts and runs migrations
8. **Health check** → Waits for container to respond
9. **Ready** → API is live and serving requests

## Cost Optimization

**Scaleway Serverless Containers Pricing** (as of 2025):
- **Free tier**: 400,000 vCPU-seconds + 200,000 GB-seconds per month
- **Scaling**: Only pay for active instances
- **Auto-scaling**: Scales down to min instances when idle

**External Services Free Tiers:**
- **MongoDB Atlas**: M0 cluster (512MB, shared) - Forever free
- **Redis Cloud**: 30MB - Forever free
- **Elastic Cloud**: 14-day trial, then paid

**Estimated Monthly Cost:**
- Low traffic: ~€5-10 (mostly free tiers)
- Medium traffic: ~€20-40
- High traffic: ~€50+ (depends on scaling)

## Manual Deployment

To manually trigger a production deployment:

1. Go to **Actions** tab in GitHub
2. Select **Deploy to Scaleway** workflow
3. Click **Run workflow**
4. Select the `main` branch
5. Click **Run workflow**

The deployment process takes approximately 3-5 minutes.

## Monitoring Deployments

### Scaleway Console:
- **Containers**: `Containers > Serverless Containers > matsak-api-prod`
- **Logs**: Click on container → Logs tab
- **Metrics**: CPU usage, memory, request count, response times
- **Container Registry**: `Containers > Container Registry` → View pushed images

### GitHub Actions:
- **Workflow Status**: Check run status and logs
- **Build Logs**: See Docker build output
- **Deployment Steps**: Monitor each deployment phase
- **Container URL**: Displayed in deployment logs after success

### Health Monitoring:
```bash
# Install Scaleway CLI
curl -o /usr/local/bin/scw -L "https://github.com/scaleway/scaleway-cli/releases/latest/download/scaleway-cli_$(uname -s)_$(uname -m)"
chmod +x /usr/local/bin/scw

# Configure CLI
scw init

# Check container status
scw container container list region=fr-par

# View logs
scw container container logs <container-id> region=fr-par

# Get container details
scw container container get <container-id> region=fr-par
```

## Troubleshooting

### Secret Validation Fails:
```
❌ MONGO_URI secret is not set
```
**Solution**: Add the missing secret in GitHub repository settings

### Container Creation Fails:
```
Error: Namespace was not found
```
**Solution**: Workflow auto-creates namespaces. Check Scaleway API key permissions.

### Image Not Updated:
```
Container is using old code
```
**Solution**: The workflow now deletes and recreates containers on every deploy to force fresh image pull.

### Container Won't Start:
```
Container is unable to start OR is not listening on port 8080
```
**Solutions**:
- Check container logs in Scaleway Console
- Verify all environment variables are set correctly
- Ensure `MONGO_URI` is a valid connection string
- Check if external services (MongoDB, Redis, Elasticsearch) are accessible

### Database Connection Fails:
```
MongoServerError: Authentication failed
```
**Solutions**:
- Verify MongoDB connection string includes username, password, and `authSource`
- Example: `mongodb+srv://user:pass@host/dbname?authSource=admin`
- Check database user permissions
- Verify IP whitelist allows Scaleway IPs

### Health Check Timeout:
```
Waiting for container to be ready... (timeout)
```
**Solutions**:
- Container needs more time to start (migrations running)
- Check application logs for startup errors
- Verify the `/api` endpoint is accessible
- Increase timeout in workflow if needed

### Tests Failing in CI:
- Check MongoDB/Elasticsearch/Redis service health in CI logs
- Verify test environment variables
- Review test output for specific failures

## Local Testing with act

To test workflows locally before pushing:

```bash
# Install act (GitHub Actions local runner)
# macOS
brew install act

# Linux
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run CI workflow locally
act pull_request -W .github/workflows/ci.yml

# Test deployment workflow (requires secrets file)
# Create .secrets file with your secrets (DO NOT COMMIT)
act push -W .github/workflows/deploy-scaleway.yml --secret-file .secrets
```

**Note**: Full deployment testing with act is limited. Use staging deployments instead.

## Security Best Practices

✅ **Do:**
- Rotate API keys and secrets regularly (every 90 days)
- Use strong, unique passwords for all services
- Enable 2FA on Scaleway account
- Use least privilege access for API keys
- Keep dependencies updated (`pnpm update`)
- Review container security settings
- Monitor logs for suspicious activity
- Use environment-specific secrets (prod vs dev)
- Whitelist specific IPs when possible

❌ **Don't:**
- Commit secrets to repository
- Use weak or default passwords
- Share API keys across environments
- Disable security features in production
- Use public endpoints for databases
- Ignore security alerts and updates

## Accessing Deployed Application

After successful deployment, your API will be available at:

```
https://<container-id>-matsak-api-prod.functions.fnc.fr-par.scw.cloud
```

The exact URL is displayed in the GitHub Actions deployment logs.

**API Endpoints:**
- Health check: `GET /api`
- API documentation: `GET /api/docs` (if Swagger is enabled)
- All other endpoints as defined in your application

**External Services:**
- MongoDB: Accessible via `MONGO_URI` connection string (private)
- Redis: Accessible via `REDIS_URL` (private)
- Elasticsearch: Accessible via `ELASTICSEARCH_NODE` (private)

## Additional Resources

- [Scaleway Serverless Containers Documentation](https://www.scaleway.com/en/docs/serverless/containers/)
- [NestJS Deployment Guide](https://docs.nestjs.com/deployment)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Redis Cloud Documentation](https://docs.redis.com/latest/rc/)
- [Elastic Cloud Documentation](https://www.elastic.co/guide/en/cloud/current/index.html)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## Support and Contributing

For issues related to:
- **Application**: Open an issue in this repository
- **Scaleway Platform**: [Scaleway Support](https://console.scaleway.com/support)
- **External Services**: Contact respective service providers

---

**Last Updated**: December 2025
**Production Environment**: Scaleway Serverless Containers (fr-par region)
