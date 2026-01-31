# Proposition UX : messages schedule + inscription par bouton

Ce document décrit les améliorations possibles autour de l’affichage des wargames et de l’inscription sans taper la commande.

---

## 1. Message automatique dans un canal "Wargame Schedule"

### Principe

Quand un **modérateur** utilise **/slot create**, le bot envoie automatiquement un **message** dans un canal dédié (ex. `#wargame-schedule`) avec :

- Un **embed** : date/heure (timezone serveur), statut (OPEN), places (0 / max_groups), ID du slot.
- Un **bouton** « S’inscrire » (ou icône + texte).

### Technique

- **Config :** variable d’environnement `WARGAME_SCHEDULE_CHANNEL_ID` = ID du canal où poster.
- **Après** `createSlot()` dans `/slot create` : récupérer le canal, envoyer un message avec `EmbedBuilder` + `ActionRowBuilder` + `ButtonBuilder`.
- **Optionnel :** stocker l’ID du message (et du canal) en base (ex. colonne `schedule_message_id` sur `slots`) pour pouvoir **mettre à jour** le message quand des inscriptions arrivent (voir plus bas).

### Exemple visuel (embed)

```
┌─────────────────────────────────────────┐
│  ⚔️ Wargame – [date/heure locale]      │
├─────────────────────────────────────────┤
│  📅 15 février 2025, 20:00              │
│  📊 Inscriptions : 0 / 16 groupes       │
│  🟢 Ouvert                               │
│  ID créneau : 1                          │
├─────────────────────────────────────────┤
│  [  S'inscrire avec mon groupe  ]        │
└─────────────────────────────────────────┘
```

---

## 2. Inscription par bouton (sans taper /signup)

### Est-ce possible ?

Oui. Discord permet :

- Des **boutons** sur les messages (Message Components).
- Au clic → événement **interaction** (type `MessageComponent`).
- En réponse au clic, on peut ouvrir un **Modal** (fenêtre avec champs texte).

### Flux proposé

1. L’utilisateur clique sur **« S’inscrire »** sur le message du wargame.
2. Le bot répond en ouvrant un **Modal** (popup) avec 6 champs :
   - « Joueur 1 (mention ou ID) », « Joueur 2 », … « Joueur 6 ».
3. L’utilisateur remplit les 6 champs (il peut **coller des mentions** type `@Pseudo` ; dans le champ texte Discord enregistre souvent `<@123456789>`).
4. Il valide le modal.
5. Le bot **parse** les 6 valeurs (extraire l’ID depuis `<@id>` ou nombre brut), applique les **mêmes validations** que `/signup` (toi parmi les 6, 6 distincts, membres du serveur, slot OPEN, pas déjà inscrit, etc.) et enregistre l’inscription.

### Contraintes Discord

- **Modal :** max 5 champs « texte court » et 1 « paragraphe ». Ici 6 joueurs = 6 infos → on peut faire 5 champs courts + 1 paragraphe « Joueur 6 (mention ou ID) », ou 6 champs courts (Discord autorise 5 inputs par modal, donc il faudra 2 modals ou 1 modal avec 5 champs + un 6e dans un seul champ « joueurs 5 et 6, séparés par une virgule »).  
  **Vérification :** en fait Discord limite à **5** composants par modal. Donc on a le choix :
  - **Option A :** 5 champs pour joueurs 1–5 + 1 champ « Joueur 6 » (total 6 champs) → non, max 5.
  - **Option B :** 1 seul champ « Liste des 6 joueurs (mentions séparées par des virgules ou espaces) » → on parse côté bot.
  - **Option C :** Modal avec 5 joueurs, puis message « Indique le 6e joueur en le mentionnant en réponse » → compliqué.
  - **Option D :** Deux modals (inscription en 2 étapes) → lourd.

La solution la plus simple est **Option B** : un champ du type « Les 6 joueurs (colle 6 mentions, ex. @A @B @C @D @E @F) ». Le bot parse la chaîne pour extraire les IDs (regex `<@!?(\d+)>` ou équivalent).

### Technique

- **Bouton :** `customId: `signup_slot_${slotId}`` pour savoir quel slot est concerné.
- Dans le handler **interactionCreate** : si `interaction.isButton() && customId.startsWith('signup_slot_')`, extraire `slotId`, puis `interaction.showModal(modal)` avec le modal (1 ou 2 champs selon le choix ci‑dessus).
- Si `interaction.isModalSubmit() && customId.startsWith('signup_modal_')` : extraire les IDs des 6 joueurs depuis les valeurs du modal, vérifier que l’auteur est parmi eux, puis appeler la même logique que `/signup` (service d’inscription) et répondre (succès ou erreur en éphemeral).

---

## 3. Mise à jour du message schedule quand quelqu’un s’inscrit

### Principe

Dès qu’une inscription est enregistrée (que ce soit via **/signup** ou via le **bouton + modal**), le bot **édite** le message du canal schedule pour ce slot :

- Mettre à jour l’embed : « Inscriptions : 3 / 16 groupes ».
- Optionnel : afficher la liste des noms de groupes (« Groupe Toto », « Groupe Alice », …).

### Technique

- Avoir stocké `schedule_message_id` (et éventuellement `schedule_channel_id`) pour chaque slot (nouvelle colonne en base ou champ en mémoire si on préfère ne pas toucher au schéma tout de suite).
- Après chaque `createRegistration()` : charger le slot, récupérer le canal et le message, puis `message.edit({ embeds: [nouvelEmbed] })`.

---

## 4. Autres améliorations du même type

| Idée | Description | Faisabilité |
|------|-------------|-------------|
| **Bouton « Voir les inscrits »** | Sur le message du wargame, un 2e bouton qui affiche (en éphemeral) la liste des groupes inscrits pour ce slot. | Simple : même handler, réponse éphemeral avec la liste. |
| **Fermeture du slot** | Quand un modérateur fait `/slot close` (V2), éditer le message : statut CLOSED, désactiver ou masquer le bouton « S’inscrire ». | Simple : `ButtonBuilder.setDisabled(true)` à l’édition. |
| **Thread sous le message** | À la création du slot, créer un **thread** sous le message du wargame pour discussions / annonces. Mettre à jour le thread avec la liste des groupes quand ça change. | Possible : `message.startThread()`, puis éditer le premier message du thread ou envoyer des messages. |
| **Rappel avant l’heure** | X heures avant le wargame (ex. 1 h), le bot envoie un message (dans le canal ou le thread) ou ping les joueurs inscrits. | Nécessite un **job planifié** (cron, setInterval, ou worker) qui parcourt les slots à venir et envoie les rappels. |
| **Réaction « Je suis intéressé »** | En plus du bouton inscription, une réaction (ex. 👍) pour « je surveille ce wargame » ; pas d’inscription automatique, juste visuel. | Possible : écouter `messageReactionAdd`, pas de lien direct avec l’inscription. |
| **Un message par slot vs un message récap** | Un **message par créneau** (comme ci‑dessus) permet un bouton par slot. Un **seul message** avec liste de tous les créneaux + boutons « S’inscrire (slot 1) », « S’inscrire (slot 2) » est possible mais le message devient long. | Recommandation : **1 message = 1 slot** pour clarté et édition simple. |

---

## 5. Résumé des étapes d’implémentation proposées

1. **Config** : `WARGAME_SCHEDULE_CHANNEL_ID` dans `.env` et `config.js`.
2. **/slot create** : après création du slot, envoyer dans ce canal un message avec embed + bouton « S’inscrire » (`signup_slot_${slotId}`). Optionnel : sauver `schedule_message_id` (et channel id) en base pour les mises à jour.
3. **Handler interactions** : dans `interactionCreate`, gérer `isButton()` avec `customId` `signup_slot_*` → ouvrir un modal (1 champ « 6 mentions » ou 5+1 selon limite Discord). Puis gérer `isModalSubmit()` avec `signup_modal_*` → parser les 6 joueurs, valider, appeler le service d’inscription, répondre.
4. **Mise à jour du message** : après chaque inscription (commande ou modal), si on a stocké l’ID du message schedule, éditer l’embed (compteur, liste des groupes).
5. **(V2)** `/slot close` : éditer le message du slot (statut CLOSED, bouton désactivé).

---

## 6. Limite Discord : 5 champs par modal

Pour rester conforme à la limite de **5 composants** par modal, le plus propre est :

- **Un seul champ texte** (style « paragraphe ») :  
  **« Colle les 6 mentions des joueurs (toi inclus), une par ligne ou séparées par des virgules) »**  
- Le bot parse avec une regex pour extraire tous les `<@!?(\d+)>` (ou IDs numériques seuls), vérifie qu’il y en a 6, que l’auteur est dedans, puis traite comme `/signup`.

Cela évite 2 modals ou des astuces avec 5 champs + 1.

---

*Ce document peut être déplacé ou fusionné dans RESTE_A_FAIRE.md ; il sert de base pour l’implémentation.*
