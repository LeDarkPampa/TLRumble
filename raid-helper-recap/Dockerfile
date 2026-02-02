# Récap Raid-Helper - Image pour exécution planifiée (cron / NAS)
# Le script s'exécute une fois puis se termine (pas de processus long)
FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY run-recap.js run-scheduler.js ./

# Par défaut : planificateur (reste en marche, récap à 23h). Pour lancer le récap une seule fois : docker compose run --rm raid-helper-recap node run-recap.js
ENV NODE_ENV=production
CMD ["node", "run-scheduler.js"]
