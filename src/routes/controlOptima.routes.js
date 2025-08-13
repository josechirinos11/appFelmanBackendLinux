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




// === DASHBOARD_BARCODE_VIEW: listado paginado con filtros + fallback =========
/**
 * GET /control-optima/barcoder
 * Query:
 *  - from (YYYY-MM-DD) opcional; por defecto hoy-30
 *  - to   (YYYY-MM-DD) opcional; por defecto hoy
 *  - page (1..n)       opcional; por defecto 1
 *  - pageSize          opcional; por defecto 50 (máx 500)
 *  - search            opcional (PEDIDO/USERNAME/NOMBRE/PRODUCTO/CENTRO_TRABAJO/VIDRIO)
 *
 * Respuesta:
 *  { items, page, pageSize, total, from, to, usedFrom, usedTo, orderBy:"EventDT", orderDir:"DESC", agg:{piezas, area} }
 */
router.get('/barcoder', async (req, res) => {
  const { from, to, page = '1', pageSize = '50', search = '' } = req.query;
  console.log('🔍 GET /control-optima/barcoder', { from, to, page, pageSize, search });

  // Defaults (últimos 30 días desde hoy)
  const today = new Date();
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const defTo = fmt(today);
  const d30 = new Date(today); d30.setDate(d30.getDate() - 30);
  const defFrom = fmt(d30);

  const fromParam = (typeof from === 'string' && from.trim()) ? from : defFrom;
  const toParam   = (typeof to   === 'string' && to.trim())   ? to   : defTo;
  const pageNum   = Math.max(1, parseInt(page, 10) || 1);
  const sizeNum   = Math.min(500, Math.max(1, parseInt(pageSize, 10) || 50));
  const offset    = (pageNum - 1) * sizeNum;
  const searchTxt = (typeof search === 'string' && search.trim()) ? search.trim() : null;

  try {
    const pool = await poolPromise;
    const request = pool.request()
      .input('from',     sql.Date,      fromParam)
      .input('to',       sql.Date,      toParam)
      .input('offset',   sql.Int,       offset)
      .input('pageSize', sql.Int,       sizeNum)
      .input('search',   sql.NVarChar,  searchTxt);

    const query = `
DECLARE @usedFrom DATE = @from;
DECLARE @usedTo   DATE = @to;

-- 1) ¿Hay filas en el rango pedido?
DECLARE @cnt INT;
SELECT @cnt = COUNT(*)
FROM (
  SELECT 1 AS x
  FROM DASHBOARD_BARCODE_VIEW WITH (NOLOCK)
  WHERE COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) >= @usedFrom
    AND COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) < DATEADD(DAY, 1, @usedTo)
    AND ( @search IS NULL OR @search = ''
          OR PEDIDO         LIKE '%' + @search + '%'
          OR USERNAME       LIKE '%' + @search + '%'
          OR NOMBRE         LIKE '%' + @search + '%'
          OR PRODUCTO       LIKE '%' + @search + '%'
          OR CENTRO_TRABAJO LIKE '%' + @search + '%'
          OR VIDRIO         LIKE '%' + @search + '%'
        )
) s;

-- 2) Fallback: si no hay filas, usa los últimos 30 días del dato más reciente
IF (@cnt = 0)
BEGIN
  DECLARE @maxDt DATETIME = (
    SELECT MAX(COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)))
    FROM DASHBOARD_BARCODE_VIEW WITH (NOLOCK)
  );
  IF (@maxDt IS NOT NULL)
  BEGIN
    SET @usedTo = CAST(@maxDt AS DATE);
    SET @usedFrom = DATEADD(DAY, -30, @usedTo);
  END
END

-- 3) Totales/agregados del rango efectivo
SELECT
  @usedFrom                                       AS usedFrom,
  @usedTo                                         AS usedTo,
  COUNT(*)                                        AS total,
  ISNULL(SUM(CAST(PIEZAS AS float)), 0)           AS piezas,
  ISNULL(SUM(CAST(AREA   AS float)), 0)           AS area
FROM DASHBOARD_BARCODE_VIEW WITH (NOLOCK)
WHERE COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) >= @usedFrom
  AND COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) < DATEADD(DAY, 1, @usedTo)
  AND ( @search IS NULL OR @search = ''
        OR PEDIDO         LIKE '%' + @search + '%'
        OR USERNAME       LIKE '%' + @search + '%'
        OR NOMBRE         LIKE '%' + @search + '%'
        OR PRODUCTO       LIKE '%' + @search + '%'
        OR CENTRO_TRABAJO LIKE '%' + @search + '%'
        OR VIDRIO         LIKE '%' + @search + '%'
      );

-- 4) Página de datos del rango efectivo
SELECT *
FROM (
  SELECT
    *,
    COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) AS EventDT
  FROM DASHBOARD_BARCODE_VIEW WITH (NOLOCK)
  WHERE COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) >= @usedFrom
    AND COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) < DATEADD(DAY, 1, @usedTo)
    AND ( @search IS NULL OR @search = ''
          OR PEDIDO         LIKE '%' + @search + '%'
          OR USERNAME       LIKE '%' + @search + '%'
          OR NOMBRE         LIKE '%' + @search + '%'
          OR PRODUCTO       LIKE '%' + @search + '%'
          OR CENTRO_TRABAJO LIKE '%' + @search + '%'
          OR VIDRIO         LIKE '%' + @search + '%'
        )
) b
ORDER BY b.EventDT DESC
OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    `;

    const result = await request.query(query);
    const meta  = result.recordsets?.[0]?.[0] || { total: 0, piezas: 0, area: 0, usedFrom: fromParam, usedTo: toParam };
    const items = result.recordsets?.[1] || [];

    console.log(`✅ /barcoder OK page=${pageNum} size=${sizeNum} total=${meta.total} items=${items.length} usedFrom=${meta.usedFrom} usedTo=${meta.usedTo}`);

    return res.json({
      items,
      page: pageNum,
      pageSize: sizeNum,
      total: meta.total,
      from: fromParam,
      to: toParam,
      usedFrom: meta.usedFrom,
      usedTo: meta.usedTo,
      orderBy: 'EventDT',
      orderDir: 'DESC',
      agg: { piezas: meta.piezas, area: meta.area }
    });

  } catch (err) {
    console.error('❌ ERROR EN /control-optima/barcoder:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});










// === DASHBOARD_STATUS_ORDER_VIEW ===============================================
// GET /control-optima/barcoder-order
// Query: from,to (YYYY-MM-DD), page, pageSize, search
// Lógica: usa FechaPedido; si no hay filas -> últimos 30 días desde MAX(FechaPedido);
// si aún no hay -> usa FechaEntrega con mismos criterios.
router.get('/barcoder-order', async (req, res) => {
  const { from, to, page = '1', pageSize = '50', search = '' } = req.query;
  console.log('🔍 GET /control-optima/barcoder-order', { from, to, page, pageSize, search });

  // Defaults (últimos 30 días desde hoy)
  const today = new Date();
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const defTo = fmt(today);
  const d30 = new Date(today); d30.setDate(d30.getDate() - 30);
  const defFrom = fmt(d30);

  const fromParam = (typeof from === 'string' && from.trim()) ? from : defFrom;
  const toParam   = (typeof to   === 'string' && to.trim())   ? to   : defTo;
  const pageNum   = Math.max(1, parseInt(page, 10) || 1);
  const sizeNum   = Math.min(500, Math.max(1, parseInt(pageSize, 10) || 50));
  const offset    = (pageNum - 1) * sizeNum;
  const searchTxt = (typeof search === 'string' && search.trim()) ? search.trim() : null;

  try {
    const pool = await poolPromise;
    const rq = pool.request()
      .input('from',     sql.Date,     fromParam)
      .input('to',       sql.Date,     toParam)
      .input('offset',   sql.Int,      offset)
      .input('pageSize', sql.Int,      sizeNum)
      .input('search',   sql.NVarChar, searchTxt);

    // Función SQL reutilizable en el batch con parámetros locales
    const query = `
DECLARE @usedFrom DATE = @from;
DECLARE @usedTo   DATE = @to;
DECLARE @mode NVARCHAR(16) = 'Pedido'; -- 'Pedido' o 'Entrega'
DECLARE @cnt INT = 0;

-- 1) Intento: FechaPedido
SELECT @cnt = COUNT(1)
FROM DASHBOARD_STATUS_ORDER_VIEW WITH (NOLOCK)
WHERE FechaPedido >= @usedFrom
  AND FechaPedido < DATEADD(DAY, 1, @usedTo)
  AND ( @search IS NULL OR @search = ''
        OR Pedido      LIKE '%' + @search + '%'
        OR RefCli      LIKE '%' + @search + '%'
        OR DescrLinea  LIKE '%' + @search + '%'
        OR CodDet      LIKE '%' + @search + '%'
        OR DescDet     LIKE '%' + @search + '%'
        OR RazonSocial LIKE '%' + @search + '%'
      );

-- 2) Fallback por FechaPedido: últimos 30 días del máximo FechaPedido
IF (@cnt = 0)
BEGIN
  DECLARE @maxFP DATETIME = (SELECT MAX(FechaPedido) FROM DASHBOARD_STATUS_ORDER_VIEW WITH (NOLOCK));
  IF (@maxFP IS NOT NULL)
  BEGIN
    SET @usedTo   = CAST(@maxFP AS DATE);
    SET @usedFrom = DATEADD(DAY, -30, @usedTo);

    SELECT @cnt = COUNT(1)
    FROM DASHBOARD_STATUS_ORDER_VIEW WITH (NOLOCK)
    WHERE FechaPedido >= @usedFrom
      AND FechaPedido < DATEADD(DAY, 1, @usedTo)
      AND ( @search IS NULL OR @search = ''
            OR Pedido      LIKE '%' + @search + '%'
            OR RefCli      LIKE '%' + @search + '%'
            OR DescrLinea  LIKE '%' + @search + '%'
            OR CodDet      LIKE '%' + @search + '%'
            OR DescDet     LIKE '%' + @search + '%'
            OR RazonSocial LIKE '%' + @search + '%'
          );
  END
END

-- 3) Si aún no hay, probar con FechaEntrega (máximo)
IF (@cnt = 0)
BEGIN
  SET @mode = 'Entrega';
  SET @usedFrom = @from;
  SET @usedTo   = @to;

  SELECT @cnt = COUNT(1)
  FROM DASHBOARD_STATUS_ORDER_VIEW WITH (NOLOCK)
  WHERE FechaEntrega >= @usedFrom
    AND FechaEntrega < DATEADD(DAY, 1, @usedTo)
    AND ( @search IS NULL OR @search = ''
          OR Pedido      LIKE '%' + @search + '%'
          OR RefCli      LIKE '%' + @search + '%'
          OR DescrLinea  LIKE '%' + @search + '%'
          OR CodDet      LIKE '%' + @search + '%'
          OR DescDet     LIKE '%' + @search + '%'
          OR RazonSocial LIKE '%' + @search + '%'
        );

  IF (@cnt = 0)
  BEGIN
    DECLARE @maxFE DATETIME = (SELECT MAX(FechaEntrega) FROM DASHBOARD_STATUS_ORDER_VIEW WITH (NOLOCK));
    IF (@maxFE IS NOT NULL)
    BEGIN
      SET @usedTo   = CAST(@maxFE AS DATE);
      SET @usedFrom = DATEADD(DAY, -30, @usedTo);

      SELECT @cnt = COUNT(1)
      FROM DASHBOARD_STATUS_ORDER_VIEW WITH (NOLOCK)
      WHERE FechaEntrega >= @usedFrom
        AND FechaEntrega < DATEADD(DAY, 1, @usedTo)
        AND ( @search IS NULL OR @search = ''
              OR Pedido      LIKE '%' + @search + '%'
              OR RefCli      LIKE '%' + @search + '%'
              OR DescrLinea  LIKE '%' + @search + '%'
              OR CodDet      LIKE '%' + @search + '%'
              OR DescDet     LIKE '%' + @search + '%'
              OR RazonSocial LIKE '%' + @search + '%'
            );
    END
  END
END

-- 4) Totales + Página según @mode
IF (@mode = 'Pedido')
BEGIN
  SELECT
    @usedFrom AS usedFrom,
    @usedTo   AS usedTo,
    @mode     AS mode,
    COUNT(*)  AS total,
    ISNULL(SUM(CAST(TotPiezas     AS float)),0) AS piezas,
    ISNULL(SUM(CAST(PiezasLinea   AS float)),0) AS piezasLinea,
    ISNULL(SUM(CAST(PiezasDet     AS float)),0) AS piezasDet
  FROM DASHBOARD_STATUS_ORDER_VIEW WITH (NOLOCK)
  WHERE FechaPedido >= @usedFrom
    AND FechaPedido < DATEADD(DAY, 1, @usedTo)
    AND ( @search IS NULL OR @search = ''
          OR Pedido      LIKE '%' + @search + '%'
          OR RefCli      LIKE '%' + @search + '%'
          OR DescrLinea  LIKE '%' + @search + '%'
          OR CodDet      LIKE '%' + @search + '%'
          OR DescDet     LIKE '%' + @search + '%'
          OR RazonSocial LIKE '%' + @search + '%'
        );

  SELECT *
  FROM (
    SELECT *, FechaPedido AS EventDT
    FROM DASHBOARD_STATUS_ORDER_VIEW WITH (NOLOCK)
    WHERE FechaPedido >= @usedFrom
      AND FechaPedido < DATEADD(DAY, 1, @usedTo)
      AND ( @search IS NULL OR @search = ''
            OR Pedido      LIKE '%' + @search + '%'
            OR RefCli      LIKE '%' + @search + '%'
            OR DescrLinea  LIKE '%' + @search + '%'
            OR CodDet      LIKE '%' + @search + '%'
            OR DescDet     LIKE '%' + @search + '%'
            OR RazonSocial LIKE '%' + @search + '%'
          )
  ) b
  ORDER BY b.EventDT DESC
  OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
END
ELSE
BEGIN
  SELECT
    @usedFrom AS usedFrom,
    @usedTo   AS usedTo,
    @mode     AS mode,
    COUNT(*)  AS total,
    ISNULL(SUM(CAST(TotPiezas     AS float)),0) AS piezas,
    ISNULL(SUM(CAST(PiezasLinea   AS float)),0) AS piezasLinea,
    ISNULL(SUM(CAST(PiezasDet     AS float)),0) AS piezasDet
  FROM DASHBOARD_STATUS_ORDER_VIEW WITH (NOLOCK)
  WHERE FechaEntrega >= @usedFrom
    AND FechaEntrega < DATEADD(DAY, 1, @usedTo)
    AND ( @search IS NULL OR @search = ''
          OR Pedido      LIKE '%' + @search + '%'
          OR RefCli      LIKE '%' + @search + '%'
          OR DescrLinea  LIKE '%' + @search + '%'
          OR CodDet      LIKE '%' + @search + '%'
          OR DescDet     LIKE '%' + @search + '%'
          OR RazonSocial LIKE '%' + @search + '%'
        );

  SELECT *
  FROM (
    SELECT *, FechaEntrega AS EventDT
    FROM DASHBOARD_STATUS_ORDER_VIEW WITH (NOLOCK)
    WHERE FechaEntrega >= @usedFrom
      AND FechaEntrega < DATEADD(DAY, 1, @usedTo)
      AND ( @search IS NULL OR @search = ''
            OR Pedido      LIKE '%' + @search + '%'
            OR RefCli      LIKE '%' + @search + '%'
            OR DescrLinea  LIKE '%' + @search + '%'
            OR CodDet      LIKE '%' + @search + '%'
            OR DescDet     LIKE '%' + @search + '%'
            OR RazonSocial LIKE '%' + @search + '%'
          )
  ) b
  ORDER BY b.EventDT DESC
  OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
END
    `;

    const result = await rq.query(query);
    const meta  = result.recordsets?.[0]?.[0] || { total: 0, usedFrom: fromParam, usedTo: toParam, mode: 'Pedido', piezas: 0, piezasLinea: 0, piezasDet: 0 };
    const items = result.recordsets?.[1] || [];

    console.log(`✅ /barcoder-order OK mode=${meta.mode} page=${pageNum} size=${sizeNum} total=${meta.total} items=${items.length} usedFrom=${meta.usedFrom} usedTo=${meta.usedTo}`);

    return res.json({
      items,
      page: pageNum,
      pageSize: sizeNum,
      total: meta.total,
      from: fromParam,
      to: toParam,
      usedFrom: meta.usedFrom,
      usedTo: meta.usedTo,
      mode: meta.mode,                // 'Pedido' o 'Entrega'
      orderBy: 'EventDT',
      orderDir: 'DESC',
      agg: { piezas: meta.piezas, piezasLinea: meta.piezasLinea, piezasDet: meta.piezasDet }
    });

  } catch (err) {
    console.error('❌ ERROR EN /control-optima/barcoder-order:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});






// === DASHBOARD_BARCODE_DET_VIEW =================================================
// GET /control-optima/barcoder-det
// Query: from,to (YYYY-MM-DD), page, pageSize, search
router.get('/barcoder-det', async (req, res) => {
  const { from, to, page = '1', pageSize = '50', search = '' } = req.query;
  console.log('🔍 GET /control-optima/barcoder-det', { from, to, page, pageSize, search });

  // Defaults (últimos 30 días)
  const today = new Date();
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const defTo = fmt(today);
  const d30 = new Date(today); d30.setDate(d30.getDate() - 30);
  const defFrom = fmt(d30);

  const fromParam = (typeof from === 'string' && from.trim()) ? from : defFrom;
  const toParam   = (typeof to   === 'string' && to.trim())   ? to   : defTo;
  const pageNum   = Math.max(1, parseInt(page, 10) || 1);
  const sizeNum   = Math.min(500, Math.max(1, parseInt(pageSize, 10) || 50));
  const offset    = (pageNum - 1) * sizeNum;
  const searchTxt = (typeof search === 'string' && search.trim()) ? search.trim() : null;

  try {
    const pool = await poolPromise;
    const request = pool.request()
      .input('from',     sql.Date,     fromParam)
      .input('to',       sql.Date,     toParam)
      .input('offset',   sql.Int,      offset)
      .input('pageSize', sql.Int,      sizeNum)
      .input('search',   sql.NVarChar, searchTxt);

    const query = `
DECLARE @usedFrom DATE = @from;
DECLARE @usedTo   DATE = @to;
DECLARE @cnt INT;

-- 1) Intento con rango pedido (COUNT directo, sin subquery)
SELECT @cnt = COUNT(1)
FROM DASHBOARD_BARCODE_DET_VIEW WITH (NOLOCK)
WHERE COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) >= @usedFrom
  AND COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) < DATEADD(DAY, 1, @usedTo)
  AND ( @search IS NULL OR @search = ''
        OR PEDIDO         LIKE '%' + @search + '%'
        OR USERNAME       LIKE '%' + @search + '%'
        OR NOMBRE         LIKE '%' + @search + '%'
        OR PRODUCTO       LIKE '%' + @search + '%'
        OR TRABAJO        LIKE '%' + @search + '%'
        OR DESC_TRABAJO   LIKE '%' + @search + '%'
        OR CENTRO_TRABAJO LIKE '%' + @search + '%'
        OR VIDRIO         LIKE '%' + @search + '%'
      );

-- 2) Fallback: últimos 30 días del dato más reciente
IF (@cnt = 0)
BEGIN
  DECLARE @maxDt DATETIME = (
    SELECT MAX(COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)))
    FROM DASHBOARD_BARCODE_DET_VIEW WITH (NOLOCK)
  );
  IF (@maxDt IS NOT NULL)
  BEGIN
    SET @usedTo   = CAST(@maxDt AS DATE);
    SET @usedFrom = DATEADD(DAY, -30, @usedTo);

    SELECT @cnt = COUNT(1)
    FROM DASHBOARD_BARCODE_DET_VIEW WITH (NOLOCK)
    WHERE COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) >= @usedFrom
      AND COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) < DATEADD(DAY, 1, @usedTo)
      AND ( @search IS NULL OR @search = ''
            OR PEDIDO         LIKE '%' + @search + '%'
            OR USERNAME       LIKE '%' + @search + '%'
            OR NOMBRE         LIKE '%' + @search + '%'
            OR PRODUCTO       LIKE '%' + @search + '%'
            OR TRABAJO        LIKE '%' + @search + '%'
            OR DESC_TRABAJO   LIKE '%' + @search + '%'
            OR CENTRO_TRABAJO LIKE '%' + @search + '%'
            OR VIDRIO         LIKE '%' + @search + '%'
          );
  END
END

-- 3) Totales/agregados del rango efectivo
SELECT
  @usedFrom                                   AS usedFrom,
  @usedTo                                     AS usedTo,
  COUNT(*)                                    AS total,
  ISNULL(SUM(CAST(PIEZAS AS float)), 0)       AS piezas,
  ISNULL(SUM(CAST(AREA   AS float)), 0)       AS area
FROM DASHBOARD_BARCODE_DET_VIEW WITH (NOLOCK)
WHERE COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) >= @usedFrom
  AND COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) < DATEADD(DAY, 1, @usedTo)
  AND ( @search IS NULL OR @search = ''
        OR PEDIDO         LIKE '%' + @search + '%'
        OR USERNAME       LIKE '%' + @search + '%'
        OR NOMBRE         LIKE '%' + @search + '%'
        OR PRODUCTO       LIKE '%' + @search + '%'
        OR TRABAJO        LIKE '%' + @search + '%'
        OR DESC_TRABAJO   LIKE '%' + @search + '%'
        OR CENTRO_TRABAJO LIKE '%' + @search + '%'
        OR VIDRIO         LIKE '%' + @search + '%'
      );

-- 4) Página
SELECT *
FROM (
  SELECT
    *,
    COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) AS EventDT
  FROM DASHBOARD_BARCODE_DET_VIEW WITH (NOLOCK)
  WHERE COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) >= @usedFrom
    AND COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) < DATEADD(DAY, 1, @usedTo)
    AND ( @search IS NULL OR @search = ''
          OR PEDIDO         LIKE '%' + @search + '%'
          OR USERNAME       LIKE '%' + @search + '%'
          OR NOMBRE         LIKE '%' + @search + '%'
          OR PRODUCTO       LIKE '%' + @search + '%'
          OR TRABAJO        LIKE '%' + @search + '%'
          OR DESC_TRABAJO   LIKE '%' + @search + '%'
          OR CENTRO_TRABAJO LIKE '%' + @search + '%'
          OR VIDRIO         LIKE '%' + @search + '%'
        )
) b
ORDER BY b.EventDT DESC
OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
    `;

    const result = await request.query(query);
    const meta  = result.recordsets?.[0]?.[0] || { total: 0, piezas: 0, area: 0, usedFrom: fromParam, usedTo: toParam };
    const items = result.recordsets?.[1] || [];

    console.log(`✅ /barcoder-det OK page=${pageNum} size=${sizeNum} total=${meta.total} items=${items.length} usedFrom=${meta.usedFrom} usedTo=${meta.usedTo}`);

    return res.json({
      items,
      page: pageNum,
      pageSize: sizeNum,
      total: meta.total,
      from: fromParam,
      to: toParam,
      usedFrom: meta.usedFrom,
      usedTo: meta.usedTo,
      orderBy: 'EventDT',
      orderDir: 'DESC',
      agg: { piezas: meta.piezas, area: meta.area }
    });

  } catch (err) {
    console.error('❌ ERROR EN /control-optima/barcoder-det:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});









module.exports = router;
