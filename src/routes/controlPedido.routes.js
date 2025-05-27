const express = require('express');
const pool = require('../config/database');

const router = express.Router();

router.get('/inicio', async (req, res, next) => {
  try {
    const [result] = await pool.execute(`
      SELECT DISTINCT CONCAT(CodigoPresupSerie, '/', CodigoPresupNumero) AS Presupuesto_No
      FROM z_felman2023.fpresupuestoslineas
      ORDER BY CodigoPresupNumero DESC
    `);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
