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

const CFG = {
  // Ajusta a tu cadena real de conexión Informix si ya la tienes en .env
  connStr:
    process.env.INFORMIX_CONNSTR ||
    'DRIVER={IBM INFORMIX ODBC DRIVER};SERVER=your_server;DATABASE=your_db;HOST=your_host;SERVICE=9088;UID=your_user;PWD=your_pwd;PROTOCOL=onsoctcp;',
};

async function getConnection() {
  if (!driverReady || !ibmdb) {
    const err = new Error(
      'ibm_db no instalado o incompatible (GLIBC). Este host no puede abrir conexión Informix ahora.'
    );
    err.code = 'INFORMIX_DRIVER_MISSING';
    throw err;
  }
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
