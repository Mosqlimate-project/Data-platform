#!/usr/bin/env bash

set -ex

npm install

if [ "$ENV" == "prod" ]; then
  npm run build:client
  npm run build:server
  npm run preview -- --host 0.0.0.0 --port $FRONTEND_PORT
else
  npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT
fi

if [ $# -ne 0 ]; then
  echo "Running: ${@}"
  exec "$@"
fi
