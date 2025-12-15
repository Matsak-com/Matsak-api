<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Matsak API Features

### ⚠️ Breaking Changes - v2.0

**Multiple Images Support** - The product API now supports multiple images per product.

**What Changed:**
- Field name: `productImage` (singular) → `productImages` (plural)
- Type: Single file → Array of files (max 10)
- Endpoints affected: `POST /products`, `PUT /products/:id`

**Migration Required:**
```javascript
// ❌ OLD (v1.x)
formData.append('productImage', file);

// ✅ NEW (v2.0)
files.forEach(file => {
  formData.append('productImages', file);
});
```

📚 **Full Migration Guide:** [API_MIGRATION_MULTIPLE_IMAGES.md](./API_MIGRATION_MULTIPLE_IMAGES.md)

---

### Notification Module
The Matsak API includes a comprehensive notification system for managing email and SMS communications:

- **Email Notifications** - Template-based emails with Handlebars support
- **SMS Notifications** - Extensible SMS provider interface
- **Scheduled Sending** - Queue notifications for future delivery
- **MailHog Integration** - Email testing in development (http://localhost:8025)
- **Job Queue** - Bull-based queue with Redis for reliable delivery

📚 **Documentation:**
- [Complete Documentation](./NOTIFICATION_MODULE.md)
- [Quick Start Guide](./NOTIFICATION_QUICK_START.md)
- [Usage Examples](./examples/notification-usage.ts)

🚀 **Quick Example:**
```typescript
await notificationService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to Matsak',
  template: 'welcome',
  context: { name: 'John Doe', loginUrl: 'https://matsak.com/login' }
});
```

### Other Features
- Product Management
- Inventory Management  
- User Authentication & Authorization
- Team & Role Management
- Order Processing

For detailed information on specific features, see the documentation files in the repository root.

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

### Scaleway Serverless Containers (Production)

The application is automatically deployed to Scaleway Serverless Containers on every push to the `main` branch.

#### Prerequisites

1. **GitHub Secrets** - Configure the following secrets in your repository:

   **Scaleway Credentials:**
   - `SCW_ACCESS_KEY` - Scaleway API access key
   - `SCW_SECRET_KEY` - Scaleway API secret key
   - `SCW_ORGANIZATION_ID` - Scaleway organization ID
   - `SCW_PROJECT_ID` - Scaleway project ID
   - `SCW_CONTAINER_NAMESPACE` - Container registry namespace name
   - `SCW_SERVERLESS_NAMESPACE_NAME` - Serverless namespace name (default: `prod-matsak`)

   **External Database Services:**
   - `MONGO_URI` - MongoDB connection string (e.g., MongoDB Atlas)
   - `REDIS_URL` - Redis connection URL (e.g., Redis Cloud)
   - `ELASTICSEARCH_NODE` - Elasticsearch node URL (e.g., Elastic Cloud)
   - `ELASTICSEARCH_USER` - Elasticsearch username
   - `ELASTICSEARCH_PASSWORD` - Elasticsearch password

   **Application Configuration:**
   - `JWT_SECRET` - JWT signing secret
   - `CORS_ORIGIN` - Allowed CORS origins (e.g., `["https://yourdomain.com"]`)
   - `MAIL_HOST` - SMTP host
   - `MAIL_PORT` - SMTP port
   - `MAIL_USER` - SMTP username
   - `MAIL_FROM` - Email sender address
   - `AWS_ACCESS_KEY_ID` - AWS access key for S3
   - `AWS_SECRET_ACCESS_KEY` - AWS secret key for S3
   - `AWS_REGION` - AWS region
   - `AWS_S3_BUCKET` - S3 bucket name

2. **External Services** - Since Scaleway Serverless Containers only support HTTP/HTTPS (not raw TCP), you need external managed services:
   - **MongoDB**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) or [Scaleway Managed Database](https://www.scaleway.com/en/database/)
   - **Redis**: [Redis Cloud](https://redis.com/cloud/) or Scaleway Managed Database
   - **Elasticsearch**: [Elastic Cloud](https://cloud.elastic.co/)

#### Deployment Workflow

The deployment is handled by the `.github/workflows/deploy-scaleway.yml` workflow:

1. **Validation** - Checks that all required secrets are configured
2. **Build** - Builds Docker image using `Dockerfile` (production)
3. **Push** - Pushes image to Scaleway Container Registry
4. **Deploy** - Creates/updates serverless container with environment variables
5. **Health Check** - Waits for container to be ready and healthy

#### Manual Deployment

Trigger a manual deployment using GitHub Actions:

1. Go to **Actions** tab in GitHub
2. Select **Deploy to Scaleway** workflow
3. Click **Run workflow**
4. Select `main` branch
5. Click **Run workflow**

#### Local Development with Docker

For local development with all services (MongoDB, Elasticsearch, etc.):

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop all services
docker-compose down
```

#### Environment Variables

The production container receives these environment variables:
- `NODE_ENV=production`
- `PORT` (auto-injected by Scaleway, typically 8080)
- All secrets configured in GitHub (see Prerequisites above)

#### Monitoring

- **Container Status**: Check in Scaleway Console → Serverless Containers
- **Logs**: Available in Scaleway Console or via CLI: `scw container container logs <container-id> region=fr-par`
- **Health**: The API exposes health check endpoints for monitoring

For more details on NestJS deployment best practices, check out the [deployment documentation](https://docs.nestjs.com/deployment).

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
