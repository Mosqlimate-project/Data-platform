# from https://github.com/postgis/docker-postgis/blob/969ef8a9e4a22e1556ca99cab4178f6e60c1483d/14-3.2/Dockerfile
# Reference: https://github.com/thegraphnetwork/epigraphhub_py/blob/main/docker/postgresql/Dockerfile
FROM postgres:15-bullseye

ENV PGDATA ${PGDATA}
ARG environment
ARG UID
ARG GID

RUN usermod -u ${UID} postgres \
    && groupmod -g ${GID} postgres \
    && echo "postgres:x:${UID}:${GID}:PostgreSQL,,,:/var/lib/postgresql:/bin/bash" >> /etc/passwd 

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        postgresql-contrib \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /var/lib/postgresql/data \
  && chown -R postgres:postgres /var/lib/postgresql/data /var/run/postgresql

USER postgres

# Overrides default image config
CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]
