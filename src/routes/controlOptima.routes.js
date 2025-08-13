const express = require("express");
const pool = require("../config/databaseOptima");

const router = express.Router();


/**
 * POST /control-optima/sql
 * Ejecuta una consulta SQL de SOLO LECTURA (SELECT) contra la BD de Óptima.
 * Body: { "query": "SELECT ..."}
 */
router.post('/sql', async (req, res) => {
  console.log("🔍 Petición recibida en /control-optima/sql");
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ status: 'error', message: 'Falta la consulta SQL en el cuerpo' });
  }

  // Protección básica: sólo SELECT (evita UPDATE/DELETE/DDL).
  const q = query.trim();
  if (!/^select\b/i.test(q)) {
    return res.status(400).json({ status: 'error', message: 'Solo se permiten consultas SELECT' });
  }

  try {
    // Usar query() en lugar de execute() para SQL arbitrario
    const [rows] = await pool.query(q);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('❌ ERROR EN /control-optima/sql:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error al ejecutar la consulta',
      detail: error.message,
    });
  }
});



router.get('/DASHBOARD_QALOG', async (req, res) => {
    console.log("🔍 Petición recibida en /optima/DASHBOARD_QALOG");
    try {
      const pool = await poolPromise;
      const result = await pool.request()
        .query('SELECT * FROM DASHBOARD_QALOG');
      res.json(result.recordset);
    } catch (err) {
      console.error('Error en DASHBOARD_QALOG', err);
      res.status(500).json({ status: 'error', message: err.message });
    }
  });






module.exports = router;
