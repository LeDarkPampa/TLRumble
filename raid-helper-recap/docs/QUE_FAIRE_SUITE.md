# Que faire pour la suite — Raid-Helper récap

Résumé de l’état actuel et des **prochaines actions** dans l’ordre.

---

## État actuel

| Élément | Statut |
|--------|--------|
| Spec (RECAP_PROJET, PLAN_ACTION, etc.) | ✅ Validée |
| Script d’appel API (`scripts/call-raid-helper-api.js`) | ✅ Prêt |
| Réponse API récupérée et sauvegardée (`docs/api-response-sample.json`) | ❓ À faire (ou déjà fait chez toi) |
| Doc structure API (`docs/API_RAID_HELPER.md`) | ❌ À faire |
| Dépendances Node (dotenv, discord.js ou axios) | ❌ À faire |
| Code récap (`src/config.js`, `raidHelper.js`, `discord.js`, `recap.js`, `run-recap.js`) | ❌ À faire |
| Test en local | ❌ À faire |
| Cron NAS à 23h | ❌ À faire |

**Note :** Depuis certains réseaux, l’API Raid-Helper peut renvoyer une erreur TLS (connexion réinitialisée). À tester **chez toi** ou sur le NAS. Voir `docs/RECAP_SITUATION.md`.

---

## Prochaines actions (dans l’ordre)

### 1. Vérifier l’API et documenter la structure

**Si pas encore fait :**

1. Depuis `raid-helper-recap/`, avec un `.env` rempli (clé API + guild ID) :
   ```bash
   node scripts/call-raid-helper-api.js
   ```
2. Vérifier que `docs/api-response-sample.json` a été créé (même si la réponse est « aucune donnée »).
3. **Si la réponse contient des événements** : ouvrir le JSON, noter :
   - Structure racine (tableau ou `events` ?)
   - Champs par événement : `startTime` (ou `start_time` ?), format de la date
   - Structure des signups : `event.signups`, champs par signup (`userId` / `user_id`, `status`, etc.), **valeurs possibles de `status`** (accepted, declined, tentative, late, absent, none, …)
4. Créer **`docs/API_RAID_HELPER.md`** : résumé de la structure + extrait JSON des champs utilisés pour le récap (événements de la semaine, signups, statuts « réponse » vs « présence »).

**Pourquoi en premier :** Éviter de coder des noms de champs ou des statuts incorrects.

---

### 2. Ajouter les dépendances Node

Dans `raid-helper-recap/` :

```bash
npm install dotenv
npm install discord.js
```

(ou `axios` si tu préfères pour les appels HTTP ; pour lister les membres Discord avec le rôle, un bot avec token est nécessaire, donc `discord.js` est adapté.)

---

### 3. Implémenter les modules

Créer la structure suivante (voir `RECAP_PROJET.md` section 9 et `docs/PLAN_ACTION.md` section 3) :

| Fichier | Rôle |
|---------|------|
| `src/config.js` | Lire `.env` (clé API, guild ID, rôle Discord, webhook ou canal, timezone). |
| `src/raidHelper.js` | Appel API Raid-Helper, filtrer les événements dont `startTime` est entre lundi 0h et dimanche 23h59 de la semaine en cours (timezone configurable). Exposer `getEventsForWeek()`. |
| `src/discord.js` | (1) Liste des membres du serveur ayant le rôle (API Discord + intent Guild Members). (2) Envoyer les deux embeds (taux de réponse + taux de présence) via webhook ou `channel.send()`. |
| `src/recap.js` | Pour chaque membre : calculer taux de réponse et taux de présence, répartir en 4 tranches (Vert ≥80 %, Jaune ≥50 %, Orange ≥20 %, Rouge <20 %), construire les deux embeds. Gérer le découpage si une liste dépasse 1024 caractères. |
| `run-recap.js` (à la racine) | Point d’entrée : config → raidHelper (événements) → discord (membres) → recap (calcul + embeds) → discord (envoi). Gérer les erreurs. |

**Ordre conseillé :** config → raidHelper (puis test manuel) → discord (liste membres, puis envoi test) → recap → run-recap.

---

### 4. Tester en local

1. Remplir `.env` avec de vraies valeurs (Discord : token bot, guild ID, rôle, webhook ou canal).
2. Lancer : `node run-recap.js`
3. Vérifier que les deux messages (taux de réponse + taux de présence) apparaissent dans le canal Discord.

---

### 5. Déployer sur le NAS et planifier le cron

1. Copier le projet sur le NAS (ou cloner le dépôt).
2. `npm install`, configurer `.env` sur le NAS.
3. Cron **tous les jours à 23h** (heure locale) :
   ```bash
   0 23 * * * cd /chemin/vers/raid-helper-recap && node run-recap.js >> /var/log/raid-recap.log 2>&1
   ```
4. Vérifier que la timezone du serveur (ou `TZ` dans le cron) correspond à `TIMEZONE` dans la config (ex. Europe/Paris).

---

## Références

- **Spec complète :** `RECAP_PROJET.md`
- **Plan détaillé :** `docs/PLAN_ACTION.md`
- **Blocage réseau / TLS :** `docs/RECAP_SITUATION.md`
- **Exemples de messages :** `docs/EXEMPLE_MESSAGES_RECAP.md`, `docs/IDEES_AFFICHAGE_RECAP.md`

---

**En un mot :** Commence par l’**étape 1** (appel API + doc `API_RAID_HELPER.md` si tu as des events), puis **étape 2** (dépendances), puis **étape 3** (code). Si tu veux, on peut détailler l’étape 1 (script pour parser la réponse) ou passer directement au squelette du code (étape 3).
