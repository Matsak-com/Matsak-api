# Matsak API Docker Management

.PHONY: help build up down logs clean dev setup

# Default target
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Set up environment files (run this first!)
	@if [ ! -f .env ]; then \
		echo "Setting up environment file..."; \
		cp .env.docker.production .env; \
		echo "✅ Created .env file from production template"; \
		echo "⚠️  IMPORTANT: Edit .env and set secure passwords before running!"; \
		echo "   - MONGO_ROOT_PASSWORD"; \
		echo "   - MONGO_APP_PASSWORD"; \
		echo "   - JWT_SECRET"; \
	else \
		echo "✅ .env file already exists"; \
	fi

build: ## Build Docker images
	docker compose build --no-cache

up: setup ## Start all services in production mode (requires .env setup)
	@echo "🔐 Starting services with MongoDB authentication..."
	docker compose up -d

dev: ## Start all services in development mode with hot reload
	@if [ ! -f .env ]; then \
		echo "Setting up development environment..."; \
		cp .env.sample .env; \
		echo "✅ Created .env from sample for development"; \
	fi
	@echo "🔧 Starting development services..."
	docker compose -f docker-compose.dev.yml up -d

down: ## Stop all services
	docker compose down

logs: ## Show logs from all services
	docker compose logs -f

api-logs: ## Show logs from API service only
	docker compose logs -f api

mongo-logs: ## Show logs from MongoDB service only
	docker compose logs -f mongodb

clean: ## Stop services and remove volumes (WARNING: This will delete all data)
	docker compose down -v
	docker system prune -f

rebuild: down clean build up ## Complete rebuild and restart

status: ## Show status of all services
	docker compose ps

shell-api: ## Access API container shell
	docker compose exec api sh

shell-mongo: ## Access MongoDB shell with authentication
	@echo "Connecting to MongoDB with application credentials..."
	docker compose exec mongodb mongosh -u matsak_user --authenticationDatabase matsak matsak

shell-mongo-admin: ## Access MongoDB shell with admin credentials
	@echo "Connecting to MongoDB with admin credentials..."
	docker compose exec mongodb mongosh -u matsak_admin --authenticationDatabase admin

migrate: ## Run database migrations manually
	docker compose exec api npm run migrate-mongo:up

migrate-status: ## Check migration status
	docker compose exec api npm run migrate-mongo:status

security-check: ## Validate security configuration
	@echo "🔍 Checking security configuration..."
	@if ! grep -q "MONGO_ROOT_PASSWORD=" .env; then echo "❌ MONGO_ROOT_PASSWORD not set in .env"; exit 1; fi
	@if ! grep -q "MONGO_APP_PASSWORD=" .env; then echo "❌ MONGO_APP_PASSWORD not set in .env"; exit 1; fi
	@if ! grep -q "JWT_SECRET=" .env; then echo "❌ JWT_SECRET not set in .env"; exit 1; fi
	@echo "✅ Security configuration looks good"