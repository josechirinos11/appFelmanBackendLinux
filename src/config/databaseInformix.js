// src/config/databaseInformix.js
// Carga perezosa (lazy) del driver para que la app no crashee al iniciar.
// Solo se intentará cargar ibm_db cuando realmente haga falta abrir conexión.

let ibmdb = null;
let driverReady = false;

try {
  // OJO: en SLES12 el binario que trae ibm_db exige GLIBC>=2.32 y puede fallar.
  // Si falla aquí, no dejamos que explote el proceso, solo marcamos driverReady=false.
  ibmdb = require('ibm_db');
  driverReady = true;
} catch (e) {
  console.warn('[Informix] ibm_db no disponible en este host:', e.message);
  driverReady = false;
}

// ✅ Configuración para Informix SE con dbaccess
const CFG = {
  // Conexión basada en tu sqlhosts: afix4_tcp sesoctcp felman sqlexec
  connStr:
    process.env.INFORMIX_CONNSTR ||
    'DRIVER={IBM INFORMIX ODBC DRIVER};SERVER=afix4_tcp;DATABASE=apli01;HOST=felman;SERVICE=sqlexec;PROTOCOL=onsoctcp;',
  
  // Variables de entorno necesarias (deben estar en .env o sistema)
  INFORMIXDIR: process.env.INFORMIXDIR || '/home/ix730',
  INFORMIXSERVER: process.env.INFORMIXSERVER || 'afix4_tcp',
  DBPATH: process.env.DBPATH || '/home/af5/dat/afix4/dbs:/home/af5/dat/afix4/dbs.20250618:/home/ix730/etc',
};

async function getConnection() {
  if (!driverReady || !ibmdb) {
    const err = new Error(
      'ibm_db no instalado o incompatible (GLIBC). Este host usa fallback CLI.'
    );
    err.code = 'INFORMIX_DRIVER_MISSING';
    throw err;
  }
  
  // Configurar variables de entorno antes de conectar
  process.env.INFORMIXDIR = CFG.INFORMIXDIR;
  process.env.INFORMIXSERVER = CFG.INFORMIXSERVER;
  process.env.DBPATH = CFG.DBPATH;
  
  // Abre conexión on-demand
  return ibmdb.open(CFG.connStr);
}

// ✅ Compatibilidad con código existente que usa db.query(sql, params)
async function query(sql, params = []) {
  const conn = await getConnection(); // Lanzará INFORMIX_DRIVER_MISSING si no hay driver
  try {
    const rows = await new Promise((resolve, reject) => {
      conn.query(sql, params, (err, rs) => (err ? reject(err) : resolve(rs || [])));
    });
    return rows;
  } finally {
    try { conn.close(() => {}); } catch {}
  }
}

module.exports = { getConnection, query, driverReady, CFG };