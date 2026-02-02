/**
 * Appel manuel à l'API Raid-Helper pour inspecter la structure des événements.
 * Usage :
 *   1. Créer un fichier .env à la racine du projet (copie de .env.example)
 *   2. Remplir RAID_HELPER_API_KEY et RAID_HELPER_GUILD_ID
 *   3. Exécuter : node scripts/call-raid-helper-api.js
 *
 * Clé API : /apikey sur ton serveur Discord (visible uniquement par les admins / manage server).
 * Header selon la doc Raid-Helper : Authorization = la clé API (valeur brute, pas "Bearer ...").
 *
 * La réponse est affichée dans la console et sauvegardée dans docs/api-response-sample.json
 */

import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Charger .env manuellement (pas de dépendance dotenv)
function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) {
    console.error('Fichier .env introuvable. Copie .env.example vers .env et remplis RAID_HELPER_API_KEY et RAID_HELPER_GUILD_ID.');
    process.exit(1);
  }
  let content = fs.readFileSync(envPath, 'utf8');
  content = content.replace(/^\uFEFF/, '');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    const unquoted = /^["'](.*)["']$/.exec(value);
    if (unquoted) process.env[key] = unquoted[1];
    else if (value) process.env[key] = value;
  });
}

loadEnv();

const apiKey = process.env.RAID_HELPER_API_KEY;
const guildId = process.env.RAID_HELPER_GUILD_ID;

if (!apiKey || !guildId) {
  console.error('RAID_HELPER_API_KEY et RAID_HELPER_GUILD_ID doivent être définis dans .env');
  process.exit(1);
}

const url = `https://api.raid-helper.dev/v1/events/${guildId}`;

const headers = {
  Authorization: apiKey,
  Accept: 'application/json',
  'User-Agent': 'Raid-Helper-Recap/1.0',
};

function handleResponse(data, outPath) {
  let json;
  try {
    json = JSON.parse(data);
  } catch {
    json = { _raw: data };
  }
  if (json.message) {
    console.log('Message API :', json.message);
  }
  const events = Array.isArray(json) ? json : (json.events || []);
  const hasEvents = Array.isArray(events) && events.length > 0;

  if (!hasEvents) {
    console.log('L\'API Raid-Helper répond correctement.');
    console.log('Aucun événement pour ce serveur (liste vide ou pas de données).');
    console.log('C\'est normal si le serveur n\'a pas d\'événements Raid-Helper récents ou si la période ne contient rien.');
  } else {
    console.log('Réponse reçue. Structure :');
    console.log('- Type racine :', Array.isArray(json) ? 'tableau' : typeof json);
    console.log('- Nombre d\'événements :', events.length);
    const first = events[0];
    console.log('- Clés du 1er événement :', Object.keys(first).join(', '));
    if (first.signups) {
      console.log('- Nombre de signups (1er event) :', first.signups.length);
      if (first.signups[0]) {
        console.log('- Clés d\'un signup :', Object.keys(first.signups[0]).join(', '));
      }
    }
    if (first.startTime !== undefined) console.log('- startTime (1er event) :', first.startTime);
    console.log('\n---\nRéponse complète (extrait) :\n');
    console.log(JSON.stringify(json, null, 2).slice(0, 3000) + (JSON.stringify(json).length > 3000 ? '...' : ''));
  }

  fs.writeFileSync(outPath, JSON.stringify(json, null, 2), 'utf8');
  console.log('\n---\nRéponse brute sauvegardée dans :', outPath);
}

function requestWithHttps() {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} ${res.statusMessage}\n${data}`));
          return;
        }
        try {
          const outPath = path.join(rootDir, 'docs', 'api-response-sample.json');
          handleResponse(data, outPath);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Timeout 15s'));
    });
    req.on('error', reject);
  });
}

async function run() {
  const outPath = path.join(rootDir, 'docs', 'api-response-sample.json');

  // 1) Essai avec fetch (Node 18+)
  if (typeof fetch === 'function') {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.text();
      if (!res.ok) {
        console.error('Erreur HTTP', res.status, res.statusText);
        console.error(data);
        process.exit(1);
      }
      handleResponse(data, outPath);
      return;
    } catch (e) {
      const cause = e.cause ? ` (cause: ${e.cause.code || e.cause.message || e.cause})` : '';
      console.error('fetch failed:', e.message + cause);
      console.log('Tentative avec module https natif...\n');
    }
  }

  // 2) Fallback : module https natif
  try {
    await requestWithHttps();
  } catch (e) {
    console.error('Erreur réseau :', e.message);
    if (e.cause) console.error('Cause :', e.cause.code || e.cause.message);
    console.error('\nVérifier :');
    console.error('  - Ouverture de https://api.raid-helper.dev dans le navigateur (page ou erreur SSL ?)');
    console.error('  - Test curl : curl -v -H "Authorization: TA_CLE" "https://api.raid-helper.dev/v1/events/' + guildId + '"');
    process.exit(1);
  }
}

run();
