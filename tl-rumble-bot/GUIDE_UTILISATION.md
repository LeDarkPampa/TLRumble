# Guide d'utilisation – TL Rumble Bot

Ce guide explique comment **configurer** le bot (propriétaire) et comment **l’utiliser** selon le serveur (TL Rumble ou autre).

---

## 1. Configuration (propriétaire du bot)

### 1.1 Variables d'environnement (`.env`)

| Variable | Obligatoire | Où la trouver | Rôle |
|----------|-------------|---------------|------|
| **BOT_TOKEN** | Oui | Developer Portal → Bot → Token | Connexion du bot à Discord |
| **CLIENT_ID** | Oui | Developer Portal → OAuth2 → General → Application ID | Identifiant de l’application |
| **MODERATOR_ROLE_ID** | Oui | Discord → Paramètres du serveur TL Rumble → Rôles → clic droit sur Moderator → Copier l’identifiant | Permission pour créer des créneaux |
| **WARGAME_PLAYER_ROLE_ID** | Oui | Même menu Rôles → clic droit sur Wargame Player → Copier l’identifiant | Permission pour s’inscrire |
| **GUILD_ID** | Non | Discord → clic droit sur le **nom du serveur** TL Rumble → Copier l’identifiant du serveur | Déploiement des commandes **sur ce serveur uniquement** (elles apparaissent tout de suite). Si vide, déploiement global (tous les serveurs, propagation jusqu’à 1 h). |
| **MAIN_GUILD_ID** | Non | Même valeur que l’ID du serveur TL Rumble | Si défini : **mode multi-guildes**. Le bot réserve création de créneaux et inscriptions au serveur TL Rumble ; les autres serveurs ont seulement `/slot list` et `/tl-feed-setup`. |
| **WARGAME_SCHEDULE_CHANNEL_ID** | Non | Clic droit sur le canal (ex. #wargame-schedule) → Copier l’identifiant | Canal où le bot envoie les messages de créneaux (embed + bouton + thread). |
| **SERVER_TIMEZONE** | Non | Ex. `Europe/Paris` | Timezone d’affichage des dates/heures. |
| **DATABASE_PATH** | Non | Ex. `./data/tl-rumble.sqlite` | Fichier SQLite. Par défaut `./data/tl-rumble.sqlite`. |

**Récupérer les IDs :** activer le **mode développeur** (Paramètres utilisateur → Paramètres de l’application → Avancés → Mode développeur). Ensuite, clic droit sur le serveur, un rôle ou un canal → **Copier l’identifiant**.

### 1.2 GUILD_ID vs MAIN_GUILD_ID

- **GUILD_ID** : utilisé **uniquement** par `npm run deploy-commands`. Si tu le remplis (souvent avec l’ID du serveur TL Rumble), les commandes sont enregistrées pour ce serveur uniquement → **propagation immédiate**. Les personnes qui ajoutent le bot sur leur serveur n’ont rien à faire avec leur ID.
- **MAIN_GUILD_ID** : utilisé **par le bot en fonctionnement**. C’est le serveur « principal » (TL Rumble) où création de créneaux et inscriptions sont autorisées. Sur les autres serveurs, seuls `/slot list` et `/tl-feed-setup` sont disponibles.

Tu peux mettre **le même ID** dans les deux (ton serveur TL Rumble) : GUILD_ID pour déploiement rapide, MAIN_GUILD_ID pour le mode multi-guildes.

### 1.3 Démarrage

```bash
cd tl-rumble-bot
cp .env.example .env
# Remplir .env (voir ci-dessus)
npm install
npm run deploy-commands   # Enregistrer les commandes (à refaire si tu ajoutes/modifies des commandes)
npm run dev              # Lancer le bot
```

Pour redémarrer : **Ctrl+C** puis `npm run dev`.

---

## 2. Utilisation selon le serveur

### 2.1 Sur le serveur principal (TL Rumble)

Quand **MAIN_GUILD_ID** est défini et que tu es sur ce serveur :

- **Moderator** : `/slot create` (date, heure, optionnel max groupes). Les créneaux sont annoncés dans le canal schedule (si configuré) et dans les canaux feed des autres serveurs.
- **Tous** : `/slot list` pour voir les créneaux.
- **Wargame Player** : `/signup` (slot + 6 joueurs dont toi) pour inscrire un groupe.
- **Tous** : `/ping` pour vérifier que le bot répond.

Le canal schedule (si **WARGAME_SCHEDULE_CHANNEL_ID** est défini) reçoit un message par créneau (embed + bouton « S'inscrire » + thread). Le message est mis à jour à chaque inscription. Un rappel est envoyé 10 minutes avant l’heure du wargame.

### 2.2 Sur un autre serveur (guilde « miroir »)

Quand **MAIN_GUILD_ID** est défini et que le bot est sur un **autre** serveur :

- **Tous** : `/slot list` pour voir les créneaux planifiés sur TL Rumble.
- **Admin / Gérer le serveur** : `/tl-feed-setup` avec l’option **canal** pour choisir où le bot enverra les **nouveaux** wargames planifiés (un message par nouveau créneau). Aucun ID à envoyer : le bot récupère l’ID du serveur automatiquement.
- **/slot create** et **/signup**** : désactivés ; le bot répond avec un message qui redirige vers le serveur TL Rumble.

Les personnes qui ajoutent le bot sur leur serveur n’ont **rien à faire** avec l’ID de leur serveur : elles invitent le bot, puis un admin fait `/tl-feed-setup canal:#un-canal`.

### 2.3 Sans mode multi-guildes (MAIN_GUILD_ID vide)

Si **MAIN_GUILD_ID** n’est pas défini : le bot se comporte comme avant. Toutes les commandes (`/slot create`, `/slot list`, `/signup`) sont disponibles sur **tous** les serveurs où le bot est invité. Aucune diffusion vers des canaux « feed » d’autres guildes.

---

## 3. Récapitulatif des commandes

| Commande | Serveur principal (TL Rumble) | Autres serveurs (si MAIN_GUILD_ID défini) |
|----------|-------------------------------|-------------------------------------------|
| `/ping` | ✅ Tous | ✅ Tous |
| `/slot list` | ✅ Tous | ✅ Tous |
| `/slot create` | ✅ Moderator | ❌ Message : uniquement sur TL Rumble |
| `/signup` | ✅ Wargame Player | ❌ Message : inscriptions sur TL Rumble |
| `/tl-feed-setup` | ❌ Message : uniquement sur les autres serveurs | ✅ Admin / Gérer le serveur |

---

## 4. Exemples de flux

### Sur TL Rumble (serveur principal)

1. Moderator : `/slot create` → date `2025-02-15`, time `20:00`.
2. Un message apparaît dans le canal schedule (embed + bouton + thread).
3. Les serveurs ayant configuré `/tl-feed-setup` reçoivent un message dans leur canal.
4. Wargame Player : `/slot list` → note l’ID (ex. 1) → `/signup` slot `1` + 6 joueurs.
5. Le message du créneau dans le canal schedule se met à jour (compteur, liste des groupes).
6. 10 minutes avant l’heure : rappel dans le thread (ou le canal).

### Sur un autre serveur

1. Un admin fait `/tl-feed-setup canal:#wargames-planifiés`.
2. À chaque nouveau créneau créé sur TL Rumble, un message apparaît dans #wargames-planifiés (date/heure, max groupes, « Inscriptions sur TL Rumble »).
3. Les membres peuvent faire `/slot list` pour voir tous les créneaux. Pour s’inscrire, ils doivent rejoindre le serveur TL Rumble et utiliser `/signup` là-bas.

---

*Pour les exemples détaillés de chaque commande, voir **EXEMPLES_COMMANDES.md**.*
