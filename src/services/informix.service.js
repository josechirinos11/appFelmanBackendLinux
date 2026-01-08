// src/services/informix.service.js
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuración de Entorno Probada
const envInformix = {
  INFORMIXDIR: '/home/ix730',
  INFORMIXSERVER: 'afix4_tcp',
  DBPATH: '/home/af5/dat/afix4/dbs:/home/af5/dat/afix4/dbs.20250618:/home/ix730/etc',
  DBTEMP: '/home/tmp',
  CLIENT_LOCALE: 'es_es.8859-1',
  DB_LOCALE: 'es_es.8859-1',
  DBDATE: 'DMY4/',
  INFORMIXCONTIME: '5',
  INFORMIXCONRETRY: '1',
  PATH: `${process.env.PATH || ''}:/home/ix730/bin:/home/ix730/lib`,
};

const DBNAME = 'apli01';
const dbaccessBin = fs.existsSync('/home/ix730/bin/dbaccess') ? '/home/ix730/bin/dbaccess' : '/usr/bin/dbaccess';

/**
 * Motor de ejecución principal (El que funciona)
 * Crea un .sql, ejecuta dbaccess -e, genera un .out y lo lee.
 */
async function queryRawSelect(sqlIn) {
  const pid = process.pid;
  const rnd = Math.random().toString(36).slice(2);
  const sqlFile = `/tmp/node_afix_${pid}_${rnd}.sql`;
  const outFile = `/tmp/node_afix_${pid}_${rnd}.out`;

  const script = `unload to '${outFile}' delimiter '|'\n${String(sqlIn).trim()}\n;`;
  fs.writeFileSync(sqlFile, script, { encoding: 'utf8' });

  return new Promise((resolve, reject) => {
    const start = Date.now();
    let child = spawn(dbaccessBin, ['-e', DBNAME, sqlFile], { env: { ...process.env, ...envInformix } });

    const killTimer = setTimeout(() => { try { child.kill('SIGKILL'); } catch {} }, 15000);

    child.on('close', code => {
      clearTimeout(killTimer);
      let payload = '';
      try {
        if (fs.existsSync(outFile)) payload = fs.readFileSync(outFile, 'utf8');
      } catch (_) {}

      try { fs.unlinkSync(sqlFile); fs.unlinkSync(outFile); } catch {}

      if (code !== 0 || !payload) {
        return reject(new Error(`Error dbaccess (Code ${code}) o sin datos`));
      }
      resolve(payload);
    });
  });
}

/**
 * Endpoints utilizando el motor robusto
 */
async function ping() {
  const raw = await queryRawSelect('select count(*) from systables');
  return { ok: true, out: raw.trim() };
}

async function getClienteByDni(dni) {
  const sql = `select cli, ras, dni, te1, e_mail from cli where dni = '${dni.replace(/'/g, "''")}'`;
  const raw = await queryRawSelect(sql);
  const rows = raw.split('\n').filter(Boolean).map(l => l.split('|'));
  return { rows };
}

async function searchClientesByRazonSocial(pattern) {
  const matches = pattern.includes('*') ? pattern : `${pattern}*`;
  const sql = `select cli, ras, dni, te1, e_mail from cli where ras matches '${matches.replace(/'/g, "''")}' order by ras`;
  const raw = await queryRawSelect(sql);
  const rows = raw.split('\n').filter(Boolean).map(l => l.split('|'));
  return { rows };
}

module.exports = { ping, getClienteByDni, searchClientesByRazonSocial, queryRawSelect };