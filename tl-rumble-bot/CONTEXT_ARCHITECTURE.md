# Contexte & Architecture – TL Rumble Bot

Référence rapide du projet (pour l’IA, les contributeurs ou toi-même plus tard). Dernière analyse : état actuel du code.

---

## 1. Contexte du projet

- **Nom :** TL Rumble – Bot Discord  
- **Usage :** Serveur Discord **TL Rumble** (jeu Throne and Liberty) + serveurs « fils » (annonces des créneaux).  
- **Objectif :** Gérer les **créneaux wargame** (slots), les **inscriptions** par groupes de **6 joueurs**, et diffuser les annonces vers d’autres serveurs.  
- **Déploiement :** Local (Node) ou NAS (Docker, volume `app-data` pour la base SQLite).

---

## 2. Stack technique

| Élément      | Choix                |
|-------------|----------------------|
| Runtime     | Node.js 18+          |
| Discord     | discord.js v14       |
| Config      | dotenv (.env)        |
| Base de données | SQLite (better-sqlite3) |
| Modules     | ES modules (`"type": "module"`) |

---

## 3. Structure actuelle du projet

```
tl-rumble-bot/
├── src/
│   ├── index.js                 # Point d'entrée : config, db, load commands/events, login
│   ├── config.js                # Lecture .env (token, clientId, rôles, timezone, db path, mainGuildId)
│   ├── deploy-commands.js       # Enregistrement slash commands (global + guild pour listen-messages, servers)
│   ├── commands/
│   │   ├── ping.js              # /ping
│   │   ├── slot.js              # /slot create | list | info | close | delete
│   │   ├── signup.js            # /signup (slot + 6 joueurs)
│   │   ├── tl-feed-setup.js     # /tl-feed-setup (canal) — serveurs autres que principal
│   │   ├── schedule-setup.js    # /schedule-setup (canal) — principal = schedule ; autres = feed
│   │   ├── listen-messages.js   # /listen-messages (enable/disable/status, enable-for-server, disable-for-server)
│   │   └── servers.js           # /servers — liste des serveurs + salons (Moderator, principal uniquement)
│   ├── services/
│   │   ├── slotService.js       # createSlot, listSlots, getSlotById, deleteSlot, getRegistrationsForSlot, etc.
│   │   ├── signupService.js     # validateSignup, createRegistration, isUserRegisteredInSlot
│   │   ├── feedService.js       # getFeedChannels, getFeedChannelsExcluding, setFeedChannel, getFeedChannelForGuild
│   │   ├── scheduleChannelService.js  # getScheduleChannelId, setScheduleChannel, getScheduleChannelForGuild
│   │   ├── scheduleMessageService.js  # postNewScheduleMessage, postToFeedChannels, updateScheduleMessage, deleteScheduleMessage
│   │   ├── teamService.js             # generateTeamsForSlot, postTeamsForSlot (équipes au rappel)
│   │   └── listeningService.js        # isGuildListening, setGuildListening
│   ├── db/
│   │   ├── db.js                # getDb (repli /app/data si SQLITE_CANTOPEN), schema + migrations
│   │   └── schema.sql           # slots, registrations, guild_feed_channels, guild_message_listening, message_log
│   ├── handlers/
│   │   ├── commandHandler.js    # Charge tous les .js dans commands/
│   │   └── eventHandler.js     # Charge tous les events depuis events/
│   └── events/
│       ├── ready.js             # Rappels 10 min avant wargame + postTeamsForSlot (getScheduleChannelId)
│       ├── interactionCreate.js # Boutons signup/view_slot, modal signup, commandes slash + garde main-guild pour servers/listen-messages
│       └── messageCreate.js     # Enregistrement messages (message_log) si écoute activée
├── docker-compose.yml           # Volume app-data:/app/data, env_file .env
├── Dockerfile                   # node:20-bookworm-slim, entrypoint : DATABASE_PATH=/app/data/tl-rumble.sqlite
├── .env.example
├── CONTEXT_ARCHITECTURE.md      # Ce fichier
├── README.md
└── docs/
    └── DEPLOIEMENT_NAS.md
```

---

## 4. Commandes (état actuel)

| Commande | Où visible | Qui | Rôle |
|----------|------------|-----|------|
| `/ping` | Partout (global) | Tous | Test |
| `/slot create` | Partout | Serveur principal uniquement si `MAIN_GUILD_ID` | Moderator/Admin |
| `/slot list` | Partout | Tous | Liste des créneaux |
| `/slot info id:<id>` | Partout | Tous | Détail d’un créneau |
| `/slot close id:<id>` | Partout | Serveur principal, Moderator/Admin | Ferme le créneau aux inscriptions (statut CLOSED, bouton désactivé) |
| `/slot delete id:<id>` | Partout | Serveur principal, Moderator/Admin | Supprime créneau + inscriptions + message schedule |
| `/signup` | Partout | Serveur principal si `MAIN_GUILD_ID` | Wargame Player, un des 6 joueurs |
| `/tl-feed-setup` | Partout | Serveurs **autres que** principal | Gérer le serveur — canal des annonces |
| `/schedule-setup` | Partout | Principal = canal schedule ; autres = canal feed | Principal : Moderator ; autres : Gérer le serveur |
| `/listen-messages` | **Serveur principal uniquement** (guild) | Principal | ManageGuild ; enable-for-server/disable-for-server = Moderator |
| `/servers` | **Serveur principal uniquement** (guild) | Principal | Moderator/Admin — liste des guildes + salons |

- **Déploiement des commandes :** si `MAIN_GUILD_ID` est défini, les commandes **listen-messages** et **servers** sont enregistrées uniquement sur ce serveur (guild) ; les autres sont en globales.  
- **Garde dans `interactionCreate` :** si quelqu’un appelle `/servers` ou `/listen-messages` hors du serveur principal, le bot répond que la commande n’est disponible que sur TL Rumble.

---

## 5. Base de données (SQLite)

- **Fichier :** `DATABASE_PATH` (.env) ou repli `/data/tl-rumble.sqlite` puis `/app/data/tl-rumble.sqlite` si SQLITE_CANTOPEN (Docker NAS).  
- **Tables :**
  - **slots** — id, datetime_utc, status (OPEN/CLOSED), max_groups, created_at, schedule_message_id, schedule_thread_id, reminder_sent  
  - **registrations** — id, slot_id, registrant_id, group_display_name, player1_id…player6_id, created_at  
  - **guild_feed_channels** — guild_id, channel_id (canal des annonces sur les serveurs fils)  
  - **guild_schedule_channels** — guild_id, channel_id (créé en migration dans db.js ; canal schedule ; prioritaire sur `WARGAME_SCHEDULE_CHANNEL_ID`)  
  - **guild_message_listening** — guild_id, enabled (0/1)  
  - **message_log** — historique des messages quand l’écoute est activée  

---

## 6. Variables d’environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| BOT_TOKEN | Oui | Token du bot Discord |
| CLIENT_ID | Oui | Application ID |
| MODERATOR_ROLE_ID | Oui | Rôle pour créer slots, delete, listen-messages, servers |
| WARGAME_PLAYER_ROLE_ID | Oui | Rôle pour s’inscrire |
| GUILD_ID | Non | Déploiement des commandes en guild (dev) |
| SERVER_TIMEZONE | Non | Défaut Europe/Paris |
| DATABASE_PATH | Non | Défaut ./data/tl-rumble.sqlite ; en Docker NAS souvent /app/data/tl-rumble.sqlite |
| WARGAME_SCHEDULE_CHANNEL_ID | Non | Canal schedule (fallback si pas de ligne en base dans guild_schedule_channels) |
| MAIN_GUILD_ID | Non | ID du serveur principal ; si défini : create/signup/schedule-setup (schedule) et listen-messages/servers limités à ce serveur ; feed sur les autres |

---

## 7. Flux principaux

- **Démarrage :** `validateConfig()` → `getDb(config.databasePath)` (repli /app/data si erreur) → `loadCommands` → `loadEvents` → `client.login()`.  
- **Création de slot :** `/slot create` → `slotService.createSlot` → si canal schedule configuré (`getScheduleChannelId()` : base puis env), `postNewScheduleMessage` + `postToFeedChannels` (tous les canaux feed hors serveur principal).  
- **Canal schedule :** `scheduleChannelService.getScheduleChannelId()` = `guild_schedule_channels` pour `MAIN_GUILD_ID`, sinon `WARGAME_SCHEDULE_CHANNEL_ID`. Configurable via `/schedule-setup` sur le serveur principal.  
- **Feed (annonces sur autres serveurs) :** `feedService.getFeedChannelsExcluding(mainGuildId)` ; si `mainGuildId` vide, tous les canaux feed ; sinon tous sauf le serveur principal. Configurable via `/tl-feed-setup` ou `/schedule-setup` sur chaque serveur fils.  
- **Inscription :** Bouton « S'inscrire » ou `/signup` → `signupService.validateSignup` → `createRegistration` → `updateScheduleMessage`.  
- **Rappel 10 min avant :** `ready.js` + intervalle → `getSlotsForReminder` → envoi dans le thread du slot ou dans le canal schedule (`getScheduleChannelId()`) + **postTeamsForSlot** (embed équipes).

---

## 8. Docker / NAS

- **Image :** Node 20 bookworm-slim, build des deps (better-sqlite3), gosu pour lancer le bot en tant que `node`.  
- **Entrypoint :** crée `/app/data`, `chown node`, `export DATABASE_PATH=/app/data/tl-rumble.sqlite`, puis `node src/index.js` (ou la commande passée).  
- **Volume :** `app-data:/app/data` (base SQLite persistante). Pas de montage `./data` par défaut pour éviter SQLITE_CANTOPEN sur NAS.  
- **Déploiement des commandes sur NAS :** `docker compose run --rm tl-rumble-bot node src/deploy-commands.js` (avec le .env du projet).

---

## 9. Où modifier quoi

| Besoin | Fichier(s) |
|--------|------------|
| Nouvelle commande slash | Nouveau fichier dans `src/commands/` (data + execute) |
| Logique slots / inscriptions | `slotService.js`, `signupService.js` |
| Génération / envoi des équipes (rappel) | `teamService.js` |
| Canal schedule / feed | `scheduleChannelService.js`, `feedService.js`, `scheduleMessageService.js` |
| Schéma DB | `schema.sql` + migrations dans `db.js` si besoin |
| Config / env | `config.js`, `.env.example` |
| Commandes réservées au serveur principal | `deploy-commands.js` (MAIN_GUILD_ONLY_COMMANDS), `interactionCreate.js` (garde) |

---

*Dernière mise à jour : réanalyse complète du projet.*
