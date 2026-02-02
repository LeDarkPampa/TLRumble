# Déployer le récap Raid-Helper sur le NAS

Le récap est un **script qui s’exécute une fois** (tous les jours à 23h), pas un bot qui tourne en continu. Même NAS que le tl-rumble-bot possible, mais **projet et .env séparés**.

---

## Prérequis

- **NAS** avec Docker (comme pour tl-rumble-bot) ou avec Node.js + accès cron / planificateur.
- **Fichier `.env`** rempli (Raid-Helper + Discord), voir `.env.example`.

---

## Option 1 : Docker (recommandé, comme tl-rumble-bot)

### 1. Copier le projet sur le NAS

Même principe que pour tl-rumble-bot : copier tout le dossier **raid-helper-recap** sur le NAS (Git, SMB, archive), par exemple :

- **Synology :** `/volume1/docker/raid-helper-recap/`
- **QNAP :** `/share/Container/raid-helper-recap/`

Tu peux le mettre à côté de tl-rumble-bot :

- `/volume1/docker/tl-rumble-bot/`
- `/volume1/docker/raid-helper-recap/`

### 2. Créer le `.env`

Dans le dossier **raid-helper-recap** sur le NAS :

1. Copier `.env.example` en `.env`.
2. Remplir les variables (les mêmes que en local) :
   - `RAID_HELPER_API_KEY`, `RAID_HELPER_GUILD_ID`
   - `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_ROLE_ID`
   - `DISCORD_WEBHOOK_URL` ou `DISCORD_CHANNEL_ID`
   - `TIMEZONE=Europe/Paris`

### 3. Construire l’image (une fois)

Depuis le dossier **raid-helper-recap** sur le NAS :

```bash
docker compose build
```

### 4. Tester à la main

```bash
docker compose run --rm raid-helper-recap
```

Tu dois voir dans la console un message du type « Récap envoyé : X membre(s), Y raid(s) » et les deux messages sur Discord.

### 5. Planifier l’exécution tous les jours à 23h

Le récap doit tourner **une fois par jour à 23h** (heure locale, ex. Europe/Paris).

#### Sur Synology (Planificateur de tâches)

1. **Planificateur de tâches** → **Créer** → **Tâche planifiée** → **Tâche utilisateur**.
2. **Général** : nom ex. « Récap Raid-Helper », utilisateur : root (ou un utilisateur qui a Docker).
3. **Planification** : tous les jours à **23:00** (vérifier le fuseau du NAS ou mettre TZ dans la commande).
4. **Paramètres de la tâche** :
   - **Script utilisateur** : par exemple (adapter le chemin) :

   ```bash
   cd /volume1/docker/raid-helper-recap && docker compose run --rm raid-helper-recap >> /volume1/docker/raid-helper-recap/logs/recap.log 2>&1
   ```

   Créer le dossier des logs si besoin : `mkdir -p /volume1/docker/raid-helper-recap/logs`

5. Enregistrer et activer la tâche.

Pour forcer le fuseau Paris :

```bash
export TZ=Europe/Paris
cd /volume1/docker/raid-helper-recap && docker compose run --rm raid-helper-recap >> /volume1/docker/raid-helper-recap/logs/recap.log 2>&1
```

#### Avec cron (SSH sur le NAS)

Éditer la crontab (`crontab -e`) et ajouter :

```cron
0 23 * * * TZ=Europe/Paris cd /volume1/docker/raid-helper-recap && docker compose run --rm raid-helper-recap >> /volume1/docker/raid-helper-recap/logs/recap.log 2>&1
```

Remplacer `/volume1/docker/raid-helper-recap` par le chemin réel du projet sur ton NAS.

---

## Option 2 : Node.js directement sur le NAS (sans Docker)

Si tu préfères ne pas utiliser Docker pour le récap :

### 1. Copier le projet

Copier **raid-helper-recap** sur le NAS, ex. `/volume1/apps/raid-helper-recap/`.

### 2. Installer les dépendances

```bash
cd /volume1/apps/raid-helper-recap
npm ci --omit=dev
```

### 3. Créer le `.env`

Comme en local, à la racine du projet.

### 4. Tester

```bash
TZ=Europe/Paris node run-recap.js
```

### 5. Planifier à 23h

**Cron :**

```cron
0 23 * * * TZ=Europe/Paris cd /volume1/apps/raid-helper-recap && node run-recap.js >> /volume1/apps/raid-helper-recap/logs/recap.log 2>&1
```

Créer le dossier `logs` si besoin. Sur Synology, utiliser le Planificateur de tâches avec la commande :

```bash
cd /volume1/apps/raid-helper-recap && TZ=Europe/Paris node run-recap.js >> logs/recap.log 2>&1
```

---

## Résumé

| Élément        | Docker (recommandé) | Node.js direct |
|----------------|---------------------|----------------|
| Projet         | Dossier raid-helper-recap sur le NAS | Idem |
| .env           | À la racine du projet | Idem |
| Démarrage      | **Démarrer le conteneur** depuis l’interface Docker (comme tl-rumble-bot) | `node run-scheduler.js` |
| Récap à 23h    | Automatique dans le conteneur | Idem si tu laisses le script tourner |

Le récap est **indépendant** du tl-rumble-bot : autre dossier, autre `.env`, pas de base de données. Tu peux avoir les deux sur le même NAS ; pour le récap, tu démarres / redémarres simplement le conteneur **raid-helper-recap** depuis l’interface du NAS.
