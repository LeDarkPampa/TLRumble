/**
 * Calcul des taux (réponse / présence) par membre et construction des embeds Discord.
 * Tranches : Vert ≥ 80 %, Jaune ≥ 50 %, Orange ≥ 20 %, Rouge < 20 %.
 * Limite Discord : 1024 caractères par valeur de champ — découpage si besoin.
 */

import { EmbedBuilder } from 'discord.js';
import { config } from './config.js';

const MAX_FIELD_VALUE_LENGTH = 1024;
const { tiers } = config;

/**
 * Extrait l'ID Discord d'un signup (Raid-Helper peut utiliser userId, user_id, user.id, id, discordId, etc.).
 * Toujours normalisé en string pour matcher avec les membres Discord.
 * @param {Record<string, unknown>} signup
 * @returns {string|null}
 */
function getSignupUserId(signup) {
  const id =
    signup.userId ??
    signup.user_id ??
    signup.discordId ??
    signup.memberId ??
    (signup.user && typeof signup.user === 'object' ? signup.user.id ?? signup.user.userId ?? signup.user.discordId : null) ??
    signup.id;
  return id != null ? String(id).trim() : null;
}

/** Rôles Raid-Helper qui comptent comme "présent" (inscrit pour participer). Le reste = non présent (Absence, etc.). */
const PRESENCE_CLASS_NAMES = new Set(['tank', 'dps', 'healer']);

/**
 * Compte comme "réponse" : toute entrée signup (présent, absent, en retard, etc.).
 * Compte comme "présence" : uniquement Tank, Dps ou Healer. Le reste (Absence, backup, etc.) = non présent.
 */
function isPresenceStatus(signup) {
  if (!signup) return false;
  const className = signup.className != null ? String(signup.className).toLowerCase().trim() : '';
  return PRESENCE_CLASS_NAMES.has(className);
}

/**
 * Pour chaque membre, calcule le nombre d'événements où il a répondu et où il est "présent".
 * @param {Array<{ id: string, displayName: string }>} members
 * @param {Array<{ id: string, startTime: number, signups?: Array<Record<string, unknown>> }>} events
 * @param {number} endOfTodayTs - Timestamp Unix (secondes) de fin du jour courant (23h59:59)
 */
function computeStats(members, events, endOfTodayTs) {
  const totalEvents = events.length;
  const eventsPassed = events.filter((e) => Number(e.startTime) <= endOfTodayTs);
  const totalPassed = eventsPassed.length;

  const byMember = new Map();
  for (const m of members) {
    const memberId = String(m.id).trim();
    byMember.set(memberId, {
      id: memberId,
      displayName: (m.displayName || m.username || m.id).trim() || memberId,
      responseCount: 0,
      presenceCount: 0,
    });
  }

  for (const event of events) {
    const signups = event.signups || [];
    const respondedUserIds = new Set();
    const presentUserIds = new Set();
    for (const s of signups) {
      const uid = getSignupUserId(s);
      if (uid) {
        respondedUserIds.add(uid);
        if (isPresenceStatus(s)) presentUserIds.add(uid);
      }
    }
    for (const uid of respondedUserIds) {
      const normalized = String(uid).trim();
      const row = byMember.get(normalized);
      if (row) row.responseCount += 1;
    }
    if (Number(event.startTime) <= endOfTodayTs) {
      for (const uid of presentUserIds) {
        const normalized = String(uid).trim();
        const row = byMember.get(normalized);
        if (row) row.presenceCount += 1;
      }
    }
  }

  return {
    byMember: Array.from(byMember.values()),
    totalEvents,
    totalPassed,
  };
}

/**
 * Répartit les membres en 4 tranches selon un taux (0–100).
 * Tranches : Vert ≥ 80 %, Jaune ≥ 50 %, Orange ≥ 20 %, Rouge < 20 %.
 */
function getTier(percent) {
  if (percent >= tiers.green) return 'green';
  if (percent >= tiers.yellow) return 'yellow';
  if (percent >= tiers.orange) return 'orange';
  return 'red';
}

/**
 * Découpe une liste de noms en blocs ≤ MAX_FIELD_VALUE_LENGTH caractères.
 * @param {string[]} names
 * @param {string} separator - ex. ", "
 */
function chunkNames(names, separator = ', ') {
  const chunks = [];
  let current = '';
  for (const name of names) {
    const next = current ? current + separator + name : name;
    if (next.length > MAX_FIELD_VALUE_LENGTH && current) {
      chunks.push(current);
      current = name;
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/**
 * Construit les deux embeds (taux de réponse + taux de présence).
 * @param {Array<{ id: string, displayName: string, username?: string }>} members
 * @param {Array<{ id: string, startTime: number, signups?: Array<Record<string, unknown>> }>} events
 * @param {{ weekLabel?: string }} options - ex. "Semaine du 2 mars"
 * @returns {[EmbedBuilder, EmbedBuilder]}
 */
export function buildRecapEmbeds(members, events, options = {}) {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const endOfTodayTs = Math.floor(endOfToday.getTime() / 1000);

  const { byMember, totalEvents, totalPassed } = computeStats(members, events, endOfTodayTs);
  const weekLabel = options.weekLabel || `Semaine en cours (${totalEvents} raid${totalEvents > 1 ? 's' : ''})`;

  const green = [], yellow = [], orange = [], red = [];

  for (const row of byMember) {
    const responsePercent = totalEvents > 0 ? Math.round((row.responseCount / totalEvents) * 100) : 0;
    const tier = getTier(responsePercent);
    if (tier === 'green') green.push(row.displayName);
    else if (tier === 'yellow') yellow.push(row.displayName);
    else if (tier === 'orange') orange.push(row.displayName);
    else red.push(row.displayName);
  }

  const embedResponse = new EmbedBuilder()
    .setTitle(`Récap Raid-Helper — Taux de réponse — ${weekLabel}`)
    .setDescription(
      `${byMember.length} membre(s) · ${totalEvents} raid(s) cette semaine · toute réponse compte (présent / absent / en retard / etc.)`
    )
    .setColor(0x57f287)
    .setTimestamp();

  addTierFieldsToEmbed(embedResponse, green, yellow, orange, red);

  const greenP = [], yellowP = [], orangeP = [], redP = [];
  for (const row of byMember) {
    const presencePercent = totalPassed > 0 ? Math.round((row.presenceCount / totalPassed) * 100) : 0;
    const tier = getTier(presencePercent);
    if (tier === 'green') greenP.push(row.displayName);
    else if (tier === 'yellow') yellowP.push(row.displayName);
    else if (tier === 'orange') orangeP.push(row.displayName);
    else redP.push(row.displayName);
  }

  const embedPresence = new EmbedBuilder()
    .setTitle(`Récap Raid-Helper — Taux de présence — ${weekLabel}`)
    .setDescription(
      `${byMember.length} membre(s) · ${totalPassed} raid(s) déjà passés · uniquement inscrits présents (accepted)`
    )
    .setColor(0xfee75c)
    .setTimestamp();

  addTierFieldsToEmbed(embedPresence, greenP, yellowP, orangeP, redP);

  return [embedResponse, embedPresence];
}

/**
 * Retourne les membres dont le taux de réponse est strictement inférieur au seuil (ex. 20 %).
 * Utilisé pour les MPs de relance (uniquement à partir du mardi soir).
 * @param {Array<{ id: string, displayName: string }>} members
 * @param {Array<{ id: string, startTime: number, signups?: Array<Record<string, unknown>> }>} events
 * @param {number} thresholdPercent - Seuil en % (ex. 20 pour < 20 %)
 * @returns {Array<{ id: string, displayName: string, responsePercent: number }>}
 */
export function getMembersBelowResponseThreshold(members, events, thresholdPercent = 20) {
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const endOfTodayTs = Math.floor(endOfToday.getTime() / 1000);
  const { byMember, totalEvents } = computeStats(members, events, endOfTodayTs);
  if (totalEvents === 0) return [];

  const below = [];
  for (const row of byMember) {
    const responsePercent = Math.round((row.responseCount / totalEvents) * 100);
    if (responsePercent < thresholdPercent) {
      below.push({
        id: row.id,
        displayName: row.displayName,
        responsePercent,
      });
    }
  }
  return below;
}

function addTierFieldsToEmbed(embed, green, yellow, orange, red) {
  const addField = (name, list) => {
    const chunks = chunkNames(list);
    for (let i = 0; i < chunks.length; i++) {
      embed.addFields({
        name: i === 0 ? name : `${name} (suite)`,
        value: chunks[i] || '—',
        inline: false,
      });
    }
  };
  addField(`🟢 Vert ≥ ${tiers.green} % (${green.length})`, green);
  addField(`🟡 Jaune ≥ ${tiers.yellow} % (${yellow.length})`, yellow);
  addField(`🟠 Orange ≥ ${tiers.orange} % (${orange.length})`, orange);
  addField(`🔴 Rouge < ${tiers.orange} % (${red.length})`, red);
}
