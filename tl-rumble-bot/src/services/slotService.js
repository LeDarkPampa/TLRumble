import { getDb } from '../db/db.js';

const DEFAULT_MAX_GROUPS = 16;

/**
 * Crée un slot en UTC. Rejette si même datetime existe déjà.
 * @returns { id, datetime_utc, status, max_groups } ou null si doublon
 */
export function createSlot(datetimeUtcIso, maxGroups = DEFAULT_MAX_GROUPS) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM slots WHERE datetime_utc = ?').get(datetimeUtcIso);
  if (existing) return null;

  const created_at = new Date().toISOString();
  const result = db.prepare(
    'INSERT INTO slots (datetime_utc, status, max_groups, created_at) VALUES (?, ?, ?, ?)'
  ).run(datetimeUtcIso, 'OPEN', maxGroups, created_at);

  return {
    id: result.lastInsertRowid,
    datetime_utc: datetimeUtcIso,
    status: 'OPEN',
    max_groups: maxGroups,
    created_at,
  };
}

/**
 * Liste tous les slots avec le nombre d'inscriptions.
 */
export function listSlots() {
  const db = getDb();
  const slots = db.prepare(`
    SELECT s.id, s.datetime_utc, s.status, s.max_groups, s.created_at,
           COUNT(r.id) AS registration_count
    FROM slots s
    LEFT JOIN registrations r ON r.slot_id = s.id
    GROUP BY s.id
    ORDER BY s.datetime_utc ASC
  `).all();
  return slots;
}

/**
 * Liste les slots ouverts (OPEN) avec le nombre d'inscriptions.
 */
export function listOpenSlots() {
  const db = getDb();
  const slots = db.prepare(`
    SELECT s.id, s.datetime_utc, s.status, s.max_groups, s.created_at,
           COUNT(r.id) AS registration_count
    FROM slots s
    LEFT JOIN registrations r ON r.slot_id = s.id
    WHERE s.status = 'OPEN'
    GROUP BY s.id
    ORDER BY s.datetime_utc ASC
  `).all();
  return slots;
}

/**
 * Ferme un créneau aux inscriptions (statut CLOSED).
 * @returns { boolean } true si le créneau existait et était OPEN
 */
export function closeSlot(slotId) {
  const db = getDb();
  const slot = db.prepare('SELECT id, status FROM slots WHERE id = ?').get(slotId);
  if (!slot || slot.status === 'CLOSED') return false;
  db.prepare('UPDATE slots SET status = ? WHERE id = ?').run('CLOSED', slotId);
  return true;
}

/**
 * Récupère un slot par ID.
 */
export function getSlotById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM slots WHERE id = ?').get(id);
}

/**
 * Récupère un slot par datetime_utc.
 */
export function getSlotByDatetime(datetimeUtcIso) {
  const db = getDb();
  return db.prepare('SELECT * FROM slots WHERE datetime_utc = ?').get(datetimeUtcIso);
}

/**
 * Nombre d'inscriptions pour un slot.
 */
export function getRegistrationCountForSlot(slotId) {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(id) AS count FROM registrations WHERE slot_id = ?').get(slotId);
  return row?.count ?? 0;
}

/**
 * Liste des inscriptions d'un slot (noms de groupes).
 */
export function getRegistrationsForSlot(slotId) {
  const db = getDb();
  return db.prepare('SELECT group_display_name FROM registrations WHERE slot_id = ? ORDER BY created_at ASC').all(slotId);
}

/**
 * Met à jour l'ID du message et du thread schedule pour un slot.
 */
export function updateSlotScheduleIds(slotId, messageId, threadId) {
  const db = getDb();
  db.prepare('UPDATE slots SET schedule_message_id = ?, schedule_thread_id = ? WHERE id = ?').run(messageId, threadId ?? null, slotId);
}

/**
 * Slots à rappeler : datetime_utc dans les 10 prochaines minutes, pas encore rappelé.
 */
export function getSlotsForReminder() {
  const db = getDb();
  const now = new Date();
  const in10 = new Date(now.getTime() + 10 * 60 * 1000);
  const nowIso = now.toISOString();
  const in10Iso = in10.toISOString();
  return db.prepare(
    'SELECT * FROM slots WHERE reminder_sent = 0 AND datetime_utc > ? AND datetime_utc <= ? ORDER BY datetime_utc ASC'
  ).all(nowIso, in10Iso);
}

/**
 * Marque le rappel comme envoyé pour un slot.
 */
export function markReminderSent(slotId) {
  const db = getDb();
  db.prepare('UPDATE slots SET reminder_sent = 1 WHERE id = ?').run(slotId);
}

/**
 * Supprime un créneau et toutes ses inscriptions.
 * @returns { boolean } true si le créneau existait et a été supprimé
 */
export function deleteSlot(slotId) {
  const db = getDb();
  const slot = db.prepare('SELECT id FROM slots WHERE id = ?').get(slotId);
  if (!slot) return false;
  db.prepare('DELETE FROM registrations WHERE slot_id = ?').run(slotId);
  db.prepare('DELETE FROM slots WHERE id = ?').run(slotId);
  return true;
}
