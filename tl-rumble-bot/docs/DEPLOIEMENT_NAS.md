# Déployer TL Rumble Bot sur un NAS

Ce guide décrit comment faire tourner le bot sur un NAS plutôt qu’en local, avec **Docker** (recommandé) ou **Node.js** directement.

---

## Prérequis

- **Discord** : `BOT_TOKEN`, `CLIENT_ID`, rôles, etc. (voir `.env.example`).
- **NAS** : soit Docker (Synology, QNAP, etc.), soit Node.js installable (SSH ou paquets).

---

## Option 1 : Docker (recommandé)

Convient aux NAS avec **Docker** (Synology DSM 7+, QNAP Container Station, etc.).

### 1. Préparer les fichiers sur le NAS

1. Copier tout le projet sur le NAS (Git, SMB, ou archive) dans un dossier dédié, par exemple :
   - Synology : ` /volume1/docker/tl-rumble-bot/`
   - QNAP : `/share/Container/tl-rumble-bot/`

2. Créer le fichier **`.env`** à la racine du projet (à côté de `docker-compose.yml`) à partir de `.env.example`, et remplir au minimum :
   - `BOT_TOKEN`
   - `CLIENT_ID`
   - `MODERATOR_ROLE_ID`
   - `WARGAME_PLAYER_ROLE_ID`

   Ne pas définir `DATABASE_PATH` dans `.env` : le compose utilise `/data/tl-rumble.sqlite` dans le volume.

3. Aucun dossier à créer pour la base : elle est stockée dans un **volume Docker** (`app-data`), ce qui évite les erreurs « unable to open database file » sur NAS.

### 2. Lancer avec Docker Compose

Depuis le dossier du projet (où se trouvent `Dockerfile` et `docker-compose.yml`) :

```bash
docker compose up -d --build
```

- `--build` : construit l’image la première fois (ou après modification du code).
- `-d` : exécution en arrière-plan.

Logs :

```bash
docker compose logs -f tl-rumble-bot
```

Arrêt :

```bash
docker compose down
```

Les données (base SQLite) restent dans le volume Docker `app-data`.

### 3. Stocker la base sur un dossier du NAS (optionnel)

Par défaut, la base SQLite est dans le volume Docker `app-data`. Pour la placer sur un dossier de votre NAS (sauvegardes, partage), montez ce dossier sur `/app/data` :

```yaml
volumes:
  - /volume1/docker/tl-rumble-bot/data:/app/data
```

Assurez-vous que le conteneur peut écrire dans ce dossier (ex. `chown 1000:1000` sur le dossier).

### 4. Déployer les commandes Discord

Après le premier démarrage, enregistrer les commandes slash une fois :

```bash
docker compose run --rm tl-rumble-bot node src/deploy-commands.js
```

Le bot lit le `.env` du projet (monté via `env_file`). Si besoin, vérifier que `CLIENT_ID` et `GUILD_ID` (optionnel) sont bien définis.

---

## Option 2 : Node.js directement sur le NAS

Pour un NAS **sans Docker** mais avec accès SSH ou Node.js (paquets / entware).

### 1. Installer Node.js sur le NAS

- **Synology** : Package Center → Node.js (ou installer via Entware / script communautaire).
- **QNAP** : Container Station ou paquet Node si disponible.
- **Autres** : souvent via SSH + script d’installation Node (nvm ou binaire officiel).

Vérifier :

```bash
node -v   # v18 ou v20 recommandé
npm -v
```

### 2. Copier le projet et les données

1. Copier le projet (Git ou archive) dans un dossier persistant, ex. `/volume1/apps/tl-rumble-bot/`.
2. Créer un fichier **`.env`** à la racine du projet (voir `.env.example`).
3. Pour que la base soit sur un volume dédié (recommandé), définir dans `.env` :
   ```env
   DATABASE_PATH=/volume1/apps/tl-rumble-bot/data/tl-rumble.sqlite
   ```
   Créer le dossier si besoin : `mkdir -p /volume1/apps/tl-rumble-bot/data`.

### 3. Installer les dépendances et lancer le bot

```bash
cd /volume1/apps/tl-rumble-bot
npm ci --omit=dev
npm start
```

### 4. Garder le bot actif (redémarrage auto)

- **Synology** : Planificateur de tâches → Créer une tâche « script utilisateur » au démarrage, qui fait `cd ... && node src/index.js` (ou utilise `pm2` si installé).
- **PM2** (si disponible) :
  ```bash
  npm install -g pm2
  pm2 start src/index.js --name tl-rumble-bot --cwd /volume1/apps/tl-rumble-bot
  pm2 save && pm2 startup
  ```

---

## Résumé des chemins

| Élément        | Docker                         | Node.js sur NAS                    |
|----------------|--------------------------------|------------------------------------|
| Code           | Dans l’image (build)          | Dossier du projet sur le NAS      |
| `.env`         | À côté de `docker-compose.yml`| À la racine du projet              |
| Base SQLite    | Volume Docker `app-data` (`/app/data`) | `DATABASE_PATH` dans `.env`       |
| Accès DB       | Volume nommé ou montage sur `/app/data`| Fichier pointé par `DATABASE_PATH`|

---

## Sécurité

- Ne jamais commiter `.env` (déjà dans `.gitignore`).
- Sur un NAS partagé, limiter les droits du dossier du bot et du fichier `.env` (lecture seule pour les autres utilisateurs si possible).
- Vérifier que le port du bot n’est pas exposé inutilement : le bot Discord fait des connexions sortantes uniquement, inutile d’ouvrir un port entrant pour lui.

---

## Dépannage

- **« SqliteError: unable to open database file »** : avec la configuration actuelle, la base est toujours dans le volume Docker `app-data` (`/app/data`). Reconstruisez l’image et redémarrez : `docker compose up -d --build`. Si vous avez personnalisé les volumes pour monter un dossier NAS sur `/app/data`, vérifiez les droits en écriture (ex. `chown 1000:1000` sur ce dossier).
- **Le bot ne se connecte pas** : vérifier `BOT_TOKEN`, pare-feu / proxy du NAS (le client Discord doit pouvoir joindre Internet).
- **Base corrompue ou vide** : en Docker, supprimer le volume `app-data` (`docker compose down -v` puis relancer) ou le fichier dans le conteneur ; le schéma sera recréé au prochain démarrage.
- **Commandes slash absentes** : lancer une fois `deploy-commands.js` (voir section Docker ci‑dessus ou équivalent en Node direct).
