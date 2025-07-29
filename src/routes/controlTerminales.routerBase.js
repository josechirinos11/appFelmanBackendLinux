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



router.get('/lotes', async (req, res) => {
    try {
      const [result] = await pool.execute('SELECT * FROM terminales.lotes');
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
  
  router.get('/lotesfabricaciones', async (req, res) => {
    try {
      const [result] = await pool.execute('SELECT * FROM terminales.lotesfabricaciones');
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
  
  router.get('/loteslineas', async (req, res) => {
    try {
      const [result] = await pool.execute('SELECT * FROM terminales.loteslineas');
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
  









module.exports = router;
