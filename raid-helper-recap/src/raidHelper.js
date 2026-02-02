/**
 * Appel API Raid-Helper : événements du serveur (v3), filtre "semaine en cours".
 * Les timestamps API sont en secondes (Unix).
 * Pour la "semaine" on utilise lundi 0h → dimanche 23h59 en heure locale du processus (TZ=Europe/Paris recommandé en cron).
 */

import { config } from './config.js';

const BASE_URL = 'https://raid-helper.dev/api';
const { apiKey, guildId } = config.raidHelper;

/**
 * Retourne [début, fin] de la semaine en cours (lundi 0h, dimanche 23h59) en timestamps Unix (secondes).
 * Utilise l'heure locale du processus (définir TZ dans le cron pour le bon fuseau).
 */
function getWeekBoundsSeconds() {
  const now = new Date();
  const day = now.getDay(); // 0 = dimanche, 1 = lundi, ...
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return [
    Math.floor(monday.getTime() / 1000),
    Math.floor(sunday.getTime() / 1000),
  ];
}

/**
 * Récupère tous les événements du serveur puis filtre ceux dont startTime est dans la semaine en cours.
 * @returns {Promise<Array<{ id: string, startTime: number, signUpCount: string, title: string, ... }>>}
 */
export async function getEventsForWeek() {
  const url = `${BASE_URL}/v3/servers/${guildId}/events`;
  const headers = {
    Authorization: apiKey,
    Accept: 'application/json',
    'User-Agent': 'Raid-Helper-Recap/1.0',
  };

  const res = await fetch(url, {
    method: 'GET',
    headers,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API Raid-Helper ${res.status}: ${text}`);
  }

  const json = await res.json();
  const events = json.postedEvents || json.events || [];
  const [startTs, endTs] = getWeekBoundsSeconds();

  const filtered = events.filter((e) => {
    const t = Number(e.startTime);
    return !Number.isNaN(t) && t >= startTs && t <= endTs;
  });

  return filtered;
}

/**
 * Extrait la liste des signups depuis la réponse v2 (plusieurs formats possibles).
 * @param {Record<string, unknown>} json
 * @returns {Array<Record<string, unknown>>}
 */
function extractSignupsFromEvent(json) {
  const raw =
    json.signups ??
    json.signUps ??
    json.participants ??
    json.attendees ??
    json.users ??
    [];
  return Array.isArray(raw) ? raw : [];
}

/**
 * Récupère le détail d'un événement (v2) pour obtenir les signups (userId, status).
 * Essaie avec Authorization: clé puis Authorization: Bearer clé (selon la doc de l'API).
 * Si l'endpoint ne renvoie pas de signups ou échoue, retourne l'événement sans signups.
 * @param {string} eventId
 * @returns {Promise<{ id: string, startTime: number, signups: Array<Record<string, unknown>> }>}
 */
export async function getEventDetails(eventId) {
  const url = `${BASE_URL}/v2/events/${eventId}`;
  const baseHeaders = {
    Accept: 'application/json',
    'User-Agent': 'Raid-Helper-Recap/1.0',
  };

  const tryFetch = async (authHeader) => {
    const res = await fetch(url, {
      method: 'GET',
      headers: { ...baseHeaders, Authorization: authHeader },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return res.json();
  };

  try {
    let json = await tryFetch(apiKey);
    if (!json) json = await tryFetch(`Bearer ${apiKey}`);
    if (!json) return { id: eventId, startTime: 0, signups: [] };

    const signups = extractSignupsFromEvent(json);
    return {
      id: String(json.id || eventId),
      startTime: Number(json.startTime) || 0,
      signups,
    };
  } catch {
    return { id: eventId, startTime: 0, signups: [] };
  }
}

/**
 * Récupère les événements de la semaine avec le détail des signups (appel v2 par événement).
 * Si v2 ne renvoie pas de signups, les événements auront signups: [].
 * @returns {Promise<Array<{ id: string, startTime: number, signups: Array<{ userId?: string, user_id?: string, status?: string }> }>>}
 */
export async function getEventsForWeekWithSignups() {
  const events = await getEventsForWeek();
  const withSignups = await Promise.all(
    events.map(async (e) => {
      const detail = await getEventDetails(e.id);
      return {
        ...e,
        startTime: e.startTime ?? detail.startTime,
        signups: detail.signups || [],
      };
    })
  );
  return withSignups;
}
