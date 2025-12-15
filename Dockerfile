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
RUN if ! addgroup -S appgroup 2>/dev/null; then true; fi && \
    if ! adduser -S appuser -G appgroup 2>/dev/null; then true; fi
RUN chown -R appuser:appgroup /app
USER appuser

# Build the application
# Note: Linting is already validated in CI, so we skip it here to speed up deployment
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app

# Enable pnpm in the runtime image
RUN corepack enable

# Copy package files first
COPY --from=builder /app/package*.json /app/pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy the built dist
COPY --from=builder /app/dist ./dist

# Copy entrypoint script
COPY --from=builder /app/scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]