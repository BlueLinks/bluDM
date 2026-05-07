.PHONY: lint lint-frontend lint-backend check-size test test-frontend test-backend verify

lint: lint-frontend lint-backend check-size

lint-frontend:
	cd frontend && npm run lint

lint-backend:
	cd backend && go vet ./...

check-size:
	node scripts/check-file-size.mjs

test: test-frontend test-backend

test-frontend:
	cd frontend && npm run test

test-backend:
	cd backend && go test ./...

verify: lint test
	cd frontend && npm run build
	docker compose config
