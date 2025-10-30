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
  // Si no hay comodines, hacemos prefijo
  if (!/[*\?]/.test(p)) p = p + '*';
  return p;
}

async function searchClientesByRazonSocial(text, { limit = 50, offset = 0 } = {}) {
  const pattern = toMatchesPattern(text);
  if (!pattern) return [];

  // MATCHES es sensible al owner si usas alias; aquí vamos directos a la tabla.
  // IMPORTANTE: no pongas ORDER BY columnas no seleccionadas en ANSI estricto.
  const sql = `
    SELECT cli, ras, dni, rowid
    FROM cli
    WHERE ras MATCHES ?
    ORDER BY ras
    SKIP ? LIMIT ?
  `;

  // Si tu motor NO soporta SKIP/LIMIT, usa paginación en memoria o reemplaza por corridas sin SKIP/LIMIT.
  return query(sql, [pattern, Number(offset), Number(limit)]);
}

async function getClienteByDni(dni) {
  const sql = `
    SELECT FIRST 1 cli, ras, dni, rowid
    FROM cli
    WHERE dni = ?
  `;
  // Si tu instancia no soporta FIRST, quita FIRST y resuelve el primer elemento en JS.
  const rows = await query(sql, [dni]);
  return rows[0] || null;
}

/**
 * Últimos N por rowid (compatible incluso si no hay FIRST/LIMIT):
 *  - Trae los N con mayor rowid usando subconsulta correlacionada
 *  - Luego los ordena asc/desc según “order”.
 */
async function getLatestClientes(limit = 10, order = 'desc') {
  // Subconsulta correlacionada "top N" sin FIRST/LIMIT:
  const inner = `
    SELECT c1.cli, c1.ras, c1.dni, c1.rowid
    FROM cli c1
    WHERE ? > (
      SELECT COUNT(*) FROM cli c2 WHERE c2.rowid > c1.rowid
    )
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
