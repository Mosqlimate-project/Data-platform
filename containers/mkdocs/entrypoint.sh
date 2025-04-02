#!/bin/sh
set -e

wget -O ./docs/swagger.json https://api.mosqlimate.org/api/openapi.json

exec mkdocs serve --dev-addr=0.0.0.0:8000 --config-file ./mkdocs.yml
