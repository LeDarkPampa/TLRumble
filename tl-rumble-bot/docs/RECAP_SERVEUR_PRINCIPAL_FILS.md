# Récapitulatif : serveur principal vs serveur fils

Quand **MAIN_GUILD_ID** est défini dans le `.env`, le bot se comporte différemment selon le serveur Discord où l’on agit.

---

## Serveur principal (TL Rumble)

C’est le serveur dont l’ID est **MAIN_GUILD_ID**. C’est là que sont créés les créneaux et gérés les inscriptions.

### Commandes disponibles

| Commande | Qui peut l’utiliser | Rôle |
|----------|---------------------|------|
| **/ping** | Tous | Test de réponse du bot |
| **/slot create** | Moderator ou Admin | Créer un créneau (date/heure dans la timezone serveur, max groupes) |
| **/slot list** | Tous | Voir tous les créneaux |
| **/slot info id:\<id\>** | Tous | Détail d’un créneau (inscrits, etc.) |
| **/slot close id:\<id\>** | Moderator ou Admin | Fermer un créneau aux inscriptions |
| **/slot delete id:\<id\>** | Moderator ou Admin | Supprimer un créneau et ses inscriptions |
| **/signup** | Wargame Player ou Admin | S’inscrire avec 6 joueurs (ID créneau + 6 mentions) |
| **/schedule-setup** | Moderator ou Admin | Définir le canal où le bot poste les créneaux (embed + boutons) |
| **/tl-feed-setup** | — | **Indisponible** sur le serveur principal (message pour utiliser le canal schedule) |
| **/listen-messages** | ManageGuild ; Moderator pour enable/disable sur d’autres serveurs | Activer/désactiver l’enregistrement des messages (historique) |
| **/servers** | Moderator ou Admin | Liste des serveurs où le bot est présent + salons |

### Ce qui se passe sur le serveur principal

- **Création de créneau** : le bot envoie un **message schedule** dans le canal défini par `/schedule-setup` (embed + boutons « S'inscrire » et « Voir les inscrits » + fil sous le message).
- **Inscription** : possible via le **bouton « S'inscrire »** sous le message du créneau ou via **/signup** (les 6 joueurs doivent être membres de ce serveur).
- **Rappel** : 10 minutes avant l’heure du créneau, le bot envoie un rappel dans le fil (ou le canal schedule).
- **Mise à jour** : le message schedule est mis à jour à chaque nouvelle inscription (compteur, liste des groupes).

---

## Serveur fils (autres serveurs)

Ce sont les autres serveurs où le bot est invité. Ils reçoivent les **annonces** des créneaux et permettent de **s’inscrire** sans aller sur le serveur principal.

### Commandes disponibles

| Commande | Qui peut l’utiliser | Rôle |
|----------|---------------------|------|
| **/ping** | Tous | Test de réponse du bot |
| **/slot list** | Tous | Voir tous les créneaux |
| **/slot info id:\<id\>** | Tous | Détail d’un créneau (inscrits, etc.) |
| **/schedule-setup** | Gérer le serveur ou Admin | Définir le **canal des annonces** (où le bot poste les nouveaux créneaux) |
| **/tl-feed-setup** | Gérer le serveur ou Admin | Même chose : définir le canal des annonces |
| **/slot create** | — | **Indisponible** (message pour créer sur TL Rumble) |
| **/slot delete** | — | **Indisponible** (réservé au serveur principal) |
| **/signup** | — | **Indisponible** en commande ; utiliser le **bouton** sous l’annonce (voir ci‑dessous) |
| **/listen-messages** | — | **Invisible** (commande enregistrée uniquement sur le serveur principal) |
| **/servers** | — | **Invisible** (commande enregistrée uniquement sur le serveur principal) |

### Ce qui se passe sur le serveur fils

- **Annonces** : quand un créneau est créé sur le serveur principal, le bot envoie une **annonce** dans le canal configuré avec **/schedule-setup** ou **/tl-feed-setup** (embed + **boutons « S'inscrire »** et **« Voir les inscrits »**).
- **Inscription depuis le serveur fils** :
  - Clic sur **« S'inscrire avec mon groupe »** → ouverture du **modal** (6 joueurs en mentions).
  - Le bot vérifie que la personne qui clique a le rôle **Wargame Player** sur le **serveur principal TL Rumble**.
  - Le bot vérifie que **les 6 joueurs** sont **membres du serveur principal TL Rumble**.
  - Si tout est ok, l’inscription est enregistrée et le message schedule sur le serveur principal est mis à jour.
- **Voir les inscrits** : le bouton « Voir les inscrits » fonctionne comme sur le serveur principal (liste des groupes inscrits).
- **Pas de création/suppression de créneau** : `/slot create` et `/slot delete` ne sont pas utilisables sur un serveur fils.

---

## Tableau récapitulatif

| Action | Serveur principal | Serveur fils |
|--------|-------------------|--------------|
| Créer un créneau | ✅ `/slot create` (Moderator) | ❌ |
| Fermer un créneau aux inscriptions | ✅ `/slot close` (Moderator) | ❌ |
| Supprimer un créneau | ✅ `/slot delete` (Moderator) | ❌ |
| Voir la liste des créneaux | ✅ `/slot list` | ✅ `/slot list` |
| Voir le détail d’un créneau | ✅ `/slot info` | ✅ `/slot info` |
| S’inscrire (commande) | ✅ `/signup` (Wargame Player) | ❌ |
| S’inscrire (bouton sous le message) | ✅ | ✅ (les 6 joueurs doivent être sur TL Rumble) |
| Voir les inscrits (bouton) | ✅ | ✅ |
| Définir le canal des créneaux (schedule) | ✅ `/schedule-setup` (Moderator) | ❌ |
| Définir le canal des annonces (feed) | ❌ | ✅ `/schedule-setup` ou `/tl-feed-setup` |
| Écoute des messages / liste des serveurs | ✅ `/listen-messages`, `/servers` (Moderator) | ❌ (commandes invisibles) |

---

## En résumé

- **Serveur principal** : création et suppression des créneaux, canal schedule, inscriptions (bouton + `/signup`), rappels, écoute des messages, liste des serveurs.
- **Serveur fils** : réception des annonces avec **boutons S'inscrire et Voir les inscrits**, inscription possible directement depuis le serveur fils (rôle et membres vérifiés sur TL Rumble), `/slot list` et `/slot info` uniquement.
