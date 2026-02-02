# Récap quotidien des réponses Raid-Helper sur Discord

**Statut :** Spécification validée — à développer.

Ce projet est **totalement indépendant de TL Rumble** : autre contexte (guilde + Raid-Helper), autre script, autre cron. Même hébergeur (NAS) possible, mais aucun code ni config partagés.

---

## 1. Contexte

- **Qui :** Tu gères une guilde sur Discord et tu utilises le bot **Raid-Helper** pour organiser les raids.
- **Besoin :** Automatiser un **récap quotidien** du taux de réponse / présence des membres aux raids : chaque soir à 23h, un message qui résume la participation depuis le **début de la semaine** (lundi) jusqu’au **jour courant**.
- **Contraintes :** Script Node.js hébergeable sur le NAS, exécutable en tâche planifiée (cron). Pas de dépendance au bot ou au projet TL Rumble.

---

## 2. Décisions validées

| Sujet | Décision |
|-------|-----------|
| **Membres concernés** | **Tous les membres du Discord ayant un certain rôle** (ex. « Raider »). Liste récupérée via l’API Discord. Ceux qui n’apparaissent jamais dans Raid-Helper sont inclus : ils comptent comme « 0 réponse sur X raids ». |
| **Périmètre temporel** | **Toute la semaine (lundi → dimanche).** Tous les raids sont postés le dimanche pour la semaine à venir ; on prend **tous les raids dont la date de début** tombe entre **lundi 0h** et **dimanche 23h59** de la semaine en cours (heure locale). Le **dénominateur** (nombre total de raids) est donc **fixe** pour toute la semaine. |
| **Comportement par jour** | Chaque jour à 23h : pour chaque membre, on compte **combien de ces raids de la semaine** il a **déjà répondu** (à la date du récap). Taux = (réponses à ce jour) / (total raids de la semaine) × 100. **Lundi 23h** → ex. 2/15 (13 %). **Dimanche 23h** → ex. 12/15 (80 %). Même base (ex. 15 raids) chaque jour ; seul le numérateur évolue. |
| **Deux messages par jour** | À 23h, le bot envoie **deux messages distincts** : (1) **Taux de réponse** au Raid-Helper — tout type de réponse compte (présent, absent, en retard, etc.) ; (2) **Taux de présence** — uniquement les membres vraiment inscrits / présents (ex. status « accepted » ou équivalent, à définir selon l’API). |
| **Tranches d’affichage** | **Vert** ≥ 80 % · **Jaune** ≥ 50 % · **Orange** ≥ 20 % · **Rouge** &lt; 20 %. Chaque message (réponse et présence) affiche les membres répartis dans ces 4 tranches. |
| **Envoi** | Bot Discord (token) pour lister les membres avec le rôle ; webhook ou bot pour poster les deux messages. |
| **Indépendance** | Projet **totalement séparé** de TL Rumble. |
| **Horaire** | **Tous les jours à 23h** (heure locale). Cron : ex. `0 23 * * *` (avec `TZ` ou timezone configurée). |

---

## 3. Objectifs fonctionnels

1. **Récupérer la liste des membres concernés**  
   Via l’API Discord : tous les membres du serveur qui ont le **rôle configuré**. Même s’ils n’apparaissent dans aucun raid Raid-Helper, ils sont dans la liste.

2. **Récupérer tous les événements de la semaine (lundi → dimanche)**  
   Via l’API Raid-Helper : tous les raids dont la **date de début** (`event.startTime`) est entre **lundi 0h** et **dimanche 23h59** de la semaine en cours (fuseau configurable). Ce sont les raids postés le dimanche pour la semaine ; le **total** (ex. 15 raids) sert de **dénominateur fixe** pour tous les récaps de la semaine.

3. **Analyser deux indicateurs par membre**  
   Pour chaque membre (avec le rôle) et pour **chaque raid de la semaine** : on regarde s’il a répondu / s’il est présent **à la date du récap** (les signups Raid-Helper sont à jour en temps réel).  
   - **Taux de réponse :** base = **toute la semaine**. Pour chaque raid de la semaine, on regarde si le membre a répondu (à la date du récap). Toute réponse compte. Taux = raids où il a répondu / **nombre total de raids de la semaine** → %.  
   - **Taux de présence effective :** base = **uniquement les raids déjà passés** (date de début ≤ fin du jour courant, récap à 23h). Pour chaque raid **déjà passé**, on regarde si le membre est inscrit **présent** (ex. status accepted). Taux = raids passés où il est présent / **nombre de raids passés** → %.  
   Les signups Raid-Helper sont à jour en temps réel.

4. **Générer deux messages récap en embed**  
   - **Message 1 — Taux de réponse :** un **embed** Discord avec titre, description (résumé), puis 4 champs (Vert ≥ 80 % / Jaune ≥ 50 % / Orange ≥ 20 % / Rouge &lt; 20 %) listant les pseudos par tranche.  
   - **Message 2 — Taux de présence :** idem en embed avec les **taux de présence**.  
   Les embeds permettent un affichage plus lisible (couleur, blocs, titre). Gestion de la longueur : limite 1024 caractères par valeur de champ ; couper une tranche en 2 champs si besoin.

5. **Envoyer les deux messages**  
   Via webhook ou bot sur un canal Discord configuré (les deux à la suite).

6. **Planification**  
   Cron : **tous les jours à 23h** (ex. `0 23 * * *`).

---

## 4. Pourquoi « toute la semaine » comme base (dénominateur fixe)

**Constat :** Tous les Raid-Helper sont postés le **dimanche** pour la semaine qui vient. La liste des raids de la semaine est donc connue dès le lundi.

**Choix retenu :** Chaque jour à 23h, le récap se base sur **tous les raids de la semaine** (lundi → dimanche) :
- **Dénominateur** = nombre total de raids de la semaine (ex. 15). **Fixé** pour toute la semaine.
- **Numérateur** = nombre de ces raids auxquels le membre a **déjà répondu** à la date du récap (les signups Raid-Helper sont mis à jour en continu).

**Avantages :**
- **Aligné avec l’usage** : les raids sont annoncés une fois pour la semaine ; naturel de dire « cette semaine il y a 15 raids, tu en as répondu à combien ? ».
- **Même référence chaque jour** : tout le monde est comparé à la même base (15 raids). Lundi : « 2/15 (13 %) » ; dimanche : « 12/15 (80 %) ». Comparaison claire entre membres et d’un jour à l’autre.
- **Encourage à répondre tôt** : ceux qui ne répondent qu’en fin de semaine restent en rouge/orange jusqu’au bout.

**Exemple (semaine avec 15 raids) :**

| Jour (23h) | Alice (réponses à ce jour) | Taux |
|------------|----------------------------|------|
| Lundi      | 2/15                       | 13 % (rouge) |
| Mercredi   | 6/15                       | 40 % (orange) |
| Vendredi   | 11/15                      | 73 % (jaune)  |
| Dimanche   | 14/15                      | 93 % (vert)   |

**Semaine :** lundi = jour 1, dimanche = jour 7 (ISO ou configurable). Fuseau horaire = configurable (ex. Europe/Paris).

---

## 5. Données et APIs

### 5.1 Discord

- **Liste des membres avec le rôle :** API Discord (List Guild Members, intent Guild Members), token bot requis.
- **Envoi du message :** webhook (POST) ou bot (`channel.send()`).

### 5.2 Raid-Helper

- **Endpoint :** `GET https://raid-helper.dev/api/v3/servers/{GUILD_ID}/events` (tous les événements du serveur ; doc : https://raid-helper.dev/documentation/api)
- **Headers :** `Authorization: <API_KEY>` (clé brute, sans "Bearer" ; à confirmer selon la doc)
- Filtrer les événements dont `event.startTime` est dans l’intervalle **[lundi 0h, dimanche 23h59]** de la semaine en cours (heure locale). Ce jeu d’événements = **dénominateur fixe** pour tous les récaps de la semaine.
- Pour chaque événement : `event.signups` (userId, status : accepted / tentative / declined / late / absent / none, etc.).  
- **À définir côté script :** quels status comptent comme **réponse** (tout sauf none / pas de signup) et quels status comptent comme **présence** (ex. accepted uniquement, ou accepted + tentative selon ta règle).

---

## 6. Configuration prévue

- **Discord :** `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_ROLE_ID`, `DISCORD_WEBHOOK_URL` (ou `DISCORD_CHANNEL_ID`).
- **Raid-Helper :** `RAID_HELPER_API_KEY` (clé du serveur via `/apikey`), `RAID_HELPER_GUILD_ID`.
- **Périmètre :** `TIMEZONE` (ex. Europe/Paris) pour définir « aujourd’hui » et « lundi de la semaine ».  
- **Tranches :** Vert ≥ 80 %, Jaune ≥ 50 %, Orange ≥ 20 %, Rouge &lt; 20 % (configurables en variables d’env si besoin).

---

## 7. Contraintes et bonnes pratiques

- **Fuseau horaire :** Toutes les dates en **heure locale** (configurable).
- **Raids multi-jours :** Un événement est compté **une seule fois** selon la date de **début** (`event.startTime`).
- **Limite Discord :** 2000 caractères par message — découpage ou résumé si beaucoup de membres.
- **API :** Gérer erreurs et rate limits. Config via `.env`.

---

## 8. Livrable attendu

- **Script Node.js** exécutable sur le NAS (`node run-recap.js`).
- **Récap quotidien** à **23h** : **deux messages** — (1) taux de **réponse** (toute réponse au Raid-Helper), (2) taux de **présence** (uniquement inscrits / présents), avec tranches Vert / Jaune / Orange / Rouge.
- **Cron :** tous les jours à 23h (ex. `0 23 * * *`).

---

## 9. Structure de projet proposée

```
raid-helper-recap/
├── .env.example
├── .gitignore
├── package.json
├── README.md
├── RECAP_PROJET.md
├── run-recap.js              # Point d'entrée (appelé par cron chaque jour)
├── src/
│   ├── config.js
│   ├── discord.js             # Liste des membres avec le rôle + envoi du message
│   ├── raidHelper.js          # Appel API Raid-Helper, filtrage lundi → dimanche (semaine en cours)
│   └── recap.js               # Calcul par membre, formatage du message
└── docs/
```

---

## 10. Prochaines étapes

Voir **`docs/PLAN_ACTION.md`** pour le détail. En résumé :

1. **Vérifier l’API Raid-Helper** : appeler l’endpoint à la main, noter la structure des `events` et `signups` (champs, valeurs de `status`), documenter dans `docs/API_RAID_HELPER.md`.
2. **Créer le projet Node.js** : `npm init`, dépendances (axios ou node-fetch, discord.js), `.env` depuis `.env.example`.
3. **Implémenter les modules** : `config.js` → `raidHelper.js` → `discord.js` (liste membres + envoi) → `recap.js` (calcul + embeds) → `run-recap.js` (point d’entrée).
4. **Tester en local** : `node run-recap.js`, vérifier les deux messages sur Discord.
5. **Déployer sur le NAS** et planifier le cron à **23h** chaque jour.

---

*Document mis à jour : récap **quotidien** à 23h. **Taux de réponse** : base = toute la semaine (dénominateur fixe ; numérateur = réponses à ce jour). **Taux de présence effective** : base = uniquement les raids déjà passés (jour courant 23h inclus).*
