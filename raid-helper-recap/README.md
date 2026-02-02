# Récap quotidien Raid-Helper

Script Node.js pour générer un **récap quotidien** du taux de réponse / présence des membres aux raids (Raid-Helper) et l’envoyer sur Discord.

**Projet totalement indépendant de TL Rumble** (autre contexte, autre config, autre cron).

**Statut :** Spécification validée. Le code n’est pas encore développé.

---

## Documentation

- **[RECAP_PROJET.md](./RECAP_PROJET.md)** — Spécification : objectifs, décisions validées, APIs, config, structure.
- **[docs/PLAN_ACTION.md](./docs/PLAN_ACTION.md)** — Que faire ensuite : étapes pour passer au code et à la mise en production.

---

## Étape 1 : Appel manuel à l’API Raid-Helper

Avant de coder, il faut **appeler l’API à la main** pour vérifier la structure des réponses.

**URL :** `GET https://raid-helper.dev/api/v3/servers/{GUILD_ID}/events`  
**Header :** `Authorization: <TA_CLÉ_API>` (la clé API comme valeur, sans "Bearer" — selon la doc Raid-Helper).  
*L’API est hébergée sur `raid-helper.dev` (certificat SSL pour ce domaine ; `api.raid-helper.dev` provoquait ERR_TLS_CERT_ALTNAME_INVALID).*

Tu as besoin de :
- la **clé API du serveur** : commande `/apikey` sur ton serveur Discord (visible uniquement par les rôles admin ou « Gérer le serveur ») ;
- l’**ID du serveur Discord** (guilde) : clic droit sur le serveur → « Copier l’identifiant du serveur » (mode développeur activé).

*Si tu as partagé la clé par erreur, régénère-la tout de suite avec `/apikey` pour éviter tout abus.*

### Option A : Script Node.js (recommandé)

1. Copier `.env.example` vers `.env` à la racine du projet.
2. Remplir dans `.env` :
   - `RAID_HELPER_API_KEY=<ta_clé_api>` (celle affichée par `/apikey`)
   - `RAID_HELPER_GUILD_ID=<id_du_serveur_discord>`
3. À la racine du projet :  
   `node scripts/call-raid-helper-api.js`

La réponse s’affiche dans la console et est sauvegardée dans `docs/api-response-sample.json`.

### Option B : cURL (ligne de commande)

```bash
curl -H "Authorization: TA_CLE_API" "https://raid-helper.dev/api/v3/servers/GUILD_ID/events"
```

Remplacer `TA_CLE_API` (la valeur brute de la clé, sans "Bearer") et `GUILD_ID` par tes valeurs. Tu peux rediriger la sortie vers un fichier pour l’inspecter :  
`curl ... > docs/api-response-sample.json`

---

## Idée en bref

1. **Membres concernés** : tous les membres du Discord avec un rôle donné (ex. Raider), récupérés via l’API Discord — y compris ceux qui ne répondent à aucun raid.
2. **Période** : **cumul depuis le lundi** de la semaine en cours **jusqu’au jour courant**.  
   - Lundi 23h → raids du lundi uniquement.  
   - Mardi 23h → lundi + mardi.  
   - … Dimanche 23h → toute la semaine.
3. **Deux indicateurs** par membre :  
   - **Taux de réponse** : toute réponse au Raid-Helper compte (présent, absent, en retard, etc.).  
   - **Taux de présence** : uniquement les inscrits / présents (ex. status accepted).
4. **Deux messages par jour** à **23h** : (1) récap **taux de réponse** par tranche, (2) récap **taux de présence** par tranche.  
   **Tranches :** Vert ≥ 80 %, Jaune ≥ 50 %, Orange ≥ 20 %, Rouge &lt; 20 %.
5. Envoi via webhook ou bot. Cron : **tous les jours à 23h**.

Configuration prévue via `.env` (voir [.env.example](./.env.example)).
