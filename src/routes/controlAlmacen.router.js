// src/routes/controlAlmacen.router.js
const express = require('express');
const pool    = require('../config/databaseAlamcen');
const router  = express.Router();

// Middleware para capturar errores de async/await
function wrap(fn) {
  return (req, res, next) => fn(req, res, next).catch(next);
}

// Ruta de inicio: devuelve la fecha del servidor
router.get('/inicio', wrap(async (req, res) => {
  const [rows] = await pool.execute('SELECT NOW() AS fecha_servidor');
  res.json({ status: 'ok', data: rows });
}));

// Tablas que quieres exponer
const tablas = [
  'categorias',
  'ubicaciones',
  'articulos',
  'entradas',
  'salidas',
  'transferencias',
  'ajustes',
  'configuraciones',
  'pedidos',
  'pedido_items'
];

// Crea una ruta GET /<tabla> para cada tabla
tablas.forEach(tabla => {
  router.get(`/${tabla}`, wrap(async (req, res) => {
    const [rows] = await pool.execute(`SELECT * FROM \`${tabla}\``);
    res.json({ status: 'ok', data: rows });
  }));
});

// Manejo centralizado de errores al final del router
router.use((err, req, res, next) => {
  console.error('💥 ERROR EN CONTROL-ALMACÉN:', err);
  res.status(500).json({
    status: 'error',
    message: 'Error interno del servidor',
    detail: err.message
  });
});

module.exports = router;
