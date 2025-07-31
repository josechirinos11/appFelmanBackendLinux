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




module.exports = router;
