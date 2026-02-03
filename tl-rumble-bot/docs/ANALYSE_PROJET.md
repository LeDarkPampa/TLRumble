# Analyse du projet – TL Rumble Bot

Analyse à jour du contexte, de l’état actuel et du reste à faire. Référence pour l’IA et les contributeurs.

**Dernière mise à jour :** février 2025.

---

## 1. Contexte et objectifs

### 1.1 Projet

- **Nom :** TL Rumble – Bot Discord  
- **Jeu :** Throne and Liberty (TL).  
- **Usage :** Serveur Discord **TL Rumble** (principal) + serveurs « fils » (annonces des créneaux, inscription possible depuis ces serveurs).  
- **Objectif :** Proposer des **wargames accessibles à tous** (petites guildes, joueurs occasionnels) : créneaux planifiés, inscriptions par **groupes de 6**, répartition automatique des équipes, annonces vers d’autres serveurs.

### 1.2 Fonctionnalités cœur

| Domaine | Fonctionnalité | État |
|--------|----------------|------|
| Créneaux | Création, liste, détail, fermeture, suppression | ✅ Implémenté |
| Inscriptions | Par commande `/signup` ou bouton + modal (6 mentions) | ✅ Implémenté |
| Schedule | Message embed + boutons par créneau, thread, mise à jour après inscription | ✅ Implémenté |
| Rappels | 10 min avant le wargame (thread ou canal schedule) | ✅ Implémenté |
| Équipes | Génération et envoi des équipes (répartition 1ère moitié / 2ᵉ moitié) au moment du rappel | ✅ Implémenté (`teamService`) |
| Multi-guildes | Feed (annonces sur serveurs fils), inscription depuis serveur fils (vérif rôle + membres sur TL Rumble) | ✅ Implémenté |
| Config | Canal schedule/feed par `/schedule-setup` et `/tl-feed-setup` | ✅ Implémenté |
| Optionnel | Écoute des inscriptions (`/listen-inscriptions`), liste des serveurs (`/servers`) | ✅ Implémenté |

### 1.3 Stack et déploiement

- **Runtime :** Node.js 18+  
- **Discord :** discord.js v14  
- **Config :** dotenv (`.env`)  
- **Base :** SQLite (better-sqlite3), fichier `DATABASE_PATH` (défaut `./data/tl-rumble.sqlite`, Docker : `/app/data/tl-rumble.sqlite`)  
- **Modules :** ES modules (`"type": "module"`)  
- **Déploiement :** Local ou NAS (Docker, `docker-compose`, volume `app-data`)

---

## 2. Structure actuelle du code

```
tl-rumble-bot/
├── src/
│   ├── index.js                 # Entrée : config, db, commandes/events, login, closeDb sur SIGINT/SIGTERM
│   ├── config.js                # .env : token, clientId, rôles, timezone, db, mainGuildId, wargameScheduleChannelId
│   ├── deploy-commands.js       # Slash commands (globales + guild pour listen-inscriptions, servers)
│   ├── commands/
│   │   ├── ping.js
│   │   ├── slot.js              # create | list | info | close | delete
│   │   ├── signup.js            # slot + 6 joueurs (autocomplete slot)
│   │   ├── tl-feed-setup.js     # Canal annonces (serveurs ≠ principal)
│   │   ├── schedule-setup.js    # Principal = canal schedule ; autres = canal feed
│   │   ├── listen-inscriptions.js   # enable-for-server, disable-for-server (avec ID serveur)
│   │   └── servers.js           # Liste serveurs + salons (Moderator, principal uniquement)
│   ├── services/
│   │   ├── slotService.js       # createSlot, listSlots, getSlotById, closeSlot, deleteSlot, getRegistrationsForSlot, getSlotsForReminder, markReminderSent
│   │   ├── signupService.js     # validateSignup, createRegistration, isUserRegisteredInSlot
│   │   ├── feedService.js       # Canaux feed (annonces)
│   │   ├── scheduleChannelService.js  # getScheduleChannelId, setScheduleChannel (guild_schedule_channels + fallback env)
│   │   ├── scheduleMessageService.js # postNewScheduleMessage, updateScheduleMessage, deleteScheduleMessage, postToFeedChannels
│   │   ├── teamService.js       # generateTeamsForSlot, postTeamsForSlot (embed équipes, appelé au rappel)
│   │   └── listeningService.js  # Écoute messages (message_log)
│   ├── db/
│   │   ├── db.js                # getDb, migrations (colonnes schedule, guild_schedule_channels, etc.), closeDb
│   │   └── schema.sql           # slots, registrations, guild_feed_channels, guild_message_listening, message_log
│   ├── handlers/
│   │   ├── commandHandler.js
│   │   └── eventHandler.js
│   └── events/
│       ├── ready.js             # Rappels 10 min (getSlotsForReminder) + postTeamsForSlot ; utilise getScheduleChannelId
│       ├── interactionCreate.js # Boutons signup/view_slot, modal signup, garde main-guild pour servers/listen-inscriptions
│       └── messageCreate.js     # Enregistrement messages si écoute activée
├── docker-compose.yml, Dockerfile, .env.example
├── README.md, CONTEXT_ARCHITECTURE.md, RESTE_A_FAIRE.md
├── GUIDE_UTILISATION.md, EXEMPLES_COMMANDES.md
└── docs/
    ├── ANALYSE_PROJET.md        # Ce fichier
    ├── RECAP_SERVEUR_PRINCIPAL_FILS.md
    ├── DEPLOIEMENT_NAS.md
    ├── PLAN_ACTION.md
    ├── AMELIORATIONS_FONCTIONNELLES.md
    └── ...
```

---

## 3. Base de données (SQLite)

- **Fichier :** `DATABASE_PATH` ou repli `./data/tl-rumble.sqlite` puis `/app/data/tl-rumble.sqlite` si SQLITE_CANTOPEN (Docker).
- **Tables :**
  - **slots** — id, datetime_utc, status (OPEN/CLOSED), max_groups, created_at, schedule_message_id, schedule_thread_id, reminder_sent
  - **registrations** — id, slot_id, registrant_id, group_display_name, player1_id…player6_id, created_at
  - **guild_feed_channels** — canal des annonces par serveur fils
  - **guild_schedule_channels** — canal schedule par guilde (créé en migration dans `db.js`, prioritaire sur `WARGAME_SCHEDULE_CHANNEL_ID`)
  - **guild_message_listening** — activation écoute des messages par serveur
  - **message_log** — historique des messages quand écoute activée

---

## 4. Flux principaux

- **Démarrage :** `validateConfig()` → `getDb()` (schéma + migrations) → chargement commandes/events → `client.login()`. À l’arrêt : `SIGINT`/`SIGTERM` → `closeDb()`.
- **Création de slot :** `/slot create` (date/heure en **timezone serveur** `SERVER_TIMEZONE`, Luxon) → `createSlot` → `postNewScheduleMessage` + `postToFeedChannels`.
- **Canal schedule :** `scheduleChannelService.getScheduleChannelId()` = base (`guild_schedule_channels` pour MAIN_GUILD_ID) puis `WARGAME_SCHEDULE_CHANNEL_ID`.
- **Inscription :** Bouton « S'inscrire » (modal 6 mentions) ou `/signup` → `signupService` → `createRegistration` → `updateScheduleMessage`. Depuis serveur fils : vérif rôle Wargame Player + 6 membres sur serveur principal.
- **Rappel 10 min avant :** `ready.js` (intervalle 1 min) → `getSlotsForReminder` → message dans le thread (ou canal schedule) + **postTeamsForSlot** (embed équipes 1 / équipes 2).

---

## 5. Reste à faire (synthèse)

### 5.1 V2 / Évolutions

- **/generate-teams** en commande explicite (optionnel : actuellement les équipes sont générées et postées automatiquement au rappel).
- **Équilibrage** des équipes (MMR, niveau, etc.) — à définir.
- **MMR / historique** joueurs — optionnel.

### 5.2 Améliorations court terme

- **Export / backup** : commande ou script staff (CSV/JSON, backup DB).
- **Logs** : traçabilité créations slots, inscriptions (fichier ou canal Discord).
- **Messages d’erreur** : centraliser (i18n ou constantes).
- **Comment obtenir les IDs** : déjà dans README ; à consolider si besoin dans `.env.example`.

### 5.3 Technique / Qualité

- **Tests** : unitaires (services) et/ou intégration (commandes).
- **Migrations DB** : schéma évolutif sans tout réappliquer à la main.
- **Health check** : endpoint ou commande (DB + Discord) pour monitoring.

### 5.4 Idées / À trancher

- **teamService** : actuellement utilise `config.wargameScheduleChannelId` en fallback ; pour cohérence avec le canal configuré via `/schedule-setup`, utiliser `getScheduleChannelId()` (comme dans `ready.js`).
- Inscription depuis guilde miroir : déjà possible (bouton + vérifs) ; `/signup` en commande reste limité au serveur principal.
- Format équipes (12v12, 18v18) : actuellement répartition simple (1ère moitié / 2ᵉ moitié) ; équilibrage à définir si besoin.

---

## 6. Références croisées

| Besoin | Fichier(s) |
|--------|------------|
| Contexte détaillé, variables d’env, commandes par rôle | **CONTEXT_ARCHITECTURE.md** |
| Backlog détaillé (cases à cocher) | **RESTE_A_FAIRE.md** |
| Serveur principal vs serveurs fils | **docs/RECAP_SERVEUR_PRINCIPAL_FILS.md** |
| Plan d’action par phases | **docs/PLAN_ACTION.md** |
| Idées fonctionnelles (désinscription, logs, etc.) | **docs/AMELIORATIONS_FONCTIONNELLES.md** |
| Déploiement NAS | **docs/DEPLOIEMENT_NAS.md** |

---

*Ce document est mis à jour à chaque analyse globale du projet.*
