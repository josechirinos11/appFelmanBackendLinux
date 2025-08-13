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


// === DASHBOARD_BARCODE_VIEW: listado paginado con filtros ====================
/**
 * GET /control-optima/barcoder
 * Query:
 *  - from (YYYY-MM-DD) opcional; por defecto hoy - 30 días
 *  - to   (YYYY-MM-DD) opcional; por defecto hoy
 *  - page (1..n)       opcional; por defecto 1
 *  - pageSize          opcional; por defecto 50
 *  - search            opcional; busca en PEDIDO/USERNAME/NOMBRE/PRODUCTO/CENTRO_TRABAJO/VIDRIO
 *
 * Respuesta:
 *  {
 *    items: [...],
 *    page, pageSize, total,
 *    from, to,
 *    orderBy: "DATAHORA_COMPL", orderDir: "DESC",
 *    agg: { piezas, area }
 *  }
 */
router.get('/barcoder', async (req, res) => {
  const { from, to, page = '1', pageSize = '50', search = '' } = req.query;
  console.log('🔍 GET /control-optima/barcoder', { from, to, page, pageSize, search });

  // Defaults de fecha (últimos 30 días) en JS; el SQL usará estos valores
  const today = new Date();
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const defTo = fmt(today);
  const d30 = new Date(today); d30.setDate(d30.getDate() - 30);
  const defFrom = fmt(d30);

  const fromParam = (typeof from === 'string' && from.trim()) ? from : defFrom;
  const toParam   = (typeof to   === 'string' && to.trim())   ? to   : defTo;
  const pageNum   = Math.max(1, parseInt(page, 10) || 1);
  const sizeNum   = Math.min(500, Math.max(1, parseInt(pageSize, 10) || 50)); // cap seguridad
  const offset    = (pageNum - 1) * sizeNum;
  const searchTxt = (typeof search === 'string' && search.trim()) ? search.trim() : null;

  try {
    const pool = await poolPromise;
    const request = pool.request()
      .input('from',     sql.Date, fromParam)
      .input('to',       sql.Date, toParam)
      .input('offset',   sql.Int,  offset)
      .input('pageSize', sql.Int,  sizeNum)
      .input('search',   sql.NVarChar, searchTxt);

    const query = `
      ;WITH base AS (
        SELECT *
        FROM DASHBOARD_BARCODE_VIEW WITH (NOLOCK)
        WHERE DATAHORA_COMPL >= @from
          AND DATAHORA_COMPL < DATEADD(DAY, 1, @to)
          AND ( @search IS NULL OR @search = ''
                OR PEDIDO         LIKE '%' + @search + '%'
                OR USERNAME       LIKE '%' + @search + '%'
                OR NOMBRE         LIKE '%' + @search + '%'
                OR PRODUCTO       LIKE '%' + @search + '%'
                OR CENTRO_TRABAJO LIKE '%' + @search + '%'
                OR VIDRIO         LIKE '%' + @search + '%'
              )
      )
      SELECT
        COUNT(*)                                    AS total,
        ISNULL(SUM(CAST(PIEZAS AS float)), 0)       AS piezas,
        ISNULL(SUM(CAST(AREA   AS float)), 0)       AS area
      FROM base;

      SELECT *
      FROM base
      ORDER BY DATAHORA_COMPL DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    `;

    const result = await request.query(query);
    // result.recordsets[0] => totales, result.recordsets[1] => items
    const totals = result.recordsets[0]?.[0] || { total: 0, piezas: 0, area: 0 };
    const items  = result.recordsets[1] || [];

    console.log(`✅ /barcoder OK page=${pageNum} size=${sizeNum} total=${totals.total} items=${items.length}`);

    return res.json({
      items,
      page: pageNum,
      pageSize: sizeNum,
      total: totals.total,
      from: fromParam,
      to: toParam,
      orderBy: 'DATAHORA_COMPL',
      orderDir: 'DESC',
      agg: { piezas: totals.piezas, area: totals.area }
    });

  } catch (err) {
    console.error('❌ ERROR EN /control-optima/barcoder:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});


module.exports = router;
