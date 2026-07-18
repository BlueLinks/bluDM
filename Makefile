GO_VERSION ?= 1.26.5
GO_TOOLCHAIN ?= go$(GO_VERSION)

.PHONY: lint lint-frontend lint-backend check-size format format-check test test-frontend test-backend test-e2e verify verify-security verify-docker verify-recovery verify-full

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

test-e2e:
	cd frontend && npm run test:e2e

verify: lint test
	cd frontend && npm run build
	docker compose config

verify-security:
	cd frontend && npm audit --audit-level=high
	cd backend && GOTOOLCHAIN=$(GO_TOOLCHAIN) go run golang.org/x/vuln/cmd/govulncheck@latest ./...
	cd backend && GOTOOLCHAIN=$(GO_TOOLCHAIN) go run github.com/securego/gosec/v2/cmd/gosec@latest -exclude=G404 ./...

verify-docker:
	docker compose config
	docker compose build web api migrate
	@set -e; \
	trap 'status=$$?; if [ $$status -ne 0 ]; then docker compose logs --no-color || true; fi; docker compose down -v; exit $$status' EXIT; \
	docker compose up -d postgres api web; \
	timeout 90 sh -c 'until curl -fsS http://localhost:$${WEB_PORT:-3080}/health; do sleep 2; done'; \
	timeout 90 sh -c 'until curl -fsS http://localhost:$${WEB_PORT:-3080}/api/health; do sleep 2; done'; \
	cd frontend && E2E_BASE_URL=http://localhost:$${WEB_PORT:-3080} npm run test:e2e; \
	trap - EXIT; \
	docker compose down -v

verify-recovery:
	docker compose config
	docker compose build migrate
	scripts/verify-postgres-recovery.sh

verify-full: verify verify-security verify-docker verify-recovery
