// src/routes/controlOptima.routes.js
const express = require("express");
const { sql, poolPromise } = require("../config/databaseOptima");




const router = express.Router();

/**
 * GET /control-optima/DASHBOARD_QALOG

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
// GET /control-optima/barcoder?scope=all|ytd|mtd&from&to&page&pageSize&search
router.get('/barcoder', async (req, res) => {
  const { scope = 'ytd', from, to, page = '1', pageSize = '50', search = '' } = req.query;
  console.log('🔍 /barcoder IN:', { scope, from, to, page, pageSize, search });

  // paginación + búsqueda
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const sizeNum = Math.min(500, Math.max(1, parseInt(pageSize, 10) || 50));
  const offset  = (pageNum - 1) * sizeNum;
  const searchTxt = (typeof search === 'string' && search.trim()) ? search.trim() : null;

  // resolver rango efectivo según scope
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth();
  const pad = (n)=> n<10 ? '0'+n : ''+n;
  const fmt = (d)=> `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  let defFrom, defTo;
  if (scope === 'all') {
    defFrom = null;                // sin filtro fecha
    defTo   = null;
  } else if (scope === 'mtd') {
    defFrom = fmt(new Date(y, m, 1));
    defTo   = fmt(today);
  } else { // ytd (por defecto)
    defFrom = fmt(new Date(y, 0, 1));
    defTo   = fmt(today);
  }

  const fromParam = (typeof from === 'string' && from.trim()) ? from : defFrom;
  const toParam   = (typeof to   === 'string' && to.trim())   ? to   : defTo;

  try {
    const pool = await poolPromise;
    const rq = pool.request()
      .input('from',     sql.Date,     fromParam)
      .input('to',       sql.Date,     toParam)
      .input('offset',   sql.Int,      offset)
      .input('pageSize', sql.Int,      sizeNum)
      .input('search',   sql.NVarChar, searchTxt);

    const query = `
SET NOCOUNT ON;    
DECLARE @usedFrom DATE = @from, @usedTo DATE = @to;
DECLARE @useDateFilter bit = CASE WHEN @usedFrom IS NULL OR @usedTo IS NULL THEN 0 ELSE 1 END;

-- 1) META
SELECT
  @usedFrom AS usedFrom,
  @usedTo   AS usedTo,
  COUNT(*)                                        AS total,
  ISNULL(SUM(CAST(PIEZAS AS float)), 0)           AS piezas,
  ISNULL(SUM(CAST(AREA   AS float)), 0)           AS area
FROM DASHBOARD_BARCODE_VIEW WITH (NOLOCK)
WHERE ( @useDateFilter = 0
        OR COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) >= @usedFrom
           AND COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) < DATEADD(DAY, 1, @usedTo) )
  AND ( @search IS NULL OR @search = ''
        OR PEDIDO         LIKE '%' + @search + '%'
        OR USERNAME       LIKE '%' + @search + '%'
        OR NOMBRE         LIKE '%' + @search + '%'
        OR PRODUCTO       LIKE '%' + @search + '%'
        OR CENTRO_TRABAJO LIKE '%' + @search + '%'
        OR VIDRIO         LIKE '%' + @search + '%' );

-- 2) ITEMS
SELECT *
FROM (
  SELECT
    *,
    COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) AS EventDT
  FROM DASHBOARD_BARCODE_VIEW WITH (NOLOCK)
  WHERE ( @useDateFilter = 0
          OR COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) >= @usedFrom
             AND COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) < DATEADD(DAY, 1, @usedTo) )
    AND ( @search IS NULL OR @search = ''
          OR PEDIDO         LIKE '%' + @search + '%'
          OR USERNAME       LIKE '%' + @search + '%'
          OR NOMBRE         LIKE '%' + @search + '%'
          OR PRODUCTO       LIKE '%' + @search + '%'
          OR CENTRO_TRABAJO LIKE '%' + @search + '%'
          OR VIDRIO         LIKE '%' + @search + '%' )
) b
ORDER BY b.EventDT DESC
OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;`;

    //const result = await rq.query(query);
    console.time('⏱ barcoderQuery');
    const result = await rq.query(query);
    console.timeEnd('⏱ barcoderQuery');
    const meta  = result.recordsets?.[0]?.[0] || { total: 0, piezas: 0, area: 0, usedFrom: fromParam, usedTo: toParam };
    const items = result.recordsets?.[1] || [];


    console.log('✅ /barcoder OUT:', {
      page: pageNum, size: sizeNum, total: meta.total, items: items.length,
      usedFrom: meta.usedFrom, usedTo: meta.usedTo, scope
    });



    

    return res.json({
      items,
      page: pageNum, pageSize: sizeNum,
      total: meta.total,
      from: fromParam, to: toParam,
      usedFrom: meta.usedFrom, usedTo: meta.usedTo,
      orderBy: 'EventDT', orderDir: 'DESC',
      agg: { piezas: meta.piezas, area: meta.area },
      scope
    });
  } catch (err) {
    console.error('❌ /barcoder ERROR:', { scope, from, to, page, pageSize, search, err: err?.message });
    if (err?.stack) console.error(err.stack);
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


// GET /api/control-optima/terminales?from=2025-01-01&to=2025-12-31
// src/routes/controlOptima.routes.js
// ...
// Asegúrate de montar este router como: app.use('/api/control-optima', router)

router.get('/terminales', async (req, res) => {
  try {
    const { from, to } = req.query; // YYYY-MM-DD
    if (!from || !to) {
      return res.status(400).json({ error: 'Parámetros "from" y "to" requeridos (YYYY-MM-DD).' });
    }

    const pool = await poolPromise;

    const q = `
DECLARE @from date = @p_from, @to date = @p_to;
DECLARE @ini datetime = DATEADD(DAY, DATEDIFF(DAY, 0, @from), 0);
DECLARE @fin datetime = DATEADD(MILLISECOND, -3, DATEADD(DAY, 1, DATEADD(DAY, DATEDIFF(DAY, 0, @to), 0)));

WITH Q AS (
  SELECT
    O.ID_ORDINI AS IdPedido, O.RIF AS Pedido, OM.RIGA AS Linea,
    QH.CDL_NAME AS Maquina, QW.[USERNAME] AS Operario,
    WK.CODICE AS CodProceso, WK.DESCRIZIONE AS DescProceso,
    QW.DATESTART AS DateStart, QW.DATEEND AS DateEnd,
    DATEDIFF(SECOND, QW.DATESTART, QW.DATEEND) AS Segundos
  FROM dbo.QUEUEWORK QW
  JOIN dbo.QUEUEHEADER QH ON QH.ID_QUEUEHEADER = QW.ID_QUEUEHEADER
  JOIN dbo.WORKKIND WK    ON WK.ID_WORKKIND    = QW.ID_WORKKIND
  JOIN dbo.ORDMAST OM     ON OM.ID_ORDMAST     = QW.ID_ORDMAST
  JOIN dbo.ORDINI  O      ON O.ID_ORDINI       = OM.ID_ORDINI
  WHERE QW.ID_QUEUEREASON IN (1,2)
    AND QW.ID_QUEUEREASON_COMPLETE = 20
    AND QW.DATESTART IS NOT NULL AND QW.DATEEND IS NOT NULL
    AND QW.DATESTART >= @ini AND QW.DATEEND <= @fin
),
D AS (
  SELECT *,
         ROW_NUMBER() OVER(
           PARTITION BY IdPedido, Linea, Maquina, DateStart, DateEnd
           ORDER BY CodProceso
         ) AS rn
  FROM Q
)
SELECT
  D.Pedido, D.IdPedido,
  P.DESCR1      AS Cliente,
  O.DESCR1_SPED AS NombrePedido,
  MIN(D.DateStart) AS Inicio,
  MAX(D.DateEnd)   AS Fin,
  DATEDIFF(SECOND, MIN(D.DateStart), MAX(D.DateEnd)) AS SegundosMakespan,
  CONVERT(varchar(8), DATEADD(SECOND, DATEDIFF(SECOND, MIN(D.DateStart), MAX(D.DateEnd)), 0), 108) AS MakespanHHMMSS,
  SUM(D.Segundos) AS SegundosBrutos,
  SUM(CASE WHEN D.rn=1 THEN D.Segundos ELSE 0 END) AS SegundosUnicos,
  CONVERT(varchar(8), DATEADD(SECOND, SUM(CASE WHEN D.rn=1 THEN D.Segundos ELSE 0 END), 0),108) AS TiempoUnicoHHMMSS,
  STUFF((SELECT DISTINCT ',' + D2.CodProceso FROM D D2 WHERE D2.IdPedido=D.IdPedido FOR XML PATH(''),TYPE).value('.','nvarchar(max)'),1,1,'') AS Procesos,
  STUFF((SELECT DISTINCT ',' + D3.Operario  FROM D D3 WHERE D3.IdPedido=D.IdPedido FOR XML PATH(''),TYPE).value('.','nvarchar(max)'),1,1,'') AS Operarios,
  STUFF((SELECT DISTINCT ',' + D4.Maquina   FROM D D4 WHERE D4.IdPedido=D.IdPedido FOR XML PATH(''),TYPE).value('.','nvarchar(max)'),1,1,'') AS Maquinas
FROM D
JOIN dbo.ORDINI  O ON O.ID_ORDINI  = D.IdPedido
JOIN dbo.PERSONE P ON P.ID_PERSONE = O.ID_PERSONE
GROUP BY D.Pedido, D.IdPedido, P.DESCR1, O.DESCR1_SPED
ORDER BY Inicio DESC;`;

    const result = await pool.request()
      .input('p_from', sql.Date, from)
      .input('p_to',   sql.Date, to)
      .query(q);

    res.json(result.recordset);
  } catch (err) {
    console.error('❌ /terminales:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/operarios', async (req, res) => {
  try {
    const { from, to } = req.query; // YYYY-MM-DD
    if (!from || !to) {
      return res.status(400).json({ error: 'Parámetros "from" y "to" requeridos (YYYY-MM-DD).' });
    }

    const pool = await poolPromise;

    const q = `
DECLARE @from date = @p_from, @to date = @p_to;
DECLARE @ini datetime = DATEADD(DAY, DATEDIFF(DAY, 0, @from), 0);
DECLARE @fin datetime = DATEADD(MILLISECOND, -3, DATEADD(DAY, 1, DATEADD(DAY, DATEDIFF(DAY, 0, @to), 0)));
WITH Q AS (
  SELECT
    O.ID_ORDINI AS IdPedido, O.RIF AS Pedido, OM.RIGA AS Linea,
    QH.CDL_NAME AS Maquina, WK.CODICE AS CodProceso, WK.DESCRIZIONE AS DescProceso,
    QW.[USERNAME] AS Operario, QW.DATESTART AS DateStart, QW.DATEEND AS DateEnd,
    DATEDIFF(SECOND, QW.DATESTART, QW.DATEEND) AS Segundos
  FROM dbo.QUEUEWORK QW
  JOIN dbo.QUEUEHEADER QH ON QH.ID_QUEUEHEADER = QW.ID_QUEUEHEADER
  JOIN dbo.WORKKIND WK    ON WK.ID_WORKKIND    = QW.ID_WORKKIND
  JOIN dbo.ORDMAST OM     ON OM.ID_ORDMAST     = QW.ID_ORDMAST
  JOIN dbo.ORDINI  O      ON O.ID_ORDINI       = OM.ID_ORDINI
  WHERE QW.ID_QUEUEREASON IN (1,2)
    AND QW.ID_QUEUEREASON_COMPLETE = 20
    AND QW.DATESTART IS NOT NULL AND QW.DATEEND IS NOT NULL
    AND QW.DATESTART >= @ini AND QW.DATEEND <= @fin
),
D AS (
  SELECT *,
         ROW_NUMBER() OVER(
           PARTITION BY IdPedido, Linea, Maquina, DateStart, DateEnd
           ORDER BY CodProceso
         ) AS rn
  FROM Q
)
SELECT
  Pedido, IdPedido, Linea,
  CodProceso, DescProceso, Maquina,
  STUFF((SELECT DISTINCT ',' + D2.Operario
         FROM D D2
         WHERE D2.IdPedido=D.IdPedido AND D2.CodProceso=D.CodProceso
         FOR XML PATH(''),TYPE).value('.','nvarchar(max)'),1,1,'') AS Operarios,
  COUNT(*) AS Registros,
  SUM(CASE WHEN rn=1 THEN Segundos ELSE 0 END) AS SegundosProceso,
  CONVERT(varchar(8), DATEADD(SECOND, SUM(CASE WHEN rn=1 THEN Segundos ELSE 0 END), 0), 108) AS TiempoHHMMSS,
  MIN(DateStart) AS InicioProceso,
  MAX(DateEnd)   AS FinProceso
FROM D
GROUP BY Pedido, IdPedido, Linea, CodProceso, DescProceso, Maquina
ORDER BY InicioProceso DESC, Pedido, CodProceso;`;

    const result = await pool.request()
      .input('p_from', sql.Date, from)
      .input('p_to',   sql.Date, to)
      .query(q);

    res.json(result.recordset);
  } catch (err) {
    console.error('❌ /operarios:', err);
    res.status(500).json({ error: err.message });
  }
});






// ===========================
// CONTROL-OPTIMA · QW REPORTS
// ===========================
// En src/routes/controlOptima.routes.js
// AÑADIR debajo de otras rutas:   router.get('/qw/...', ...)


function baseCTE(filters = {}) {
  // Agregamos filtros opcionales a la CTE
  const { byMaquina = false, byOperario = false } = filters;
  return `
DECLARE @from date = @p_from, @to date = @p_to;
DECLARE @ini datetime = DATEADD(DAY, DATEDIFF(DAY, 0, @from), 0);
DECLARE @fin datetime = DATEADD(MILLISECOND, -3, DATEADD(DAY, 1, DATEADD(DAY, DATEDIFF(DAY, 0, @to), 0)));

WITH Q AS (
  SELECT
    O.ID_ORDINI AS IdPedido, O.RIF AS Pedido, OM.RIGA AS Linea,
    QH.CDL_NAME AS Maquina, QW.[USERNAME] AS Operario,
    WK.CODICE AS CodProceso, WK.DESCRIZIONE AS DescProceso,
    QW.DATESTART AS DateStart, QW.DATEEND AS DateEnd,
    DATEDIFF(SECOND, QW.DATESTART, QW.DATEEND) AS Segundos
  FROM dbo.QUEUEWORK QW
  JOIN dbo.QUEUEHEADER QH ON QH.ID_QUEUEHEADER = QW.ID_QUEUEHEADER
  JOIN dbo.WORKKIND WK    ON WK.ID_WORKKIND    = QW.ID_WORKKIND
  JOIN dbo.ORDMAST OM     ON OM.ID_ORDMAST     = QW.ID_ORDMAST
  JOIN dbo.ORDINI  O      ON O.ID_ORDINI       = OM.ID_ORDINI
  WHERE QW.ID_QUEUEREASON IN (1,2)
    AND QW.ID_QUEUEREASON_COMPLETE = 20
    AND QW.DATESTART IS NOT NULL AND QW.DATEEND IS NOT NULL
    AND QW.DATESTART >= @ini AND QW.DATEEND <= @fin
    ${byMaquina ? 'AND QH.CDL_NAME = @p_maquina' : ''}
    ${byOperario ? 'AND QW.[USERNAME] = @p_operario' : ''}
),
D AS (
  SELECT *,
         ROW_NUMBER() OVER(
           PARTITION BY IdPedido, Linea, Maquina, DateStart, DateEnd
           ORDER BY CodProceso
         ) AS rn
  FROM Q
)
`;
}

// ===== Máquinas activas en rango =====
router.get('/qw/machines', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ message: 'from y to requeridos (YYYY-MM-DD).' });

    const pool = await poolPromise;
    const q = baseCTE() + `
SELECT
  Maquina,
  COUNT(*) AS Registros,
  SUM(CASE WHEN rn=1 THEN Segundos ELSE 0 END) AS Segundos
FROM D
WHERE Maquina IS NOT NULL AND LTRIM(RTRIM(Maquina)) <> ''
GROUP BY Maquina
ORDER BY Maquina;
`;
    const r = await pool.request()
      .input('p_from', sql.Date, from)
      .input('p_to',   sql.Date, to)
      .query(q);

    return res.json({ data: r.recordset, from, to });
  } catch (err) {
    console.error('qw/machines', err);
    return res.status(500).json({ message: err.message });
  }
});

// ===== Operarios activos en rango =====
router.get('/qw/operators', async (req, res) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ message: 'from y to requeridos (YYYY-MM-DD).' });

    const pool = await poolPromise;
    const q = baseCTE() + `
SELECT
  Operario,
  COUNT(*) AS Registros,
  SUM(CASE WHEN rn=1 THEN Segundos ELSE 0 END) AS Segundos
FROM D
WHERE Operario IS NOT NULL AND LTRIM(RTRIM(Operario)) <> ''
GROUP BY Operario
ORDER BY Operario;
`;
    const r = await pool.request()
      .input('p_from', sql.Date, from)
      .input('p_to',   sql.Date, to)
      .query(q);

    return res.json({ data: r.recordset, from, to });
  } catch (err) {
    console.error('qw/operators', err);
    return res.status(500).json({ message: err.message });
  }
});

// ===== Matriz Máquina–Operario =====
router.get('/qw/matrix', async (req, res) => {
  try {
    const { from, to, maquina, operario } = req.query;
    if (!from || !to) return res.status(400).json({ message: 'from y to requeridos (YYYY-MM-DD).' });

    const byM = !!maquina, byO = !!operario;
    const pool = await poolPromise;
    const q = baseCTE({ byMaquina: byM, byOperario: byO }) + `
SELECT
  Maquina, Operario,
  COUNT(*) AS Registros,
  SUM(CASE WHEN rn=1 THEN Segundos ELSE 0 END) AS Segundos
FROM D
GROUP BY Maquina, Operario
ORDER BY Maquina, Operario;
`;
    const reqst = pool.request().input('p_from', sql.Date, from).input('p_to', sql.Date, to);
    if (byM) reqst.input('p_maquina', sql.VarChar(100), String(maquina));
    if (byO) reqst.input('p_operario', sql.VarChar(100), String(operario));

    const r = await reqst.query(q);
    return res.json({ data: r.recordset, from, to, maquina, operario });
  } catch (err) {
    console.error('qw/matrix', err);
    return res.status(500).json({ message: err.message });
  }
});

// ===== Detalle crudo por operario =====
router.get('/qw/operario/raw', async (req, res) => {
  try {
    const { from, to, operario, maquina } = req.query;
    if (!from || !to || !operario) return res.status(400).json({ message: 'from, to y operario requeridos.' });

    const pool = await poolPromise;
    const q = baseCTE({ byOperario: true, byMaquina: !!maquina }) + `
SELECT
  Pedido, IdPedido, Linea, Maquina, CodProceso, DescProceso, Operario,
  DateStart, DateEnd, Segundos
FROM D
ORDER BY DateStart DESC;
`;
    const reqst = pool.request()
      .input('p_from', sql.Date, from)
      .input('p_to',   sql.Date, to)
      .input('p_operario', sql.VarChar(100), String(operario));
    if (maquina) reqst.input('p_maquina', sql.VarChar(100), String(maquina));

    const r = await reqst.query(q);
    return res.json({ data: r.recordset, from, to, operario, maquina });
  } catch (err) {
    console.error('qw/operario/raw', err);
    return res.status(500).json({ message: err.message });
  }
});

// ===== Resumen por operario → máquina/proceso =====
router.get('/qw/operario/resumen-maquina-proceso', async (req, res) => {
  try {
    const { from, to, operario, maquina } = req.query;
    if (!from || !to || !operario) return res.status(400).json({ message: 'from, to y operario requeridos.' });

    const pool = await poolPromise;
    const q = baseCTE({ byOperario: true, byMaquina: !!maquina }) + `
SELECT
  Operario, Maquina, CodProceso, DescProceso,
  COUNT(*) AS Registros,
  SUM(CASE WHEN rn=1 THEN Segundos ELSE 0 END) AS Segundos,
  MIN(DateStart) AS Inicio, MAX(DateEnd) AS Fin
FROM D
GROUP BY Operario, Maquina, CodProceso, DescProceso
ORDER BY Inicio DESC, Operario, Maquina, CodProceso;
`;
    const reqst = pool.request()
      .input('p_from', sql.Date, from)
      .input('p_to',   sql.Date, to)
      .input('p_operario', sql.VarChar(100), String(operario));
    if (maquina) reqst.input('p_maquina', sql.VarChar(100), String(maquina));

    const r = await reqst.query(q);
    return res.json({ data: r.recordset, from, to, operario, maquina });
  } catch (err) {
    console.error('qw/operario/resumen-maquina-proceso', err);
    return res.status(500).json({ message: err.message });
  }
});




// ===== PEDIDO · OVERVIEW (cliente, nombre, makespan, tiempos únicos, piezas, área)
// ===== PEDIDO · OVERVIEW (cliente, nombre, makespan, tiempos únicos, piezas, área) — robusto a nombres de columnas
router.get('/qw/order/overview', async (req, res) => {
  try {
    const { from, to, pedido, idPedido } = req.query;
    if (!from || !to || (!pedido && !idPedido))
      return res.status(400).json({ message: 'from, to y pedido (RIF) o idPedido requeridos.' });

    const pool = await poolPromise;

    // 1) Leer columnas reales de la vista (sin CTE para evitar ;WITH)
    const meta = await pool.request().query(`
      SELECT c.name
      FROM sys.columns c
      WHERE c.object_id = OBJECT_ID('dbo.DASHBOARD_STATUS_ORDER_VIEW');
    `);
    const cols = new Set((meta.recordset || []).map(r => String(r.name).toUpperCase()));

    // 2) Elegir candidatos válidos
    const pick = (cands) => cands.find(n => cols.has(n.toUpperCase())) || null;
    const pezCol  = pick(['Piezas','PEZZI','PZ','QTA_PZ','QTA_PEZZI']);
    const areaCol = pick(['Area','MQ','M2','METRIQUADRI','METRI_QUADRI','METRIQUADRATI','SUPERFICIE','SURFACE']);

    // 3) Construir expresiones seguras
    const pezExpr  = pezCol  ? `SUM(TRY_CONVERT(float, V.[${pezCol}]))`  : `CAST(0 AS float)`;
    const areaExpr = areaCol ? `SUM(TRY_CONVERT(float, V.[${areaCol}]))` : `CAST(0 AS float)`;

    // 4) Query principal (usando tu baseCTE)
    const q = baseCTE() + `
, F AS (
  SELECT *
  FROM D
  WHERE (@p_pedido IS NULL OR Pedido = @p_pedido)
    AND (@p_idPedido IS NULL OR IdPedido = @p_idPedido)
)
SELECT TOP 1
  O.RIF           AS Pedido,
  O.ID_ORDINI     AS IdPedido,
  P.DESCR1        AS Cliente,
  O.DESCR1_SPED   AS NombrePedido,
  MIN(F.DateStart) AS Inicio,
  MAX(F.DateEnd)   AS Fin,
  DATEDIFF(SECOND, MIN(F.DateStart), MAX(F.DateEnd)) AS SegundosMakespan,
  CONVERT(varchar(8), DATEADD(SECOND, DATEDIFF(SECOND, MIN(F.DateStart), MAX(F.DateEnd)), 0), 108) AS MakespanHHMMSS,
  SUM(F.Segundos) AS SegundosBrutos,
  SUM(CASE WHEN F.rn=1 THEN F.Segundos ELSE 0 END) AS SegundosUnicos,
  CONVERT(varchar(8), DATEADD(SECOND, SUM(CASE WHEN F.rn=1 THEN F.Segundos ELSE 0 END), 0),108) AS TiempoUnicoHHMMSS,
  ${pezExpr}  AS Piezas,
  ${areaExpr} AS Area
FROM F
JOIN dbo.ORDINI  O ON O.ID_ORDINI  = F.IdPedido
JOIN dbo.PERSONE P ON P.ID_PERSONE = O.ID_PERSONE
LEFT JOIN dbo.DASHBOARD_STATUS_ORDER_VIEW V ON V.Pedido = O.RIF
GROUP BY O.RIF, O.ID_ORDINI, P.DESCR1, O.DESCR1_SPED
ORDER BY Inicio DESC;`;

    const reqst = pool.request()
      .input('p_from', sql.Date, from)
      .input('p_to',   sql.Date, to)
      .input('p_pedido', sql.VarChar(50), pedido || null)
      .input('p_idPedido', sql.Int, idPedido ? Number(idPedido) : null);

    const r = await reqst.query(q);
    // Te mando también qué columnas usó (útil para soporte)
    return res.json({
      data: r.recordset?.[0] || null,
      meta: { pezCol: pezCol || null, areaCol: areaCol || null }
    });
  } catch (err) {
    console.error('qw/order/overview', err);
    return res.status(500).json({ message: err.message });
  }
});


// ===== PEDIDO · PROCESOS (línea, proceso, máquina, operarios, tiempos únicos)
router.get('/qw/order/procesos', async (req, res) => {
  try {
    const { from, to, pedido, idPedido } = req.query;
    if (!from || !to || (!pedido && !idPedido))
      return res.status(400).json({ message: 'from, to y pedido (RIF) o idPedido requeridos.' });

    const pool = await poolPromise;
    const q = baseCTE() + `
, F AS (
  SELECT *
  FROM D
  WHERE (@p_pedido IS NULL OR Pedido = @p_pedido)
    AND (@p_idPedido IS NULL OR IdPedido = @p_idPedido)
)
SELECT
  Linea,
  CodProceso, DescProceso,
  Maquina,
  STUFF((SELECT DISTINCT ',' + f2.Operario
         FROM F f2
         WHERE f2.Linea = f.Linea AND f2.CodProceso = f.CodProceso AND f2.Maquina = f.Maquina
         FOR XML PATH(''), TYPE).value('.','nvarchar(max)'),1,1,'') AS Operarios,
  COUNT(*) AS Registros,
  SUM(CASE WHEN rn=1 THEN Segundos ELSE 0 END) AS Segundos,
  MIN(DateStart) AS Inicio, MAX(DateEnd) AS Fin
FROM F f
GROUP BY Linea, CodProceso, DescProceso, Maquina
ORDER BY Linea, Inicio;
`;
    const reqst = pool.request()
      .input('p_from', sql.Date, from)
      .input('p_to',   sql.Date, to)
      .input('p_pedido', sql.VarChar(50), pedido || null)
      .input('p_idPedido', sql.Int, idPedido ? Number(idPedido) : null);

    const r = await reqst.query(q);
    return res.json({ data: r.recordset, from, to, pedido, idPedido });
  } catch (err) {
    console.error('qw/order/procesos', err);
    return res.status(500).json({ message: err.message });
  }
});

// ===== PEDIDO · RAW (timeline crudo por eventos, para Gantt o lista)
router.get('/qw/order/raw', async (req, res) => {
  try {
    const { from, to, pedido, idPedido } = req.query;
    if (!from || !to || (!pedido && !idPedido))
      return res.status(400).json({ message: 'from, to y pedido (RIF) o idPedido requeridos.' });

    const pool = await poolPromise;
    const q = baseCTE() + `
SELECT
  Pedido, IdPedido, Linea, Maquina, CodProceso, DescProceso, Operario,
  DateStart, DateEnd, Segundos
FROM D
WHERE (@p_pedido IS NULL OR Pedido = @p_pedido)
  AND (@p_idPedido IS NULL OR IdPedido = @p_idPedido)
ORDER BY DateStart;
`;
    const reqst = pool.request()
      .input('p_from', sql.Date, from)
      .input('p_to',   sql.Date, to)
      .input('p_pedido', sql.VarChar(50), pedido || null)
      .input('p_idPedido', sql.Int, idPedido ? Number(idPedido) : null);

    const r = await reqst.query(q);
    return res.json({ data: r.recordset, from, to, pedido, idPedido });
  } catch (err) {
    console.error('qw/order/raw', err);
    return res.status(500).json({ message: err.message });
  }
});


// ===== Resumen por MÁQUINA → Operario =====
router.get('/qw/machine/resumen-operarios', async (req, res) => {
  try {
    const { from, to, maquina } = req.query;
    if (!from || !to || !maquina) return res.status(400).json({ message: 'from, to y maquina requeridos.' });

    const pool = await poolPromise;
    const q = baseCTE({ byMaquina: true }) + `
SELECT
  Maquina,
  Operario,
  COUNT(*) AS Registros,
  SUM(CASE WHEN rn=1 THEN Segundos ELSE 0 END) AS Segundos,
  MIN(DateStart) AS Inicio, MAX(DateEnd) AS Fin
FROM D
GROUP BY Maquina, Operario
ORDER BY Operario;
`;
    const r = await pool.request()
      .input('p_from', sql.Date, from)
      .input('p_to',   sql.Date, to)
      .input('p_maquina', sql.VarChar(100), String(maquina))
      .query(q);

    return res.json({ data: r.recordset, from, to, maquina });
  } catch (err) {
    console.error('qw/machine/resumen-operarios', err);
    return res.status(500).json({ message: err.message });
  }
});

// ===== Resumen por MÁQUINA → Pedido =====
router.get('/qw/machine/resumen-pedidos', async (req, res) => {
  try {
    const { from, to, maquina } = req.query;
    if (!from || !to || !maquina) return res.status(400).json({ message: 'from, to y maquina requeridos.' });

    const pool = await poolPromise;
    const q = baseCTE({ byMaquina: true }) + `
SELECT
  Maquina, Pedido, IdPedido,
  COUNT(*) AS Registros,
  SUM(CASE WHEN rn=1 THEN Segundos ELSE 0 END) AS Segundos,
  MIN(DateStart) AS Inicio, MAX(DateEnd) AS Fin
FROM D
GROUP BY Maquina, Pedido, IdPedido
ORDER BY Inicio DESC, Pedido;
`;
    const r = await pool.request()
      .input('p_from', sql.Date, from)
      .input('p_to',   sql.Date, to)
      .input('p_maquina', sql.VarChar(100), String(maquina))
      .query(q);

    return res.json({ data: r.recordset, from, to, maquina });
  } catch (err) {
    console.error('qw/machine/resumen-pedidos', err);
    return res.status(500).json({ message: err.message });
  }
});

// ===== MÁQUINA → detalle crudo (QW)
router.get('/qw/machine/raw', async (req, res) => {
  try {
    const { from, to, maquina, operario } = req.query;
    if (!from || !to || !maquina) return res.status(400).json({ message: 'from, to y maquina requeridos.' });

    const byO = !!operario;
    const pool = await poolPromise;
    const q = baseCTE({ byMaquina: true, byOperario: byO }) + `
SELECT
  Pedido, IdPedido, Linea, Maquina, CodProceso, DescProceso, Operario,
  DateStart, DateEnd, Segundos
FROM D
ORDER BY DateStart DESC;
`;
    const reqst = pool.request()
      .input('p_from', sql.Date, from)
      .input('p_to',   sql.Date, to)
      .input('p_maquina', sql.VarChar(100), String(maquina));
    if (byO) reqst.input('p_operario', sql.VarChar(100), String(operario));

    const r = await reqst.query(q);
    return res.json({ data: r.recordset, from, to, maquina, operario });
  } catch (err) {
    console.error('qw/machine/raw', err);
    return res.status(500).json({ message: err.message });
  }
});

// ===== LOOKUPS (operarios, maquinas, pedidos) =====
// ===== LOOKUPS (operarios, maquinas, pedidos) =====
// ===== LOOKUPS (operarios, maquinas, pedidos) =====
// ===== LOOKUPS (operarios, maquinas, pedidos) =====


// ===== LOOKUPS (operarios, maquinas, pedidos) =====
router.get('/qw/lookups', async (req, res) => {
  try {
    const { q, limit } = req.query;
    const take = Math.min(Number(limit || 2000), 10000); // tope de seguridad
    const pool = await poolPromise;

    // --- Operarios (USERNAME)
    const sqlOperarios = `
      SELECT DISTINCT ${take ? `TOP (${take})` : ''}
             QW.[USERNAME] AS Operario
      FROM dbo.QUEUEWORK QW WITH (NOLOCK)
      WHERE QW.[USERNAME] IS NOT NULL AND LTRIM(RTRIM(QW.[USERNAME])) <> ''
        ${q ? 'AND QW.[USERNAME] LIKE @p_q' : ''}
      ORDER BY Operario ASC;`;

    const sqlOperariosCount = `
      SELECT COUNT(DISTINCT QW.[USERNAME]) AS totalOperarios
      FROM dbo.QUEUEWORK QW WITH (NOLOCK)
      WHERE QW.[USERNAME] IS NOT NULL AND LTRIM(RTRIM(QW.[USERNAME])) <> ''
      ${q ? 'AND QW.[USERNAME] LIKE @p_q' : ''};`;

    // --- Máquinas (desde QUEUEHEADER.CDL_NAME — coherente con tus CTEs)
    const sqlMaquinas = `
      SELECT DISTINCT ${take ? `TOP (${take})` : ''}
             QH.CDL_NAME AS Maquina
      FROM dbo.QUEUEHEADER QH WITH (NOLOCK)
      WHERE QH.CDL_NAME IS NOT NULL AND LTRIM(RTRIM(QH.CDL_NAME)) <> ''
        ${q ? 'AND QH.CDL_NAME LIKE @p_q' : ''}
      ORDER BY Maquina ASC;`;

    const sqlMaquinasCount = `
      SELECT COUNT(DISTINCT QH.CDL_NAME) AS totalMaquinas
      FROM dbo.QUEUEHEADER QH WITH (NOLOCK)
      WHERE QH.CDL_NAME IS NOT NULL AND LTRIM(RTRIM(QH.CDL_NAME)) <> ''
      ${q ? 'AND QH.CDL_NAME LIKE @p_q' : ''};`;

    // --- Pedidos (con actividad a través de ORDMAST+QUEUEWORK)
    const sqlPedidos = `
      SELECT ${take ? `TOP (${take})` : ''}
             O.RIF        AS Pedido,
             O.ID_ORDINI  AS IdPedido,
             P.DESCR1     AS Cliente
      FROM dbo.ORDINI  O WITH (NOLOCK)
      JOIN dbo.PERSONE P WITH (NOLOCK) ON P.ID_PERSONE = O.ID_PERSONE
      WHERE EXISTS (
        SELECT 1
        FROM dbo.ORDMAST   OM WITH (NOLOCK)
        JOIN dbo.QUEUEWORK QW WITH (NOLOCK) ON QW.ID_ORDMAST = OM.ID_ORDMAST
        WHERE OM.ID_ORDINI = O.ID_ORDINI
          AND QW.ID_QUEUEREASON IN (1,2)
          AND QW.ID_QUEUEREASON_COMPLETE = 20
      )
      ${q ? 'AND (O.RIF LIKE @p_q OR P.DESCR1 LIKE @p_q OR CAST(O.ID_ORDINI AS varchar(20)) LIKE @p_q)' : ''}
      ORDER BY O.RIF DESC;`;

    const sqlPedidosCount = `
      SELECT COUNT(*) AS totalPedidos
      FROM dbo.ORDINI  O WITH (NOLOCK)
      JOIN dbo.PERSONE P WITH (NOLOCK) ON P.ID_PERSONE = O.ID_PERSONE
      WHERE EXISTS (
        SELECT 1
        FROM dbo.ORDMAST   OM WITH (NOLOCK)
        JOIN dbo.QUEUEWORK QW WITH (NOLOCK) ON QW.ID_ORDMAST = OM.ID_ORDMAST
        WHERE OM.ID_ORDINI = O.ID_ORDINI
          AND QW.ID_QUEUEREASON IN (1,2)
          AND QW.ID_QUEUEREASON_COMPLETE = 20
      )
      ${q ? 'AND (O.RIF LIKE @p_q OR P.DESCR1 LIKE @p_q OR CAST(O.ID_ORDINI AS varchar(20)) LIKE @p_q)' : ''};`;

    // requests independientes
    const reqOp = pool.request(), reqOpC = pool.request();
    const reqMq = pool.request(), reqMqC = pool.request();
    const reqPe = pool.request(), reqPeC = pool.request();
    if (q) {
      const like = `%${q}%`;
      for (const r of [reqOp, reqOpC, reqMq, reqMqC, reqPe, reqPeC]) r.input('p_q', sql.VarChar(100), like);
    }

    const [rOp, rOpC, rMq, rMqC, rPe, rPeC] = await Promise.all([
      reqOp.query(sqlOperarios),
      reqOpC.query(sqlOperariosCount),
      reqMq.query(sqlMaquinas),
      reqMqC.query(sqlMaquinasCount),
      reqPe.query(sqlPedidos),
      reqPeC.query(sqlPedidosCount),
    ]);

    return res.json({
      operarios: rOp.recordset || [],
      maquinas : rMq.recordset || [],
      pedidos  : rPe.recordset || [],
      totalOperarios: rOpC.recordset?.[0]?.totalOperarios ?? 0,
      totalMaquinas : rMqC.recordset?.[0]?.totalMaquinas  ?? 0,
      totalPedidos  : rPeC.recordset?.[0]?.totalPedidos   ?? 0,
      q: q || null,
      limit: take,
    });
  } catch (err) {
    console.error('qw/lookups', err);
    return res.status(500).json({ message: err.message });
  }
});






















// src/routes/piezasMaquina.routes.js


/**
 * GET /piezas-maquina
 * Query params:
 *  - scope: 'today' | 'wtd' | 'mtd' | 'ytd' | 'custom' (default: 'mtd')
 *  - from, to: 'YYYY-MM-DD' (obligatorios si scope='custom')
 *  - page: 1-based (default 1)
 *  - pageSize: (default 50, max 1000)
 *  - search: texto libre (pedido, cliente, usuario, producto, centro, vidrio)
 */






// === PIEZAS POR MÁQUINA (sin usar la vista) ==================================
// GET /control-optima/piezas-maquina?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=500&search=...
// GET /control-optima/piezas-maquina

//comentarios
// GET /control-optima/piezas-maquina
// === PIEZAS POR MÁQUINA (corregido con tiempos) ===============================
// GET /control-optima/piezas-maquina?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=500&search=...
// === PIEZAS POR MÁQUINA (corregido sin GREATEST) ===============================
// GET /control-optima/piezas-maquina?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=500&search=...
// === PIEZAS POR MÁQUINA (sin usar la vista) ==================================
// GET /control-optima/piezas-maquina?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=500&search=...
// GET /control-optima/piezas-maquina?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=500&search=...
// === PIEZAS POR MÁQUINA (SIN VISTAS · tablas directas OPTIMA_FELMAN) ========
// GET /control-optima/piezas-maquina?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=500&search=...
router.get('/piezas-maquina', async (req, res) => {
  const { from, to, page = '1', pageSize = '500', search = '' } = req.query;

  // Validaciones básicas
  const validYMD = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
  const today = new Date();
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const todayIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  const usedFrom = validYMD(from) ? from : '1753-01-01';
  const usedTo   = validYMD(to)   ? to   : todayIso;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const sizeNum = Math.min(1000, Math.max(1, parseInt(pageSize, 10) || 500));
  const offset  = (pageNum - 1) * sizeNum;
  const qTxt    = (typeof search === 'string' && search.trim()) ? `%${search.trim()}%` : null;

  try {
    const pool = await poolPromise;
    const rq = pool.request()
      .input('fromS',    sql.Date,     usedFrom)
      .input('toS',      sql.Date,     usedTo)
      .input('offset',   sql.Int,      offset)
      .input('pageSize', sql.Int,      sizeNum)
      .input('q',        sql.NVarChar, qTxt);

    const query = `-- ================================
--  /piezas-maquina  (TABLAS DIRECTAS - SIN VISTAS)
--  Parámetros esperados (SQL Server):
--    @from     DATE   (nullable)  -- si es NULL no filtra por fecha
--    @to       DATE   (nullable)
--    @offset   INT
--    @pageSize INT
--    @search   NVARCHAR(200)  (nullable)
-- ================================

SET NOCOUNT ON;

DECLARE @usedFrom DATE = @from;
DECLARE @usedTo   DATE = @to;
DECLARE @useDateFilter bit = CASE WHEN @usedFrom IS NULL OR @usedTo IS NULL THEN 0 ELSE 1 END;

WITH TAULA1 AS (   -- Producción completada (QUEUEWORK)
    SELECT
        YEAR(CONVERT(date,Q.DATEEND))                              AS ANO,
        MONTH(CONVERT(date,Q.DATEEND))                             AS MES,
        ISNULL(P.DESCR1_SPED,'')                                   AS NOMBRE,
        P.RIF                                                      AS PEDIDO,
        O.RIGA                                                     AS LINEA,
        CONVERT(date,Q.DATEEND)                                    AS DATA_COMPLETE,
        Q.[USERNAME]                                               AS USERNAME,
        Q1.CDL_NAME                                                AS CENTRO_TRABAJO,
        W.CODICE                                                   AS TRABAJO,
        W.DESCRIZIONE                                              AS DESC_TRABAJO,
        CASE WHEN Q1.CDL_NAME = 'LINEA_FOREL' THEN '' 
             ELSE ISNULL( (SELECT M.CODICE
                           FROM OPTIMA_FELMAN.dbo.MAGAZ M
                           WHERE M.ID_MAGAZ = (SELECT ID_MAGAZ
                                               FROM OPTIMA_FELMAN.dbo.ORDDETT
                                               WHERE ID_ORDDETT = Q.ID_ORDDETT)), '') 
        END                                                        AS VIDRIO,
        CASE WHEN Q1.CDL_NAME = 'LINEA_FOREL' THEN 0 ELSE FLOOR(O1.ID_DETT/2)+1 END AS N_VIDRIO,
        CASE WHEN Q.ID_QUEUEREASON IN (1,2) AND Q.ID_QUEUEREASON_COMPLETE = 20 THEN 'COMPLETE' ELSE '' END AS ESTADO,
        Q.DATEEND                                                  AS DATAHORA_COMPL,
        CAST(1 AS INT)                                             AS PIEZAS,
        O1.DIMXPZR                                                 AS MEDIDA_X,
        O1.DIMYPZR                                                 AS MEDIDA_Y,
        Q.PROGR                                                    AS PROGR,
        PR.RIF                                                     AS PRODUCTO,
        CASE WHEN W.ID_TIPILAVORAZIONE = 301 AND W.PRIOWORK IN (20,30)
             THEN D.LENTOTBARRE/1000.0
             ELSE 0.0
        END                                                        AS LONG_TRABAJO,
        (O1.DIMXPZR*O1.DIMYPZR)/1000000.0                          AS AREA,
        O.QTAPZ                                                    AS PZ_LIN,
        CAST('' AS NVARCHAR(200))                                  AS RAZON_QUEBRA1,
        CAST('' AS NVARCHAR(200))                                  AS RAZON_QUEBRA2,
        CAST('' AS NVARCHAR(200))                                  AS RAZON_QUEBRA3,
        CAST('' AS NVARCHAR(4000))                                 AS TEXT1,
        CAST(0 AS DECIMAL(18,4))                                   AS PREZZO_PZ,
        D.ID_DBASEORDINI                                           AS ID_DBASEORDINI,
        DATEDIFF(SECOND, Q.DATESTART, Q.DATEEND)                   AS t_trabajo_seg
    FROM OPTIMA_FELMAN.dbo.QUEUEWORK   Q
    JOIN OPTIMA_FELMAN.dbo.QUEUEHEADER Q1 ON Q1.ID_QUEUEHEADER = Q.ID_QUEUEHEADER
    JOIN OPTIMA_FELMAN.dbo.WORKKIND    W  ON W.ID_WORKKIND    = Q.ID_WORKKIND
    JOIN OPTIMA_FELMAN.dbo.ORDMAST     O  ON O.ID_ORDMAST     = Q.ID_ORDMAST
    JOIN OPTIMA_FELMAN.dbo.ORDINI      P  ON P.ID_ORDINI      = O.ID_ORDINI
    JOIN OPTIMA_FELMAN.dbo.ORDDETT     O1 ON O1.ID_ORDDETT    = Q.ID_ORDDETT
    JOIN OPTIMA_FELMAN.dbo.ITEMS       I  ON I.ID_ITEMS       = Q.ID_ITEMS
    JOIN OPTIMA_FELMAN.dbo.DBASEORDINI D  ON D.ID_DBASEORDINI = I.ID_DBASEORDINI
    JOIN OPTIMA_FELMAN.dbo.PRODOTTI    PR ON PR.ID_PRODOTTI   = O.ID_PRODOTTI
    WHERE Q.ID_QUEUEREASON IN (1,2)
      AND Q.ID_QUEUEREASON_COMPLETE = 20
      AND Q.DATEEND IS NOT NULL
      AND YEAR(Q.DATESTART) > 2018
)
, TAULA2 AS (      -- Línea TV (QALOG_VIEW)
    SELECT
        YEAR(CONVERT(date,Q.DATE_COMPL))                           AS ANO,
        MONTH(CONVERT(date,Q.DATE_COMPL))                          AS MES,
        O.DESCR1_SPED                                              AS NOMBRE,
        Q.RIF                                                      AS PEDIDO,
        Q.RIGA                                                     AS LINEA,
        CONVERT(date,Q.DATE_COMPL)                                 AS DATA_COMPLETE,
        Q.[USERNAME]                                               AS USERNAME,
        CASE WHEN Q.VIRTMACHINE = 'TV' THEN C.BANCO ELSE Q.VIRTMACHINE END AS CENTRO_TRABAJO,
        Q.FASE                                                     AS TRABAJO,
        Q.FASE                                                     AS DESC_TRABAJO,
        Q.CODMAT                                                   AS VIDRIO,
        FLOOR(D.ID_DETT/2)+1                                       AS N_VIDRIO,
        Q.ActionName                                               AS ESTADO,
        Q.ServerDateTime                                           AS DATAHORA_COMPL,
        Q.LAVQTY                                                   AS PIEZAS,
        D.DIMXPZR                                                  AS MEDIDA_X,
        D.DIMYPZR                                                  AS MEDIDA_Y,
        Q.PROGR                                                    AS PROGR,
        PR.RIF                                                     AS PRODUCTO,
        CAST(0.0 AS DECIMAL(18,4))                                 AS LONG_TRABAJO,
        D.AREA                                                     AS AREA,
        D.QTAPZ                                                    AS PZ_LIN,
        CAST('' AS NVARCHAR(200))                                  AS RAZON_QUEBRA1,
        CAST('' AS NVARCHAR(200))                                  AS RAZON_QUEBRA2,
        CAST('' AS NVARCHAR(200))                                  AS RAZON_QUEBRA3,
        CAST('' AS NVARCHAR(4000))                                 AS TEXT1,
        CAST(0 AS DECIMAL(18,4))                                   AS PREZZO_PZ,
        D.ID_DBASEORDINI                                           AS ID_DBASEORDINI,
        CAST(NULL AS INT)                                          AS t_trabajo_seg
    FROM OPTIMA_FELMAN.dbo.QALOG_VIEW Q
    JOIN OPTIMA_FELMAN.dbo.DBASEORDINI D ON D.ID_DBASEORDINI = Q.ID_DBASEORDINI
    JOIN OPTIMA_FELMAN.dbo.ORDMAST     O1 ON O1.ID_ORDMAST   = Q.ID_ORDMAST
    JOIN OPTIMA_FELMAN.dbo.ORDINI      O  ON O.ID_ORDINI     = Q.ID_ORDINI
    JOIN OPTIMA_FELMAN.dbo.COMMESSE    C  ON C.ID_COMMESSE   = Q.ID_COMMESSE
    JOIN OPTIMA_FELMAN.dbo.PRODOTTI    PR ON PR.ID_PRODOTTI  = O1.ID_PRODOTTI
    WHERE Q.VIRTMACHINE = 'TV'
      AND YEAR(Q.DATE_COMPL) > 2018
)
, ROTURAS AS (     -- Roturas (QUEUEWORK con BREAK=200)
    SELECT
        YEAR(CONVERT(date,Q.DATEEND))                              AS ANO,
        MONTH(CONVERT(date,Q.DATEEND))                             AS MES,
        ISNULL(P.DESCR1_SPED,'')                                   AS NOMBRE,
        P.RIF                                                      AS PEDIDO,
        O.RIGA                                                     AS LINEA,
        CONVERT(date,Q.DATEBROKEN)                                 AS DATA_COMPLETE,
        Q.USERNAME_BREAK                                           AS USERNAME,
        Q1.CDL_NAME                                                AS CENTRO_TRABAJO,
        W.CODICE                                                   AS TRABAJO,
        W.DESCRIZIONE                                              AS DESC_TRABAJO,
        CASE WHEN Q1.CDL_NAME = 'LINEA_FOREL' THEN '' 
             ELSE ISNULL( (SELECT M.CODICE
                           FROM OPTIMA_FELMAN.dbo.MAGAZ M
                           WHERE M.ID_MAGAZ = (SELECT ID_MAGAZ
                                               FROM OPTIMA_FELMAN.dbo.ORDDETT
                                               WHERE ID_ORDDETT = Q.ID_ORDDETT)), '') 
        END                                                        AS VIDRIO,
        CASE WHEN Q1.CDL_NAME = 'LINEA_FOREL' THEN 0 ELSE FLOOR(O1.ID_DETT/2)+1 END AS N_VIDRIO,
        CASE WHEN Q.ID_QUEUEREASON_BREAK = 200 THEN 'ROTURA' ELSE '' END AS ESTADO,
        Q.DATEEND                                                  AS DATAHORA_COMPL,
        CAST(1 AS INT)                                             AS PIEZAS,
        O1.DIMXPZR                                                 AS MEDIDA_X,
        O1.DIMYPZR                                                 AS MEDIDA_Y,
        Q.PROGR                                                    AS PROGR,
        PR.RIF                                                     AS PRODUCTO,
        CASE WHEN W.ID_TIPILAVORAZIONE = 301 AND W.PRIOWORK IN (20,30)
             THEN D.LENTOTBARRE/1000.0
             ELSE 0.0
        END                                                        AS LONG_TRABAJO,
        (O1.DIMXPZR*O1.DIMYPZR)/1000000.0                          AS AREA,
        O.QTAPZ                                                    AS PZ_LIN,
        (SELECT REASON_DESCR FROM OPTIMA_FELMAN.dbo.QUEUEREASON T1 WHERE T1.ID_QUEUEREASON = Q.ID_QUEUEREASON_CAUPROD ) AS RAZON_QUEBRA1,
        (SELECT REASON_DESCR FROM OPTIMA_FELMAN.dbo.QUEUEREASON T2 WHERE T2.ID_QUEUEREASON = Q.ID_QUEUEREASON_CAUPROD1) AS RAZON_QUEBRA2,
        (SELECT REASON_DESCR FROM OPTIMA_FELMAN.dbo.QUEUEREASON T3 WHERE T3.ID_QUEUEREASON = Q.ID_QUEUEREASON_CAUPROD2) AS RAZON_QUEBRA3,
        Q.TEXT1                                                    AS TEXT1,
        O.PREZZO_PZ                                                AS PREZZO_PZ,
        D.ID_DBASEORDINI                                           AS ID_DBASEORDINI,
        DATEDIFF(SECOND, Q.DATESTART, Q.DATEEND)                   AS t_trabajo_seg
    FROM OPTIMA_FELMAN.dbo.QUEUEWORK   Q
    JOIN OPTIMA_FELMAN.dbo.QUEUEHEADER Q1 ON Q1.ID_QUEUEHEADER = Q.ID_QUEUEHEADER
    JOIN OPTIMA_FELMAN.dbo.WORKKIND    W  ON W.ID_WORKKIND    = Q.ID_WORKKIND
    JOIN OPTIMA_FELMAN.dbo.ORDMAST     O  ON O.ID_ORDMAST     = Q.ID_ORDMAST
    JOIN OPTIMA_FELMAN.dbo.ORDINI      P  ON P.ID_ORDINI      = O.ID_ORDINI
    JOIN OPTIMA_FELMAN.dbo.ORDDETT     O1 ON O1.ID_ORDDETT    = Q.ID_ORDDETT
    JOIN OPTIMA_FELMAN.dbo.ITEMS       I  ON I.ID_ITEMS       = Q.ID_ITEMS
    JOIN OPTIMA_FELMAN.dbo.DBASEORDINI D  ON D.ID_DBASEORDINI = I.ID_DBASEORDINI
    JOIN OPTIMA_FELMAN.dbo.PRODOTTI    PR ON PR.ID_PRODOTTI   = O.ID_PRODOTTI
    WHERE Q.ID_QUEUEREASON_BREAK = 200
      AND Q.DATEEND IS NOT NULL
      AND YEAR(Q.DATESTART) > 2018
)

, BASE AS (
    -- ¡IMPORTANTE! Las 3 proyecciones devuelven MISMAS columnas y orden.
    SELECT
        LTRIM(RTRIM(STR(ANO)))                       AS ANO,
        LTRIM(RTRIM(STR(MES)))                       AS MES,
        NOMBRE, PEDIDO, LINEA, DATA_COMPLETE, USERNAME, CENTRO_TRABAJO,
        TRABAJO, DESC_TRABAJO, VIDRIO, N_VIDRIO, ESTADO, DATAHORA_COMPL,
        PIEZAS, MEDIDA_X, MEDIDA_Y, PROGR, PRODUCTO, LONG_TRABAJO, AREA, PZ_LIN,
        RAZON_QUEBRA1, RAZON_QUEBRA2, RAZON_QUEBRA3, TEXT1, PREZZO_PZ, ID_DBASEORDINI,
        t_trabajo_seg,
        COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) AS eventdt
    FROM TAULA1
    UNION ALL
    SELECT
        LTRIM(RTRIM(STR(ANO))), LTRIM(RTRIM(STR(MES))),
        NOMBRE, PEDIDO, LINEA, DATA_COMPLETE, USERNAME, CENTRO_TRABAJO,
        TRABAJO, DESC_TRABAJO, VIDRIO, N_VIDRIO, ESTADO, DATAHORA_COMPL,
        PIEZAS, MEDIDA_X, MEDIDA_Y, PROGR, PRODUCTO, LONG_TRABAJO, AREA, PZ_LIN,
        RAZON_QUEBRA1, RAZON_QUEBRA2, RAZON_QUEBRA3, TEXT1, PREZZO_PZ, ID_DBASEORDINI,
        t_trabajo_seg,
        COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) AS eventdt
    FROM TAULA2
    UNION ALL
    SELECT
        LTRIM(RTRIM(STR(ANO))), LTRIM(RTRIM(STR(MES))),
        NOMBRE, PEDIDO, LINEA, DATA_COMPLETE, USERNAME, CENTRO_TRABAJO,
        TRABAJO, DESC_TRABAJO, VIDRIO, N_VIDRIO, ESTADO, DATAHORA_COMPL,
        PIEZAS, MEDIDA_X, MEDIDA_Y, PROGR, PRODUCTO, LONG_TRABAJO, AREA, PZ_LIN,
        RAZON_QUEBRA1, RAZON_QUEBRA2, RAZON_QUEBRA3, TEXT1, PREZZO_PZ, ID_DBASEORDINI,
        t_trabajo_seg,
        COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) AS eventdt
    FROM ROTURAS
)

-- META
SELECT
  @usedFrom AS usedFrom,
  @usedTo   AS usedTo,
  COUNT(*)                                      AS total,
  ISNULL(SUM(CAST(PIEZAS AS float)), 0)         AS piezas,
  ISNULL(SUM(CAST(AREA   AS float)), 0)         AS area
FROM BASE
WHERE ( @useDateFilter = 0
        OR eventdt >= @usedFrom AND eventdt < DATEADD(DAY,1,@usedTo) )
  AND ( @search IS NULL OR @search = ''
        OR PEDIDO         LIKE '%' + @search + '%'
        OR USERNAME       LIKE '%' + @search + '%'
        OR NOMBRE         LIKE '%' + @search + '%'
        OR PRODUCTO       LIKE '%' + @search + '%'
        OR CENTRO_TRABAJO LIKE '%' + @search + '%'
        OR VIDRIO         LIKE '%' + @search + '%'
        OR TRABAJO        LIKE '%' + @search + '%'
      );

-- ITEMS (paginado)
SELECT *
FROM (
    SELECT b.*
    FROM BASE b
    WHERE ( @useDateFilter = 0
            OR b.eventdt >= @usedFrom AND b.eventdt < DATEADD(DAY,1,@usedTo) )
      AND ( @search IS NULL OR @search = ''
            OR b.PEDIDO         LIKE '%' + @search + '%'
            OR b.USERNAME       LIKE '%' + @search + '%'
            OR b.NOMBRE         LIKE '%' + @search + '%'
            OR b.PRODUCTO       LIKE '%' + @search + '%'
            OR b.CENTRO_TRABAJO LIKE '%' + @search + '%'
            OR b.VIDRIO         LIKE '%' + @search + '%'
            OR b.TRABAJO        LIKE '%' + @search + '%'
          )
) X
ORDER BY X.eventdt DESC
OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
`;

    const r = await rq.query(query);
    const meta  = r.recordsets?.[0]?.[0] || { total: 0, piezas: 0, area: 0, usedFrom: usedFrom, usedTo: usedTo };
    const items = r.recordsets?.[1] || [];

    return res.json({
      items,
      page: pageNum,
      pageSize: sizeNum,
      total: meta.total,
      from: usedFrom,
      to: usedTo,
      usedFrom: meta.usedFrom,
      usedTo: meta.usedTo,
      orderBy: 'eventdt',
      orderDir: 'DESC',
      agg: { piezas: meta.piezas, area: meta.area }
    });
  } catch (err) {
    console.error('❌ /piezas-maquina ERROR:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});








// GET /control-optima/tiempos
// Totales por máquina/pedido + tiempos por proceso (pedido puede tener varias líneas)
// Query params:
//   pedido=01/011196-02   (opcional; admite % comodín, p.ej. 01/% )
//   from=2025-08-01       (opcional)
//   to=2025-08-19         (opcional)
//   limitPedidos=50       (opcional)
router.get('/tiempos', async (req, res) => {
  console.log('🔍 Petición recibida en /control-optima/tiempos', req.query);
  const { pedido, from, to, limitPedidos = '50' } = req.query;

  try {
    const pool = await poolPromise;
    const rq = pool.request();

    // Normalizamos filtros
    const limit = Math.max(1, Math.min(parseInt(limitPedidos, 10) || 50, 200));

    if (from) rq.input('from', sql.DateTime2, from);
    if (to) rq.input('to', sql.DateTime2, to);
    if (pedido) rq.input('pedido', sql.VarChar, pedido); // admite % si el cliente lo manda

    // Filtro dinámico por fechas sobre event time (DATEEND)
    // y por pedido (exacto o like). Tomamos pedidos con actividad más reciente.
    const whereFecha = (from || to)
      ? `
        AND Q.DATEEND >= COALESCE(@from, Q.DATEEND)
        AND Q.DATEEND <  DATEADD(DAY, 1, COALESCE(@to, Q.DATEEND))
      `
      : '';

    const wherePedido = pedido
      ? `AND P.RIF LIKE @pedido`
      : '';

    // 1) Seleccionamos primero los pedidos candidatos (más recientes) para no barrer todo:
    //    - De QUEUEWORK con completadas
    //    - Respetando filtros de fecha o de pedido
    // 2) Luego calculamos tiempos por proceso + esperas (lag) y agregamos a nivel pedido+máquina y pedido+máquina+proceso
    const query = `
;WITH pedidos_candidatos AS (
  SELECT TOP (${limit})
    P.RIF AS Pedido,
    MAX(Q.DATEEND) AS UltimoEvento
  FROM OPTIMA_FELMAN.dbo.QUEUEWORK Q
  JOIN OPTIMA_FELMAN.dbo.ORDMAST O ON O.ID_ORDMAST = Q.ID_ORDMAST
  JOIN OPTIMA_FELMAN.dbo.ORDINI  P ON P.ID_ORDINI  = O.ID_ORDINI
  WHERE Q.ID_QUEUEREASON IN (1,2)
    AND Q.ID_QUEUEREASON_COMPLETE = 20
    ${whereFecha}
    ${wherePedido}
  GROUP BY P.RIF
  ORDER BY MAX(Q.DATEEND) DESC
),
procesos AS (
  SELECT
    P.RIF AS Pedido,
    Q1.CDL_NAME AS CentroTrabajo,
    Q.USERNAME,
    W.CODICE AS CodigoTrabajo,
    W.DESCRIZIONE AS DescTrabajo,
    Q.DATESTART,
    Q.DATEEND,
    DATEDIFF(SECOND, Q.DATESTART, Q.DATEEND) AS t_trabajo_seg,
    ROW_NUMBER() OVER (PARTITION BY P.RIF ORDER BY Q.DATESTART, Q.ID_QUEUEWORK) AS rn
  FROM OPTIMA_FELMAN.dbo.QUEUEWORK Q
  JOIN OPTIMA_FELMAN.dbo.QUEUEHEADER Q1 ON Q1.ID_QUEUEHEADER = Q.ID_QUEUEHEADER
  JOIN OPTIMA_FELMAN.dbo.ORDMAST O ON O.ID_ORDMAST = Q.ID_ORDMAST
  JOIN OPTIMA_FELMAN.dbo.ORDINI  P ON P.ID_ORDINI  = O.ID_ORDINI
  JOIN OPTIMA_FELMAN.dbo.WORKKIND W ON W.ID_WORKKIND = Q.ID_WORKKIND
  WHERE Q.ID_QUEUEREASON IN (1,2)
    AND Q.ID_QUEUEREASON_COMPLETE = 20
    AND EXISTS (SELECT 1 FROM pedidos_candidatos pc WHERE pc.Pedido = P.RIF)
)
,proc_con_espera AS (
  SELECT
    Pedido, CentroTrabajo, USERNAME, CodigoTrabajo, DescTrabajo,
    DATESTART, DATEEND, t_trabajo_seg, rn,
    -- Espera = delta entre fin anterior y comienzo actual (solo si positivo)
    CASE 
      WHEN LAG(DATEEND) OVER (PARTITION BY Pedido ORDER BY DATESTART, rn) IS NULL THEN NULL
      ELSE DATEDIFF(SECOND, LAG(DATEEND) OVER (PARTITION BY Pedido ORDER BY DATESTART, rn), DATESTART)
    END AS t_espera_prev_seg
  FROM procesos
)
-- Recordset 1: totales por Pedido + CentroTrabajo
SELECT
  Pedido,
  CentroTrabajo,
  SUM(t_trabajo_seg) AS t_trabajo_total_seg,
  SUM(CASE WHEN t_espera_prev_seg > 0 THEN t_espera_prev_seg ELSE 0 END) AS t_espera_total_seg,
  MIN(DATESTART) AS primer_evento,
  MAX(DATEEND) AS ultimo_evento,
  COUNT(*) AS procesos
FROM proc_con_espera
GROUP BY Pedido, CentroTrabajo
ORDER BY ultimo_evento DESC;

-- Recordset 2: totales por Pedido + CentroTrabajo + Proceso
SELECT
  Pedido,
  CentroTrabajo,
  CodigoTrabajo,
  DescTrabajo,
  SUM(t_trabajo_seg) AS t_trabajo_total_seg,
  SUM(CASE WHEN t_espera_prev_seg > 0 THEN t_espera_prev_seg ELSE 0 END) AS t_espera_total_seg,
  MIN(DATESTART) AS primer_evento,
  MAX(DATEEND) AS ultimo_evento,
  COUNT(*) AS repeticiones
FROM proc_con_espera
GROUP BY Pedido, CentroTrabajo, CodigoTrabajo, DescTrabajo
ORDER BY ultimo_evento DESC, Pedido, CentroTrabajo, CodigoTrabajo;
    `;

    const result = await rq.query(query);
    const [porMaquina, porProceso] = result.recordsets || [[], []];

    res.json({
      ok: true,
      filtros: { pedido: pedido || null, from: from || null, to: to || null, limitPedidos: limit },
      rows_maquina: porMaquina,
      rows_proceso: porProceso,
    });
  } catch (err) {
    console.error('❌ ERROR en /control-optima/tiempos:', err);
    res.status(500).json({ ok: false, message: err.message });
  }
});







module.exports = router;
