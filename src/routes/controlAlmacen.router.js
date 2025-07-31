const express = require('express');
const pool = require('../config/databaseAlamcen');

const router = express.Router();

router.get('/inicio', async (req, res) => {
    try {
      const [result] = await pool.execute('SELECT NOW() AS fecha_servidor');
      res.status(200).json(result);
    } catch (error) {
      console.error('❌ ERROR EN /control-almacen/inicio:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor',
        detail: error.message,
      });
    }
  });


  
// Ruta genérica para listar todos los registros de una tabla
async function listarTabla(tabla, res, next) {
    try {
      const [rows] = await pool.execute(`SELECT * FROM \`${tabla}\``);
      res.status(200).json(rows);
    } catch (error) {
      console.error(`❌ ERROR EN /control-almacen/${tabla}:`, error);
      res.status(500).json({ status: 'error', message: `Error al listar ${tabla}`, detail: error.message });
    }
  }
  
  // Definición de rutas según tablas del esquema
  router.get('/usuarios',       (req, res, next) => listarTabla('usuarios',       res, next));
  router.get('/categorias',     (req, res, next) => listarTabla('categorias',     res, next));
  router.get('/ubicaciones',    (req, res, next) => listarTabla('ubicaciones',    res, next));
  router.get('/articulos',      (req, res, next) => listarTabla('articulos',      res, next));
  router.get('/entradas',       (req, res, next) => listarTabla('entradas',       res, next));
  router.get('/salidas',        (req, res, next) => listarTabla('salidas',        res, next));         // :contentReference[oaicite:8]{index=8}
  router.get('/transferencias', (req, res, next) => listarTabla('transferencias', res, next));         // :contentReference[oaicite:9]{index=9}
  router.get('/ajustes',        (req, res, next) => listarTabla('ajustes',        res, next));         // :contentReference[oaicite:10]{index=10}
  router.get('/configuraciones',(req, res, next) => listarTabla('configuraciones',res, next));         // :contentReference[oaicite:11]{index=11}
  router.get('/pedidos',        (req, res, next) => listarTabla('pedidos',        res, next));         // :contentReference[oaicite:12]{index=12}
  router.get('/pedido_items',   (req, res, next) => listarTabla('pedido_items',   res, next));         // :contentReference[oaicite:13]{index=13}



module.exports = router;
