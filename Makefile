TEST_SETTINGS ?= mosqlimate.settings.test
TEST_ARGS ?= --settings=$(TEST_SETTINGS) --verbosity=2

ENV ?= dev
ifeq ($(ENV), dev)
  COMPOSE_FILES = docker-compose.yaml docker-compose.override.yaml
else
  COMPOSE_FILES = docker-compose.yaml
endif
COMPOSE_OPTS := $(foreach f,$(COMPOSE_FILES),-f $(f))

ifeq ($(SUGAR), true)
  BACKEND_RUN = sugar compose exec --service backend --options -T --cmd
  BACKEND_SHELL = sugar compose exec --service backend --options -T --cmd python manage.py shell
else
  BACKEND_RUN = docker compose $(COMPOSE_OPTS) exec -T backend
  BACKEND_SHELL = docker compose $(COMPOSE_OPTS) exec backend python manage.py shell
endif

.PHONY: test lint migrate migrations build up down start shell

test:
	$(BACKEND_RUN) python manage.py test $(TEST_ARGS)

lint:
	pre-commit run --all-files
	cd frontend && npm run typecheck

migrate:
	$(BACKEND_RUN) python manage.py migrate

migrations:
	$(BACKEND_RUN) python manage.py makemigrations

shell:
	$(BACKEND_SHELL)

build:
	docker compose $(COMPOSE_OPTS) build

up:
	docker compose $(COMPOSE_OPTS) up -d --build

down:
	docker compose $(COMPOSE_OPTS) down

start:
	docker compose $(COMPOSE_OPTS) start

restart:
	docker compose $(COMPOSE_OPTS) restart
