# Récap de la situation — Raid-Helper récap

**À relire quand tu es chez toi** pour que l’assistant sache où en est le projet et quoi faire ensuite.

---

## 1. Objectif du projet

- **Récap quotidien** (à 23h) des réponses Raid-Helper sur Discord.
- **Deux indicateurs** par membre (rôle configuré, ex. Raider) : **taux de réponse** (toute réponse) et **taux de présence** (inscrit présent).
- **Période** : cumul **lundi → jour courant** de la semaine.
- **Quatre tranches** : Vert ≥80 %, Jaune ≥50 %, Orange ≥20 %, Rouge <20 %.
- **Deux messages** par jour (embeds Discord) : un pour taux de réponse, un pour taux de présence.
- Spec détaillée : `RECAP_PROJET.md`. Plan d’action : `docs/PLAN_ACTION.md`.

---

## 2. Ce qui est déjà fait

- **Script d’appel API** : `scripts/call-raid-helper-api.js`
  - Charge `.env` (RAID_HELPER_API_KEY, RAID_HELPER_GUILD_ID).
  - Appel : `GET https://raid-helper.dev/api/v3/servers/{GUILD_ID}/events` avec header `Authorization: <clé API>` (sans "Bearer", selon la doc Raid-Helper).
  - Essai d’abord avec `fetch`, puis repli sur le module `https` natif.
  - Gère les réponses vides / « aucune donnée » et enregistre la réponse dans `docs/api-response-sample.json`.
- **Config** : `.env.example` avec RAID_HELPER_API_KEY (obtenue via `/apikey` sur le serveur), RAID_HELPER_GUILD_ID, plus variables Discord / timezone pour la suite.
- **package.json** minimal avec `"type": "module"`.
- **Doc** : README (étape 1 + curl), RECAP_PROJET, PLAN_ACTION alignés (clé API, pas Bearer).

---

## 3. Situation actuelle (connexion)

- **Depuis un certain réseau** (pas chez toi) : le script Node a **réussi** à appeler l’API et a reçu une réponse **« Aucune donnée disponible »** (pas d’événements pour ce serveur — normal si pas d’events Raid-Helper).
- **Depuis un autre endroit** (où tu as fait le curl) : **connexion TLS réinitialisée** (curl : `Recv failure: Connection was reset`, `schannel: failed to receive handshake, SSL/TLS connection failed`). Donc blocage **réseau / TLS** entre ta machine et `raid-helper.dev` (pare-feu, FAI, antivirus, ou politique côté serveur).
- **Tu as dit** que tu retesteras **chez toi** (connexion perso).

---

## 4. À faire quand tu es chez toi

### 4.1 Retester la connexion

1. **Script Node** (depuis `raid-helper-recap/`) :
   ```bash
   node scripts/call-raid-helper-api.js
   ```
2. **Si besoin, curl** (remplacer `TA_CLE` par ta clé) :
   ```bash
   curl -v -H "Authorization: TA_CLE" "https://raid-helper.dev/api/v3/servers/979650570849759282/events"
   ```

### 4.2 Si ça marche chez toi

1. **Si la réponse contient des événements** : ouvrir `docs/api-response-sample.json`, noter la structure (racine : tableau ou `events` ?, champs par event : `startTime`, format date, etc. ; par signup : `userId`/`user_id`, `status`, valeurs de status). Créer **`docs/API_RAID_HELPER.md`** avec un résumé + extrait JSON (champs utilisés pour le récap).
2. **Enchaîner avec le plan** : **étape 2** (dépendances : axios ou node-fetch, discord.js), puis **étape 3** (config → raidHelper → discord → recap → run-recap). Voir `docs/PLAN_ACTION.md`.

### 4.3 Si ça ne marche pas chez toi (toujours TLS reset)

- Options : tester en 4G, désactiver temporairement l’inspection HTTPS de l’antivirus, contacter Raid-Helper pour savoir s’ils bloquent certaines régions/clients.
- **Pour le récap en prod** : faire tourner le script sur un **VPS** (ou NAS ailleurs) qui arrive à joindre `raid-helper.dev`. Le code et la config restent les mêmes.

---

## 5. Fichiers utiles

| Fichier | Rôle |
|--------|------|
| `RECAP_PROJET.md` | Spec complète (périmètre, APIs, config, tranches, embeds). |
| `docs/PLAN_ACTION.md` | Étapes 1 → 6 (API, npm, modules, tests, déploiement cron). |
| `scripts/call-raid-helper-api.js` | Appel manuel API Raid-Helper ; sauvegarde dans `docs/api-response-sample.json`. |
| `.env` | Clé API, guild ID, (plus tard : Discord, timezone). Ne pas commiter. |

---

**En résumé pour l’assistant :** Projet récap Raid-Helper bien spécifié ; script d’appel API prêt et testé avec succès (réponse « aucune donnée ») depuis un réseau, mais TLS reset depuis un autre. À la reprise : **retester chez soi** ; si OK → documenter la structure API puis enchaîner étape 2 et 3 du plan ; si KO → VPS ou contact Raid-Helper.
