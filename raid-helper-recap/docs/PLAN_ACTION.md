# Que faire ensuite — Raid-Helper récap

La spec est figée. Voici les **prochaines étapes** dans l’ordre pour passer au code et à la mise en production.

---

## 1. Vérifier l’API Raid-Helper (avant de coder)

**Objectif :** Connaître la structure exacte des réponses pour coder correctement.

1. **Obtenir la clé API** du serveur (commande `/apikey` sur le serveur Discord — visible par admin / manage server) et l’ID de ta guilde.
2. **Appeler l’endpoint** à la main :
   - `GET https://raid-helper.dev/api/v3/servers/{GUILD_ID}/events`
   - Header : `Authorization: <TA_CLÉ_API>` (la clé comme valeur, sans "Bearer")
3. **Noter** :
   - Structure de la réponse (tableau `events` ? objet ?).
   - Pour chaque événement : nom des champs (`startTime`, `start_time` ?, format de la date (ISO ? timestamp ?)).
   - Pour les signups : structure (`event.signups` ?), champs par signup (`userId` / `user_id`, `status`, `username` ?), **valeurs possibles de `status`** (accepted, declined, tentative, late, absent, none, …).
4. **Documenter** dans `docs/API_RAID_HELPER.md` (exemple de réponse JSON, champs utilisés) pour le développement.

**Pourquoi en premier :** Éviter de coder des noms de champs ou des status incorrects.

---

## 2. Créer le projet Node.js

**Objectif :** Structure du projet + dépendances.

1. **Initialiser le projet** dans `raid-helper-recap/` :
   - `npm init -y`
   - `"type": "module"` dans `package.json` (ou rester en CommonJS, au choix).
2. **Installer les dépendances** :
   - Pour les appels HTTP : `axios` ou `node-fetch`.
   - Pour Discord (liste des membres + envoi) : `discord.js` (ou seulement `axios` si envoi via webhook uniquement ; pour lister les membres avec le rôle, un token bot Discord est nécessaire).
3. **Copier `.env.example` en `.env`** et remplir les valeurs (sans commiter `.env`).

---

## 3. Implémenter les modules (dans l’ordre)

| Étape | Fichier | Rôle |
|-------|---------|------|
| 3.1 | `src/config.js` | Lire les variables d’env (clé API Raid-Helper, guild ID, rôle Discord, webhook ou canal, timezone). |
| 3.2 | `src/raidHelper.js` | Appeler l’API Raid-Helper, filtrer les événements dont `startTime` est entre lundi 0h et dimanche 23h59 de la semaine en cours (timezone configurable). Exposer une fonction du type `getEventsForWeek()`. |
| 3.3 | `src/discord.js` | (1) Récupérer la liste des membres du serveur ayant le rôle configuré (API Discord + intent Guild Members). (2) Envoyer les deux embeds (taux de réponse + taux de présence) via webhook ou `channel.send()`. |
| 3.4 | `src/recap.js` | Pour chaque membre (avec le rôle) : calculer le **taux de réponse** (combien de raids de la semaine il a répondu, tout status confondu sauf « pas de réponse ») et le **taux de présence** (combien de raids où il est inscrit comme présent, ex. accepted). Répartir les membres dans les 4 tranches (Vert ≥80 %, Jaune ≥50 %, Orange ≥20 %, Rouge <20 %). Construire les deux embeds (titre, description, 4 champs par embed, couleurs). Gérer le découpage si une liste dépasse 1024 caractères. |
| 3.5 | `run-recap.js` | Point d’entrée : charger la config, appeler raidHelper → récupérer les événements de la semaine, appeler discord → récupérer les membres avec le rôle, appeler recap → calculer les stats et construire les embeds, appeler discord → envoyer les deux messages. Gérer les erreurs (log, exit code). |

**Ordre conseillé :** config → raidHelper (puis test manuel de l’appel API) → discord (liste des membres, puis envoi d’un message test) → recap (calcul + formatage) → run-recap (enchaînement).

---

## 4. Tester en local

1. **Remplir `.env`** avec de vraies valeurs (guilde de test ou prod).
2. **Lancer** `node run-recap.js` depuis le dossier du projet.
3. **Vérifier** :
   - Les deux messages apparaissent dans le canal Discord configuré.
   - Les tranches et les pseudos sont cohérents (éventuellement avec peu de raids / peu de membres pour déboguer).
4. **Ajuster** si besoin (seuils, couleurs, noms de champs API, mapping des status « réponse » / « présence »).

---

## 5. Déployer sur le NAS et planifier (cron)

1. **Copier le projet** sur le NAS (ou cloner le repo).
2. **Installer les dépendances** : `npm install` (ou `npm ci` si tu utilises un lockfile).
3. **Configurer `.env`** sur le NAS (tokens, IDs, webhook/canal).
4. **Planifier l’exécution** : cron **tous les jours à 23h** (heure locale du NAS).
   - Ex. : `0 23 * * * cd /chemin/vers/raid-helper-recap && node run-recap.js >> /var/log/raid-recap.log 2>&1`
   - Vérifier que la **timezone** du serveur (ou `TZ` dans le cron) correspond à `TIMEZONE` dans la config (ex. Europe/Paris).

---

## 6. Suivi après mise en prod

- **Surveiller les logs** les premiers jours (erreurs API, rate limits, message trop long).
- **Ajuster** les seuils (Vert / Jaune / Orange / Rouge) ou le découpage des champs si une tranche dépasse 1024 caractères.
- **Documenter** dans le README comment lancer le récap à la main et comment modifier le cron.

---

## Récap des livrables

| Livrable | Statut |
|----------|--------|
| Spec (RECAP_PROJET.md, IDEES_AFFICHAGE_RECAP, EXEMPLE_MESSAGES_RECAP) | ✅ Fait |
| Doc API Raid-Helper (structure des réponses) | À faire (étape 1) |
| Projet Node.js (package.json, config, raidHelper, discord, recap, run-recap) | À faire (étapes 2–3) |
| Tests en local | À faire (étape 4) |
| Cron sur le NAS à 23h | À faire (étape 5) |

**Prochaine action concrète :** exécuter l’**étape 1** (appel manuel à l’API Raid-Helper, noter la structure), puis enchaîner avec l’**étape 2** (npm init, dépendances, .env). Si tu veux, on peut détailler l’étape 1 (ex. script curl ou Node minimal pour appeler l’API) ou passer directement au squelette du code (étape 3).
