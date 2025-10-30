// src/config/databaseInformix.js
const ibmdb = require('ibm_db');

/**
 * Ajusta tus datos reales. SERVER es el nombre del “dbserver” de Informix (onconfig).
 * SERVICE suele ser el puerto (ej. 9088). PROTOCOL normalmente onsoctcp.
 */
const cfg = {
  DATABASE: process.env.AFIX_DB || 'afixdb',
  HOSTNAME: process.env.AFIX_HOST || '128.0.0.253',
  PORT:     process.env.AFIX_PORT || 9088,
  SERVER:   process.env.AFIX_SERVER || 'afix_server', // nombre del dbserver (DBSERVERNAME)
  PROTOCOL: process.env.AFIX_PROTOCOL || 'onsoctcp',
  UID:      process.env.AFIX_USER || 'informix',
  PWD:      process.env.AFIX_PASS || '$1mb@',
};

const connStr =
  `DATABASE=${cfg.DATABASE};` +
  `HOSTNAME=${cfg.HOSTNAME};` +
  `PORT=${cfg.PORT};` +
  `PROTOCOL=${cfg.PROTOCOL};` +
  `UID=${cfg.UID};PWD=${cfg.PWD};` +
  `SERVER=${cfg.SERVER};`;

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    ibmdb.open(connStr, (err, conn) => {
      if (err) return reject(err);
      conn.query(sql, params, (err2, rows) => {
        conn.close(() => {}); // cerrar siempre
        if (err2) return reject(err2);
        resolve(rows || []);
      });
    });
  });
}

module.exports = { query };
