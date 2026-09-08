#!/bin/sh
set -e

mkdir -p ./docs
for i in 1 2 3 4 5; do
  if wget -O ./docs/swagger.json https://api.mosqlimate.org/api/openapi.json; then
    break
  fi
  sleep 5
done

exec mkdocs serve --dev-addr=0.0.0.0:8000 --config-file ./mkdocs.yml
