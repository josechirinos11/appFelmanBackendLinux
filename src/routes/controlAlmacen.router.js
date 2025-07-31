
// src/routes/controlAlmacen.router.js
const express = require('express');
const poolAlmacen = require('../config/databaseAlamcen');
const router = express.Router();

// Wrapper para async handlers
function wrap(fn) {
  return function(req, res, next) {
    fn(req, res, next).catch(next);
  };
}

// Ruta fija /inicio
router.get('/inicio', wrap(async (req, res) => {
  const [rows] = await poolAlmacen.query('SELECT NOW() AS fecha_servidor');
  res.json({ status: 'ok', data: rows });
}));

// Registrar rutas dinámicas según tablas existentes
(async () => {
  try {
    const [results] = await poolAlmacen.query(
      'SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ?', 
      [process.env.DB_NAME_ALMACEN]
    );
    const tablas = results.map(r => r.TABLE_NAME);
    tablas.forEach(tabla => {
      router.get(`/${tabla}`, wrap(async (req, res) => {
        const [rows] = await poolAlmacen.query(`SELECT * FROM \`${tabla}\``);
        res.json({ status: 'ok', data: rows });
      }));
    });
  } catch (err) {
    console.error('Error al registrar rutas dinámicas:', err);
  }
})();

// Handler 404 para rutas no encontradas
router.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Ruta no encontrada' });
});

// Middleware de manejo de errores
router.use((err, req, res, next) => {
  console.error('❌ Error en control-almacén:', err);
  res.status(500).json({
    status: 'error',
    message: 'Error interno del servidor',
    detail: err.code || err.message
  });
});

module.exports = router;