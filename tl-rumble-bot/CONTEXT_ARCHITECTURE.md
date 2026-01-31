# Contexte & Architecture – TL Rumble Bot

Ce fichier sert de **référence rapide** pour retrouver le contexte et l’architecture du projet (pour l’IA, les contributeurs ou toi-même plus tard).

---

## 1. Contexte du projet

- **Nom :** TL Rumble – Bot Discord  
- **Usage :** Serveur Discord **TL Rumble** (jeu Throne and Liberty)  
- **Objectif :** Gérer les **créneaux wargame** (slots) et les **inscriptions** par groupes de **6 joueurs**.  
- **Scope V1 :** MVP uniquement (création de slots, liste, inscription). Pas de génération d’équipes, pas de notifications, pas de MMR.  
- **Déploiement cible :** Machine locale puis NAS (Docker-ready plus tard).

---

## 2. Stack technique

| Élément | Choix |
|--------|--------|
| Runtime | Node.js 18+ |
| Librairie Discord | discord.js v14 |
| Config | dotenv (.env) |
| Base de données V1 | SQLite (better-sqlite3) |
| Modules | ES modules (`"type": "module"`) |

---

## 3. Décisions métier validées

| Sujet | Décision |
|-------|----------|
| **Nom du groupe** | `"Groupe " + displayName` de celui qui fait `/signup` (fallback `username`) |
| **Qui inscrit** | Un des 6 joueurs fait `/signup` avec ses 5 coéquipiers ; pas de “leader” séparé |
| **Rôle staff** | **Moderator** pour créer les slots (les admins sont aussi moderator) |
| **Rôle joueur** | **Wargame Player** pour s’inscrire (nom sans emoji) |
| **Max groupes par slot** | **16** par défaut, modifiable à la création du slot |
| **Dates** | Stockage en **UTC** ; affichage en timezone configurable (`SERVER_TIMEZONE`) |
| **Saisie date/heure** | Pour `/slot create`, date et heure sont interprétées en **UTC** (à améliorer en saisie locale si besoin) |
| **Serveur Discord** | Un seul serveur (une guild) ; les 6 joueurs doivent être membres de ce serveur |

---

## 4. Architecture des dossiers

```
tl-rumble-bot/
├── src/
│   ├── index.js              # Point d'entrée : config, db, load commands/events, login
│   ├── config.js             # Lecture .env (token, clientId, guildId, rôles, timezone, db path)
│   ├── deploy-commands.js    # Enregistrement des slash commands (guild ou global)
│   ├── commands/             # Une commande = un fichier, export { data, execute }
│   │   ├── ping.js           # /ping
│   │   ├── slot.js           # /slot create, /slot list (subcommands)
│   │   └── signup.js         # /signup (slot + 6 users)
│   ├── services/             # Logique métier + accès DB
│   │   ├── slotService.js    # createSlot, listSlots, getSlotById, getRegistrationCountForSlot
│   │   └── signupService.js   # validateSignup, createRegistration, isUserRegisteredInSlot
│   ├── db/
│   │   ├── db.js             # getDb(path), closeDb(), chargement schema.sql
│   │   └── schema.sql        # slots + registrations
│   ├── handlers/
│   │   ├── commandHandler.js # Charge tous les .js dans commands/ (récursif)
│   │   └── eventHandler.js   # Charge tous les events depuis events/
│   └── events/
│       ├── ready.js          # once: ready
│       └── interactionCreate.js  # ChatInputCommand → command.execute(interaction)
├── data/                     # Créé au runtime (SQLite)
├── .env                      # Non versionné
├── .env.example
├── CONTEXT_ARCHITECTURE.md   # Ce fichier
├── RESTE_A_FAIRE.md          # Backlog / tâches
└── README.md
```

---

## 5. Flux principaux

### Démarrage

1. `index.js` : `validateConfig()` → `getDb(config.databasePath)` → `loadCommands(client)` → `loadEvents(client)` → `client.login(config.token)`  
2. Commandes : chargées depuis `commands/` (fichiers et sous-dossiers), stockées dans `client.commands` (Collection).  
3. Events : `ready`, `interactionCreate` ; pour une commande slash, `interactionCreate` appelle `command.execute(interaction)`.

### Création d’un slot

- Utilisateur : `/slot create` (date YYYY-MM-DD, time HH:mm, optionnel max_groups).  
- Vérification : rôle Moderator ou Admin.  
- `slotService.createSlot(datetimeUtcIso, maxGroups)` : rejet si même `datetime_utc` existe déjà.  
- Stockage : `slots` (datetime_utc, status OPEN, max_groups, created_at).

### Inscription

- Utilisateur : `/signup` (slot = ID, player1…player6 = User).  
- Vérification : rôle Wargame Player ou Admin ; l’auteur doit être un des 6 ; les 6 distincts et membres du serveur.  
- `signupService.validateSignup(interaction, slotId, playerIds)` : slot existant/OPEN, pas full, pas déjà inscrit, etc.  
- `signupService.createRegistration(slotId, registrantId, "Groupe " + displayName, playerIds)`.  
- Table : `registrations` (slot_id, registrant_id, group_display_name, player1_id…player6_id).

---

## 6. Base de données (V1)

- **Moteur :** SQLite, fichier par défaut `./data/tl-rumble.sqlite`.  
- **Tables :**
  - **slots** : id, datetime_utc (TEXT ISO), status (OPEN/CLOSED), max_groups, created_at. Unicité sur `datetime_utc`.  
  - **registrations** : id, slot_id, registrant_id, group_display_name, player1_id…player6_id, created_at. Unicité `(slot_id, registrant_id)`.  
  - **guild_feed_channels** : guild_id, channel_id, created_at.  
  - **guild_message_listening** : guild_id, enabled (0/1), created_at, updated_at. Écoute des messages par serveur (activée/désactivée via `/listen-messages`).  
  - **message_log** : id, guild_id, channel_id, channel_name, author_id, author_tag, author_name, content (tronqué 2000 car.), message_id, created_at. Historique des messages lorsque l’écoute est activée.  
- **Contraintes en code :** 6 joueurs distincts ; registrant parmi les 6 ; aucun joueur déjà inscrit pour ce slot ; count < max_groups.
- **Intent privilégié :** **Message Content** (Discord Developer Portal → Bot) requis pour que le contenu des messages soit enregistré dans `message_log`.

---

## 7. Variables d’environnement

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| BOT_TOKEN | Oui | Token du bot Discord |
| CLIENT_ID | Oui | Application ID du bot |
| MODERATOR_ROLE_ID | Oui | ID du rôle Moderator (création slots) |
| WARGAME_PLAYER_ROLE_ID | Oui | ID du rôle Wargame Player (inscription) |
| GUILD_ID | Non | Si défini : déploiement des commandes en guild (dev) |
| SERVER_TIMEZONE | Non | Timezone d’affichage (défaut Europe/Paris) |
| DATABASE_PATH | Non | Chemin fichier SQLite (défaut ./data/tl-rumble.sqlite) |
| MAIN_GUILD_ID | Non | ID du serveur principal TL Rumble. Si défini : mode multi-guildes (create/signup uniquement sur ce serveur ; autres = feed + /slot list + /tl-feed-setup). |

---

## 8. Où modifier quoi

| Besoin | Fichier(s) |
|--------|------------|
| Ajouter une commande slash | Nouveau fichier dans `src/commands/` avec `data` (SlashCommandBuilder) et `execute(interaction)` |
| Changer la logique slots | `src/services/slotService.js` |
| Changer les règles d’inscription | `src/services/signupService.js` (validateSignup, createRegistration) |
| Changer le schéma DB | `src/db/schema.sql` + migrations si besoin |
| Changer config / env | `src/config.js` et `.env.example` |
| Permissions / rôles | Vérifications dans les commandes (`config.moderatorRoleId`, `config.wargamePlayerRoleId`) |

---

## 9. Références externes

- Spec détaillée : `discord-bots/examples/tl-rumble-spec/SPEC_TL_RUMBLE_V1.md` (dans le repo CursorBot).  
- discord.js v14 : [SlashCommandBuilder](https://discord.js.org/#/docs/main/14/class/SlashCommandBuilder), [ApplicationCommandOptionType](https://discord.js.org/#/docs/main/14/typedef/ApplicationCommandOptionType).

---

*Dernière mise à jour : à adapter à chaque changement d’architecture ou de décision importante.*
