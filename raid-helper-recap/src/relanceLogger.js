/**
 * Enregistrement des utilisateurs n'ayant pas pu recevoir le MP de relance (MP désactivés, etc.).
 * Chaque run est ajouté au fichier JSON (tableau d'entrées { date, errors }).
 */

import fs from 'fs';
import path from 'path';

/**
 * Ajoute une entrée au fichier des erreurs de relance MP.
 * Crée le dossier parent si besoin. Le fichier contient un tableau JSON d'entrées.
 * @param {string} filePath - Chemin absolu ou relatif au CWD du fichier (ex. data/relance-mp-errors.json)
 * @param {Array<{ id: string, displayName: string, error: string }>} errors - Liste des utilisateurs n'ayant pas reçu le MP
 */
export function appendRelanceErrors(filePath, errors) {
  if (!errors || errors.length === 0) return;

  const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const dir = path.dirname(resolved);

  let entries = [];
  try {
    const raw = fs.readFileSync(resolved, 'utf8');
    entries = JSON.parse(raw);
    if (!Array.isArray(entries)) entries = [];
  } catch {
    // Fichier absent ou invalide
  }

  entries.push({
    date: new Date().toISOString(),
    errors: errors.map((e) => ({ id: e.id, displayName: e.displayName, error: e.error })),
  });

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(resolved, JSON.stringify(entries, null, 2), 'utf8');
  } catch (err) {
    console.warn('[relance] Impossible d\'écrire le fichier des erreurs MP:', err?.message || err);
  }
}

/**
 * Lit le fichier des erreurs de relance MP.
 * @param {string} filePath - Chemin absolu ou relatif au CWD
 * @returns {Array<{ date: string, errors: Array<{ id: string, displayName: string, error: string }> }>}
 */
export function readRelanceErrors(filePath) {
  const resolved = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  try {
    const raw = fs.readFileSync(resolved, 'utf8');
    const entries = JSON.parse(raw);
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

/**
 * Retourne la liste des utilisateurs ayant eu au moins un échec d'envoi de MP (dédupliqués).
 * Pour chaque utilisateur : id, displayName (dernier connu), dernière erreur, date, nombre d'occurrences.
 * @param {string} filePath - Chemin du fichier des erreurs
 * @returns {Array<{ id: string, displayName: string, lastError: string, lastDate: string, count: number }>}
 */
export function getUniqueMpRefuses(filePath) {
  const entries = readRelanceErrors(filePath);
  const byId = new Map();

  for (const entry of entries) {
    const date = entry.date || '';
    for (const e of entry.errors || []) {
      const id = String(e.id || '').trim();
      if (!id) continue;
      const existing = byId.get(id);
      const count = (existing?.count ?? 0) + 1;
      byId.set(id, {
        id,
        displayName: e.displayName ?? existing?.displayName ?? id,
        lastError: e.error ?? existing?.lastError ?? '',
        lastDate: date,
        count,
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.count - a.count);
}
