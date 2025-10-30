const { query, driverReady } = require('../config/databaseInformix');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);

// ...

async function getClienteByDni(dni) {
    if (!dni) {
        const e = new Error('Parámetro dni es requerido');
        e.code = 'BAD_REQUEST';
        throw e;
    }
    const dniTrim = String(dni).trim();

    // 1) Camino normal (driver ibm_db)
    if (driverReady) {
        const sql = `
      SELECT FIRST 1 *
      FROM cli
      WHERE TRIM(nif) = ? OR TRIM(dni) = ? OR TRIM(cif) = ?
    `;
        const rows = await query(sql, [dniTrim, dniTrim, dniTrim]);
        return rows[0] || null;
    }

    // 2) Fallback por CLI con afix_select (cuando no hay driver)
    // Nota: usamos una consulta segura, sin FIRST, y filtramos exacto por NIF/DNI/CIF
  // 2) Fallback por CLI con afix_select (cuando no hay driver)
  // Usamos solo la columna real 'dni'
   // 2) Fallback por CLI con afix_select (cuando no hay driver)
  const sqlCli = `
SELECT rowid, cli, ras, dni
FROM cli
WHERE TRIM(dni) = '${dniTrim}'
ORDER BY rowid DESC
`.trim();

  const AFIX_CMD = process.env.AFIX_SELECT_CMD || 'afix_select';
  const AFIX_WORKDIR = process.env.AFIX_WORKDIR || '/tmp';

  try {
    // Ejecutar vía bash -lc para respetar PATH/entorno del usuario
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

// debug simple del estado del driver
function driverStatus() {
  return { driverReady };
}

module.exports = {
  getClienteByDni,
  driverStatus,
};

