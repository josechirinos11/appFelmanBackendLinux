const { query, driverReady } = require('../config/databaseInformix');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);

/**
 * Busca cliente por DNI/NIF/CIF
 * @param {string} dni - Documento a buscar
 * @returns {Promise<Object|null>} Cliente encontrado o null
 */
async function getClienteByDni(dni) {
  if (!dni) {
    const e = new Error('Parámetro dni es requerido');
    e.code = 'BAD_REQUEST';
    throw e;
  }
  const dniTrim = String(dni).trim();

  // 1) Camino normal (driver ibm_db)
  if (driverReady) {
    // ⚠️ Informix SE NO soporta FIRST, usamos subquery con MAX(rowid)
    const sql = `
      SELECT *
      FROM cli
      WHERE (TRIM(dni) = ? OR TRIM(nif) = ? OR TRIM(cif) = ?)
        AND rowid = (
          SELECT MAX(rowid) FROM cli 
          WHERE TRIM(dni) = ? OR TRIM(nif) = ? OR TRIM(cif) = ?
        )
    `;
    const rows = await query(sql, [dniTrim, dniTrim, dniTrim, dniTrim, dniTrim, dniTrim]);
    return rows[0] || null;
  }

  // 2) Fallback por CLI con afix_select
  const sqlCli = `
SELECT rowid, cli, ras, dni
FROM cli
WHERE TRIM(dni) = '${dniTrim.replace(/'/g, "''")}'
  AND rowid = (SELECT MAX(rowid) FROM cli WHERE TRIM(dni) = '${dniTrim.replace(/'/g, "''")}')
`.trim();

  const AFIX_CMD = process.env.AFIX_SELECT_CMD || 'afix_select';
  const AFIX_WORKDIR = process.env.AFIX_WORKDIR || '/tmp';

  try {
    const cmd = `cd "${AFIX_WORKDIR}" && ${AFIX_CMD} "${sqlCli.replace(/"/g, '\\"')}"`;
    const { stdout } = await execFileAsync('/bin/bash', ['-lc', cmd], {
      timeout: 20000,
      cwd: AFIX_WORKDIR,
      env: {
        ...process.env,
        HOME: AFIX_WORKDIR,
        TMPDIR: AFIX_WORKDIR,
        TEMP: AFIX_WORKDIR,
        TMP: AFIX_WORKDIR,
      },
    });

    // Formato: "rowid|cli|ras|dni"
    const lines = stdout
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('[AFIX]') && !l.includes('Database') && !l.includes('row(s) unloaded.'));

    const data = lines
      .filter(l => l.includes('|'))
      .map(l => {
        const [rowid, cli, ras, dniVal] = l.split('|');
        return { rowid: Number(rowid), cli, ras, dni: dniVal };
      });

    return data[0] || null;
  } catch (err) {
    const e = new Error(`AFIX_CLI_ERROR: ${err.message}`);
    e.code = 'AFIX_CLI_ERROR';
    throw e;
  }
}

/**
 * Busca clientes por razón social (búsqueda parcial con LIKE)
 * @param {string} text - Texto a buscar (puede incluir * como comodín)
 * @param {Object} options - { limit, offset }
 * @returns {Promise<Array>} Lista de clientes
 */
async function searchClientesByRazonSocial(text, options = {}) {
  if (!text) {
    const e = new Error('Parámetro text es requerido');
    e.code = 'BAD_REQUEST';
    throw e;
  }

  const { limit = 50, offset = 0 } = options;
  const pattern = String(text).trim().replace(/\*/g, '%');

  // 1) Camino normal (driver ibm_db)
  if (driverReady) {
    // Informix SE: no LIMIT/OFFSET, usar subquery con rowid
    const sql = `
      SELECT *
      FROM cli
      WHERE UPPER(ras) LIKE UPPER(?)
        AND rowid IN (
          SELECT rowid FROM cli
          WHERE UPPER(ras) LIKE UPPER(?)
          AND rowid > (SELECT MAX(rowid) - ? - ? FROM cli)
        )
      ORDER BY rowid DESC
    `;
    const rows = await query(sql, [pattern, pattern, limit + offset, limit]);
    return rows.slice(offset, offset + limit);
  }

  // 2) Fallback por CLI
  const sqlCli = `
SELECT rowid, cli, ras, dni
FROM cli
WHERE UPPER(ras) LIKE UPPER('${pattern.replace(/'/g, "''")}')
  AND rowid > (SELECT MAX(rowid) - ${limit + offset} - 100 FROM cli)
ORDER BY rowid DESC
`.trim();

  const AFIX_CMD = process.env.AFIX_SELECT_CMD || 'afix_select';
  const AFIX_WORKDIR = process.env.AFIX_WORKDIR || '/tmp';

  try {
    const cmd = `cd "${AFIX_WORKDIR}" && ${AFIX_CMD} "${sqlCli.replace(/"/g, '\\"')}"`;
    const { stdout } = await execFileAsync('/bin/bash', ['-lc', cmd], {
      timeout: 20000,
      cwd: AFIX_WORKDIR,
      env: {
        ...process.env,
        HOME: AFIX_WORKDIR,
        TMPDIR: AFIX_WORKDIR,
        TEMP: AFIX_WORKDIR,
        TMP: AFIX_WORKDIR,
      },
    });

    const lines = stdout
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('[AFIX]') && !l.includes('Database') && !l.includes('row(s) unloaded.'));

    const data = lines
      .filter(l => l.includes('|'))
      .map(l => {
        const [rowid, cli, ras, dniVal] = l.split('|');
        return { rowid: Number(rowid), cli, ras, dni: dniVal };
      });

    return data.slice(offset, offset + limit);
  } catch (err) {
    const e = new Error(`AFIX_CLI_ERROR: ${err.message}`);
    e.code = 'AFIX_CLI_ERROR';
    throw e;
  }
}

/**
 * Obtiene los últimos N clientes creados
 * @param {number} limit - Cantidad de registros
 * @param {string} order - 'asc' o 'desc'
 * @returns {Promise<Array>} Lista de clientes
 */
async function getLatestClientes(limit = 10, order = 'desc') {
  const orderDir = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // 1) Camino normal (driver ibm_db)
  if (driverReady) {
    const sql = `
      SELECT *
      FROM cli
      WHERE rowid > (SELECT MAX(rowid) - ? FROM cli)
      ORDER BY rowid ${orderDir}
    `;
    const rows = await query(sql, [limit]);
    return rows;
  }

  // 2) Fallback por CLI
  const sqlCli = `
SELECT rowid, cli, ras, dni
FROM cli
WHERE rowid > (SELECT MAX(rowid) - ${limit} FROM cli)
ORDER BY rowid ${orderDir}
`.trim();

  const AFIX_CMD = process.env.AFIX_SELECT_CMD || 'afix_select';
  const AFIX_WORKDIR = process.env.AFIX_WORKDIR || '/tmp';

  try {
    const cmd = `cd "${AFIX_WORKDIR}" && ${AFIX_CMD} "${sqlCli.replace(/"/g, '\\"')}"`;
    const { stdout } = await execFileAsync('/bin/bash', ['-lc', cmd], {
      timeout: 20000,
      cwd: AFIX_WORKDIR,
      env: {
        ...process.env,
        HOME: AFIX_WORKDIR,
        TMPDIR: AFIX_WORKDIR,
        TEMP: AFIX_WORKDIR,
        TMP: AFIX_WORKDIR,
      },
    });

    const lines = stdout
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('[AFIX]') && !l.includes('Database') && !l.includes('row(s) unloaded.'));

    const data = lines
      .filter(l => l.includes('|'))
      .map(l => {
        const [rowid, cli, ras, dniVal] = l.split('|');
        return { rowid: Number(rowid), cli, ras, dni: dniVal };
      });

    return data;
  } catch (err) {
    const e = new Error(`AFIX_CLI_ERROR: ${err.message}`);
    e.code = 'AFIX_CLI_ERROR';
    throw e;
  }
}

/**
 * Debug: estado del driver
 */
function driverStatus() {
  return { driverReady };
}

module.exports = {
  getClienteByDni,
  searchClientesByRazonSocial,
  getLatestClientes,
  driverStatus,
};