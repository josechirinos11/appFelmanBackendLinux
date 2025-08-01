// src/routes/controlAlmacen.router.js
const express = require('express');
const poolAlmacen = require('../config/databaseAlamcen');
const router = express.Router();

// Ruta /inicio para verificar conexión
router.get('/inicio', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT NOW() AS fecha_servidor');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /inicio:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Rutas CRUD básicas para cada tabla (consultas SELECT simples)

// Ajustes
router.get('/ajustes', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM ajustes');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /ajustes:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Artículos
router.get('/articulos', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM articulos');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /articulos:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Categorías
router.get('/categorias', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT id, nombre, descripcion FROM categorias');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /categorias:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Configuraciones
router.get('/configuraciones', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM configuraciones');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /configuraciones:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Entradas
router.get('/entradas', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM entradas');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /entradas:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Pedido Items
router.get('/pedido_items', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM pedido_items');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /pedido_items:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Pedidos
router.get('/pedidos', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM pedidos');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /pedidos:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Salidas
router.get('/salidas', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM salidas');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /salidas:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Transferencias
router.get('/transferencias', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM transferencias');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /transferencias:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Ubicaciones
router.get('/ubicaciones', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM ubicaciones');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /ubicaciones:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Usuarios
router.get('/usuarios', async (req, res) => {
  try {
    const [rows] = await poolAlmacen.query('SELECT * FROM usuarios');
    res.json({ status: 'ok', data: rows });
  } catch (error) {
    console.error('❌ Error en /usuarios:', error);
    res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: error.message });
  }
});

// Handler 404 para rutas no encontradas
router.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Ruta no encontrada' });
});

// Middleware de manejo de errores
router.use((err, req, res, next) => {
  console.error('❌ Error en control-almacén:', err);
  res.status(500).json({ status: 'error', message: 'Error interno del servidor', detail: err.message });
});

module.exports = router;
