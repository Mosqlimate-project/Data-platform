#!/bin/sh
set -e

wget -O ./docs/swagger.json http://mosqlimate-django:8042/api/openapi.json

exec mkdocs serve --dev-addr=0.0.0.0:8000 --config-file ./mkdocs.yml
