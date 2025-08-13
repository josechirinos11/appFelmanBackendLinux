const express = require("express");
const pool = require("../config/databaseOptima");

const router = express.Router();


/**
 * POST /control-optima/sql
 * Ejecuta una consulta SQL de SOLO LECTURA (SELECT) contra la BD de Óptima.
 * Body: { "query": "SELECT ..."}
 */
router.post('/sql', async (req, res) => {
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



  router.get("/DASHBOARD_QALOG", async (req, res) => {
    try {
      const [result] = await pool.execute("SELECT * FROM DASHBOARD_QALOG");
      res.status(200).json(result);
    } catch (error) {
      console.error("❌ ERROR EN /optima/DASHBOARD_QALOG:", error);
      res.status(500).json({
        status: "error",
        message: "Error interno del servidor",
        detail: error.message, // Esto te mostrará el error exacto
      });
    }
  });






module.exports = router;
