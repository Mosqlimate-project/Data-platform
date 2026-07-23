TEST_SETTINGS ?= mosqlimate.settings.test
TEST_ARGS ?= --settings=$(TEST_SETTINGS) --verbosity=2

ifeq ($(SUGAR), true)
  BACKEND_RUN = sugar compose exec --service backend --options -T --cmd
  BACKEND_SHELL = sugar compose exec --service backend --options -T --cmd python manage.py shell
else
  BACKEND_RUN = docker exec mosqlimate-2-backend-1
  BACKEND_SHELL = docker exec -it mosqlimate-2-backend-1 python manage.py shell
endif

.PHONY: test lint migrate migrations build up down shell test-cov

test:
	$(BACKEND_RUN) python manage.py test $(TEST_ARGS)

test-cov:
	$(BACKEND_RUN) coverage run manage.py test $(TEST_ARGS) registry
	$(BACKEND_RUN) coverage report -m
	$(BACKEND_RUN) coverage erase

lint:
	pre-commit run --all-files
	cd frontend && npm run typecheck

migrate:
	$(BACKEND_RUN) python manage.py migrate

migrations:
	$(BACKEND_RUN) python manage.py makemigrations

build:
	docker compose -f containers/compose.yaml build

up:
	docker compose -f containers/compose.yaml up -d

down:
	docker compose -f containers/compose.yaml down

shell:
	$(BACKEND_SHELL)
