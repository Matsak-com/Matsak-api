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

Runs automatically on:
- Pushes to `dev` branch
- Manual trigger via workflow dispatch

### What it does:
- **Deploy MongoDB**: Deploys MongoDB 7.0 container (private, 2GB RAM, 1 vCPU)
- **Deploy Elasticsearch**: Deploys Elasticsearch 8.11.0 container (private, 4GB RAM, 2 vCPU)
- **Deploy Redis**: Deploys Redis 7-alpine container (private, 512MB RAM, 0.5 vCPU)
- **Deploy Mailhog**: Deploys Mailhog container for email testing (public UI, 256MB RAM, 0.25 vCPU)
- **Build Docker Image**: Builds and pushes API to Scaleway Container Registry
- **Deploy API Container**: Creates or updates main API container with auto-configured service URLs
- **Health Check**: Verifies deployment is successful
- **Auto-scaling**: API configured with min 1, max 5 instances

### Deployed Services:
- **API**: Main application (1-5 instances, 2GB RAM, 1 vCPU)
- **MongoDB**: Database (private network, 2GB RAM, 1 vCPU)
- **Elasticsearch**: Search and indexing (private network, 4GB RAM, 2 vCPU)
- **Redis**: Cache and session storage (private network, 512MB RAM, 0.5 vCPU)
- **Mailhog**: Email testing (public web UI at port 8025, 256MB RAM, 0.25 vCPU)

## Required GitHub Secrets

Add these secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):

### Scaleway Secrets:
```
SCW_ACCESS_KEY                 # Scaleway API access key
SCW_SECRET_KEY                 # Scaleway API secret key
SCW_ORGANIZATION_ID            # Scaleway organization ID
SCW_PROJECT_ID                 # Scaleway project ID
SCW_CONTAINER_NAMESPACE        # Container registry namespace (e.g., matsak)
SCW_CONTAINER_NAMESPACE_ID     # Container namespace ID
```

### Application Secrets:
```
JWT_SECRET                  # JWT signing secret
```

### AWS S3 Secrets:
```
AWS_ACCESS_KEY_ID          # AWS access key for S3
AWS_SECRET_ACCESS_KEY      # AWS secret access key
AWS_REGION                 # AWS region (e.g., us-east-1)
AWS_S3_BUCKET              # S3 bucket name
```

### Email Secrets:
```
MAIL_FROM                  # Sender email address
```

**Note**: MongoDB, Elasticsearch, Redis, and Mailhog are automatically deployed as separate containers in Scaleway. No manual configuration needed for:
- `MONGODB_URI`
- `ELASTICSEARCH_NODE`
- `REDIS_HOST`, `REDIS_PORT`
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`

## Getting Scaleway Credentials

1. **Access Keys**: 
   - Go to [Scaleway Console](https://console.scaleway.com/)
   - Navigate to `Project > API Keys`
   - Create a new API key

2. **Container Registry**:
   - Go to `Containers > Container Registry`
   - Create a namespace if you don't have one
   - Copy the namespace ID and name

3. **Organization & Project IDs**:
   - Found in your Scaleway Console URL
   - Or in `Project Settings > Project ID`

## Container Configuration

### API Container:
- **CPU**: 1000m (1 vCPU)
- **Memory**: 2048MB (2GB)
- **Port**: 3000
- **Timeout**: 300s
- **Auto-scaling**: 1-5 instances
- **Health check**: GET /api

### MongoDB Container:
- **CPU**: 1000m (1 vCPU)
- **Memory**: 2048MB (2GB)
- **Port**: 27017
- **Privacy**: Private (internal network only)
- **Scaling**: Fixed at 1 instance
- **Database**: matsak (auto-initialized)

### Elasticsearch Container:
- **CPU**: 2000m (2 vCPU)
- **Memory**: 4096MB (4GB)
- **Port**: 9200
- **Privacy**: Private (internal network only)
- **Scaling**: Fixed at 1 instance
- **Java Heap**: 2GB (-Xms2g -Xmx2g)
- **Security**: Disabled (xpack.security.enabled=false)

### Redis Container:
- **CPU**: 500m (0.5 vCPU)
- **Memory**: 512MB
- **Port**: 6379
- **Privacy**: Private (internal network only)
- **Scaling**: Fixed at 1 instance

### Mailhog Container:
- **CPU**: 250m (0.25 vCPU)
- **Memory**: 256MB
- **Port**: 8025 (Web UI)
- **SMTP Port**: 1025 (Email ingress)
- **Privacy**: Public (web UI accessible)
- **Scaling**: Fixed at 1 instance

## Manual Deployment

To manually trigger a deployment:
1. Go to `Actions` tab in GitHub
2. Select `Deploy to Scaleway` workflow
3. Click `Run workflow`
4. Select the `dev` branch
5. Click `Run workflow`

## Monitoring Deployments

After deployment, you can monitor your containers:
- **Scaleway Console**: `Containers > Containers`
- **API Logs**: Check logs for matsak-api-dev container
- **MongoDB Logs**: Check logs for matsak-mongodb-dev container
- **Elasticsearch Logs**: Check logs for matsak-elasticsearch-dev container
- **Redis Logs**: Check logs for matsak-redis-dev container
- **Mailhog UI**: Access via the public URL (displayed in deployment logs)
- **Metrics**: CPU, Memory, Request count in Console
- **GitHub Actions**: Check workflow run logs for deployment status and URLs

## Troubleshooting

### Tests failing:
- Check service health in CI logs
- Verify MongoDB/Elasticsearch/Redis are running
- Check test environment variables

### Deployment failing:
- Verify all required secrets are set
- Check Scaleway API key permissions
- Review container logs in Scaleway Console
- Ensure Docker build completes successfully

### Health check failing:
- Container might need more time to start
- Check application logs in Scaleway Console
- Verify environment variables are correct
- Test the /api endpoint manually

## Local Testing

To test the workflows locally:

```bash
# Install act (GitHub Actions local runner)
brew install act

# Run CI workflow
act pull_request -W .github/workflows/ci.yml

# Run deployment workflow (requires secrets)
act push -W .github/workflows/deploy-scaleway.yml --secret-file .secrets
```

## Accessing Deployed Services

After successful deployment, you'll see URLs in the GitHub Actions logs:

- **API**: `https://your-api-domain.scw.cloud/api`
- **MongoDB**: `mongodb://mongodb-domain.scw.cloud:27017/matsak` (private, internal only)
- **Elasticsearch**: `http://elasticsearch-domain.scw.cloud:9200` (private, internal only)
- **Redis**: `redis-domain.scw.cloud:6379` (private, internal only)
- **Mailhog UI**: `https://mailhog-domain.scw.cloud` (public, for viewing test emails)
- **Mailhog SMTP**: `mailhog-domain.scw.cloud:1025` (internal)

## Email Testing with Mailhog

Mailhog captures all emails sent by your application:
1. Your API sends emails to the Mailhog SMTP server
2. Access the Mailhog web UI to view captured emails
3. No emails are actually sent externally (perfect for testing)

## Security Notes

- Never commit secrets to the repository
- Rotate API keys regularly
- Use least privilege access for API keys
- Enable 2FA on Scaleway account
- Elasticsearch is on private network with security disabled (dev only)
- Redis is on private network (not publicly accessible)
- Mailhog UI is public (consider adding auth in production)
- Review container security settings
- Keep dependencies updated
- For production, enable Elasticsearch security features
