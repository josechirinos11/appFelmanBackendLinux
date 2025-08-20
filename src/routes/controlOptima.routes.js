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

// === PIEZAS POR MÁQUINA (sin vistas) =========================================
// GET /control-optima/piezas-maquina?scope=custom|ytd|mtd|all&from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=100&search=TXT
// ========================= RUTA: /piezas-maquina =========================
// GET /piezas-maquina?scope=ytd|mtd&from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=100&search=texto
// GET /control-optima/piezas-maquina
// GET /control-optima/piezas-maquina
// GET /control-optima/piezas-maquina

// GET /control-optima/piezas-maquina
// EN: src/routes/controlOptima.routes.js
// ==== /control-optima/piezas-maquina  (SIN PAGINACIÓN + OPCIÓN A FECHA HOY) ====

router.get('/piezas-maquina', async (req, res) => {
  const pool = await poolPromise;

  // --- Parámetros del cliente ---
  const { from: fromStr, to: toStr, search: searchStr } = req.query || {};

  // ==== Opción A: si no llega fecha, usar día en curso ====
  // - Si faltan ambas → from = to = hoy
  // - Si llega solo una → la otra = misma fecha
  const today = new Date();
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  let fromISO = (typeof fromStr === 'string' && fromStr.trim()) ? fromStr.trim() : null;
  let toISO   = (typeof toStr   === 'string' && toStr.trim())   ? toStr.trim()   : null;

  if (!fromISO && !toISO) {
    fromISO = ymd(today);
    toISO   = ymd(today);
  } else if (fromISO && !toISO) {
    toISO = fromISO;
  } else if (!fromISO && toISO) {
    fromISO = toISO;
  }

  // Búsqueda libre
  const search = (searchStr || '').trim();

  try {
    const request = pool.request();
    request.input('from',   sql.Date, fromISO);
    request.input('to',     sql.Date, toISO);
    request.input('search', sql.NVarChar(100), search || null);

    const query = `
SET NOCOUNT ON;

DECLARE @usedFrom date = @from;
DECLARE @usedTo   date = @to;

IF OBJECT_ID('tempdb..#COMPUTED') IS NOT NULL DROP TABLE #COMPUTED;

-- ================== BASE: piezas completadas ==================
WITH BASE AS (
  SELECT
    O.RIF                                  AS PEDIDO,
    ISNULL(O.DESCR1_SPED,'')               AS NOMBRE,
    OM.RIGA                                AS LINEA,
    CONVERT(date, QW.DATEEND)              AS DATA_COMPLETE,
    QW.[USERNAME]                          AS USERNAME,
    WK.CODICE                              AS TRABAJO,
    WK.DESCRIZIONE                         AS DESC_TRABAJO,
    QH.CDL_NAME                            AS CENTRO_TRABAJO,
    CASE WHEN QH.CDL_NAME = 'LINEA_FOREL' THEN '' ELSE ISNULL(M.CODICE,'') END  AS VIDRIO,
    CASE WHEN QH.CDL_NAME = 'LINEA_FOREL' THEN 0 ELSE FLOOR(OD.ID_DETT/2)+1 END AS N_VIDRIO,
    CASE WHEN QW.ID_QUEUEREASON IN (1,2) THEN 'COMPLETE' ELSE '' END            AS ESTADO,
    QW.DATEEND                             AS DATAHORA_COMPL,
    CAST(1 AS INT)                         AS PIEZAS,
    OD.DIMXPZR                             AS MEDIDA_X,
    OD.DIMYPZR                             AS MEDIDA_Y,
    CAST(OD.DIMXPZR*OD.DIMYPZR/1000000.0 AS decimal(18,6)) AS AREA,
    OM.QTAPZ                               AS PZ_LIN,
    QW.PROGR                               AS PROGR,
    PR.RIF                                 AS PRODUCTO,
    CAST(DB.PERIMETRO/1000.0 AS decimal(18,6)) AS PERIMETRO,
    CASE WHEN WK.ID_TIPILAVORAZIONE = 301 AND WK.PRIOWORK IN (20,30)
         THEN CAST(DB.LENTOTBARRE/1000.0 AS decimal(18,6)) ELSE 0 END AS LONG_TRABAJO,
    DB.ID_DBASEORDINI,
    QW.ID_ITEMS,
    O.ID_ORDINI,
    QW.DATESTART                           AS FECHA_INICIO_OP,
    QW.DATEEND                             AS FECHA_FIN_OP,
    QW.DATEBROKEN                          AS FECHA_ROTURA,
    O.DATAORD                              AS fecha_pedido,
    O.DATACONS                             AS fecha_entrega_prog
  FROM OPTIMA_FELMAN.dbo.QUEUEWORK    AS QW   WITH (NOLOCK)
  JOIN OPTIMA_FELMAN.dbo.QUEUEHEADER  AS QH   WITH (NOLOCK) ON QH.ID_QUEUEHEADER = QW.ID_QUEUEHEADER
  JOIN OPTIMA_FELMAN.dbo.WORKKIND     AS WK   WITH (NOLOCK) ON WK.ID_WORKKIND    = QW.ID_WORKKIND
  JOIN OPTIMA_FELMAN.dbo.ORDMAST      AS OM   WITH (NOLOCK) ON OM.ID_ORDMAST     = QW.ID_ORDMAST
  JOIN OPTIMA_FELMAN.dbo.ORDINI       AS O    WITH (NOLOCK) ON O.ID_ORDINI       = OM.ID_ORDINI
  JOIN OPTIMA_FELMAN.dbo.ORDDETT      AS OD   WITH (NOLOCK) ON OD.ID_ORDDETT     = QW.ID_ORDDETT
  LEFT JOIN OPTIMA_FELMAN.dbo.MAGAZ   AS M    WITH (NOLOCK) ON M.ID_MAGAZ        = OD.ID_MAGAZ
  LEFT JOIN OPTIMA_FELMAN.dbo.ITEMS   AS IT   WITH (NOLOCK) ON IT.ID_ITEMS       = QW.ID_ITEMS
  LEFT JOIN OPTIMA_FELMAN.dbo.DBASEORDINI AS DB WITH (NOLOCK) ON DB.ID_DBASEORDINI = IT.ID_DBASEORDINI
  LEFT JOIN OPTIMA_FELMAN.dbo.PRODOTTI    AS PR WITH (NOLOCK) ON PR.ID_PRODOTTI  = OM.ID_PRODOTTI
  WHERE QW.ID_QUEUEREASON IN (1,2)
    AND QW.ID_QUEUEREASON_COMPLETE = 20
    AND QW.DATEEND IS NOT NULL
    AND YEAR(QW.DATESTART) > 2018
    AND QW.DATEEND >= @usedFrom
    AND QW.DATEEND < DATEADD(DAY, 1, @usedTo)
    AND ( @search IS NULL OR @search = ''
          OR O.RIF            LIKE '%' + @search + '%'
          OR QW.[USERNAME]    LIKE '%' + @search + '%'
          OR WK.CODICE        LIKE '%' + @search + '%'
          OR WK.DESCRIZIONE   LIKE '%' + @search + '%'   -- DESC_TRABAJO
          OR QH.CDL_NAME      LIKE '%' + @search + '%'
          OR PR.RIF           LIKE '%' + @search + '%'
          OR ISNULL(M.CODICE,'') LIKE '%' + @search + '%' )
),
ENRICH AS (
  SELECT b.*, COALESCE(b.DATAHORA_COMPL, CAST(b.DATA_COMPLETE AS datetime)) AS eventdt
  FROM BASE b
),
ORDENED AS (
  SELECT
    e.*,
    LAG(e.eventdt) OVER (PARTITION BY e.PEDIDO, e.LINEA, e.ID_ITEMS ORDER BY e.eventdt) AS prev_eventdt
  FROM ENRICH e
),
COMPUTED AS (
  SELECT
    o.*,
    CASE WHEN o.FECHA_INICIO_OP IS NOT NULL AND o.FECHA_FIN_OP IS NOT NULL
         THEN DATEDIFF(SECOND, o.FECHA_INICIO_OP, o.FECHA_FIN_OP) END                   AS t_trabajo_seg,
    CASE WHEN o.prev_eventdt IS NOT NULL AND o.FECHA_INICIO_OP IS NOT NULL
         THEN DATEDIFF(SECOND, o.prev_eventdt, o.FECHA_INICIO_OP) END                   AS t_espera_prev_maquina_seg,
    CASE WHEN o.prev_eventdt IS NOT NULL
         THEN DATEDIFF(SECOND, o.prev_eventdt, o.eventdt) END                           AS t_entre_operaciones_seg,
    CASE WHEN o.fecha_pedido IS NOT NULL
         THEN DATEDIFF(SECOND, o.fecha_pedido, o.eventdt) END                           AS t_desde_pedido_seg,
    CASE WHEN o.fecha_entrega_prog IS NOT NULL
         THEN DATEDIFF(SECOND, o.eventdt, o.fecha_entrega_prog) END                     AS t_hasta_entrega_prog_seg,
    DATEDIFF(SECOND,
      MIN(o.eventdt) OVER (PARTITION BY o.PEDIDO, o.LINEA, o.ID_ITEMS),
      MAX(o.eventdt) OVER (PARTITION BY o.PEDIDO, o.LINEA, o.ID_ITEMS)
    )                                                                                   AS t_ciclo_pieza_total_seg
  FROM ORDENED o
)
SELECT * INTO #COMPUTED FROM COMPUTED;

-- ===== META (totales) =====
SELECT
  @usedFrom AS usedFrom,
  @usedTo   AS usedTo,
  COUNT(*)                                        AS total,
  ISNULL(SUM(CAST(PIEZAS AS float)), 0)           AS piezas,
  ISNULL(SUM(CAST(AREA   AS float)), 0)           AS area
INTO #META
FROM #COMPUTED;

-- ===== DEVOLUCIÓN =====
-- 1) Meta
SELECT * FROM #META;

-- 2) Items (SIN paginación): todo el rango pedido
SELECT
  PEDIDO, NOMBRE, LINEA, DATA_COMPLETE, USERNAME,
  TRABAJO, DESC_TRABAJO,                      -- <= requerido por frontend
  CENTRO_TRABAJO, VIDRIO, N_VIDRIO, ESTADO, DATAHORA_COMPL,
  PIEZAS, MEDIDA_X, MEDIDA_Y, AREA, PZ_LIN, PROGR, PRODUCTO, PERIMETRO, LONG_TRABAJO,
  eventdt,
  FECHA_INICIO_OP   AS fecha_inicio_op,
  FECHA_FIN_OP      AS fecha_fin_op,
  FECHA_ROTURA      AS fecha_rotura,
  fecha_pedido,
  fecha_entrega_prog,
  t_trabajo_seg,
  t_espera_prev_maquina_seg,
  t_entre_operaciones_seg,
  t_desde_pedido_seg,
  t_hasta_entrega_prog_seg,
  t_ciclo_pieza_total_seg
FROM #COMPUTED
ORDER BY eventdt DESC;`;

    const result = await request.query(query);

    // recordsets[0] = meta, recordsets[1] = items
    const meta  = result.recordsets?.[0]?.[0] || { total: 0, piezas: 0, area: 0, usedFrom: fromISO, usedTo: toISO };
    const items = result.recordsets?.[1] || [];

    return res.json({
      ok: true,
      usedFrom: meta.usedFrom,
      usedTo: meta.usedTo,
      total: meta.total,
      agg: { piezas: meta.piezas, area: meta.area },
      items
    });
  } catch (err) {
    console.error('❌ /piezas-maquina (sin paginación) ERROR:', err);
    return res.status(500).json({
      ok: false,
      message: '/piezas-maquina failed',
      detail: err?.message || String(err),
    });
  }
});



// === NUEVO: AGRUPADO POR PEDIDO (summary) ====================================
// GET /control-optima/piezas-maquina/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=50&search=TXT
router.get('/piezas-maquina/summary', async (req, res) => {
  const pool = await poolPromise;

  const {
    from: fromStr,
    to: toStr,
    search: searchStr,
    page = 1,
    pageSize = 50,
  } = req.query || {};

  const from = fromStr ? new Date(fromStr) : null;
  const to   = toStr   ? new Date(toStr)   : null;
  const search = (searchStr || '').trim();
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const pageSz  = Math.max(1, Math.min(500, parseInt(pageSize, 10) || 50));
  const offset  = (pageNum - 1) * pageSz;

  try {
    const request = pool.request()
      .input('from',     sql.DateTime, from || null)
      .input('to',       sql.DateTime, to   || null)
      .input('search',   sql.NVarChar(100), search || null)
      .input('offset',   sql.Int, offset)
      .input('pageSize', sql.Int, pageSz);

    // Nota: usamos la misma base que tu endpoint /piezas-maquina,
    // pero terminamos con un GROUP BY por pedido y calculamos totales/medias.
    const query = `
SET NOCOUNT ON;

DECLARE @usedFrom DATE = @from;
DECLARE @usedTo   DATE = @to;
DECLARE @useDateFilter bit = CASE WHEN @usedFrom IS NULL OR @usedTo IS NULL THEN 0 ELSE 1 END;

WITH BASE AS (
  SELECT
    O.RIF                                  AS PEDIDO,
    ISNULL(O.DESCR1_SPED,'')               AS NOMBRE,
    OM.RIGA                                AS LINEA,
    QW.[USERNAME]                          AS USERNAME,
    WK.CODICE                              AS TRABAJO,
    WK.DESCRIZIONE                         AS DESC_TRABAJO,
    QH.CDL_NAME                            AS CENTRO_TRABAJO,
    CASE WHEN QH.CDL_NAME = 'LINEA_FOREL' THEN '' ELSE ISNULL(M.CODICE,'') END  AS VIDRIO,
    CASE WHEN QH.CDL_NAME = 'LINEA_FOREL' THEN 0 ELSE FLOOR(OD.ID_DETT/2)+1 END AS N_VIDRIO,
    CASE WHEN QW.ID_QUEUEREASON IN (1,2) THEN 'COMPLETE' ELSE '' END            AS ESTADO,
    QW.DATEEND                             AS DATAHORA_COMPL,
    CAST(1 AS INT)                         AS PIEZAS,
    OD.DIMXPZR                             AS MEDIDA_X,
    OD.DIMYPZR                             AS MEDIDA_Y,
    CAST(OD.DIMXPZR*OD.DIMYPZR/1000000.0 AS decimal(18,6)) AS AREA,
    OM.QTAPZ                               AS PZ_LIN,
    QW.PROGR                               AS PROGR,
    PR.RIF                                 AS PRODUCTO,
    DB.ID_DBASEORDINI,
    QW.ID_ITEMS,
    O.ID_ORDINI,
    QW.DATESTART                           AS FECHA_INICIO_OP,
    QW.DATEEND                             AS FECHA_FIN_OP,
    O.DATAORD                              AS FECHA_PEDIDO,
    O.DATACONS                             AS FECHA_ENTREGA_PROG
  FROM OPTIMA_FELMAN.dbo.QUEUEWORK    AS QW   WITH (NOLOCK)
  JOIN OPTIMA_FELMAN.dbo.QUEUEHEADER  AS QH   WITH (NOLOCK) ON QH.ID_QUEUEHEADER = QW.ID_QUEUEHEADER
  JOIN OPTIMA_FELMAN.dbo.WORKKIND     AS WK   WITH (NOLOCK) ON WK.ID_WORKKIND    = QW.ID_WORKKIND
  JOIN OPTIMA_FELMAN.dbo.ORDMAST      AS OM   WITH (NOLOCK) ON OM.ID_ORDMAST     = QW.ID_ORDMAST
  JOIN OPTIMA_FELMAN.dbo.ORDINI       AS O    WITH (NOLOCK) ON O.ID_ORDINI       = OM.ID_ORDINI
  JOIN OPTIMA_FELMAN.dbo.ORDDETT      AS OD   WITH (NOLOCK) ON OD.ID_ORDDETT     = QW.ID_ORDDETT
  LEFT JOIN OPTIMA_FELMAN.dbo.MAGAZ   AS M    WITH (NOLOCK) ON M.ID_MAGAZ        = OD.ID_MAGAZ
  LEFT JOIN OPTIMA_FELMAN.dbo.ITEMS   AS IT   WITH (NOLOCK) ON IT.ID_ITEMS       = QW.ID_ITEMS
  LEFT JOIN OPTIMA_FELMAN.dbo.DBASEORDINI AS DB WITH (NOLOCK) ON DB.ID_DBASEORDINI = IT.ID_DBASEORDINI
  LEFT JOIN OPTIMA_FELMAN.dbo.PRODOTTI    AS PR WITH (NOLOCK) ON PR.ID_PRODOTTI  = OM.ID_PRODOTTI
  WHERE QW.ID_QUEUEREASON IN (1,2)
    AND QW.ID_QUEUEREASON_COMPLETE = 20
    AND QW.DATEEND IS NOT NULL
    AND YEAR(QW.DATESTART) > 2018
    AND ( @useDateFilter = 0
          OR QW.DATEEND >= @usedFrom AND QW.DATEEND < DATEADD(DAY, 1, @usedTo) )
    AND ( @search IS NULL OR @search = ''
          OR O.RIF           LIKE '%' + @search + '%'
          OR QW.[USERNAME]   LIKE '%' + @search + '%'
          OR WK.CODICE       LIKE '%' + @search + '%'
          OR QH.CDL_NAME     LIKE '%' + @search + '%'
          OR PR.RIF          LIKE '%' + @search + '%'
          OR ISNULL(M.CODICE,'') LIKE '%' + @search + '%' )
),
E AS (
  SELECT
    b.*,
    COALESCE(b.DATAHORA_COMPL, CAST(CONVERT(date, b.DATAHORA_COMPL) AS datetime)) AS eventdt
  FROM BASE b
),
O AS (
  SELECT
    e.*,
    LAG(e.eventdt) OVER (PARTITION BY e.PEDIDO, e.LINEA, e.ID_ITEMS ORDER BY e.eventdt) AS prev_eventdt
  FROM E e
),
T AS (
  SELECT
    o.*,
    CASE WHEN o.FECHA_INICIO_OP IS NOT NULL AND o.FECHA_FIN_OP IS NOT NULL
         THEN DATEDIFF(SECOND, o.FECHA_INICIO_OP, o.FECHA_FIN_OP) END                           AS t_trabajo_seg,
    CASE WHEN o.prev_eventdt IS NOT NULL
         THEN DATEDIFF(SECOND, o.prev_eventdt, o.eventdt) END                                   AS t_entre_operaciones_seg,
    CASE WHEN o.prev_eventdt IS NOT NULL AND o.FECHA_INICIO_OP IS NOT NULL
         THEN DATEDIFF(SECOND, o.prev_eventdt, o.FECHA_INICIO_OP) END                           AS t_espera_prev_maquina_seg,
    CASE WHEN o.FECHA_PEDIDO IS NOT NULL
         THEN DATEDIFF(SECOND, o.FECHA_PEDIDO, o.eventdt) END                                   AS t_desde_pedido_seg,
    CASE WHEN o.FECHA_ENTREGA_PROG IS NOT NULL
         THEN DATEDIFF(SECOND, o.eventdt, o.FECHA_ENTREGA_PROG) END                             AS t_hasta_entrega_prog_seg,
    MIN(o.eventdt) OVER (PARTITION BY o.PEDIDO, o.LINEA, o.ID_ITEMS)                            AS min_ev,
    MAX(o.eventdt) OVER (PARTITION BY o.PEDIDO, o.LINEA, o.ID_ITEMS)                            AS max_ev
  FROM O o
),
T2 AS (
  SELECT
    *,
    DATEDIFF(SECOND, min_ev, max_ev) AS t_ciclo_pieza_total_seg
  FROM T
),
G AS (
  -- normalizamos clave de pedido para evitar duplicados por espacios/minúsculas
  SELECT
    UPPER(LTRIM(RTRIM(PEDIDO))) AS PedidoKey,
    MAX(PEDIDO)                 AS PEDIDO,
    MAX(NOMBRE)                 AS NOMBRE,
    -- estado: único / mixto
    CASE
      WHEN COUNT(DISTINCT ISNULL(ESTADO,'')) <= 1 THEN MAX(ESTADO)
      ELSE 'Mixto'
    END                         AS ESTADO,
    MAX(eventdt)                AS fechaUlt,
    COUNT(*)                    AS countRows,
    SUM(COALESCE(t_trabajo_seg,0))               AS s_trabajo,
    SUM(COALESCE(t_espera_prev_maquina_seg,0))   AS s_esperaprev,
    SUM(COALESCE(t_entre_operaciones_seg,0))     AS s_entreops,
    SUM(COALESCE(t_desde_pedido_seg,0))          AS s_desdeped,
    SUM(COALESCE(t_hasta_entrega_prog_seg,0))    AS s_hastaent,
    SUM(COALESCE(t_ciclo_pieza_total_seg,0))     AS s_ciclo
  FROM T2
  GROUP BY UPPER(LTRIM(RTRIM(PEDIDO)))
),
META AS (
  SELECT COUNT(*) AS total FROM G
),
PAGE AS (
  SELECT *
  FROM G
  ORDER BY fechaUlt DESC
  OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
)
SELECT * FROM META;
SELECT
  PedidoKey,
  PEDIDO      AS pedido,
  NOMBRE      AS nombre,
  countRows   AS [count],
  ESTADO      AS estado,
  CONVERT(datetime, fechaUlt) AS fechaUlt,
  -- empaquetamos los totales/medias para que el front no agrupe nada más
  s_trabajo     AS total_trabajo,
  s_esperaprev  AS total_esperaPrev,
  s_entreops    AS total_entreOps,
  s_desdeped    AS total_desdePedido,
  s_hastaent    AS total_hastaEntrega,
  s_ciclo       AS total_ciclo,
  CASE WHEN countRows>0 THEN s_trabajo    * 1.0 / countRows ELSE 0 END AS avg_trabajo,
  CASE WHEN countRows>0 THEN s_esperaprev * 1.0 / countRows ELSE 0 END AS avg_esperaPrev,
  CASE WHEN countRows>0 THEN s_entreops   * 1.0 / countRows ELSE 0 END AS avg_entreOps,
  CASE WHEN countRows>0 THEN s_desdeped   * 1.0 / countRows ELSE 0 END AS avg_desdePedido,
  CASE WHEN countRows>0 THEN s_hastaent   * 1.0 / countRows ELSE 0 END AS avg_hastaEntrega,
  CASE WHEN countRows>0 THEN s_ciclo      * 1.0 / countRows ELSE 0 END AS avg_ciclo
FROM PAGE
ORDER BY fechaUlt DESC;
    `;

    const r = await request.query(query);
    const meta  = r.recordsets?.[0]?.[0] || { total: 0 };
    const items = r.recordsets?.[1] || [];

    // adaptamos el shape al front
    const groups = items.map(it => ({
      kind: 'pedido',
      pedido: it.pedido,
      nombre: it.nombre,
      count: it.count,
      estado: it.estado || '',
      fechaUlt: it.fechaUlt ? new Date(it.fechaUlt).toISOString() : null,
      rows: [], // se cargan al abrir modal
      totals: {
        trabajo:      Number(it.total_trabajo)    || 0,
        esperaPrev:   Number(it.total_esperaPrev) || 0,
        entreOps:     Number(it.total_entreOps)   || 0,
        desdePedido:  Number(it.total_desdePedido)|| 0,
        hastaEntrega: Number(it.total_hastaEntrega)|| 0,
        cicloPieza:   Number(it.total_ciclo)      || 0,
      },
      avg: {
        trabajo:      Number(it.avg_trabajo)      || 0,
        esperaPrev:   Number(it.avg_esperaPrev)   || 0,
        entreOps:     Number(it.avg_entreOps)     || 0,
        desdePedido:  Number(it.avg_desdePedido)  || 0,
        hastaEntrega: Number(it.avg_hastaEntrega) || 0,
        cicloPieza:   Number(it.avg_ciclo)        || 0,
      }
    }));

    return res.json({
      items: groups,
      page: pageNum,
      pageSize: pageSz,
      total: meta.total,
      from: fromStr || null,
      to: toStr || null,
      orderBy: 'fechaUlt', orderDir: 'DESC'
    });
  } catch (err) {
    console.error('/piezas-maquina/summary', err);
    return res.status(500).json({ message: err.message });
  }
});


// === NUEVO: DETALLE DE UN PEDIDO (todas las filas del rango) ==================
// GET /control-optima/piezas-maquina/pedido?pedido=01/011254-10&from=YYYY-MM-DD&to=YYYY-MM-DD
// GET /control-optima/piezas-maquina/pedido?pedido=01/011254-10&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/piezas-maquina/pedido', async (req, res) => {
  const { pedido, from, to } = req.query || {};

  if (!pedido) return res.status(400).json({ message: 'Parámetro "pedido" requerido.' });

  // Validar formato de fechas (YYYY-MM-DD)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const fromValid = from && dateRegex.test(from) && !isNaN(new Date(from).getTime());
  const toValid = to && dateRegex.test(to) && !isNaN(new Date(to).getTime());
  const useDateFilter = fromValid && toValid;

  try {
    const pool = await poolPromise;
    const request = pool.request()
      .input('pedido', sql.NVarChar(50), String(pedido))
      .input('from', sql.Date, fromValid ? from : null)
      .input('to', sql.Date, toValid ? to : null);

    const query = `
SET NOCOUNT ON;

DECLARE @usedFrom DATE = @from;
DECLARE @usedTo DATE = @to;
DECLARE @useDateFilter bit = ${useDateFilter ? 1 : 0};

WITH BASE AS (
  SELECT
    O.RIF AS PEDIDO,
    ISNULL(O.DESCR1_SPED, '') AS NOMBRE,
    OM.RIGA AS LINEA,
    CONVERT(date, QW.DATEEND) AS DATA_COMPLETE,
    QW.[USERNAME] AS USERNAME,
    WK.CODICE AS TRABAJO,
    WK.DESCRIZIONE AS DESC_TRABAJO,
    QH.CDL_NAME AS CENTRO_TRABAJO,
    CASE WHEN QH.CDL_NAME = 'LINEA_FOREL' THEN '' ELSE ISNULL(M.CODICE, '') END AS VIDRIO,
    CASE WHEN QH.CDL_NAME = 'LINEA_FOREL' THEN 0 ELSE FLOOR(OD.ID_DETT / 2) + 1 END AS N_VIDRIO,
    CASE WHEN QW.ID_QUEUEREASON IN (1, 2) THEN 'COMPLETE' ELSE '' END AS ESTADO,
    QW.DATEEND AS DATAHORA_COMPL,
    CAST(1 AS INT) AS PIEZAS,
    OD.DIMXPZR AS MEDIDA_X,
    OD.DIMYPZR AS MEDIDA_Y,
    CAST(OD.DIMXPZR * OD.DIMYPZR / 1000000.0 AS decimal(18,6)) AS AREA,
    OM.QTAPZ AS PZ_LIN,
    QW.PROGR AS PROGR,
    PR.RIF AS PRODUCTO,
    DB.ID_DBASEORDINI,
    QW.ID_ITEMS,
    O.ID_ORDINI,
    QW.DATESTART AS fecha_inicio_op,
    QW.DATEEND AS fecha_fin_op,
    O.DATAORD AS fecha_pedido,
    O.DATACONS AS fecha_entrega_prog
  FROM OPTIMA_FELMAN.dbo.QUEUEWORK QW WITH (NOLOCK)
  JOIN OPTIMA_FELMAN.dbo.QUEUEHEADER QH WITH (NOLOCK) ON QH.ID_QUEUEHEADER = QW.ID_QUEUEHEADER
  JOIN OPTIMA_FELMAN.dbo.WORKKIND WK WITH (NOLOCK) ON WK.ID_WORKKIND = QW.ID_WORKKIND
  JOIN OPTIMA_FELMAN.dbo.ORDMAST OM WITH (NOLOCK) ON OM.ID_ORDMAST = QW.ID_ORDMAST
  JOIN OPTIMA_FELMAN.dbo.ORDINI O WITH (NOLOCK) ON O.ID_ORDINI = OM.ID_ORDINI
  JOIN OPTIMA_FELMAN.dbo.ORDDETT OD WITH (NOLOCK) ON OD.ID_ORDDETT = QW.ID_ORDDETT
  LEFT JOIN OPTIMA_FELMAN.dbo.MAGAZ M WITH (NOLOCK) ON M.ID_MAGAZ = OD.ID_MAGAZ
  LEFT JOIN OPTIMA_FELMAN.dbo.ITEMS IT WITH (NOLOCK) ON IT.ID_ITEMS = QW.ID_ITEMS
  LEFT JOIN OPTIMA_FELMAN.dbo.DBASEORDINI DB WITH (NOLOCK) ON DB.ID_DBASEORDINI = IT.ID_DBASEORDINI
  LEFT JOIN OPTIMA_FELMAN.dbo.PRODOTTI PR WITH (NOLOCK) ON PR.ID_PRODOTTI = OM.ID_PRODOTTI
  WHERE QW.ID_QUEUEREASON IN (1, 2)
    AND QW.ID_QUEUEREASON_COMPLETE = 20
    AND QW.DATEEND IS NOT NULL
    AND YEAR(QW.DATESTART) > 2018
    AND O.RIF = @pedido
    ${useDateFilter ? `AND QW.DATEEND >= @usedFrom AND QW.DATEEND < DATEADD(DAY, 1, @usedTo)` : ''}
),
ENRICH AS (
  SELECT
    b.*,
    COALESCE(b.DATAHORA_COMPL, CAST(b.DATA_COMPLETE AS datetime)) AS eventdt
  FROM BASE b
),
ORDEN AS (
  SELECT
    e.*,
    LAG(e.eventdt) OVER (
      PARTITION BY e.PEDIDO, e.LINEA, e.ID_ITEMS
      ORDER BY e.eventdt
    ) AS prev_eventdt
  FROM ENRICH e
)
SELECT
  PEDIDO,
  NOMBRE,
  LINEA,
  DATA_COMPLETE,
  USERNAME,
  TRABAJO,
  DESC_TRABAJO,
  CENTRO_TRABAJO,
  VIDRIO,
  N_VIDRIO,
  ESTADO,
  DATAHORA_COMPL,
  PIEZAS,
  MEDIDA_X,
  MEDIDA_Y,
  AREA,
  PZ_LIN,
  PROGR,
  PRODUCTO,
  ID_DBASEORDINI,
  ID_ITEMS,
  ID_ORDINI,
  fecha_inicio_op,
  fecha_fin_op,
  fecha_pedido,
  fecha_entrega_prog,
  eventdt,
  CASE WHEN fecha_inicio_op IS NOT NULL AND fecha_fin_op IS NOT NULL
       THEN DATEDIFF(SECOND, fecha_inicio_op, fecha_fin_op) END AS t_trabajo_seg,
  CASE WHEN prev_eventdt IS NOT NULL AND fecha_inicio_op IS NOT NULL
       THEN DATEDIFF(SECOND, prev_eventdt, fecha_inicio_op) END AS t_espera_prev_maquina_seg,
  CASE WHEN prev_eventdt IS NOT NULL
       THEN DATEDIFF(SECOND, prev_eventdt, eventdt) END AS t_entre_operaciones_seg,
  CASE WHEN fecha_pedido IS NOT NULL
       THEN DATEDIFF(SECOND, fecha_pedido, eventdt) END AS t_desde_pedido_seg,
  CASE WHEN fecha_entrega_prog IS NOT NULL
       THEN DATEDIFF(SECOND, eventdt, fecha_entrega_prog) END AS t_hasta_entrega_prog_seg,
  DATEDIFF(
    SECOND,
    MIN(eventdt) OVER (PARTITION BY PEDIDO, LINEA, ID_ITEMS),
    MAX(eventdt) OVER (PARTITION BY PEDIDO, LINEA, ID_ITEMS)
  ) AS t_ciclo_pieza_total_seg
FROM ORDEN
ORDER BY eventdt;
`;

    console.log('🔍 /piezas-maquina/pedido', { pedido, from, to, useDateFilter });
    const r = await request.query(query);
    console.log(`✅ /piezas-maquina/pedido OK rows=${r.recordset?.length || 0}`);
    return res.json({ items: r.recordset || [] });

  } catch (err) {
    console.error('❌ /piezas-maquina/pedido', err);
    return res.status(500).json({ message: err.message });
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
SET NOCOUNT ON;
USE OPTIMA_FELMAN;

DECLARE @usedFrom DATE = @from;
DECLARE @usedTo   DATE = @to;
DECLARE @useDateFilter bit = CASE WHEN @usedFrom IS NULL OR @usedTo IS NULL THEN 0 ELSE 1 END;

IF OBJECT_ID('tempdb..#BASE') IS NOT NULL DROP TABLE #BASE;

-- ================== BASE: operaciones completadas (sin vistas) ==================
SELECT
  O.RIF                                  AS PEDIDO,
  ISNULL(O.DESCR1_SPED,'')               AS NOMBRE,
  OM.RIGA                                AS LINEA,
  CONVERT(date, QW.DATEEND)              AS DATA_COMPLETE,
  QW.[USERNAME]                          AS USERNAME,
  WK.CODICE                              AS TRABAJO,
  WK.DESCRIZIONE                         AS DESC_TRABAJO,
  QH.CDL_NAME                            AS CENTRO_TRABAJO,
  CASE WHEN QH.CDL_NAME = 'LINEA_FOREL' THEN '' ELSE ISNULL(M.CODICE,'') END  AS VIDRIO,
  CASE WHEN QH.CDL_NAME = 'LINEA_FOREL' THEN 0 ELSE FLOOR(OD.ID_DETT/2)+1 END AS N_VIDRIO,
  CASE WHEN QW.ID_QUEUEREASON IN (1,2) THEN 'COMPLETE' ELSE '' END            AS ESTADO,
  QW.DATEEND                             AS DATAHORA_COMPL,
  CAST(1 AS INT)                         AS PIEZAS,
  OD.DIMXPZR                             AS MEDIDA_X,
  OD.DIMYPZR                             AS MEDIDA_Y,
  CAST(OD.DIMXPZR*OD.DIMYPZR/1000000.0 AS decimal(18,6)) AS AREA,
  OM.QTAPZ                               AS PZ_LIN,
  QW.PROGR                               AS PROGR,
  PR.RIF                                 AS PRODUCTO,
  CAST(DB.PERIMETRO/1000.0 AS decimal(18,6)) AS PERIMETRO,
  CASE WHEN WK.ID_TIPILAVORAZIONE = 301 AND WK.PRIOWORK IN (20,30)
       THEN CAST(DB.LENTOTBARRE/1000.0 AS decimal(18,6)) ELSE 0 END AS LONG_TRABAJO,
  DB.ID_DBASEORDINI,
  O.ID_ORDINI,
  QW.DATESTART                           AS FECHA_INICIO_OP,
  QW.DATEEND                             AS FECHA_FIN_OP,
  CAST(NULL AS DATETIME)                 AS FECHA_ROTURA
INTO #BASE
FROM dbo.QUEUEWORK    QW
JOIN dbo.QUEUEHEADER  QH ON QH.ID_QUEUEHEADER = QW.ID_QUEUEHEADER
JOIN dbo.WORKKIND     WK ON WK.ID_WORKKIND    = QW.ID_WORKKIND
JOIN dbo.ORDMAST      OM ON OM.ID_ORDMAST     = QW.ID_ORDMAST
JOIN dbo.ORDINI       O  ON O.ID_ORDINI       = OM.ID_ORDINI
JOIN dbo.ORDDETT      OD ON OD.ID_ORDDETT     = QW.ID_ORDDETT
LEFT JOIN dbo.MAGAZ   M  ON M.ID_MAGAZ        = OD.ID_MAGAZ
LEFT JOIN dbo.ITEMS   IT ON IT.ID_ITEMS       = QW.ID_ITEMS
LEFT JOIN dbo.DBASEORDINI DB ON DB.ID_DBASEORDINI = IT.ID_DBASEORDINI
LEFT JOIN dbo.PRODOTTI PR  ON PR.ID_PRODOTTI      = OM.ID_PRODOTTI
WHERE QW.ID_QUEUEREASON IN (1,2)
  AND QW.ID_QUEUEREASON_COMPLETE = 20
  AND QW.DATESTART IS NOT NULL
  AND QW.DATEEND   IS NOT NULL
  AND (
        @useDateFilter = 0
        OR QW.DATEEND >= DATEADD(DAY, DATEDIFF(DAY,0,@usedFrom), 0)
       AND QW.DATEEND <  DATEADD(DAY, 1, DATEADD(DAY, DATEDIFF(DAY,0,@usedTo), 0))
      )
  AND (
        @search IS NULL OR @search = '' OR
        O.RIF             LIKE '%' + @search + '%' OR
        O.DESCR1_SPED     LIKE '%' + @search + '%' OR
        QW.[USERNAME]     LIKE '%' + @search + '%' OR
        QH.CDL_NAME       LIKE '%' + @search + '%' OR
        WK.CODICE         LIKE '%' + @search + '%' OR
        WK.DESCRIZIONE    LIKE '%' + @search + '%' OR
        ISNULL(M.CODICE,'') LIKE '%' + @search + '%' OR
        PR.RIF            LIKE '%' + @search + '%'
      );

-- ================== META ==================
WITH ENRICH AS (
  SELECT
    b.*,
    COALESCE(CAST(b.DATAHORA_COMPL AS datetime), CAST(b.DATA_COMPLETE AS datetime)) AS eventdt,
    O.DATAORD   AS fecha_pedido,
    O.DATACONS  AS fecha_entrega_prog
  FROM #BASE b
  LEFT JOIN dbo.ORDINI O ON O.ID_ORDINI = b.ID_ORDINI
)
SELECT
  @usedFrom AS usedFrom,
  @usedTo   AS usedTo,
  COUNT(*)                                      AS total,
  ISNULL(SUM(CAST(PIEZAS AS float)), 0)         AS piezas,
  ISNULL(SUM(CAST(AREA   AS float)), 0)         AS area
FROM ENRICH;

-- ================== ITEMS (con tiempos + alias en minúsculas) ==================
WITH ENRICH AS (
  SELECT
    b.*,
    COALESCE(CAST(b.DATAHORA_COMPL AS datetime), CAST(b.DATA_COMPLETE AS datetime)) AS eventdt,
    O.DATAORD   AS fecha_pedido,
    O.DATACONS  AS fecha_entrega_prog
  FROM #BASE b
  LEFT JOIN dbo.ORDINI O ON O.ID_ORDINI = b.ID_ORDINI
  WHERE
    (@useDateFilter = 0 OR (COALESCE(CAST(b.DATAHORA_COMPL AS datetime), CAST(b.DATA_COMPLETE AS datetime)) >= @usedFrom
                         AND COALESCE(CAST(b.DATAHORA_COMPL AS datetime), CAST(b.DATA_COMPLETE AS datetime)) < DATEADD(DAY,1,@usedTo)))
    AND (
      @search IS NULL OR @search = '' OR
      b.PEDIDO         LIKE '%' + @search + '%' OR
      b.USERNAME       LIKE '%' + @search + '%' OR
      b.NOMBRE         LIKE '%' + @search + '%' OR
      b.PRODUCTO       LIKE '%' + @search + '%' OR
      b.CENTRO_TRABAJO LIKE '%' + @search + '%' OR
      b.VIDRIO         LIKE '%' + @search + '%' OR
      b.TRABAJO        LIKE '%' + @search + '%'
    )
)
SELECT *
FROM (
  SELECT
    e.PEDIDO, e.NOMBRE, e.LINEA, e.DATA_COMPLETE, e.USERNAME, e.TRABAJO, e.DESC_TRABAJO,
    e.CENTRO_TRABAJO, e.VIDRIO, e.N_VIDRIO, e.ESTADO, e.DATAHORA_COMPL,
    e.PIEZAS, e.MEDIDA_X, e.MEDIDA_Y, e.AREA, e.PZ_LIN, e.PROGR, e.PRODUCTO, e.PERIMETRO, e.LONG_TRABAJO,

    -- 👇 nombres EXACTOS que tu front espera (minúsculas)
    e.eventdt,
    e.FECHA_INICIO_OP   AS fecha_inicio_op,
    e.FECHA_FIN_OP      AS fecha_fin_op,
    e.FECHA_ROTURA      AS fecha_rotura,
    e.fecha_pedido,
    e.fecha_entrega_prog,

    -- tiempos
    CASE WHEN e.FECHA_INICIO_OP IS NOT NULL AND e.FECHA_FIN_OP IS NOT NULL
         THEN DATEDIFF(SECOND, e.FECHA_INICIO_OP, e.FECHA_FIN_OP) END                   AS t_trabajo_seg,

    CASE WHEN e.FECHA_INICIO_OP IS NOT NULL
         THEN DATEDIFF(SECOND,
                LAG(e.eventdt) OVER (PARTITION BY e.PEDIDO, e.LINEA, e.N_VIDRIO, e.ID_DBASEORDINI ORDER BY e.eventdt),
                e.FECHA_INICIO_OP
              )
         END                                                                            AS t_espera_prev_maquina_seg,

    DATEDIFF(SECOND,
      LAG(e.eventdt) OVER (PARTITION BY e.PEDIDO, e.LINEA, e.N_VIDRIO, e.ID_DBASEORDINI ORDER BY e.eventdt),
      e.eventdt
    )                                                                                   AS t_entre_operaciones_seg,

    CASE WHEN e.fecha_pedido IS NOT NULL
         THEN DATEDIFF(SECOND, e.fecha_pedido, e.eventdt) END                           AS t_desde_pedido_seg,

    CASE WHEN e.fecha_entrega_prog IS NOT NULL
         THEN DATEDIFF(SECOND, e.eventdt, e.fecha_entrega_prog) END                     AS t_hasta_entrega_prog_seg,

    DATEDIFF(SECOND,
      MIN(e.eventdt) OVER (PARTITION BY e.PEDIDO, e.LINEA, e.N_VIDRIO, e.ID_DBASEORDINI),
      MAX(e.eventdt) OVER (PARTITION BY e.PEDIDO, e.LINEA, e.N_VIDRIO, e.ID_DBASEORDINI)
    )                                                                                   AS t_ciclo_pieza_total_seg
  FROM ENRICH e
) Z
ORDER BY Z.eventdt DESC
OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;

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
