// src/routes/controlAlmacen.router.js
import express from 'express';
import { poolAlmacen } from '../config/databaseAlamcen.js';

const router = express.Router();

// helper para evitar repetir try/catch
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

// 1. Ruta fija /inicio que siempre funciona
router.get('/inicio', wrap(async (req, res) => {
  const [rows] = await poolAlmacen.query('SELECT NOW() AS fecha_servidor');
  res.json({ status: 'ok', data: rows });
}));

// 2. Registra dinámicamente una ruta por cada tabla existente
const tablas = (
  await poolAlmacen.query(
    'SELECT TABLE_NAME FROM information_schema.tables WHERE table_schema = ?',
    [process.env.DB_NAME_ALMACEN]
  )
)[0].map(r => r.TABLE_NAME);

tablas.forEach(tabla => {
  router.get(`/${tabla}`, wrap(async (req, res) => {
    const [rows] = await poolAlmacen.query(`SELECT * FROM \`${tabla}\``);
    res.json({ status: 'ok', data: rows });
  }));
});

// 3. Si piden una ruta de tabla que no existe, devolvemos 404
router.use((req, res) => {
  res.status(404).json({ status: 'error', message: 'Ruta no encontrada' });
});

// 4. Manejo centralizado de errores
router.use((err, req, res, next) => {
  console.error('❌ Error en control-almacén:', err);
  res.status(500).json({
    status: 'error',
    message: 'Error interno del servidor',
    detail: err.code || err.message
  });
});

export default router;
