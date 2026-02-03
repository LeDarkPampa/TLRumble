# Visualiser les données des messages enregistrés (message_log)

Quand l’écoute des messages est activée pour un serveur (`/listen-inscriptions`), les messages sont stockés dans la table **message_log** (SQLite). Voici plusieurs façons de les visualiser.

---

## 1. Script de stats + export CSV (recommandé)

Un script Node fournit des **statistiques en console** et un **export CSV** pour Excel / Google Sheets.

### Lancer les stats en console

Depuis la racine du projet `tl-rumble-bot` :

```bash
npm run message-log-stats
# ou
node scripts/message-log-stats.js
```

Affichage :
- **Total** de messages
- **Par jour** (30 derniers jours)
- **Top canaux** (par volume de messages)
- **Top auteurs** (par volume de messages)

### Exporter en CSV

```bash
npm run message-log-export
# ou
node scripts/message-log-stats.js --csv
```

Le fichier est créé dans `data/message-log-export.csv`. Pour un autre chemin :

```bash
node scripts/message-log-stats.js --csv=exports/messages.csv
```

Tu peux ensuite ouvrir le CSV dans **Excel**, **Google Sheets** ou **LibreOffice** pour tableaux croisés, graphiques, filtres, etc.

---

## 2. Outils SQLite (requêtes à la main)

Si tu préfères interroger la base directement :

- **DB Browser for SQLite** : [sqlitebrowser.org](https://sqlitebrowser.org/) — interface graphique, onglet “Execute SQL”, graphiques basiques.
- **L’extension SQLite** de VS Code / Cursor : ouvre le fichier `.sqlite` (chemin défini par `DATABASE_PATH` dans ton `.env`, par défaut `/data/tl-rumble.sqlite`).

Exemples de requêtes utiles :

```sql
-- Messages par jour
SELECT date(created_at) AS jour, COUNT(*) AS nb
FROM message_log
GROUP BY date(created_at)
ORDER BY jour DESC;

-- Top canaux
SELECT channel_name, channel_id, COUNT(*) AS nb
FROM message_log
GROUP BY guild_id, channel_id
ORDER BY nb DESC;

-- Top auteurs
SELECT author_tag, author_id, COUNT(*) AS nb
FROM message_log
GROUP BY author_id
ORDER BY nb DESC;
```

---

## 3. Tableau de bord (optionnel, plus avancé)

Pour des graphiques interactifs et des filtres par date/serveur/canal :

- **Metabase** : connecte une source “SQLite” vers ton fichier `.sqlite`, crée des questions et un dashboard.
- **Grafana** : nécessite un connecteur SQLite (plugin) et un peu de config.
- **Petite app web maison** : Express + Chart.js qui lit la même base et affiche courbes (messages/jour) et barres (canaux, auteurs). Possible à ajouter plus tard si besoin.

---

## Résumé

| Besoin              | Solution                          |
|---------------------|-----------------------------------|
| Vue d’ensemble rapide | `npm run message-log-stats`       |
| Analyse dans Excel/Sheets | `npm run message-log-export` puis ouvrir le CSV |
| Requêtes SQL libres | DB Browser for SQLite ou extension VS Code |
| Dashboards avancés  | Metabase (ou app web dédiée)      |

Le script `scripts/message-log-stats.js` et l’export CSV couvrent la plupart des besoins sans installation supplémentaire.
