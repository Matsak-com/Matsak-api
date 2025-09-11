FROM node:20-alpine AS base

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable

# Copy package files first for better caching
COPY package*.json pnpm-lock.yaml ./

# Install dependencies with legacy peer deps to handle version conflicts
RUN pnpm install --frozen-lockfile --prod

# Copy source code
COPY . .

# Build the application
RUN pnpm run build

# Copy and set permissions for entrypoint script
COPY scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create uploads directory
RUN mkdir -p uploads

# Expose the application port
EXPOSE 8080

# Use the entrypoint script
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]