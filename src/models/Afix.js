// src/models/Afix.js
// Modelo Afix: expone funciones que usan la capa Informix (query)
// Nota: Informix usa `SELECT FIRST 1 ...` en vez de `LIMIT 1`.

const { query, driverReady } = require('../config/databaseInformix');

/**
 * Obtiene un cliente por DNI/NIF/CIF exacto (trim).
 * Devuelve: objeto del cliente o null.
 * Lanza: Error con code=INFORMIX_DRIVER_MISSING si el driver no está disponible.
 */
async function getClienteByDni(dni) {
  if (!dni) {
    const e = new Error('Parámetro dni es requerido');
    e.code = 'BAD_REQUEST';
    throw e;
  }

  // Ajusta el nombre de la tabla/campos según tu esquema real de Informix.
  // He usado 'cli' como tabla típica de clientes y posibles campos nif/dni/cif.
  const sql = `
    SELECT FIRST 1 *
    FROM cli
    WHERE TRIM(nif) = ? OR TRIM(dni) = ? OR TRIM(cif) = ?
  `;

  const rows = await query(sql, [dni, dni, dni]);
  return rows[0] || null;
}

/** Para health/debug: indica si el driver está cargado en este host */
function driverStatus() {
  return { driverReady };
}

module.exports = {
  getClienteByDni,
  driverStatus,
};
