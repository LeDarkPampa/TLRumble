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

# Données et DB montés en volume ; le schéma est appliqué au premier lancement
ENV NODE_ENV=production
USER node

CMD ["node", "src/index.js"]
