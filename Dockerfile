FROM node:20-alpine AS base

WORKDIR /app

COPY . .
RUN apk update && apk add --no-cache build-base g++ cairo-dev pango-dev libpng-dev
RUN pnpm install
RUN pnpm build

# Expose the application port
EXPOSE 8080

# Start the application
CMD ["pnpm", "run", "start:dev"]