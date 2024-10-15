#!/usr/bin/env bash

set -ex

npm install

if [ "$ENV" == "dev" ]; then
  npm run dev
else
  npm run build
  npm run start
fi
