FROM node:20-slim AS builder

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

# Build the application
# Note: Linting is already validated in CI, so we skip it here to speed up deployment
RUN pnpm run build

FROM node:20-slim AS runner
WORKDIR /app

# Enable pnpm in the runtime image
RUN corepack enable

# Copy package files first
COPY --from=builder /app/package*.json /app/pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy the built dist
COPY --from=builder /app/dist ./dist

# Copy entrypoint script and create uploads directory
COPY --from=builder /app/scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh && \
    mkdir -p uploads

EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]