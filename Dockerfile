FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable

# Copy package files for caching
COPY package*.json pnpm-lock.yaml ./

# Install full dependencies (including dev) required for build
# --frozen-lockfile ensures lockfile is respected
RUN pnpm install --frozen-lockfile

# Copy source code and build
COPY . .

# Clean any existing build output that might be present (e.g., from mounting host volume)
RUN rm -rf ./dist || true

# Run build as a non-root user to avoid permission issues when files are created by root on host
RUN addgroup -S appgroup && adduser -S appuser -G appgroup || true
RUN chown -R appuser:appgroup /app
USER appuser

# Run focused linter check for CI and fail build on lint errors
RUN pnpm run lint:ci

RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app

# Enable pnpm in the runtime image so the entrypoint can call pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create uploads directory
RUN mkdir -p uploads

# Copy production dependencies from builder's pnpm store via node_modules
# and the built dist
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Copy and set permissions for entrypoint script
COPY --from=builder /app/scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]