// Archivo: routes/test.router.js
require('dotenv').config();
const express = require('express');
const pool = require('../config/database');

const router = express.Router();

// Ruta de test: comprueba que el servidor y la BD responden correctamente
router.get('/', async (req, res, next) => {
  console.log('Cargando test.router.js');
      // ① Obtener IP real del cliente
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // ② Loguear en consola la petición y la IP
  console.log(`[${new Date().toISOString()}] GET /test desde IP: ${ip}`);

  try {
    // Ejecutamos una consulta simple para verificar conexión a la base de datos
    // Le puse un alias "test" con un valor fijo (p.ej. 2) para que rows[0].test exista
    const [rows] = await pool.query(`
      SELECT 2 AS test, Codigo, Nombre, FechaAlta
      FROM clientes
      ORDER BY FechaAlta DESC
      LIMIT 10
    `);

    res.json({
      server: 'online',
      database: 'connected',
      testResult: rows  // ahora sí existe y vale 2
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
