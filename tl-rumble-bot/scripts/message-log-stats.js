#!/usr/bin/env node
/**
 * Affiche des statistiques sur les messages enregistrés (message_log)
 * et peut exporter en CSV pour Excel / Google Sheets.
 *
 * Usage (depuis la racine tl-rumble-bot) :
 *   node scripts/message-log-stats.js           # stats en console
 *   node scripts/message-log-stats.js --csv     # export CSV dans data/message-log-export.csv
 *   node scripts/message-log-stats.js --csv=out.csv
 */

import 'dotenv/config';
import { getDb } from '../src/db/db.js';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const TOP_N = 15;
const CSV_DEFAULT = 'data/message-log-export.csv';

function escapeCsv(str) {
  if (str == null) return '';
  const s = String(str);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function run() {
  const db = getDb();
  const args = process.argv.slice(2);
  const csvArg = args.find((a) => a.startsWith('--csv'));
  const doCsv = Boolean(csvArg);
  const csvPath = csvArg && csvArg.includes('=') ? csvArg.split('=')[1] : CSV_DEFAULT;

  // Total
  const total = db.prepare('SELECT COUNT(*) AS n FROM message_log').get();
  console.log('\n--- Messages enregistrés (message_log) ---\n');
  console.log(`Total : ${total.n} messages\n`);

  if (total.n === 0) {
    if (doCsv) console.log('Aucun message à exporter.');
    return;
  }

  // Par jour (date seule)
  const byDay = db
    .prepare(
      `SELECT date(created_at) AS day, COUNT(*) AS n
       FROM message_log
       GROUP BY date(created_at)
       ORDER BY day DESC
       LIMIT 30`
    )
    .all();
  console.log('--- Par jour (30 derniers jours) ---');
  byDay.forEach((r) => console.log(`  ${r.day} : ${r.n}`));
  console.log('');

  // Par canal
  const byChannel = db
    .prepare(
      `SELECT guild_id, channel_id, channel_name, COUNT(*) AS n
       FROM message_log
       GROUP BY guild_id, channel_id
       ORDER BY n DESC
       LIMIT ?`
    )
    .all(TOP_N);
  console.log(`--- Top ${TOP_N} canaux ---`);
  byChannel.forEach((r) => console.log(`  ${r.channel_name || r.channel_id} (${r.channel_id}) : ${r.n}`));
  console.log('');

  // Par auteur
  const byAuthor = db
    .prepare(
      `SELECT author_id, author_tag, author_name, COUNT(*) AS n
       FROM message_log
       GROUP BY author_id
       ORDER BY n DESC
       LIMIT ?`
    )
    .all(TOP_N);
  console.log(`--- Top ${TOP_N} auteurs ---`);
  byAuthor.forEach((r) => console.log(`  ${r.author_tag || r.author_name || r.author_id} : ${r.n}`));
  console.log('');

  // Export CSV
  if (doCsv) {
    const rows = db
      .prepare(
        `SELECT id, guild_id, channel_id, channel_name, author_id, author_tag, author_name, content, message_id, created_at
         FROM message_log
         ORDER BY created_at ASC`
      )
      .all();
    const header = [
      'id',
      'guild_id',
      'channel_id',
      'channel_name',
      'author_id',
      'author_tag',
      'author_name',
      'content',
      'message_id',
      'created_at',
    ];
    const lines = [header.join(',')].concat(
      rows.map((r) =>
        header.map((h) => escapeCsv(r[h])).join(',')
      )
    );
    const out = lines.join('\n');
    const dir = dirname(csvPath);
    try {
      if (dir && dir !== '.') mkdirSync(dir, { recursive: true });
    } catch (_) {}
    writeFileSync(csvPath, out, 'utf-8');
    console.log(`Export CSV : ${csvPath} (${rows.length} lignes)\n`);
  }
}

run();
