FROM postgres:15-bullseye

ARG environment
ARG UID
ARG GID

RUN usermod -u ${UID} postgres \
  && groupmod -g ${GID} postgres \
  && echo "postgres:x:${UID}:${GID}:PostgreSQL,,,:/var/lib/postgresql:/bin/bash" >> /etc/passwd 

RUN mkdir -p /var/run/postgresql && chown -R postgres:postgres /var/run/postgresql

RUN mkdir -p /var/run/postgresql && chown -R postgres:postgres /var/run/postgresql

ENV DEBIAN_FRONTEND=noninteractive
ENV POSTGIS_MAJOR 3

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  build-essential \
  ca-certificates \
  postgresql-$PG_MAJOR-postgis-$POSTGIS_MAJOR \
  postgresql-$PG_MAJOR-postgis-$POSTGIS_MAJOR-scripts \
  postgresql-$PG_MAJOR-plr \
  postgresql-plpython3-$PG_MAJOR \
  postgresql-contrib \
  && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /docker-entrypoint-initdb.d

COPY ./contrib/postgres/update-postgis.sh /usr/local/bin

USER postgres

VOLUME /var/lib/postgresql/data

CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]
