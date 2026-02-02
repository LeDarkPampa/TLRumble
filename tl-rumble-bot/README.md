# TL Rumble – Bot Discord

Bot Discord pour le serveur **TL Rumble** (Throne and Liberty) : gestion des créneaux wargame et inscriptions par groupes de 6 joueurs.

---

## Présentation du projet

**TL Rumble** a pour but de proposer des **wargames accessibles à tous** : joueurs occasionnels, petites guildes et grandes communautés. Pas besoin d’être une méga-guild pour participer : on s’inscrit par **groupes de 6**, les créneaux sont ouverts à tous, et les équipes sont formées à partir des inscriptions. L’objectif est de **jouer ensemble** dans un esprit chill, **sans guerres d’égo** ni pression — juste des wargames réguliers, bien cadrés par le bot (créneaux, rappels, répartition des équipes).

Que tu sois en petite guilde ou en solo avec des potes, tu peux t’inscrire sur un créneau, retrouver d’autres joueurs TL et enchaîner les parties. Bienvenue à bord.

---

## Prérequis

- Node.js 18+
- Un bot Discord (token + Client ID)
- Rôles sur le serveur : **Moderator**, **Wargame Player**

## Comment obtenir les IDs (rôles, canal, serveur)

1. **Activer le mode développeur** : Discord → Paramètres utilisateur → Paramètres de l'application → **Mode développeur** : activer.
2. **Copier l'identifiant** : clic droit sur l'élément → **Copier l'identifiant**.
   - **Rôle** : Paramètres du serveur → Rôles → clic droit sur le rôle (ex. Moderator, Wargame Player).
   - **Canal** : clic droit sur le canal dans la liste (ex. #wargame-schedule).
   - **Serveur** : clic droit sur le nom du serveur (icône en haut à gauche).
3. **CLIENT_ID** (Application ID) : [Discord Developer Portal](https://discord.com/developers/applications) → ton application → **General Information** → **Application ID**.

## Installation

```bash
cd tl-rumble-bot
cp .env.example .env
# Éditer .env : BOT_TOKEN, CLIENT_ID, MODERATOR_ROLE_ID, WARGAME_PLAYER_ROLE_ID
npm install
```

## Déploiement des commandes

En **dev** (recommandé) : définir `GUILD_ID` dans `.env` pour que les commandes soient disponibles tout de suite sur ton serveur.

```bash
npm run deploy-commands
```

Puis démarrer le bot :

```bash
npm run dev
# ou
npm start
```

## Commandes

| Commande | Description | Qui / où |
|----------|-------------|----------|
| `/ping` | Vérifie que le bot répond | Tous |
| `/slot create` | Crée un créneau (date/heure dans la timezone serveur `SERVER_TIMEZONE`, optionnel max groupes) | Moderator, **serveur principal uniquement** si `MAIN_GUILD_ID` est défini |
| `/slot list` | Liste tous les créneaux (date/heure, statut, nb groupes) | Tous (tous les serveurs) |
| `/slot info id:<id>` | Affiche le détail d'un créneau (inscrits, etc.) | Tous |
| `/slot close id:<id>` | Ferme un créneau aux inscriptions (bouton « S'inscrire » désactivé) | Moderator, **serveur principal uniquement** |
| `/slot delete id:<id>` | Supprime un créneau et ses inscriptions | Moderator, **serveur principal uniquement** |
| `/signup` | Inscrit un groupe de 6 joueurs sur un créneau (choix du créneau dans la liste ou ID + 6 mentions) | Wargame Player, **serveur principal uniquement** si `MAIN_GUILD_ID` est défini |
| `/tl-feed-setup` | Configure le canal des annonces des nouveaux créneaux (pour ce serveur) | Gérer le serveur, **serveurs autres que TL Rumble** si `MAIN_GUILD_ID` est défini |
| `/schedule-setup` | Principal : canal des créneaux + inscription. Autres serveurs : canal des annonces | Principal : Moderator ; autres : Gérer le serveur |
| `/listen-messages` | Activer / désactiver l’enregistrement des messages écrits de ce serveur (historique en base) | **Serveur principal uniquement** — Admin / Gérer le serveur ; Moderator pour enable-for-server/disable-for-server |
| `/servers` | Lister les serveurs où le bot est présent et leurs salons (dont vocaux + qui est connecté) | Moderator, **serveur principal uniquement** |

## Inviter le bot sur d’autres serveurs (lien OAuth2)

Pour que d’autres guildes (serveurs) puissent utiliser le bot (ex. `/slot list`, `/tl-feed-setup`), ils doivent **inviter le bot** via le lien d’autorisation OAuth2.

### Méthode recommandée : URL Generator du portail Discord

1. Ouvre le [Discord Developer Portal](https://discord.com/developers/applications) → ton application → **OAuth2** → **URL Generator**.
2. Dans **SCOPES**, coche : **bot** et **applications.commands**.
3. Dans **BOT PERMISSIONS**, coche **uniquement** ces 3 permissions (liste courte pour ne pas inquiéter les guildes qui invitent le bot) :
   - **View Channels** (voir les salons)
   - **Send Messages** (envoyer des messages)
   - **Embed Links** (embeds)
4. Copie l’URL générée en bas de page et partage-la (site, message, etc.).  
   Quand quelqu’un clique, Discord lui demande de choisir un serveur et d’autoriser le bot ; après validation, le bot est ajouté sur ce serveur.

Avec ces 3 permissions, le bot fonctionne sur **tous** les serveurs (principal et miroirs). Sur le serveur principal, si tu veux que le **message schedule soit mis à jour** à chaque inscription, ajoute **après coup** au rôle du bot : **Read Message History**. Si tu veux les **threads** sous les messages schedule, ajoute aussi : **Create Public Threads** et **Send Messages in Threads**. Sans ces droits, le bot poste les messages et envoie les rappels dans le canal ; le message schedule ne sera pas mis à jour après inscription (sans Read Message History).

**Écoute des messages (`/listen-messages`) :** pour que le bot puisse enregistrer le contenu des messages écrits (historique), il faut activer l’intent privilégié **Message Content** dans le [Discord Developer Portal](https://discord.com/developers/applications) → ton application → **Bot** → **Privileged Gateway Intents** → cocher **Message Content Intent**. Sans cet intent, les messages ne seront pas stockés (le bot ne reçoit pas le texte).

### Permissions : serveur principal vs autres serveurs

| Permission | Serveur principal (TL Rumble) | Autres serveurs (miroir) |
|------------|------------------------------|--------------------------|
| **View Channels** | ✅ Nécessaire | ✅ Nécessaire (canal feed) |
| **Send Messages** | ✅ Nécessaire | ✅ Nécessaire |
| **Embed Links** | ✅ Nécessaire | ✅ Nécessaire |
| **Read Message History** | Optionnel (mise à jour du message schedule après inscription) | ❌ Inutile |
| **Create Public Threads** | Optionnel (threads sous les messages schedule) | ❌ Inutile |
| **Send Messages in Threads** | Optionnel (rappels dans le thread) | ❌ Inutile |

**Résumé :** le lien d’invitation ne demande que **3 permissions**. Sur le serveur principal, tu peux ajouter manuellement **Read Message History** (pour mettre à jour le message schedule) et les droits threads si tu le souhaites.

### Lien direct (si tu préfères)

L’URL contient le paramètre **`permissions=`** : c’est un entier (bitmask) qui indique quelles permissions demander. Avec les **3 permissions** recommandées ci-dessus (View Channels + Send Messages + Embed Links, sans Read Message History), la valeur est **`19456`**.

Exemple d’URL (remplace `TON_CLIENT_ID` par ton Application ID, même valeur que `CLIENT_ID` dans `.env`) :

```
https://discord.com/api/oauth2/authorize?client_id=TON_CLIENT_ID&permissions=19456&scope=bot%20applications.commands
```

*(Ancienne valeur 19008 incluait par erreur la permission « Vidéo » / Stream ; 19456 = uniquement View Channels + Send Messages + Embed Links.)*

Les personnes qui ont déjà invité le bot gardent les permissions actuelles du rôle ; seules les **nouvelles** invitations utiliseront cette liste (3 permissions).

**Important :** si l’option **Require OAuth2 Code Grant** est activée dans OAuth2 → General, désactive-la pour une invitation classique (sinon tu peux avoir une erreur à l’invitation).

---

## Comportement

- **Créneaux** : stockés en UTC ; affichés dans la timezone configurée (`SERVER_TIMEZONE`, défaut Europe/Paris).
- **Création de slot** : date et heure sont interprétées dans la **timezone du serveur** (`SERVER_TIMEZONE`, défaut Europe/Paris), puis converties en UTC pour le stockage (ex. `2025-01-20` + `20:00` = 20h00 heure locale).
- **Inscription** : la personne qui fait `/signup` doit être **l’un des 6 joueurs**. Le groupe est nommé automatiquement : `Groupe [ton display name]`.
- **Limite** : 16 groupes par créneau par défaut (modifiable via `max_groups` à la création).
- **Canal schedule** : si `WARGAME_SCHEDULE_CHANNEL_ID` est défini dans `.env`, chaque création de slot envoie un message (embed + bouton « S'inscrire ») dans ce canal et crée un thread sous le message. Le message est mis à jour à chaque inscription. Un rappel est envoyé **10 minutes avant** le wargame (dans le thread ou le canal).
- **Mode multi-guildes** : si `MAIN_GUILD_ID` est défini (ID du serveur TL Rumble), le bot se comporte différemment selon le serveur :
  - **Serveur principal (TL Rumble)** : `/slot create`, `/slot list`, `/signup`, canal schedule, threads, rappels. Les créneaux y sont créés et les inscriptions y sont gérées.
  - **Autres serveurs** : `/slot list` pour voir les créneaux ; `/tl-feed-setup` pour choisir un canal où le bot affichera les **nouveaux** wargames planifiés (embed informatif, inscriptions restant sur TL Rumble). `/slot create` et `/signup` sont désactivés avec un message explicatif.

## Documentation projet

- **GUIDE_UTILISATION.md** – Guide principal : configuration (.env, GUILD_ID vs MAIN_GUILD_ID), qui fait quoi, utilisation selon le serveur.
- **CONTEXT_ARCHITECTURE.md** – Contexte, décisions, architecture et flux (référence pour l’IA et les contributeurs).
- **RESTE_A_FAIRE.md** – Backlog : V2, améliorations, technique, idées.
- **EXEMPLES_COMMANDES.md** – Exemples d'utilisation de `/slot create`, `/slot list` et `/signup`.
- **docs/PROPOSITION_UX_SCHEDULE_ET_BOUTONS.md** – Proposition : message auto dans un canal schedule + inscription par bouton/modal.

## Structure

```
src/
├── index.js
├── config.js
├── deploy-commands.js
├── commands/
│   ├── ping.js
│   ├── slot.js           # create, list, info, delete
│   ├── signup.js
│   ├── tl-feed-setup.js  # canal des annonces (serveurs autres que principal)
│   ├── schedule-setup.js # canal schedule (principal) ou feed (autres serveurs)
│   ├── listen-messages.js
│   └── servers.js
├── services/
│   ├── slotService.js
│   ├── signupService.js
│   ├── feedService.js
│   ├── scheduleChannelService.js
│   ├── scheduleMessageService.js
│   └── listeningService.js
├── db/
│   ├── db.js
│   └── schema.sql
├── handlers/
│   ├── commandHandler.js
│   └── eventHandler.js
└── events/
    ├── ready.js
    ├── interactionCreate.js
    └── messageCreate.js
```

## Base de données

SQLite, fichier par défaut : `./data/tl-rumble.sqlite`. Le schéma est appliqué au premier lancement.

## Licence

MIT.
