# Matsak API Docker Management

.PHONY: help build up down logs clean dev

# Default target
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

build: ## Build Docker images
	docker-compose build --no-cache

up: ## Start all services in production mode
	docker-compose up -d

dev: ## Start all services in development mode with hot reload
	docker-compose -f docker-compose.dev.yml up -d

down: ## Stop all services
	docker-compose down

logs: ## Show logs from all services
	docker-compose logs -f

api-logs: ## Show logs from API service only
	docker-compose logs -f api

mongo-logs: ## Show logs from MongoDB service only
	docker-compose logs -f mongodb

clean: ## Stop services and remove volumes (WARNING: This will delete all data)
	docker-compose down -v
	docker system prune -f

rebuild: down clean build up ## Complete rebuild and restart

status: ## Show status of all services
	docker-compose ps

shell-api: ## Access API container shell
	docker-compose exec api sh

shell-mongo: ## Access MongoDB shell
	docker-compose exec mongodb mongosh matsak

migrate: ## Run database migrations manually
	docker-compose exec api npm run migrate-mongo:up

migrate-status: ## Check migration status
	docker-compose exec api npm run migrate-mongo:status