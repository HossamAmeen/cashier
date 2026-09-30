# Simple POS backend (DRF_SKILL §45). Run from backend/.
PY ?= python
DB_CONTAINER ?= simple-pos-test-db

.PHONY: install install-dev run migrate makemigrations test coverage check lint format typecheck \
        contract-check db-up db-down shell collectstatic ci

install:
	pip install -r requirements/base.txt

install-dev:
	pip install -r requirements/development.txt

run:
	$(PY) manage.py runserver

migrate:
	$(PY) manage.py migrate

makemigrations:
	$(PY) manage.py makemigrations

test:
	pytest

coverage:
	pytest --cov=. --cov-report=term-missing

check:
	$(PY) manage.py check
	DJANGO_SETTINGS_MODULE=config.settings.test $(PY) manage.py makemigrations --check --dry-run

lint:
	ruff check .
	ruff format --check .

format:
	ruff format .
	ruff check --fix .

typecheck:
	mypy .

contract-check:
	DJANGO_SETTINGS_MODULE=config.settings.test $(PY) scripts/contract_check.py

# Local Postgres 16 for tests (unit/integration only; never E2E/QA — CLAUDE.md §7).
db-up:
	docker run -d --rm --name $(DB_CONTAINER) -e POSTGRES_USER=pos -e POSTGRES_PASSWORD=pos -e POSTGRES_DB=pos \
	  -p 127.0.0.1:55432:5432 postgres:16-alpine
	@until docker exec $(DB_CONTAINER) pg_isready -U pos >/dev/null 2>&1; do sleep 1; done

db-down:
	docker stop $(DB_CONTAINER)

shell:
	$(PY) manage.py shell

collectstatic:
	$(PY) manage.py collectstatic --noinput

ci: lint typecheck check test contract-check
