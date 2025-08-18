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
router.get('/piezas-maquina', async (req, res) => {
  const {
    scope = 'mtd',
    from,
    to,
    page = '1',
    pageSize = '50',
    search = ''
  } = req.query;

  const pg = Math.max(parseInt(page, 10) || 1, 1);
  const psz = Math.min(Math.max(parseInt(pageSize, 10) || 50, 1), 1000);
  const offset = (pg - 1) * psz;

  // Rango de fechas (EventDT) según scope (en SQL se aplica sobre eventdt)
  let dateFrom = null;
  let dateTo = null;
  const today = new Date(); // se usa solo como fallback para default dates

  // Fechas sin zona para SQL (local del servidor)
  const pad = (n) => String(n).padStart(2, '0');
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  const d = today.getDate();

  if (scope === 'today') {
    dateFrom = `${y}-${pad(m)}-${pad(d)}`;
    dateTo = dateFrom;
  } else if (scope === 'wtd') {
    // lunes a hoy (ISO: 1..7)
    const wd = (today.getDay() + 6) % 7; // 0=lunes
    const monday = new Date(today); monday.setDate(today.getDate() - wd);
    dateFrom = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
    dateTo = `${y}-${pad(m)}-${pad(d)}`;
  } else if (scope === 'ytd') {
    dateFrom = `${y}-01-01`;
    dateTo = `${y}-${pad(m)}-${pad(d)}`;
  } else if (scope === 'custom') {
    if (!from || !to) {
      return res.status(400).json({ ok: false, error: "Para scope='custom' debes enviar 'from' y 'to' (YYYY-MM-DD)." });
    }
    dateFrom = from;
    dateTo = to;
  } else {
    // mtd (default)
    dateFrom = `${y}-${pad(m)}-01`;
    dateTo = `${y}-${pad(m)}-${pad(d)}`;
  }

  try {
    /** @type {sql.ConnectionPool} */
    const pool = await poolPromise;
    if (!pool) return res.status(500).json({ ok: false, error: 'No hay pool MSSQL disponible.' });

    const request = pool.request();
    if (from && to) { dateFrom = from; dateTo = to; }
    request.input('dateFrom', sql.Date, dateFrom);
    request.input('dateTo', sql.Date, dateTo);
    request.input('search', sql.NVarChar(200), search || '');
    request.input('offset', sql.Int, offset);
    request.input('fetch', sql.Int, psz);

    if (from && to) { dateFrom = from; dateTo = to; }

    const query = `
      SET NOCOUNT ON;
      SET TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;

      DECLARE @useDateFilter bit = CASE WHEN @dateFrom IS NULL OR @dateTo IS NULL THEN 0 ELSE 1 END;
      -- EventDT se filtra de [dateFrom, dateTo + 1)

      /* === Base 1: operaciones completadas en máquinas (QUEUEWORK) === */
      WITH base_qw AS (
        SELECT
          O.RIF                                 AS PEDIDO,
          O.DESCR1_SPED                         AS NOMBRE,
          OM.RIGA                               AS LINEA,
          CAST(QW.DATEEND AS date)              AS DATA_COMPLETE,
          QW.USERNAME                           AS USERNAME,
          QH.CDL_NAME                           AS CENTRO_TRABAJO,

          -- VIDRIO y N_VIDRIO (mismo criterio que vistas, excepto FOREL/DUPLO)
          CASE WHEN QH.CDL_NAME IN ('DUPLO','LINEA_FOREL') THEN ''
               ELSE ISNULL( (SELECT M.CODICE
                             FROM dbo.MAGAZ M
                             WHERE M.ID_MAGAZ = (SELECT OD.ID_MAGAZ FROM dbo.ORDDETT OD WHERE OD.ID_ORDDETT = QW.ID_ORDDETT)
                           ), '')
          END                                   AS VIDRIO,
          CASE WHEN QH.CDL_NAME IN ('DUPLO','LINEA_FOREL') THEN 0
               ELSE FLOOR(OD.ID_DETT/2)+1
          END                                   AS N_VIDRIO,

          CASE WHEN QW.ID_QUEUEREASON IN (1,2) AND QW.ID_QUEUEREASON_COMPLETE = 20 THEN 'COMPLETE' ELSE '' END AS ESTADO,

          QW.DATEEND                            AS DATAHORA_COMPL,
          CAST(1 AS int)                        AS PIEZAS,

          OD.DIMXPZR                            AS MEDIDA_X,
          OD.DIMYPZR                            AS MEDIDA_Y,
          (OD.DIMXPZR*OD.DIMYPZR)/1000000.0     AS AREA,
          OM.QTAPZ                              AS PZ_LIN,

          -- Secuenciación y claves
          QW.PROGR,
          PR.RIF                                AS PRODUCTO,
          D.PERIMETRO/1000.0                    AS PERIMETRO,
          QW.DATESTART                          AS fecha_inicio_op,
          QW.DATEEND                            AS fecha_fin_op,
          CAST(NULL AS datetime)                AS fecha_rotura,
          O.DATAORD                             AS fecha_pedido,
          O.DATACONS                            AS fecha_entrega_prog,

          D.ID_DBASEORDINI,

          -- Tiempos: trabajo
          DATEDIFF(SECOND, QW.DATESTART, QW.DATEEND) AS t_trabajo_seg,

          -- EventDT operativo (para filtros y orden): fin de la operación
          QW.DATEEND                            AS eventdt
        FROM dbo.QUEUEWORK QW
        JOIN dbo.QUEUEHEADER QH    ON QH.ID_QUEUEHEADER = QW.ID_QUEUEHEADER
        JOIN dbo.ORDMAST OM        ON OM.ID_ORDMAST     = QW.ID_ORDMAST
        JOIN dbo.ORDINI O          ON O.ID_ORDINI       = OM.ID_ORDINI
        JOIN dbo.WORKKIND WK       ON WK.ID_WORKKIND    = QW.ID_WORKKIND
        JOIN dbo.ORDDETT OD        ON OD.ID_ORDDETT     = QW.ID_ORDDETT
        JOIN dbo.ITEMS I           ON I.ID_ITEMS        = QW.ID_ITEMS
        JOIN dbo.DBASEORDINI D     ON D.ID_DBASEORDINI  = I.ID_DBASEORDINI
        JOIN dbo.PRODOTTI PR       ON PR.ID_PRODOTTI    = OM.ID_PRODOTTI
        WHERE
          QW.ID_QUEUEREASON IN (1,2)
          AND QW.ID_QUEUEREASON_COMPLETE = 20
          AND ISNULL(QW.DATEEND,'') <> ''
          AND YEAR(QW.DATESTART) > 2018
      ),
      /* === Base 2: tramo TV (QALOG_VIEW) === */
      base_tv AS (
        SELECT
          Q.RIF                                 AS PEDIDO,
          O.DESCR1_SPED                         AS NOMBRE,
          Q.RIGA                                AS LINEA,
          CAST(Q.DATE_COMPL AS date)            AS DATA_COMPLETE,
          Q.USERNAME                            AS USERNAME,
          CASE WHEN Q.VIRTMACHINE = 'TV' THEN C.BANCO ELSE Q.VIRTMACHINE END AS CENTRO_TRABAJO,
          Q.CODMAT                              AS VIDRIO,
          FLOOR(D.ID_DETT/2)+1                  AS N_VIDRIO,
          Q.ActionName                          AS ESTADO,
          Q.ServerDateTime                      AS DATAHORA_COMPL,
          Q.LAVQTY                              AS PIEZAS,
          D.DIMXPZR                             AS MEDIDA_X,
          D.DIMYPZR                             AS MEDIDA_Y,
          D.AREA                                AS AREA,
          D.QTAPZ                               AS PZ_LIN,
          Q.PROGR,
          PR.RIF                                AS PRODUCTO,
          D.PERIMETRO                           AS PERIMETRO,

          CAST(NULL AS datetime)                AS fecha_inicio_op,
          Q.ServerDateTime                      AS fecha_fin_op,
          CAST(NULL AS datetime)                AS fecha_rotura,
          O.DATAORD                             AS fecha_pedido,
          O.DATACONS                            AS fecha_entrega_prog,

          D.ID_DBASEORDINI,

          CAST(NULL AS int)                     AS t_trabajo_seg,

          Q.ServerDateTime                      AS eventdt
        FROM dbo.QALOG_VIEW Q
        JOIN dbo.DBASEORDINI D  ON D.ID_DBASEORDINI = Q.ID_DBASEORDINI
        JOIN dbo.ORDMAST OM     ON OM.ID_ORDMAST    = Q.ID_ORDMAST
        JOIN dbo.ORDINI O       ON O.ID_ORDINI      = Q.ID_ORDINI
        JOIN dbo.COMMESSE C     ON C.ID_COMMESSE    = Q.ID_COMMESSE
        JOIN dbo.PRODOTTI PR    ON PR.ID_PRODOTTI   = OM.ID_PRODOTTI
        WHERE Q.VIRTMACHINE = 'TV'
          AND YEAR(Q.DATE_COMPL) > 2018
      ),
      /* === Base 3: roturas (QUEUEWORK) === */
      base_roturas AS (
        SELECT
          O.RIF                                 AS PEDIDO,
          O.DESCR1_SPED                         AS NOMBRE,
          OM.RIGA                               AS LINEA,
          CAST(QW.DATEBROKEN AS date)           AS DATA_COMPLETE,
          QW.USERNAME_BREAK                     AS USERNAME,
          QH.CDL_NAME                           AS CENTRO_TRABAJO,

          CASE WHEN QH.CDL_NAME IN ('DUPLO','LINEA_FOREL') THEN ''
               ELSE ISNULL( (SELECT M.CODICE
                             FROM dbo.MAGAZ M
                             WHERE M.ID_MAGAZ = (SELECT OD.ID_MAGAZ FROM dbo.ORDDETT OD WHERE OD.ID_ORDDETT = QW.ID_ORDDETT)
                           ), '')
          END                                   AS VIDRIO,
          CASE WHEN QH.CDL_NAME IN ('DUPLO','LINEA_FOREL') THEN 0
               ELSE FLOOR(OD.ID_DETT/2)+1
          END                                   AS N_VIDRIO,

          CASE WHEN QW.ID_QUEUEREASON_BREAK = 200 THEN 'ROTURA' ELSE '' END AS ESTADO,

          QW.DATEEND                            AS DATAHORA_COMPL, -- momento en que se cerró la operación (no la rotura)
          CAST(1 AS int)                        AS PIEZAS,

          OD.DIMXPZR                            AS MEDIDA_X,
          OD.DIMYPZR                            AS MEDIDA_Y,
          (OD.DIMXPZR*OD.DIMYPZR)/1000000.0     AS AREA,
          OM.QTAPZ                              AS PZ_LIN,
          QW.PROGR,
          PR.RIF                                AS PRODUCTO,
          D.PERIMETRO/1000.0                    AS PERIMETRO,

          QW.DATESTART                          AS fecha_inicio_op,
          QW.DATEEND                            AS fecha_fin_op,
          QW.DATEBROKEN                         AS fecha_rotura,
          O.DATAORD                             AS fecha_pedido,
          O.DATACONS                            AS fecha_entrega_prog,

          D.ID_DBASEORDINI,

          DATEDIFF(SECOND, QW.DATESTART, QW.DATEBROKEN) AS t_trabajo_seg,

          QW.DATEEND                            AS eventdt
        FROM dbo.QUEUEWORK QW
        JOIN dbo.QUEUEHEADER QH    ON QH.ID_QUEUEHEADER = QW.ID_QUEUEHEADER
        JOIN dbo.ORDMAST OM        ON OM.ID_ORDMAST     = QW.ID_ORDMAST
        JOIN dbo.ORDINI O          ON O.ID_ORDINI       = OM.ID_ORDINI
        JOIN dbo.WORKKIND WK       ON WK.ID_WORKKIND    = QW.ID_WORKKIND
        JOIN dbo.QUEUEREASON QR    ON QR.ID_QUEUEREASON = QW.ID_QUEUEREASON_BREAK
        JOIN dbo.ORDDETT OD        ON OD.ID_ORDDETT     = QW.ID_ORDDETT
        JOIN dbo.ITEMS I           ON I.ID_ITEMS        = QW.ID_ITEMS
        JOIN dbo.DBASEORDINI D     ON D.ID_DBASEORDINI  = I.ID_DBASEORDINI
        JOIN dbo.PRODOTTI PR       ON PR.ID_PRODOTTI    = OM.ID_PRODOTTI
        WHERE
          QW.ID_QUEUEREASON_BREAK = 200
          AND ISNULL(QW.DATEEND,'') <> ''
          AND YEAR(QW.DATESTART) > 2018
      ),
      B AS (
        SELECT * FROM base_qw
        UNION ALL
        SELECT * FROM base_tv
        UNION ALL
        SELECT * FROM base_roturas
      ),
      -- Enriquecemos con métricas por pieza (window functions)
      BW AS (
        SELECT
          B.*,

          -- t_entre_operaciones_seg: fin(prev) -> fin(actual)
          DATEDIFF(
            SECOND,
            LAG(B.eventdt) OVER (PARTITION BY B.ID_DBASEORDINI ORDER BY B.eventdt, B.fecha_inicio_op),
            B.eventdt
          ) AS t_entre_operaciones_seg,

          -- t_espera_prev_maquina_seg: fin(prev) -> inicio(actual)
          CASE
            WHEN B.fecha_inicio_op IS NULL THEN NULL
            ELSE DATEDIFF(
              SECOND,
              LAG(B.eventdt) OVER (PARTITION BY B.ID_DBASEORDINI ORDER BY B.eventdt, B.fecha_inicio_op),
              B.fecha_inicio_op
            )
          END AS t_espera_prev_maquina_seg,

          -- t_desde_pedido_seg: pedido -> fin actual
          DATEDIFF(SECOND, B.fecha_pedido, B.eventdt) AS t_desde_pedido_seg,

          -- t_hasta_entrega_prog_seg: fin actual -> entrega planificada (positivo si falta, negativo si retraso)
          DATEDIFF(SECOND, B.eventdt, B.fecha_entrega_prog) AS t_hasta_entrega_prog_seg,

          -- t_ciclo_pieza_total_seg (min inicio -> max fin) por pieza
          DATEDIFF(
            SECOND,
            MIN(B.fecha_inicio_op) OVER (PARTITION BY B.ID_DBASEORDINI),
            MAX(B.eventdt)        OVER (PARTITION BY B.ID_DBASEORDINI)
          ) AS t_ciclo_pieza_total_seg
        FROM B
      ),
      BF AS (
        SELECT *
        FROM BW
        WHERE
          (@useDateFilter = 0 OR (BW.eventdt >= @dateFrom AND BW.eventdt < DATEADD(DAY, 1, @dateTo)))
          AND (
            @search = '' OR
            BW.PEDIDO LIKE '%' + @search + '%' OR
            BW.NOMBRE LIKE '%' + @search + '%' OR
            BW.USERNAME LIKE '%' + @search + '%' OR
            BW.PRODUCTO LIKE '%' + @search + '%' OR
            BW.CENTRO_TRABAJO LIKE '%' + @search + '%' OR
            BW.VIDRIO LIKE '%' + @search + '%'
          )
      )
      SELECT
        @dateFrom AS usedFrom,
        @dateTo   AS usedTo,
        COUNT(*)  AS total
      FROM BF;

      SELECT
        PEDIDO, NOMBRE, LINEA, DATA_COMPLETE, USERNAME, CENTRO_TRABAJO,
        VIDRIO, N_VIDRIO, ESTADO, DATAHORA_COMPL, PIEZAS,
        MEDIDA_X, MEDIDA_Y, AREA, PZ_LIN, PROGR, PRODUCTO, PERIMETRO,
        /* Timestamps normalizados */
        eventdt, fecha_inicio_op, fecha_fin_op, fecha_rotura, fecha_pedido, fecha_entrega_prog,
        /* Métricas de tiempo */
        t_trabajo_seg, t_espera_prev_maquina_seg, t_entre_operaciones_seg,
        t_desde_pedido_seg, t_hasta_entrega_prog_seg, t_ciclo_pieza_total_seg,
        /* Clave de pieza para el front */
        ID_DBASEORDINI
      FROM BF
      ORDER BY eventdt DESC
      OFFSET @offset ROWS FETCH NEXT @fetch ROWS ONLY;
    `;

    const result = await request.query(query);

    const meta = result.recordsets[0]?.[0] || { usedFrom: dateFrom, usedTo: dateTo, total: 0 };
    const rows = result.recordsets[1] || [];

return res.json({
  ok: true,
  scope,
  usedFrom: meta.usedFrom,
  usedTo: meta.usedTo,
  page: pg,
  pageSize: psz,
  total: meta.total,
  orderBy: 'eventdt',
  orderDir: 'DESC',
  items: rows, // <-- renombrado
});

  } catch (err) {
    console.error('[piezas-maquina] error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});















module.exports = router;
