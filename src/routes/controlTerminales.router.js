const express = require('express');
const pool = require('../config/databaseTerminales');

const router = express.Router();

router.get('/inicio', async (req, res) => {
  try {
    const [result] = await pool.execute('SHOW TABLES');
    res.status(200).json(result);
  } catch (error) {
    console.error('❌ ERROR EN /control-terminales/inicio:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      detail: error.message, // Esto te mostrará el error exacto
    });
  }
});







// GET /control-terminales/lotes
router.get('/lotes', async (req, res) => {
    try {
      const [result] = await pool.execute(
        `SELECT
           num_manual    AS \`Num. manual\`,
           fabricado     AS Fabricado,
           porcentaje    AS \`% Comp.\`,
           cargado       AS Cargado
         FROM terminales.lotes`
      );
      res.status(200).json(result);
    } catch (error) {
      console.error('❌ ERROR EN /control-terminales/lotes:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error interno al consultar lotes',
        detail: error.message,
      });
    }
  });
  
  // GET /control-terminales/loteslineas?num_manual=12345
  router.get('/loteslineas', async (req, res) => {
    const { num_manual } = req.query;
    if (!num_manual) {
      return res.status(400).json({
        status: 'error',
        message: 'Falta parámetro num_manual',
      });
    }
  
    try {
      const [result] = await pool.execute(
        `SELECT
           modulo                           AS Módulo,
           tarea_general1                   AS \`Tarea General 1\`,
           tarea_general2                   AS \`Tarea General 2\`,
           tarea_general3                   AS \`Tarea General 3\`,
           /* … repite hasta … */
           tarea_general15                  AS \`Tarea General 15\`,
           inicia                           AS Inicia,
           final                            AS Final
         FROM terminales.loteslineas
         WHERE num_manual = ?`,
        [num_manual]
      );
      res.status(200).json(result);
    } catch (error) {
      console.error('❌ ERROR EN /control-terminales/loteslineas:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error interno al consultar loteslineas',
        detail: error.message,
      });
    }
  });
  
  // GET /control-terminales/lotesfabricaciones?num_manual=12345&modulo=A1
  router.get('/lotesfabricaciones', async (req, res) => {
    const { num_manual, modulo } = req.query;
    if (!num_manual || !modulo) {
      return res.status(400).json({
        status: 'error',
        message: 'Faltan parámetros num_manual y/o modulo',
      });
    }
  
    try {
      const [result] = await pool.execute(
        `SELECT
           tarea_general1                   AS \`Tarea General 1\`,
           tarea_general2                   AS \`Tarea General 2\`,
           tarea_general3                   AS \`Tarea General 3\`,
           /* … repite hasta … */
           tarea_general15                  AS \`Tarea General 15\`,
           inicia                           AS Inicia,
           final                            AS Final
         FROM terminales.lotesfabricaciones
         WHERE num_manual = ?
           AND modulo    = ?`,
        [num_manual, modulo]
      );
      res.status(200).json(result);
    } catch (error) {
      console.error('❌ ERROR EN /control-terminales/lotesfabricaciones:', error);
      res.status(500).json({
        status: 'error',
        message: 'Error interno al consultar lotesfabricaciones',
        detail: error.message,
      });
    }
  });
  





///////////////////////////////////////////////////////////////////////////////////////////////
// GET /control-terminales/lotes/columns
router.get('/lotes/columns', async (req, res) => {
    try {
      const [cols] = await pool.execute(
        `SELECT COLUMN_NAME
         FROM information_schema.columns
         WHERE table_schema = 'terminales'
           AND table_name   = 'lotes'
         ORDER BY ORDINAL_POSITION`
      );
      res.status(200).json(cols.map(c => c.COLUMN_NAME));
    } catch (error) {
      console.error('❌ ERROR EN /lotes/columns:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });
  
  // GET /control-terminales/loteslineas/columns
  router.get('/loteslineas/columns', async (req, res) => {
    try {
      const [cols] = await pool.execute(
        `SELECT COLUMN_NAME
         FROM information_schema.columns
         WHERE table_schema = 'terminales'
           AND table_name   = 'loteslineas'
         ORDER BY ORDINAL_POSITION`
      );
      res.status(200).json(cols.map(c => c.COLUMN_NAME));
    } catch (error) {
      console.error('❌ ERROR EN /loteslineas/columns:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });
  
  // GET /control-terminales/lotesfabricaciones/columns
  router.get('/lotesfabricaciones/columns', async (req, res) => {
    try {
      const [cols] = await pool.execute(
        `SELECT COLUMN_NAME
         FROM information_schema.columns
         WHERE table_schema = 'terminales'
           AND table_name   = 'lotesfabricaciones'
         ORDER BY ORDINAL_POSITION`
      );
      res.status(200).json(cols.map(c => c.COLUMN_NAME));
    } catch (error) {
      console.error('❌ ERROR EN /lotesfabricaciones/columns:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });
  


module.exports = router;
