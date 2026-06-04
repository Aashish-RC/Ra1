# ============================================================
# RA1 Universal Makefile
# Run from project root:
#   make help        — Show this help
#   make init        — First-time setup: copy .env and generate secrets
#   make dev         — Start dev stack and open browser
#   make status      — Show health of all running services
#   make up          — Start all services
#   make down        — Stop all services
#   make build       — Build all images
#   make rebuild     — Force rebuild all images (no cache)
#   make logs        — Tail logs for all services
#   make ps          — Show running services
#   make restart     — Restart all services
#   make clean       — Stop and remove volumes (⚠️ destroys data!)
# ============================================================

.DEFAULT_GOAL := help

.PHONY: help init dev status up down build rebuild logs ps restart clean canvas-api

help:  ## Show this help
	@echo "RA1 Universal Docker Commands"
	@echo "=============================="
	@echo "make init      — First-time setup: copy .env and generate secrets"
	@echo "make dev       — Start dev stack and open browser"
	@echo "make status    — Show health of all running services"
	@echo "make up        — Start all services"
	@echo "make down      — Stop all services"
	@echo "make build     — Build all images"
	@echo "make rebuild   — Force rebuild all images (no cache)"
	@echo "make logs      — Tail logs for all services"
	@echo "make ps        — Show running services"
	@echo "make restart   — Restart all services"
	@echo "make clean     — Stop and remove volumes (⚠️ destroys data!)"
	@echo ""
	@echo "Custom subsets:"
	@echo "make up-min      — Start only essentials (postgres, valkey)"
	@echo "make up-canvas   — Start canvas + API + infra"
	@echo "make logs-canvas — Follow only canvas logs"
	@echo "make logs-api    — Follow only API logs"

init:  ## First-time setup: copy .env and generate required secrets
	@bash run.sh init

dev:  ## Start dev stack and open browser
	@bash run.sh dev

status:  ## Show health of all running services
	@bash run.sh status

up:  ## Start all services
	docker compose up -d

up-min:  ## Start minimal stack (postgres + valkey only)
	docker compose up -d postgres valkey

up-canvas:  ## Start canvas + API + full infrastructure
	docker compose up -d canvas api

down:  ## Stop all services
	docker compose down

build:  ## Build all images
	docker compose build

rebuild:  ## Force rebuild all images (no cache)
	docker compose build --no-cache

logs:  ## Tail logs for all services
	docker compose logs -f

logs-canvas:  ## Follow only canvas logs
	docker compose logs -f canvas

logs-api:  ## Follow only API logs
	docker compose logs -f api

ps:  ## Show running services
	docker compose ps

restart:  ## Restart all services
	docker compose restart

clean:  ## Stop and remove ALL containers AND volumes (⚠️ DESTROYS DATA!)
	docker compose down -v