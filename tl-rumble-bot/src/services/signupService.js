import { getDb } from '../db/db.js';
import { getSlotById, getRegistrationCountForSlot } from './slotService.js';

/**
 * Vérifie si un utilisateur est déjà inscrit (comme joueur ou registrant) pour ce slot.
 */
export function isUserRegisteredInSlot(slotId, userId) {
  const db = getDb();
  const row = db.prepare(`
    SELECT id FROM registrations
    WHERE slot_id = ? AND (
      registrant_id = ? OR player1_id = ? OR player2_id = ? OR player3_id = ?
      OR player4_id = ? OR player5_id = ? OR player6_id = ?
    )
  `).get(slotId, userId, userId, userId, userId, userId, userId, userId);
  return !!row;
}

/**
 * Inscrit un groupe. Contraintes à vérifier en amont :
 * - Les 6 joueurs distincts
 * - registrantId parmi les 6
 * - Aucun des 6 déjà inscrit pour ce slot
 * - Slot OPEN et pas full
 */
export function createRegistration(slotId, registrantId, groupDisplayName, playerIds) {
  if (playerIds.length !== 6) throw new Error('Il faut exactement 6 joueurs.');
  const db = getDb();
  const created_at = new Date().toISOString();
  const result = db.prepare(`
    INSERT INTO registrations (
      slot_id, registrant_id, group_display_name,
      player1_id, player2_id, player3_id, player4_id, player5_id, player6_id,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    slotId,
    registrantId,
    groupDisplayName,
    playerIds[0],
    playerIds[1],
    playerIds[2],
    playerIds[3],
    playerIds[4],
    playerIds[5],
    created_at
  );
  return result.lastInsertRowid;
}

/**
 * Valide une inscription (côté service) et retourne une erreur explicite ou null.
 */
export function validateSignup(interaction, slotId, playerIds) {
  const slot = getSlotById(slotId);
  if (!slot) return 'Ce créneau n’existe pas.';
  if (slot.status !== 'OPEN') return 'Ce créneau est fermé aux inscriptions.';

  const count = getRegistrationCountForSlot(slotId);
  if (count >= slot.max_groups) return 'Ce créneau est complet (maximum ' + slot.max_groups + ' groupes).';

  const registrantId = interaction.user.id;
  const set = new Set(playerIds);
  if (set.size !== 6) return 'Les 6 joueurs doivent être différents.';
  if (!set.has(registrantId)) return 'Tu dois faire partie des 6 joueurs que tu inscris.';

  for (const id of playerIds) {
    if (isUserRegisteredInSlot(slotId, id)) {
      return 'Un des joueurs est déjà inscrit pour ce créneau.';
    }
  }

  const db = getDb();
  const existingReg = db.prepare('SELECT id FROM registrations WHERE slot_id = ? AND registrant_id = ?').get(slotId, registrantId);
  if (existingReg) return 'Tu as déjà inscrit un groupe pour ce créneau.';

  return null;
}
