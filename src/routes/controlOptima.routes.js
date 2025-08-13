// src/routes/controlOptima.routes.js
const express = require("express");
const { sql, poolPromise } = require("../config/databaseOptima");

const router = express.Router();

/**
 * GET /control-optima/DASHBOARD_QALOG
 * Devuelve todas las filas y columnas de la tabla DASHBOARD_QALOG
 */
router.get('/DASHBOARD_QALOG', async (req, res) => {
  console.log("🔍 Petición recibida en /control-optima/DASHBOARD_QALOG");
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM DASHBOARD_QALOG');
    console.log(`✅ Consulta DASHBOARD_QALOG OK - Filas: ${result.recordset.length}`);
    res.json(result.recordset);
  } catch (err) {
    console.error('❌ ERROR EN /control-optima/DASHBOARD_QALOG:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});

/**
 * POST /control-optima/sql
 * Ejecuta una consulta SQL de solo lectura (SELECT) enviada en el body
 * Body JSON: { "query": "SELECT ..." }
 */
router.post('/sql', async (req, res) => {
  console.log("🔍 Petición recibida en /control-optima/sql");
  const { query } = req.body;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ status: 'error', message: 'Falta la consulta SQL en el cuerpo' });
  }

  // Protección básica: solo SELECT
  const q = query.trim();
  if (!/^select\b/i.test(q)) {
    return res.status(400).json({ status: 'error', message: 'Solo se permiten consultas SELECT' });
  }

  try {
    const pool = await poolPromise;
    const result = await pool.request().query(q);
    console.log(`✅ Consulta SQL OK - Filas: ${result.recordset.length}`);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('❌ ERROR EN /control-optima/sql:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error al ejecutar la consulta',
      detail: error.message,
    });
  }
});


// === CONTROL-OPERARIOS: último evento por operario ===========================
/**
 * GET /control-optima/_OptimaTemp
 * Devuelve una fila por operario (USERNAME) con su último evento en DASHBOARD_QALOG.
 * Params: ?limit=100  (opcional; por defecto 100)
 */
router.get('/_OptimaTemp', async (req, res) => {
  const limit = Number(req.query.limit) || 100;
  console.log('🔍 Petición recibida en /control-optima/_OptimaTemp, limit =', limit);

  // TOP(N) dinámico para SQL Server
  const top = limit > 0 ? `TOP (${limit})` : '';

  // NOTA: Usamos columnas reales de DASHBOARD_QALOG (CLIENTNAME en vez de CLIENTCREATE).
  const q = `
    WITH Ultimo AS (
      SELECT USERNAME, MAX(DATE_COMPL) AS LAST_DATE
      FROM DASHBOARD_QALOG
      WHERE USERNAME IS NOT NULL AND USERNAME <> ''
      GROUP BY USERNAME
    )
    SELECT ${top}
           q.USERNAME,
           q.ID_QALOG,
           q.RIF,
           q.RIGA,
           q.BARCODE,
           q.CLIENTNAME,               -- << aquí el cambio correcto
           q.DATE_COMPL   AS LASTDATE,
           q.ID_COMMESSE,
           q.PROGR,
           q.EventName,
           q.ActionName
    FROM Ultimo u
    JOIN DASHBOARD_QALOG q
      ON q.USERNAME = u.USERNAME
     AND q.DATE_COMPL = u.LAST_DATE
    ORDER BY q.DATE_COMPL DESC;
  `;

  try {
    const pool = await poolPromise; // proviene de databaseOptima.js (mssql)
    const result = await pool.request().query(q);
    console.log(`✅ _OptimaTemp OK - Operarios: ${result.recordset.length}`);
    res.json(result.recordset);
  } catch (err) {
    console.error('❌ ERROR EN /control-optima/_OptimaTemp:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});




module.exports = router;
