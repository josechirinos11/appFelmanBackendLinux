// src/routes/controlOptima.routes.js
const express = require("express");
const { sql, poolPromise } = require("../config/databaseOptima");




const router = express.Router();


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
// === DASHBOARD_BARCODE_VIEW (INLINE sobre OPTIMA_FELMAN) ======================
router.get('/barcoder', async (req, res) => {
  const { scope = 'ytd', from, to, page = '1', pageSize = '50', search = '' } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const sizeNum = Math.min(500, Math.max(1, parseInt(pageSize, 10) || 50));
  const offset  = (pageNum - 1) * sizeNum;
  const searchTxt = (typeof search === 'string' && search.trim()) ? search.trim() : null;

  // rango por scope
  const today = new Date();
  const pad = (n)=> n<10 ? '0'+n : ''+n;
  const fmt = (d)=> `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  let defFrom, defTo;
  if (scope === 'all') { defFrom = null; defTo = null; }
  else if (scope === 'mtd') { defFrom = fmt(new Date(today.getFullYear(), today.getMonth(), 1)); defTo = fmt(today); }
  else { defFrom = fmt(new Date(today.getFullYear(), 0, 1)); defTo = fmt(today); } // ytd

  const fromParam = (typeof from === 'string' && from.trim()) ? from : defFrom;
  const toParam   = (typeof to   === 'string' && to.trim())   ? to   : defTo;

  try {
    const pool = await poolPromise;
const rq = pool.request();
rq.input('from', sql.Date, fromParam);
rq.input('to',   sql.Date, toParam);
rq.input('offset', sql.Int, offset);
rq.input('pageSize', sql.Int, sizeNum);
rq.multiple = true; // 👈 importante para 2 recordsets

    // === SQL inline equivalente a la vista DASHBOARD_BARCODE_VIEW (ajustada a OPTIMA_FELMAN) ===
    const query = `
SET NOCOUNT ON;

WITH TAULA1 AS ( /* ... idéntico a antes ... */ ),
TAULA2 AS ( /* ... idéntico a antes ... */ ),
ROTURAS AS ( /* ... idéntico a antes ... */ ),
BASE AS (
  SELECT
    LTRIM(RTRIM(STR(ANO))) AS ANO, LTRIM(RTRIM(STR(MES))) AS MES,
    ISNULL(NOMBRE,'') AS NOMBRE,
    PEDIDO, LINEA, DATA_COMPLETE, USERNAME, CENTRO_TRABAJO,
    '' AS TRABAJO,
    VIDRIO, N_VIDRIO, ESTADO, DATAHORA_COMPL, PIEZAS,
    DIMXPZR AS MEDIDA_X, DIMYPZR AS MEDIDA_Y, PROGR,
    PRODUCTO, SUM(LONG_TRABAJO) AS LONG_TRABAJO,
    AREA, QTAPZ AS PZ_LIN,
    '' AS RAZON_QUEBRA1, '' AS RAZON_QUEBRA2, '' AS RAZON_QUEBRA3, '' AS TEXT1,
    CAST(0 AS float) AS PREZZO_PZ
  FROM TAULA1
  GROUP BY ANO,MES,NOMBRE,PEDIDO,LINEA,DATA_COMPLETE,USERNAME,CENTRO_TRABAJO,VIDRIO,N_VIDRIO,ESTADO,DATAHORA_COMPL,PIEZAS,DIMXPZR,DIMYPZR,AREA,QTAPZ,PROGR,PRODUCTO

  UNION ALL
  SELECT
    LTRIM(RTRIM(STR(ANO))), LTRIM(RTRIM(STR(MES))),
    ISNULL(NOMBRE,''), PEDIDO, LINEA, DATA_COMPLETE, USERNAME, CENTRO_TRABAJO,
    '', VIDRIO, N_VIDRIO, ESTADO, DATAHORA_COMPL, PIEZAS,
    DIMXPZR, DIMYPZR, PROGR, PRODUCTO, CAST(0 AS float), AREA, QTAPZ,
    '', '', '', '', CAST(0 AS float)
  FROM TAULA2

  UNION ALL
  SELECT
    LTRIM(RTRIM(STR(ANO))), LTRIM(RTRIM(STR(MES))),
    ISNULL(NOMBRE,''), PEDIDO, LINEA, DATA_COMPLETE, USERNAME, CENTRO_TRABAJO,
    TRABAJO, VIDRIO, N_VIDRIO, ESTADO, DATAHORA_COMPL, PIEZAS,
    DIMXPZR, DIMYPZR, PROGR, PRODUCTO, LONG_TRABAJO, AREA, QTAPZ,
    RAZON_QUEBRA1, RAZON_QUEBRA2, RAZON_QUEBRA3, TEXT1, PREZZO_PZ
  FROM ROTURAS
)
-- 1) Persistimos la base en #B para poder hacer varias consultas sin DECLARE
SELECT
  *, COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) AS EventDT
INTO #B
FROM BASE;

-- 2) META
SELECT
  @from AS usedFrom, @to AS usedTo,
  COUNT(*) AS total,
  ISNULL(SUM(TRY_CONVERT(float, PIEZAS)), 0) AS piezas,
  ISNULL(SUM(TRY_CONVERT(float, AREA)),   0) AS area
FROM #B
WHERE (@from IS NULL OR @to IS NULL OR (EventDT >= @from AND EventDT < DATEADD(DAY,1,@to)));

-- 3) ITEMS
SELECT *
FROM #B
WHERE (@from IS NULL OR @to IS NULL OR (EventDT >= @from AND EventDT < DATEADD(DAY,1,@to)))
ORDER BY EventDT DESC
OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
`;

    const result = await rq.query(query);
    const meta  = result.recordsets?.[0]?.[0] || { total: 0, piezas: 0, area: 0, usedFrom: fromParam, usedTo: toParam };
    const items = result.recordsets?.[1] || [];

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
    console.error('❌ /barcoder (inline) ERROR:', err);
    res.status(500).json({ status: 'error', message: err.message });
  }
});












// === DASHBOARD_STATUS_ORDER_VIEW ===============================================
// GET /control-optima/barcoder-order
// Query: from,to (YYYY-MM-DD), page, pageSize, search
// Lógica: usa FechaPedido; si no hay filas -> últimos 30 días desde MAX(FechaPedido);
// si aún no hay -> usa FechaEntrega con mismos criterios.
// === DASHBOARD_STATUS_ORDER_VIEW (INLINE sobre OPTIMA_FELMAN) =================
router.get('/barcoder-order', async (req, res) => {
  const { from, to, page = '1', pageSize = '50', search = '' } = req.query;

  // defaults: últimos 30 días
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
const rq = pool.request();
rq.input('from', sql.Date, fromParam);
rq.input('to',   sql.Date, toParam);
rq.input('offset', sql.Int, offset);
rq.input('pageSize', sql.Int, sizeNum);
rq.multiple = true; // 👈 importante para 2 recordsets

    // === SQL inline equivalente a la vista DASHBOARD_STATUS_ORDER_VIEW ===
    const query = `
SET NOCOUNT ON;

WITH V AS ( /* ... igual que antes ... */ )
SELECT *
INTO #B
FROM (
  SELECT
    P.DESCR1       AS RazonSocial,
    P.INDIRI       AS Direccion,
    P.LOCALITA     AS Localidad,
    P.CAP          AS CP,
    P.PROV         AS Prov,
    P.TEL          AS Tel,
    O.RIF          AS Pedido,
    O.STATO        AS EstadoProd,
    O.DATAORD      AS FechaPedido,
    O.DATACONS     AS FechaEntrega,
    O.QTAPZTOT     AS TotPiezas,
    (SELECT SUM(QTADONE) FROM OPTIMA_FELMAN.dbo.ORDMAST OM2 WHERE OM2.ID_ORDINI = O.ID_ORDINI) AS TotPiezasHechas,
    O.NUMPOS       AS TotNumPos,
    O.RIFCLI       AS RefCli,
    O.AVANZ        AS EstadoExp,
    OM.RIGA        AS Linea,
    OM.QTAPZ       AS PiezasLinea,
    OM.QTADONE     AS PiezasLineaHechas,
    OM.STATO       AS EstadoLinea,
    OM.DIMENSIONE_X AS MedX,
    OM.DIMENSIONE_Y AS MedY,
    OM.DESCR_MAT_DOC AS DescrLinea,
    OM.N_ULT_BOLLA AS NumBill,
    OM.N_ULT_FATT  AS NumInv,
    IT.RACK        AS Caballete,
    IT.STATO       AS EstadoLinDet,
    /* ... CodDetPadre, CodDet, DescDet, PiezasDet, PiezasHechasDet ... */
    -- (mismo SELECT que ya te di, no lo repito entero para abreviar)
    *
  FROM OPTIMA_FELMAN.dbo.ITEMS IT
  JOIN OPTIMA_FELMAN.dbo.ORDMAST OM ON OM.ID_ORDMAST = IT.ID_ORDMAST
  JOIN OPTIMA_FELMAN.dbo.ORDINI  O  ON O.ID_ORDINI   = OM.ID_ORDINI
  JOIN OPTIMA_FELMAN.dbo.PERSONE P  ON P.ID_PERSONE  = O.ID_PERSONE
  JOIN OPTIMA_FELMAN.dbo.DBASEORDINI DB ON DB.ID_DBASEORDINI = IT.ID_DBASEORDINI
  JOIN OPTIMA_FELMAN.dbo.ANAGRAFICA  ANA ON ANA.ID_ANAGRAFICA = DB.ID_ANAGRAFICA
  WHERE O.ID_TIPICAUDOC = 5
    AND O.AVANZ <> 2
    AND IT.IS_STOCK IS NULL
) V2;

-- META (usando FechaPedido como referencia)
SELECT
  @from AS usedFrom, @to AS usedTo, 'Pedido' AS mode,
  COUNT(*) AS total,
  ISNULL(SUM(TRY_CONVERT(float, TotPiezas   )),0) AS piezas,
  ISNULL(SUM(TRY_CONVERT(float, PiezasLinea )),0) AS piezasLinea,
  ISNULL(SUM(TRY_CONVERT(float, PiezasDet   )),0) AS piezasDet
FROM #B
WHERE (FechaPedido >= @from AND FechaPedido < DATEADD(DAY,1,@to));

-- ITEMS
SELECT *
FROM #B
WHERE (FechaPedido >= @from AND FechaPedido < DATEADD(DAY,1,@to))
ORDER BY FechaPedido DESC
OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
`;

    const result = await rq.query(query);
    const meta  = result.recordsets?.[0]?.[0] || { total: 0, usedFrom: fromParam, usedTo: toParam, mode: 'Pedido', piezas: 0, piezasLinea: 0, piezasDet: 0 };
    const items = result.recordsets?.[1] || [];

    return res.json({
      items,
      page: pageNum,
      pageSize: sizeNum,
      total: meta.total,
      from: fromParam,
      to: toParam,
      usedFrom: meta.usedFrom,
      usedTo: meta.usedTo,
      mode: meta.mode,
      orderBy: 'EventDT',
      orderDir: 'DESC',
      agg: { piezas: meta.piezas, piezasLinea: meta.piezasLinea, piezasDet: meta.piezasDet }
    });
  } catch (err) {
    console.error('❌ /barcoder-order (inline):', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});






// === DASHBOARD_BARCODE_DET_VIEW =================================================
// GET /control-optima/barcoder-det
// Query: from,to (YYYY-MM-DD), page, pageSize, search
// === DASHBOARD_BARCODE_DET_VIEW (INLINE sobre OPTIMA_FELMAN) ==================
router.get('/barcoder-det', async (req, res) => {
  const { from, to, page = '1', pageSize = '50', search = '' } = req.query;

  // defaults últimos 30 días si no envían
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
const rq = pool.request();
rq.input('from', sql.Date, fromParam);
rq.input('to',   sql.Date, toParam);
rq.input('offset', sql.Int, offset);
rq.input('pageSize', sql.Int, sizeNum);
rq.multiple = true; // 👈 importante para 2 recordsets

    // === SQL inline equivalente a la vista DASHBOARD_BARCODE_DET_VIEW ===
    const query = `
SET NOCOUNT ON;

WITH TAULA1 AS ( /* ... igual que antes ... */ ),
TAULA2 AS ( /* ... igual que antes ... */ ),
ROTURAS AS ( /* ... igual que antes ... */ ),
BASE AS (
  SELECT
    LTRIM(RTRIM(STR(ANO))) AS ANO, LTRIM(RTRIM(STR(MES))) AS MES,
    ISNULL(NOMBRE,'') AS NOMBRE,
    PEDIDO, LINEA, DATA_COMPLETE, USERNAME, CENTRO_TRABAJO,
    TRABAJO, DESC_TRABAJO, VIDRIO, N_VIDRIO, ESTADO, DATAHORA_COMPL,
    PIEZAS, DIMXPZR AS MEDIDA_X, DIMYPZR AS MEDIDA_Y, PROGR,
    PRODUCTO, SUM(LONG_TRABAJO) AS LONG_TRABAJO,
    AREA, QTAPZ AS PZ_LIN,
    '' AS RAZON_QUEBRA1, '' AS RAZON_QUEBRA2, '' AS RAZON_QUEBRA3, '' AS TEXT1,
    CAST(0 AS float) AS PREZZO_PZ, ID_DBASEORDINI
  FROM TAULA1
  GROUP BY ANO,MES,NOMBRE,PEDIDO,LINEA,DATA_COMPLETE,USERNAME,CENTRO_TRABAJO,VIDRIO,N_VIDRIO,ESTADO,DATAHORA_COMPL,PIEZAS,DIMXPZR,DIMYPZR,AREA,QTAPZ,PROGR,PRODUCTO,TRABAJO,DESC_TRABAJO,ID_DBASEORDINI

  UNION ALL
  SELECT
    LTRIM(RTRIM(STR(ANO))), LTRIM(RTRIM(STR(MES))), ISNULL(NOMBRE,''), PEDIDO, LINEA, DATA_COMPLETE,
    USERNAME, CENTRO_TRABAJO, TRABAJO, TRABAJO, VIDRIO, N_VIDRIO, ESTADO, DATAHORA_COMPL,
    PIEZAS, DIMXPZR, DIMYPZR, PROGR, PRODUCTO, CAST(0 AS float), AREA, QTAPZ,
    '', '', '', '', CAST(0 AS float), ID_DBASEORDINI
  FROM TAULA2

  UNION ALL
  SELECT
    LTRIM(RTRIM(STR(ANO))), LTRIM(RTRIM(STR(MES))), ISNULL(NOMBRE,''), PEDIDO, LINEA, DATA_COMPLETE,
    USERNAME, CENTRO_TRABAJO, TRABAJO, DESC_TRABAJO, VIDRIO, N_VIDRIO, ESTADO, DATAHORA_COMPL,
    PIEZAS, DIMXPZR, DIMYPZR, PROGR, PRODUCTO, LONG_TRABAJO, AREA, QTAPZ,
    RAZON_QUEBRA1, RAZON_QUEBRA2, RAZON_QUEBRA3, TEXT1, PREZZO_PZ, ID_DBASEORDINI
  FROM ROTURAS
)
SELECT *, COALESCE(DATAHORA_COMPL, CAST(DATA_COMPLETE AS datetime)) AS EventDT
INTO #B
FROM BASE;

-- META
SELECT
  @from AS usedFrom, @to AS usedTo,
  COUNT(*) AS total,
  ISNULL(SUM(TRY_CONVERT(float, PIEZAS)), 0) AS piezas,
  ISNULL(SUM(TRY_CONVERT(float, AREA)),   0) AS area
FROM #B
WHERE (EventDT >= @from AND EventDT < DATEADD(DAY,1,@to));

-- ITEMS
SELECT *
FROM #B
WHERE (EventDT >= @from AND EventDT < DATEADD(DAY,1,@to))
ORDER BY EventDT DESC
OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;
`;

    const result = await request.query(query);
    const meta  = result.recordsets?.[0]?.[0] || { total: 0, piezas: 0, area: 0, usedFrom: fromParam, usedTo: toParam };
    const items = result.recordsets?.[1] || [];

    return res.json({
      items,
      page: pageNum, pageSize: sizeNum,
      total: meta.total,
      from: fromParam, to: toParam,
      usedFrom: meta.usedFrom, usedTo: meta.usedTo,
      orderBy: 'EventDT', orderDir: 'DESC',
      agg: { piezas: meta.piezas, area: meta.area }
    });
  } catch (err) {
    console.error('❌ /barcoder-det (inline):', err);
    return res.status(500).json({ status: 'error', message: err.message });
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







// POST /control-optima/piezas-maquina
router.post("/piezas-maquina", async (req, res) => {
  const { desde, hasta } = req.body;

  if (!desde || !hasta) {
    return res.status(400).json({ error: "Debe indicar 'desde' y 'hasta' (YYYY-MM-DD)" });
  }

  try {
    const pool = await sql.connect({
      user: process.env.DB_USER_OPTIMA,
      password: process.env.DB_PASS_OPTIMA,
      server: process.env.DB_HOST_OPTIMA,
      port: parseInt(process.env.DB_PORT_OPTIMA, 10),
      database: process.env.DB_NAME_OPTIMA, // puede ser Felman_2024; abajo forzamos OPTIMA_FELMAN en FROM
      options: { encrypt: false }
    });

    const query = `
      SET NOCOUNT ON;

DECLARE @d DATETIME = @desde;                      -- 'YYYY-MM-DD' 00:00:00
DECLARE @h DATETIME = DATEADD(DAY, 1, @hasta);     -- exclusivo (hasta + 1 día)

-- 1) BASE: operaciones completadas (sin vistas) + columnas extra solicitadas
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

    -- VIDRIO / N_VIDRIO (excepción para LINEA_FOREL)
    CASE WHEN QH.CDL_NAME = 'LINEA_FOREL' THEN '' ELSE ISNULL(M.CODICE,'') END  AS VIDRIO,
    CASE WHEN QH.CDL_NAME = 'LINEA_FOREL' THEN 0 ELSE FLOOR(OD.ID_DETT/2)+1 END AS N_VIDRIO,

    -- Estado y evento
    CASE WHEN QW.ID_QUEUEREASON IN (1,2) THEN 'COMPLETE' ELSE '' END            AS ESTADO,
    QW.DATEEND                             AS DATAHORA_COMPL,

    -- Métricas pieza
    CAST(1 AS INT)                         AS PIEZAS,
    OD.DIMXPZR                             AS MEDIDA_X,
    OD.DIMYPZR                             AS MEDIDA_Y,
    CAST(OD.DIMXPZR*OD.DIMYPZR/1000000.0 AS decimal(18,6)) AS AREA,
    OM.QTAPZ                               AS PZ_LIN,

    -- Extra solicitados
    QW.PROGR                               AS PROGR,       -- PROGR: 2, etc.
    PR.RIF                                 AS PRODUCTO,    -- código de producto

    -- Claves y tiempos base
    QW.ID_ITEMS,
    QW.ID_ORDDETT,
    O.ID_ORDINI,
    QW.DATESTART                           AS FECHA_INICIO_OP,
    QW.DATEEND                             AS FECHA_FIN_OP,
    O.DATAORD                              AS FECHA_PEDIDO,
    O.DATACONS                             AS FECHA_ENTREGA_PROG,

    -- Instante de evento para ordenar/filtrar (end/start/broken – como fallback)
    COALESCE(QW.DATEEND, QW.DATESTART, QW.DATEBROKEN)     AS EVENTDT
  FROM OPTIMA_FELMAN.dbo.QUEUEWORK    AS QW   WITH (NOLOCK)
  JOIN OPTIMA_FELMAN.dbo.QUEUEHEADER  AS QH   WITH (NOLOCK) ON QH.ID_QUEUEHEADER = QW.ID_QUEUEHEADER
  JOIN OPTIMA_FELMAN.dbo.WORKKIND     AS WK   WITH (NOLOCK) ON WK.ID_WORKKIND    = QW.ID_WORKKIND
  JOIN OPTIMA_FELMAN.dbo.ORDMAST      AS OM   WITH (NOLOCK) ON OM.ID_ORDMAST     = QW.ID_ORDMAST
  JOIN OPTIMA_FELMAN.dbo.ORDINI       AS O    WITH (NOLOCK) ON O.ID_ORDINI       = OM.ID_ORDINI
  JOIN OPTIMA_FELMAN.dbo.ORDDETT      AS OD   WITH (NOLOCK) ON OD.ID_ORDDETT     = QW.ID_ORDDETT
  LEFT JOIN OPTIMA_FELMAN.dbo.MAGAZ   AS M    WITH (NOLOCK) ON M.ID_MAGAZ        = OD.ID_MAGAZ
  LEFT JOIN OPTIMA_FELMAN.dbo.ITEMS   AS IT   WITH (NOLOCK) ON IT.ID_ITEMS       = QW.ID_ITEMS
  LEFT JOIN OPTIMA_FELMAN.dbo.DBASEORDINI AS DB WITH (NOLOCK) ON DB.ID_DBASEORDINI = IT.ID_DBASEORDINI
  LEFT JOIN OPTIMA_FELMAN.dbo.PRODOTTI     AS PR WITH (NOLOCK) ON PR.ID_PRODOTTI   = OM.ID_PRODOTTI
  WHERE QW.ID_QUEUEREASON IN (1,2)                -- operaciones reales
    AND QW.ID_QUEUEREASON_COMPLETE = 20           -- completadas
),

-- 2) Pedidos con al menos un evento dentro del rango (>= @d y < @h)
PEDIDOS_EN_RANGO AS (
  SELECT DISTINCT b.PEDIDO
  FROM BASE b
  WHERE b.EVENTDT >= @d
    AND b.EVENTDT <  @h
),

-- 3) ORDEN: lag por pedido/linea/pieza para tiempos de espera y entre operaciones
ORDEN AS (
  SELECT
    b.*,
    LAG(b.EVENTDT) OVER (
      PARTITION BY b.PEDIDO, b.LINEA, b.ID_ITEMS
      ORDER BY b.EVENTDT
    ) AS PREV_EVENTDT
  FROM BASE b
  WHERE b.PEDIDO IN (SELECT PEDIDO FROM PEDIDOS_EN_RANGO)
)

-- 4) SALIDA FINAL (incluye campos solicitados)
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
  MEDIDA_X,
  MEDIDA_Y,
  PROGR,
  PRODUCTO,

  ESTADO,
  DATAHORA_COMPL,
  PIEZAS,
  AREA,
  PZ_LIN,

  -- tiempos derivados (segundos)
  CASE WHEN FECHA_INICIO_OP IS NOT NULL AND FECHA_FIN_OP IS NOT NULL
       THEN DATEDIFF(SECOND, FECHA_INICIO_OP, FECHA_FIN_OP) END AS t_trabajo_seg,
  CASE WHEN PREV_EVENTDT IS NOT NULL AND FECHA_INICIO_OP IS NOT NULL
       THEN DATEDIFF(SECOND, PREV_EVENTDT, FECHA_INICIO_OP) END AS t_espera_prev_maquina_seg,
  CASE WHEN PREV_EVENTDT IS NOT NULL
       THEN DATEDIFF(SECOND, PREV_EVENTDT, EVENTDT) END AS t_entre_operaciones_seg,
  CASE WHEN FECHA_PEDIDO IS NOT NULL
       THEN DATEDIFF(SECOND, FECHA_PEDIDO, EVENTDT) END AS t_desde_pedido_seg,
  CASE WHEN FECHA_ENTREGA_PROG IS NOT NULL
       THEN DATEDIFF(SECOND, EVENTDT, FECHA_ENTREGA_PROG) END AS t_hasta_entrega_prog_seg,

  -- ciclo total de la pieza dentro del pedido/linea
  DATEDIFF(
    SECOND,
    MIN(EVENTDT) OVER (PARTITION BY PEDIDO, LINEA, ID_ITEMS),
    MAX(EVENTDT) OVER (PARTITION BY PEDIDO, LINEA, ID_ITEMS)
  ) AS t_ciclo_pieza_total_seg,

  -- extras/ids y timestamps crudos
  ID_ITEMS,
  ID_ORDDETT,
  ID_ORDINI,
  EVENTDT,
  FECHA_INICIO_OP,
  FECHA_FIN_OP,
  FECHA_PEDIDO,
  FECHA_ENTREGA_PROG
FROM ORDEN
ORDER BY PEDIDO, LINEA, EVENTDT;
    `;

    const result = await pool.request()
      .input("desde", sql.DateTime, new Date(`${desde}T00:00:00`))
      .input("hasta", sql.DateTime, new Date(`${hasta}T00:00:00`))
      .query(query);

    return res.json(result.recordset ?? []);
  } catch (err) {
    console.error("Error en /piezas-maquina:", err);
    return res.status(500).json({ error: "Error interno en el servidor" });
  }
});














module.exports = router;
