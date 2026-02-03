# Exemples d'utilisation des commandes – TL Rumble Bot

Ce guide montre comment utiliser les commandes du bot sur Discord.

**Configuration et variables (.env, GUILD_ID vs MAIN_GUILD_ID, qui fait quoi) :** voir **GUIDE_UTILISATION.md**.

---

## 1. `/ping`

**Qui :** tout le monde  
**But :** vérifier que le bot répond.

**Exemple :**
```
/ping
```
**Réponse du bot :** `TL Rumble bot is alive`

---

## 2. `/slot create`

**Qui :** utilisateurs avec le rôle **Moderator** (ou Admin)  
**Où :** uniquement sur le **serveur principal TL Rumble** si `MAIN_GUILD_ID` est défini (sinon disponible partout).  
**But :** créer un créneau wargame (date + heure).

**Options :**
| Option      | Type    | Obligatoire | Description                              |
|-------------|---------|-------------|------------------------------------------|
| date        | Texte   | Oui         | Date au format **YYYY-MM-DD**            |
| time        | Texte   | Oui         | Heure au format **HH:mm** (ex. 20:00)     |
| max_groups  | Nombre  | Non         | Nombre max de groupes (défaut : 16)       |

**Important :** la date et l’heure sont interprétées en **UTC**. Pour 20h à Paris en hiver (UTC+1), utilise par exemple `20:00` si tu veux 20h UTC, ou `19:00` pour 20h Paris.

**Exemples :**

- Créer un créneau le 15 février 2025 à 20h00 (UTC), 16 groupes max par défaut :
  ```
  /slot create
  date: 2025-02-15
  time: 20:00
  ```

- Créer un créneau le 20 février 2025 à 19h00 (UTC), max 12 groupes :
  ```
  /slot create
  date: 2025-02-20
  time: 19:00
  max_groups: 12
  ```

**Réponse en cas de succès :**  
`Créneau créé : **15/02/2025, 20:00:00** (ID: 1, max 16 groupes).`

**Erreurs possibles :**
- Sur un autre serveur (mode multi-guildes) → *"Cette commande n'est disponible que sur le serveur **TL Rumble**."*
- Pas le rôle Moderator → *"Tu n'as pas la permission de créer des créneaux (rôle Moderator requis)."*
- Mauvais format → *"Format attendu : date = YYYY-MM-DD, heure = HH:mm (ex. 2025-01-20, 20:00)"*
- Créneau déjà existant pour cette date/heure → *"Un créneau existe déjà pour cette date et heure."*

---

## 3. `/slot list`

**Qui :** tout le monde  
**But :** afficher tous les créneaux (date/heure, statut, nombre de groupes inscrits).

**Exemple :**
```
/slot list
```

**Réponse du bot (exemple) :**
```
**Créneaux wargame**
• **15/02/2025, 20:00:00** — OPEN — 0/16 groupes (ID: 1)
• **20/02/2025, 19:00:00** — OPEN — 2/12 groupes (ID: 2)
```

Si aucun créneau n’existe :  
`Aucun créneau pour le moment.`

**Astuce :** note l’**ID** du créneau (ex. `1`, `2`) pour l’utiliser dans `/signup`.

---

## 4. `/signup`

**Qui :** utilisateurs avec le rôle **Wargame Player** (ou Admin)  
**But :** inscrire un groupe de **6 joueurs** sur un créneau. La personne qui fait la commande doit être **l’un des 6**.

**Options :**
| Option   | Type    | Obligatoire | Description                                  |
|----------|---------|-------------|----------------------------------------------|
| slot     | Nombre  | Oui         | **ID du créneau** (voir `/slot list`)        |
| player1  | Utilisateur | Oui     | Joueur 1 (mention)                           |
| player2  | Utilisateur | Oui     | Joueur 2 (mention)                           |
| player3  | Utilisateur | Oui     | Joueur 3 (mention)                           |
| player4  | Utilisateur | Oui     | Joueur 4 (mention)                           |
| player5  | Utilisateur | Oui     | Joueur 5 (mention)                           |
| player6  | Utilisateur | Oui     | Joueur 6 (mention)                           |

**Règles :**
- Les 6 joueurs doivent être **tous différents**.
- Les 6 doivent être **membres du serveur** TL Rumble.
- **Toi** (celui qui tape la commande) dois être **parmi les 6**.
- Le créneau doit exister et être **OPEN**.
- Aucun des 6 ne doit déjà être inscrit sur ce créneau.
- Le créneau ne doit pas être **complet** (nombre de groupes < max).

Le groupe sera nommé automatiquement : **Groupe [ton pseudo]** (ton display name Discord).

**Exemple :**

Tu es *Toto*, tu veux t’inscrire avec *Alice*, *Bob*, *Charlie*, *Dana*, *Eve* sur le créneau ID **1** :

1. Va dans `/slot list` pour confirmer l’ID du créneau (ex. 1).
2. Lance la commande et remplis les 6 joueurs (dont toi) :

```
/signup
slot: 1
player1: @Toto
player2: @Alice
player3: @Bob
player4: @Charlie
player5: @Dana
player6: @Eve
```

**Réponse en cas de succès :**  
`**Groupe Toto** est inscrit pour le créneau **15/02/2025, 20:00:00** (ID: 1).`

**Erreurs possibles :**
- Sur un autre serveur (mode multi-guildes) → *"Les inscriptions se font sur le serveur **TL Rumble**. Rejoins ce serveur pour t'inscrire avec ton groupe de 6 (commande `/signup`)."*
- Pas le rôle Wargame Player → *"Tu dois avoir le rôle **Wargame Player** pour t'inscrire."*
- Tu n’es pas parmi les 6 → *"Tu dois faire partie des 6 joueurs que tu inscris."*
- Doublon parmi les 6 → *"Les 6 joueurs doivent être différents."*
- Un joueur n’est pas sur le serveur → *"[@Pseudo] n'est pas membre de ce serveur."*
- Créneau inexistant → *"Ce créneau n'existe pas."*
- Créneau fermé → *"Ce créneau est fermé aux inscriptions."*
- Créneau complet → *"Ce créneau est complet (maximum X groupes)."*
- Un joueur déjà inscrit sur ce créneau → *"Un des joueurs est déjà inscrit pour ce créneau."*
- Tu as déjà inscrit un groupe sur ce créneau → *"Tu as déjà inscrit un groupe pour ce créneau."*

---

## 5. `/tl-feed-setup` (autres serveurs uniquement)

**Qui :** utilisateurs avec la permission **Gérer le serveur** (ou Administrateur)  
**Où :** uniquement sur les serveurs **autres que TL Rumble** (si `MAIN_GUILD_ID` est défini dans la config du bot).  
**But :** choisir le canal où le bot affichera les **nouveaux** wargames planifiés sur TL Rumble.

**Options :**
| Option | Type   | Obligatoire | Description                                      |
|--------|--------|-------------|--------------------------------------------------|
| canal  | Canal  | Oui         | Canal texte où envoyer les annonces de wargames  |

**Exemple :**
```
/tl-feed-setup
canal: #wargames-planifiés
```

**Réponse du bot :**  
`Le canal #wargames-planifiés a été configuré pour recevoir les annonces des nouveaux wargames planifiés sur **TL Rumble**. Les inscriptions restent sur le serveur TL Rumble.`

**Note :** Les personnes qui ajoutent le bot sur leur serveur n'ont rien à faire avec l'ID de leur serveur : elles invitent le bot, puis un admin fait `/tl-feed-setup`. L'ID du serveur est récupéré automatiquement par le bot.

**Erreurs possibles :**
- Sur le serveur TL Rumble → *"Cette commande n'est disponible que sur les serveurs autres que TL Rumble."*
- Pas la permission Gérer le serveur → *"Tu dois avoir la permission **Gérer le serveur** (ou Administrateur) pour configurer le canal."*

---

## 6. `/servers`

**Qui :** utilisateurs avec le rôle **Moderator** (ou Admin)  
**Où :** uniquement sur le **serveur principal TL Rumble**.  
**But :** lister tous les serveurs où le bot est présent, et pour chacun afficher la liste des salons (texte et vocal). Pour les salons vocaux, les utilisateurs actuellement connectés sont indiqués.

**Exemple :**
```
/servers
```

**Réponse du bot :** message éphémère avec un embed par serveur : nom du serveur, nombre de membres, puis pour chaque salon :
- `# nom` pour les salons texte
- `🔊 nom → User1, User2` pour les vocaux (avec les pseudos des personnes connectées, ou *(vide)* si personne)

Les salons sont regroupés par catégorie. Si la liste dépasse la limite Discord, plusieurs messages sont envoyés (10 embeds max par message).

**Erreurs possibles :**
- Sur un autre serveur → *"Cette commande n'est disponible que sur le serveur **TL Rumble**."*
- Pas le rôle Moderator → *"Tu n'as pas la permission (rôle Moderator requis)."*

---

## 7. `/listen-inscriptions`

**Qui :** utilisateurs avec la permission **Gérer le serveur** (ou Administrateur)  
**Où :** sur **n’importe quel serveur** **uniquement sur le serveur principal TL Rumble**. La commande n'est pas accessible sur les autres serveurs (message d'erreur si utilisée ailleurs).  
**But :** choisir si le bot enregistre ou non les messages écrits de ce serveur dans une table (historique local). Par défaut l’écoute est désactivée ; un admin peut l’activer avec `enable` ou la désactiver avec `disable`.

**Sous-commandes :**
| Sous-commande | Description |
|---------------|-------------|
| `enable-for-server`  | Active l’écoute : les messages écrits (hors bots) seront enregistrés dans la base (option `server_id` requise). |
| `disable-for-server` | Désactive l’écoute : les nouveaux messages ne seront plus enregistrés. |
| `status`  | Affiche si l’écoute est activée ou non sur ce serveur. |

**Exemples :**
```
/listen-inscriptions enable-for-server  server_id: 1234567890123456789
/listen-inscriptions disable-for-server  server_id: 1234567890123456789
```
Pour obtenir l'ID d'un serveur : lance **`/servers`** sur le serveur principal ; l'ID est en bas de chaque embed (footer « ID: … »).

**Réponse du bot :** message éphémère confirmant l’état ou le changement.

**Note technique :** l’enregistrement nécessite l’intent privilégié **Message Content** (à activer dans le Discord Developer Portal → Bot → Privileged Gateway Intents). Les messages sont stockés en base (guild_id, canal, auteur, contenu tronqué à 2000 caractères, message_id, date).

**Erreurs possibles :**
- Sur un autre serveur → *"La commande /listen-inscriptions n'est disponible que sur le serveur principal TL Rumble."*
- Pas la permission Gérer le serveur → la commande n’apparaît pas ou Discord affiche une erreur de permission.

---

## Scénario complet (résumé)

1. **Moderator** crée un créneau :  
   `/slot create` → date `2025-02-15`, time `20:00`
2. **Tout le monde** voit les créneaux :  
   `/slot list` → noter l’ID (ex. 1)
3. **Wargame Player** inscrit son groupe :  
   `/signup` → slot `1`, player1 à player6 (dont lui)

---

*Pour plus de détails sur les règles et l’architecture, voir **GUIDE_UTILISATION.md** (config), **CONTEXT_ARCHITECTURE.md** et SPEC_TL_RUMBLE_V1.md (dans discord-bots/examples/tl-rumble-spec).*
