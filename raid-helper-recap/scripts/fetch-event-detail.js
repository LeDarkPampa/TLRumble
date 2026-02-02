/**
 * Script de diagnostic : récupère le détail d'un événement Raid-Helper (API v2)
 * et sauvegarde la réponse brute pour inspecter la structure des signups.
 *
 * Usage :
 *   node scripts/fetch-event-detail.js
 *   (utilise le 1er événement de la semaine depuis l'API v3)
 *
 * Ou avec un ID d'événement :
 *   node scripts/fetch-event-detail.js 1467642512532308088
 *
 * La réponse est sauvegardée dans docs/event-detail-sample.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { config } from '../src/config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env') });

const BASE_URL = 'https://raid-helper.dev/api';
const eventId = process.argv[2];

async function getFirstEventId() {
  const url = `${BASE_URL}/v3/servers/${config.raidHelper.guildId}/events`;
  const res = await fetch(url, {
    headers: { Authorization: config.raidHelper.apiKey, Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`v3: ${res.status}`);
  const json = await res.json();
  const events = json.postedEvents || json.events || [];
  const first = events[0];
  return first ? String(first.id) : null;
}

async function fetchEventDetail(id) {
  const url = `${BASE_URL}/v2/events/${id}`;
  console.log('Appel:', url);

  const res1 = await fetch(url, {
    headers: {
      Authorization: config.raidHelper.apiKey,
      Accept: 'application/json',
      'User-Agent': 'Raid-Helper-Recap/1.0',
    },
    signal: AbortSignal.timeout(10000),
  });
  console.log('v2 avec Authorization: clé →', res1.status);

  let json = null;
  if (res1.ok) {
    json = await res1.json();
  } else {
    const res2 = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.raidHelper.apiKey}`,
        Accept: 'application/json',
        'User-Agent': 'Raid-Helper-Recap/1.0',
      },
      signal: AbortSignal.timeout(10000),
    });
    console.log('v2 avec Authorization: Bearer clé →', res2.status);
    if (res2.ok) json = await res2.json();
  }

  return json;
}

async function run() {
  const id = eventId || (await getFirstEventId());
  if (!id) {
    console.error('Aucun événement trouvé (v3) et aucun ID passé en argument.');
    process.exit(1);
  }
  console.log('ID événement:', id);

  const json = await fetchEventDetail(id);
  const outPath = path.join(rootDir, 'docs', 'event-detail-sample.json');
  fs.writeFileSync(outPath, JSON.stringify(json, null, 2), 'utf8');
  console.log('Réponse sauvegardée dans:', outPath);

  if (json) {
    const signups = json.signups ?? json.signUps ?? json.participants ?? json.attendees ?? [];
    console.log('Clés racine:', Object.keys(json).join(', '));
    console.log('Nombre de signups (signups/signUps/participants/attendees):', Array.isArray(signups) ? signups.length : 0);
    if (Array.isArray(signups) && signups[0]) {
      console.log('Clés du 1er signup:', Object.keys(signups[0]).join(', '));
    }
  }
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
