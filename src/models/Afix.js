// src/models/Afix.js
const { query } = require('../config/databaseInformix');

/**
 * Normaliza el patrón para MATCHES.
 * - Acepta '*' y '?' del usuario tal cual (MATCHES usa esos comodines).
 * - Si el usuario no pone comodín, añadimos '*' al final para “prefijo”.
 */
function toMatchesPattern(text) {
  let p = (text || '').trim();
  if (!p) return null;
  if (!/[*?]/.test(p)) p = p + '*';
  return p;
}

async function searchClientesByRazonSocial(text, { limit = 50, offset = 0 } = {}) {
  const pattern = toMatchesPattern(text);
  if (!pattern) return [];

  // Sin SKIP/LIMIT por compatibilidad: paginamos en memoria.
  const sql = `
    SELECT cli, ras, dni, rowid
    FROM cli
    WHERE ras MATCHES ?
    ORDER BY ras
  `;
  const all = await query(sql, [pattern]);
  const from = Number(offset) || 0;
  const to = from + (Number(limit) || 50);
  return all.slice(from, to);
}

async function getClienteByDni(dni) {
  // Sin FIRST: ordeno por rowid y tomo el primero en JS.
  const sql = `
    SELECT cli, ras, dni, rowid
    FROM cli
    WHERE dni = ?
    ORDER BY rowid DESC
  `;
  const rows = await query(sql, [dni]);
  return rows[0] || null;
}

/**
 * Últimos N por rowid (compatible sin FIRST/LIMIT).
 * Usa subconsulta correlacionada y luego ordena (asc|desc).
 */
async function getLatestClientes(limit = 10, order = 'desc') {
  const inner = `
    SELECT c1.cli, c1.ras, c1.dni, c1.rowid
    FROM cli c1
    WHERE ? > (SELECT COUNT(*) FROM cli c2 WHERE c2.rowid > c1.rowid)
  `;
  const sql = `
    SELECT cli, ras, dni, rowid
    FROM ( ${inner} ) t
    ORDER BY rowid ${order.toLowerCase() === 'asc' ? 'ASC' : 'DESC'}
  `;
  return query(sql, [Number(limit)]);
}

module.exports = {
  searchClientesByRazonSocial,
  getClienteByDni,
  getLatestClientes,
};
