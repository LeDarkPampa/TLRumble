# Reste à faire – TL Rumble Bot

Backlog des tâches, améliorations et évolutions prévues. À mettre à jour au fil du temps.

---

## V2 – Fonctionnalités prévues (hors V1)

- [ ] **/slot close** – Fermer un créneau aux inscriptions (passer status à CLOSED).
- [ ] **/generate-teams** – Génération des équipes (12v12, 18v18, etc.) à partir des inscriptions d’un slot.
- [ ] **Équilibrage automatique** – Logique d’équilibrage des équipes (à définir).
- [ ] **Publication des équipes** – Envoi automatique des équipes dans un canal dédié.
- [ ] **Notifications / pings** – Rappels ou notifications (ex. avant le wargame).
- [ ] **MMR / historique** – Suivi MMR ou historique des joueurs (optionnel).

---

## Améliorations possibles (V1 ou court terme)

- [x] **Message auto dans #wargame-schedule** – Quand un modérateur crée un slot, le bot envoie un message (embed) dans un canal dédié avec les infos du wargame + bouton « S'inscrire ». (Implémenté : définir `WARGAME_SCHEDULE_CHANNEL_ID`.)
- [x] **Inscription par bouton (modal)** – Clic sur « S'inscrire » → modal (1 champ : coller les 6 mentions) → le bot parse et enregistre l'inscription sans taper /signup.
- [x] **Mise à jour du message schedule** – Après chaque inscription, l'embed du message est mis à jour (compteur X/16 groupes, liste des noms de groupes).
- [x] **Thread sous le message** – Un thread est créé sous chaque message de wargame.
- [x] **Rappel 10 min avant** – Le bot envoie un rappel dans le thread (ou le canal) 10 minutes avant l'heure du wargame.
- [x] **Bouton « Voir les inscrits »** – Sur le message du wargame, un 2e bouton qui affiche en éphemeral la liste des groupes inscrits.
- [ ] **Saisie date/heure en timezone serveur** – Interpréter date + heure de `/slot create` dans `SERVER_TIMEZONE` puis convertir en UTC pour le stockage (au lieu d’interpréter en UTC).
- [ ] **Choix du slot dans /signup** – Proposer une liste de slots OPEN (menu de choix) au lieu de saisir uniquement l’ID (limitation Discord : choix statiques au déploiement ; possible avec commande dynamique ou message avec boutons).
- [x] **Commande /slot info \<id>** – Afficher le détail d’un créneau (date, heure, statut, liste des groupes inscrits).
- [ ] **Export ou backup** – Script ou commande staff pour exporter les inscriptions (CSV/JSON) ou sauvegarder la DB.
- [ ] **Logs** – Logger les créations de slots et inscriptions (fichier ou canal Discord) pour traçabilité.
- [ ] **Messages d’erreur** – Centraliser les textes (fichier i18n ou constantes) pour cohérence et traduction future.

---

## Technique / Qualité

- [ ] **Tests** – Tests unitaires (services) et/ou tests d’intégration (commandes).
- [ ] **Migrations DB** – Si le schéma évolue (PostgreSQL V2+), prévoir un système de migrations au lieu de réappliquer `schema.sql`.
- [x] **Docker** – Dockerfile et docker-compose pour déploiement sur NAS.
- [ ] **Health check** – Endpoint ou commande dédiée pour vérifier DB + Discord (utile en prod).
- [ ] **Gestion propre de la sortie** – Fermer la connexion SQLite (`closeDb()`) au `SIGINT`/`SIGTERM`.

---

## Documentation / Onboarding

- [ ] **Comment obtenir les IDs de rôles** – Ajouter au README ou à `.env.example` (ex. mode développeur Discord, clic droit sur le rôle).
- [ ] **Scénario de test** – Petit guide pas à pas (créer un slot, s’inscrire, vérifier en DB ou via /slot list).

---

## Idées / À trancher

- Limite de groupes par slot : actuellement 16 par défaut ; à confirmer ou rendre configurable globalement.
- Format des équipes (12v12, 18v18) : à définir pour la commande `/generate-teams`.
- **Inscription depuis une guilde miroir** : permettre `/signup` depuis un autre serveur en vérifiant que les 6 joueurs sont membres du serveur principal TL Rumble (à étudier). Ancien : multi-guildes le bot reste sur un seul serveur ; pas de multi-guild prévu pour l’instant.

---

*Mettre à jour ce fichier à chaque nouvelle tâche identifiée ou tâche réalisée.*
