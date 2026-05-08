.PHONY: lint lint-frontend lint-backend check-size format format-check test test-frontend test-backend verify

lint: lint-frontend lint-backend format-check check-size

lint-frontend:
	cd frontend && npm run lint

lint-backend:
	cd backend && go vet ./...

check-size:
	node scripts/check-file-size.mjs

format:
	cd frontend && npm run format

format-check:
	cd frontend && npm run format:check

test: test-frontend test-backend

test-frontend:
	cd frontend && npm run test

test-backend:
	cd backend && go test ./...

verify: lint test
	cd frontend && npm run build
	docker compose config
