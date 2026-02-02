# TL Rumble Bot - Image pour NAS / serveur
# better-sqlite3 nécessite une compilation native, on utilise une image Debian-based
FROM node:20-bookworm-slim

WORKDIR /app

# Dépendances pour better-sqlite3 (compilation native)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

# Script d'entrée : DB toujours dans /app/data (volume nommé) pour éviter SQLITE_CANTOPEN sur NAS
RUN apt-get update && apt-get install -y --no-install-recommends gosu && rm -rf /var/lib/apt/lists/*
RUN printf '%s\n' \
  '#!/bin/sh' \
  'set -e' \
  'mkdir -p /app/data' \
  'chown node:node /app/data' \
  'export DATABASE_PATH=/app/data/tl-rumble.sqlite' \
  'if [ $# -gt 0 ]; then' \
  '  exec gosu node "$@"' \
  'else' \
  '  exec gosu node node src/index.js' \
  'fi' \
  > /entrypoint.sh && chmod +x /entrypoint.sh

ENV NODE_ENV=production

ENTRYPOINT ["/entrypoint.sh"]