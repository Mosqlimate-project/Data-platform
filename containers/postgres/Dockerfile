FROM postgres:15-bullseye

ARG environment
ARG UID
ARG GID

RUN usermod -u ${UID} postgres \
    && groupmod -g ${GID} postgres \
    && echo "postgres:x:${UID}:${GID}:PostgreSQL,,,:/var/lib/postgresql:/bin/bash" >> /etc/passwd 

RUN mkdir -p /var/run/postgresql && chown -R postgres:postgres /var/run/postgresql

ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        postgresql-contrib \
    && rm -rf /var/lib/apt/lists/*

USER postgres

VOLUME /var/lib/postgresql/data

# Overrides default image config
CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]
