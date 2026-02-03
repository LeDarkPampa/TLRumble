# Plan d’action – Discord wargames complètement fonctionnel

Plan étape par étape pour finaliser le bot TL Rumble (créneaux + inscriptions) et le rendre pleinement utilisable au quotidien.

**Références :** `RESTE_A_FAIRE.md` (backlog détaillé), `CONTEXT_ARCHITECTURE.md`, `docs/PROPOSITION_UX_SCHEDULE_ET_BOUTONS.md`.

---

## État actuel (déjà en place)

- [x] `/slot create` et `/slot list`
- [x] `/signup` (slot + 6 joueurs)
- [x] Message auto dans le canal schedule (embed + bouton « S'inscrire ») si `WARGAME_SCHEDULE_CHANNEL_ID` est défini
- [x] Thread sous chaque message de wargame
- [x] Mise à jour de l’embed après chaque inscription (compteur + liste des groupes)
- [x] Rappel 10 min avant l’heure du wargame (dans le thread)
- [x] Multi-guildes : feed, `/slot list`, `/tl-feed-setup`, `/listen-inscriptions`
- [x] Docker + déploiement NAS (`Dockerfile`, `docker-compose.yml`, `docs/DEPLOIEMENT_NAS.md`)

**Manquant pour « complètement fonctionnel » :** inscription par bouton (modal), voir les inscrits, fermeture de slot, doc/config pour les admins, robustesse (arrêt propre, optionnel health check).

---

## Phase 0 – Prérequis (à faire une fois)

À faire avant ou en parallèle des phases suivantes.

| # | Action | Détail |
|---|--------|--------|
| 0.1 | **Configurer le bot Discord** | Portail développeur : créer l’app, bot, activer **Message Content** (Privileged Gateway Intents), inviter le bot avec les scopes `bot` + `applications.commands`. |
| 0.2 | **Remplir `.env`** | `BOT_TOKEN`, `CLIENT_ID`, `MODERATOR_ROLE_ID`, `WARGAME_PLAYER_ROLE_ID`. Optionnel : `MAIN_GUILD_ID`, `WARGAME_SCHEDULE_CHANNEL_ID`, `SERVER_TIMEZONE`. |
| 0.3 | **Déployer les commandes** | `npm run deploy-commands` (ou `node src/deploy-commands.js`). À refaire après ajout/modification de commandes. |
| 0.4 | **Canal schedule** | Créer un canal (ex. `#wargame-schedule`), copier son ID, mettre `WARGAME_SCHEDULE_CHANNEL_ID=...` dans `.env` et redémarrer le bot. |

---

## Phase 1 – Déploiement fiable (priorité haute) ✅

Objectif : le bot tourne de façon stable (local ou NAS) et s’arrête proprement.

| # | Action | Fichiers / commandes |
|---|--------|----------------------|
| 1.1 | **Arrêt propre** ✅ | Dans `src/index.js`, écouter `SIGINT` / `SIGTERM` et appeler `closeDb()` avant `process.exit()`. Évite des DB lock ou corruption en arrêt brutal. |
| 1.2 | **Doc : obtenir les IDs** ✅ | Dans `README.md` et `.env.example` : comment obtenir les IDs (mode développeur Discord, clic droit sur rôle/canal/serveur → « Copier l’identifiant »). |
| 1.3 | **(Optionnel) Health check** | Commande `/ping` existe ; si besoin d’un check « DB + Discord » pour un monitoring externe, ajouter une commande dédiée ou étendre `/ping`. |

---

## Phase 2 – UX quotidienne (priorité haute) ✅

Objectif : les joueurs peuvent s’inscrire en un clic et voir qui est inscrit sans taper de commande.

| # | Action | Détail |
|---|--------|--------|
| 2.1 | **Inscription par modal (bouton « S'inscrire »)** ✅ | Au clic sur « S'inscrire », ouvrir un **modal** avec **un champ** : « Colle les 6 mentions (toi inclus), séparées par des virgules ou espaces ». Parser les IDs (regex `<@!?(\d+)>` ou IDs bruts), réutiliser la logique de `signupService` (validation + `createRegistration`), répondre en éphemeral. Fichiers : `interactionCreate.js` (bouton → `showModal` ; handler `isModalSubmit` avec `signup_modal_*`). |
| 2.2 | **Bouton « Voir les inscrits »** ✅ | Sur le même message schedule, 2ᵉ bouton `view_slot_${slotId}`. Au clic : réponse éphemeral avec la liste des groupes inscrits. Fichiers : `scheduleMessageService.js`, `interactionCreate.js`. |
| 2.3 | **Commande `/slot info <id>`** ✅ | Sous-commande `info` avec option `id` : affiche le détail du créneau (date, statut, liste des groupes). Fichier : `commands/slot.js`. |

---

## Phase 3 – Gestion des créneaux (priorité moyenne)

| # | Action | Détail |
|---|--------|--------|
| 3.1 | **`/slot close <id>`** | Sous-commande (réservée Moderator) : passer le slot en `CLOSED`, refuser les nouvelles inscriptions. En base : `UPDATE slots SET status = 'CLOSED' WHERE id = ?`. Si le message schedule existe : éditer l’embed (statut 🔴 CLOSED) et désactiver le bouton « S'inscrire » (`setDisabled(true)`). Fichiers : `slotService.js` (ex. `closeSlot(id)`), `commands/slot.js`, `scheduleMessageService.js` (fonction d’édition pour statut + bouton). |
| 3.2 | **Saisie date/heure en timezone serveur** | Pour `/slot create`, interpréter date + heure dans `SERVER_TIMEZONE` puis convertir en UTC pour le stockage (au lieu d’interpréter en UTC). Évite les erreurs de créneaux. Fichiers : `commands/slot.js`, éventuellement un utilitaire date dans `src/utils/` ou dans le service. |

---

## Phase 4 – Documentation et maintenance (priorité moyenne)

| # | Action | Détail |
|---|--------|--------|
| 4.1 | **Scénario de test** | Petit guide pas à pas : créer un slot, s’inscrire (commande + bouton), vérifier l’embed et le thread, lancer un rappel (ou attendre 10 min avant l’heure). À mettre dans `README.md` ou `docs/SCENARIO_TEST.md`. |
| 4.2 | **Export / backup** | Script ou commande staff (ex. Moderator) pour exporter les inscriptions d’un slot (ou toute la DB) en CSV/JSON, ou rappel de sauvegarder le fichier `data/tl-rumble.sqlite`. Optionnel pour V1. |
| 4.3 | **Logs** | Logger les créations de slots et inscriptions (fichier ou canal Discord) pour traçabilité. Optionnel ; peut être fait après la mise en prod. |

---

## Phase 5 – Qualité (optionnel / plus tard)

| # | Action |
|---|--------|
| 5.1 | **Messages d’erreur** | Centraliser les textes (fichier i18n ou constantes) pour cohérence et traduction future. |
| 5.2 | **Tests** | Tests unitaires (services) et/ou tests d’intégration (commandes). |
| 5.3 | **Migrations DB** | Si le schéma évolue, prévoir un système de migrations au lieu de réappliquer `schema.sql` à la main. |

---

## Ordre recommandé pour ce soir (résumé)

1. **Phase 0** – Vérifier `.env`, canal schedule, `deploy-commands`.
2. **Phase 1.1** – Arrêt propre (`closeDb` sur SIGINT/SIGTERM).
3. **Phase 1.2** – Doc « Comment obtenir les IDs » dans README ou `.env.example`.
4. **Phase 2.1** – Modal d’inscription (bouton « S'inscrire » → 1 champ « 6 mentions » → même logique que `/signup`).
5. **Phase 2.2** – Bouton « Voir les inscrits » (réponse éphemeral).
6. **Phase 2.3** – `/slot info <id>` (optionnel si temps).
7. **Phase 3.1** – `/slot close` + mise à jour du message schedule (statut + bouton désactivé).

Ensuite, selon le temps : Phase 3.2 (timezone), Phase 4 (scénario de test, export), Phase 5 (qualité).

---

## Mise à jour de ce plan

- Cocher les cases au fur et à mesure (remplacer `| # |` par `| ✓ |` ou ajouter `[x]` dans une section « Fait »).
- Synchroniser avec `RESTE_A_FAIRE.md` quand une tâche est terminée (passer les items concernés en `[x]`).
