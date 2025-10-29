// src/services/informix.service.js
const { spawn } = require('child_process');
const fs = require('fs/promises');
const path = require('path');

const INFORMIXDIR = process.env.INFORMIXDIR || '/home/ix730';
const INFORMIXSERVER = process.env.INFORMIXSERVER || 'afix4_tcp';
const INFORMIX_DB = process.env.INFORMIX_DATABASE || 'apli01';
const DBPATH = process.env.DBPATH || '/home/af5/dat/afix4/dbs:/home/af5/dat/afix4/dbs.20250618:/home/ix730/etc';

function getEnv() {
  return {
    ...process.env,
    INFORMIXDIR,
    INFORMIXSERVER,
    DBPATH,
    PATH: `${INFORMIXDIR}/bin:${process.env.PATH || ''}`
  };
}

/**
 * Ejecuta un SQL que hace UNLOAD a un fichero temporal CSV y devuelve { rows, raw }
 * - sqlBody debe ser SOLO el SELECT; este helper envuelve el UNLOAD automáticamente.
 * - columns: array con los nombres de columnas para mapear el CSV a objetos.
 * - delimiter: por defecto ';'
 */
async function unloadSelect({ sqlBody, columns, delimiter = ';' }) {
  const tmp = `/tmp/afix_${process.pid}_${Date.now()}.csv`;

  const sql = `
unload to '${tmp}' delimiter '${delimiter}'
${sqlBody}
;`;

  await runDbaccess(sql);

  const raw = await fs.readFile(tmp, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const rows = lines.map(line => {
    const parts = line.split(delimiter).map(s => s.trim());
    const obj = {};
    columns.forEach((c, i) => { obj[c] = parts[i] ?? null; });
    return obj;
  });

  // limpieza del fichero temporal
  try { await fs.unlink(tmp); } catch {}
  return { rows, raw };
}

/**
 * Ejecuta cualquier SQL (por ejemplo un COUNT simple) y devuelve la salida RAW de dbaccess.
 * Útil para pings o consultas que no necesitan parseo.
 */
async function runDbaccess(sql) {
  return new Promise((resolve, reject) => {
    const child = spawn('bash', ['-lc', `dbaccess ${INFORMIX_DB}@${INFORMIXSERVER} - <<'SQL'\n${sql}\nSQL`], {
      env: getEnv()
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => (stdout += d.toString()));
    child.stderr.on('data', d => (stderr += d.toString()));

    child.on('close', code => {
      if (code === 0) return resolve(stdout);
      const err = new Error(`dbaccess exit ${code}`);
      err.stdout = stdout;
      err.stderr = stderr;
      reject(err);
    });
  });
}

/**
 * ENDPOINTS “SEGUROS” (plantillas):
 */
async function ping() {
  const out = await runDbaccess(`select count(*) as c from systables;`);
  return { ok: true, out };
}

async function getClienteByDni(dni) {
  // matches exacto por DNI; columnas en el orden del SELECT
  const sqlBody = `
select cli, ras, dni, te1, te2, e_mail, pais, anulado
from cli
where dni = '${dni.replace(/'/g, "''")}'
`;
  const columns = ['cli', 'ras', 'dni', 'te1', 'te2', 'e_mail', 'pais', 'anulado'];
  return unloadSelect({ sqlBody, columns, delimiter: ';' });
}

async function searchClientesByRazonSocial(pattern) {
  // Informix SE usa MATCHES con comodines * y ?
  // Si el usuario pasa texto normal, le añadimos * al final para “empieza por”
  const safe = pattern.trim();
  const matches = safe.includes('*') || safe.includes('?') ? safe : `${safe}*`;
  const sqlBody = `
select cli, ras, dni, te1, e_mail, anulado
from cli
where ras matches '${matches.replace(/'/g, "''")}'
order by ras
`;
  const columns = ['cli', 'ras', 'dni', 'te1', 'e_mail', 'anulado'];
  return unloadSelect({ sqlBody, columns, delimiter: ';' });
}

module.exports = {
  ping,
  getClienteByDni,
  searchClientesByRazonSocial,
  runDbaccess,
  unloadSelect
};
