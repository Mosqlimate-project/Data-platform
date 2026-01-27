FROM node:20-alpine AS base
WORKDIR /app

RUN apk add --no-cache bash sudo shadow

ARG UID
ARG GID

RUN deluser --remove-home node \
    && addgroup -g ${GID} mosqlimate \
    && adduser -u ${UID} -G mosqlimate -s /bin/bash -D mosqlimate \
    && mkdir -p /opt/services/mosqlimate /opt/conda \
    && chmod -R a+rwx /opt/conda /opt/services \
    && chown -R mosqlimate:mosqlimate /opt/services \
    && echo "mosqlimate ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/mosqlimate \
    && chmod 0440 /etc/sudoers.d/mosqlimate

FROM base AS deps
COPY frontend/package*.json ./
RUN npm ci --ignore-scripts

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=mosqlimate:mosqlimate frontend/ .
RUN npm run build

FROM base AS runner
WORKDIR /app

USER mosqlimate 

COPY --chown=mosqlimate:mosqlimate --from=builder /app/.next ./.next
COPY --chown=mosqlimate:mosqlimate --from=builder /app/public ./public
COPY --chown=mosqlimate:mosqlimate --from=builder /app/node_modules ./node_modules
COPY --chown=mosqlimate:mosqlimate --from=builder /app/package*.json ./
COPY --chown=mosqlimate:mosqlimate --from=builder /app/next.config.mjs ./next.config.mjs
