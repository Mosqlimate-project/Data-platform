#!/bin/bash

set -e

psql -U $POSTGRES_USER <<- 'EOSQL'
CREATE DATABASE template_postgis IS_TEMPLATE true;
EOSQL

for DB in template_postgis "$POSTGRES_DB"; do
	echo "Loading PostGIS extensions into $DB"
	psql -U $POSTGRES_USER --dbname="$DB" <<-'EOSQL'
		CREATE EXTENSION IF NOT EXISTS postgis;
		CREATE EXTENSION IF NOT EXISTS postgis_topology;

		\c
		CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;
		CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;
EOSQL
done
