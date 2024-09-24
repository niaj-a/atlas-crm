.PHONY: install dev test build check up down
install:
	npm ci
dev:
	npm run dev
test:
	npm test
build:
	npm run build
check:
	npm run check
up:
	docker compose up --build
down:
	docker compose down
