# Améliorations fonctionnelles – TL Rumble Bot

Proposition d’évolutions **métier / UX** (nouvelles commandes, flux, modération). À prioriser selon tes besoins.

---

## 1. Gestion des créneaux

| Idée | Description | Priorité suggérée |
|------|-------------|-------------------|
| **/slot close \<id>** | Fermer un créneau aux inscriptions (status → CLOSED). Déjà prévu dans le backlog ; le bouton « S'inscrire » est déjà désactivé quand status = CLOSED, il manque juste la commande pour passer un slot en CLOSED. | Haute |
| **/slot delete \<id>** (ou **cancel**) | Supprimer un créneau (et ses inscriptions) si annulé. Réservé staff. À définir : autoriser seulement si 0 inscription, ou toujours avec confirmation. | Moyenne |
| **Réouvrir un créneau** | Passer un slot de CLOSED à OPEN (ex. sous-commande `/slot reopen \<id>`). Utile en cas d’erreur. | Basse |

---

## 2. Inscriptions

| Idée | Description | Priorité suggérée |
|------|-------------|-------------------|
| **Choix du slot dans /signup** | Au lieu de demander l’ID à la main : proposer un **menu déroulant** (Select Menu) avec les slots OPEN à venir. L’utilisateur choisit le créneau sans retenir l’ID. (Limitation Discord : les options peuvent être chargées au moment de l’interaction via un handler dédié.) | Haute |
| **Désinscription** | Commande ou bouton « Annuler mon inscription » pour le groupe dont l’utilisateur est le registrant (ou un des 6). Réduit le nombre d’inscriptions et met à jour le message schedule. | Haute |
| **Vérifier doublons de créneaux** | À l’inscription : vérifier qu’aucun des 6 joueurs n’est déjà inscrit sur **un autre** créneau dont l’heure chevauche (même jour / même créneau horaire). Évite qu’un joueur soit dans deux wargames au même moment. | Moyenne |
| **Limite « 1 slot à la fois »** | Option : un joueur ne peut être inscrit que sur un seul créneau à la fois (prochains à venir). À trancher selon la règle métier. | Basse |

---

## 3. UX / Affichage

| Idée | Description | Priorité suggérée |
|------|-------------|-------------------|
| **/slot list : à venir uniquement** | Option ou sous-commande pour n’afficher que les créneaux dont la date/heure est dans le futur (ex. `/slot list --upcoming` ou filtre par défaut). Évite de noyer la liste avec des wargames passés. | Haute |
| **Pagination sur /slot list** | Si beaucoup de créneaux : boutons « Suivant / Précédent » ou Select Menu par page (ex. 10 par page). | Moyenne |
| **Rappel avec lien vers le thread** | Dans le message de rappel (10 min avant), ajouter un lien direct vers le thread du wargame pour ouvrir la discussion. | Basse |

---

## 4. Modération / Staff

| Idée | Description | Priorité suggérée |
|------|-------------|-------------------|
| **Supprimer une inscription** | Commande réservée modérateurs : retirer un groupe d’un créneau (par ID d’inscription ou par nom de groupe). Utile en cas d’erreur ou d’abus. | Haute |
| **Export des inscriptions** | Commande ou script staff : exporter les inscriptions d’un slot (ou tous les slots) en CSV/JSON pour archivage ou traitement externe. Déjà dans RESTE_A_FAIRE. | Moyenne |
| **Logs Discord** | Canal dédié « logs » : le bot envoie un message à chaque création de slot, fermeture, inscription, désinscription (avec auteur, slot, groupe). Améliore la traçabilité sans fichier. | Moyenne |

---

## 5. Notifications / Rappels

| Idée | Description | Priorité suggérée |
|------|-------------|-------------------|
| **Ping rôle ou canal à la création** | Quand un modérateur crée un slot : option pour mentionner un rôle (ex. @Wargame) ou envoyer un message dans un canal « annonces » pour prévenir que les inscriptions sont ouvertes. | Moyenne |
| **Rappel configurable** | Actuellement 10 min avant ; rendre le délai configurable (ex. variable d’env REMINDER_MINUTES_BEFORE = 10, ou 5 / 15). | Basse |
| **Plusieurs rappels** | Ex. rappel 24h avant + 10 min avant (pour que les gens s’organisent). | Basse |

---

## 6. Équipes (déjà partiellement en place)

| Idée | Description | Priorité suggérée |
|------|-------------|-------------------|
| **/generate-teams** (V2) | Commande pour générer les équipes (12v12, 18v18) à partir des inscriptions. Déjà prévue dans le backlog ; actuellement les équipes sont envoyées automatiquement au moment du rappel (teamService). | V2 |
| **Ajuster la répartition** | Aujourd’hui : première moitié des groupes = équipe 1, seconde = équipe 2. Plus tard : équilibrage (MMR, niveau, etc.) ou choix manuel par un modérateur. | V2 |

---

## 7. Multi‑serveurs (guilde miroir)

| Idée | Description | Priorité suggérée |
|------|-------------|-------------------|
| **Inscription depuis une guilde miroir** | Permettre de cliquer « S'inscrire » (ou d’utiliser une commande) depuis un serveur partenaire : le bot vérifie que les 6 joueurs sont bien membres du serveur principal TL Rumble, puis enregistre l’inscription. À étudier (flux, permissions, UX). | À trancher |

---

## Synthèse des « quick wins »

1. **/slot close \<id>** – peu de code, gros gain (fermer les inscriptions proprement).
2. **Désinscription** – bouton ou commande « Annuler mon inscription » sur le message du slot (ou `/signup cancel \<slot_id>`).
3. **/slot list : uniquement à venir** – filtrer par `datetime_utc > now` pour éviter la liste surchargée.
4. **Choix du slot dans /signup** – menu dynamique des slots OPEN (améliore beaucoup l’UX).

Tu peux piocher dans cette liste et prioriser selon ton usage réel (fréquence des wargames, nombre de modos, besoin de traçabilité, etc.). Si tu veux, on peut détailler l’implémentation d’une de ces idées en premier (par ex. `/slot close` ou la désinscription).
