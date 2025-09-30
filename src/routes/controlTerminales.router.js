const express = require("express");
const pool = require("../config/databaseTerminales");
const logger = require('../utils/logger');

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


router.get("/inicio", async (req, res) => {
  try {
    const [result] = await pool.execute("SHOW TABLES");
    res.status(200).json(result);
  } catch (error) {
    console.error("❌ ERROR EN /control-terminales/inicio:", error);
    res.status(500).json({
      status: "error",
      message: "Error interno del servidor",
      detail: error.message, // Esto te mostrará el error exacto
    });
  }
});

// 1) /lotes → Num. manual, Fabricado, % Comp. y Cargado
router.get("/lotes", async (req, res) => {
  try {
    const [result] = await pool.execute(`
      SELECT
        Fabricado,
        FabricadoFecha,
        FechaRealInicio,
        Descripcion,
        TotalTiempo,
        NumeroManual,
        -- Tareas finales 1–15
        TareaFinal01,  TareaFinal02,  TareaFinal03,  TareaFinal04,  TareaFinal05,
        TareaFinal06,  TareaFinal07,  TareaFinal08,  TareaFinal09,  TareaFinal10,
        TareaFinal11,  TareaFinal12,  TareaFinal13,  TareaFinal14,  TareaFinal15,
        -- Indicadores de finalización 1–15
        TareaFinalizada01,  TareaFinalizada02,  TareaFinalizada03,  TareaFinalizada04,  TareaFinalizada05,
        TareaFinalizada06,  TareaFinalizada07,  TareaFinalizada08,  TareaFinalizada09,  TareaFinalizada10,
        TareaFinalizada11,  TareaFinalizada12,  TareaFinalizada13,  TareaFinalizada14,  TareaFinalizada15,
        -- Fechas de inicio de tarea 1–15
        TareaInicio01,  TareaInicio02,  TareaInicio03,  TareaInicio04,  TareaInicio05,
        TareaInicio06,  TareaInicio07,  TareaInicio08,  TareaInicio09,  TareaInicio10,
        TareaInicio11,  TareaInicio12,  TareaInicio13,  TareaInicio14,  TareaInicio15,
        TotalUnidades
      FROM terminales.lotes
    `);
    res.json(result);
  } catch (error) {
    console.error("❌ ERROR EN /control-terminales/lotes:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// src/routes/controlTerminales.router.js

// 2) loteslineas — usando CódigoTarea01–15 y TareaInicio01–15
router.get("/loteslineas", async (req, res) => {
  const { num_manual } = req.query;
  if (!num_manual)
    return res
      .status(400)
      .json({ status: "error", message: "Falta num_manual" });

  const sql = `
      SELECT
      Fabricada,
        Modulo                                    AS Módulo,
        CodigoTarea01                             AS \`Tarea General 1\`,
        CodigoTarea02                             AS \`Tarea General 2\`,
        CodigoTarea03                             AS \`Tarea General 3\`,
        CodigoTarea04                             AS \`Tarea General 4\`,
        CodigoTarea05                             AS \`Tarea General 5\`,
        CodigoTarea06                             AS \`Tarea General 6\`,
        CodigoTarea07                             AS \`Tarea General 7\`,
        CodigoTarea08                             AS \`Tarea General 8\`,
        CodigoTarea09                             AS \`Tarea General 9\`,
        CodigoTarea10                             AS \`Tarea General 10\`,
        CodigoTarea11                             AS \`Tarea General 11\`,
        CodigoTarea12                             AS \`Tarea General 12\`,
        CodigoTarea13                             AS \`Tarea General 13\`,
        CodigoTarea14                             AS \`Tarea General 14\`,
        CodigoTarea15                             AS \`Tarea General 15\`,
        TareaInicio01   AS \`Inicia 1\`,  TareaFinal01   AS \`Final 1\`,
        TareaInicio02   AS \`Inicia 2\`,  TareaFinal02   AS \`Final 2\`,
        TareaInicio03   AS \`Inicia 3\`,  TareaFinal03   AS \`Final 3\`,
        TareaInicio04   AS \`Inicia 4\`,  TareaFinal04   AS \`Final 4\`,
        TareaInicio05   AS \`Inicia 5\`,  TareaFinal05   AS \`Final 5\`,
        TareaInicio06   AS \`Inicia 6\`,  TareaFinal06   AS \`Final 6\`,
        TareaInicio07   AS \`Inicia 7\`,  TareaFinal07   AS \`Final 7\`,
        TareaInicio08   AS \`Inicia 8\`,  TareaFinal08   AS \`Final 8\`,
        TareaInicio09   AS \`Inicia 9\`,  TareaFinal09   AS \`Final 9\`,
        TareaInicio10   AS \`Inicia 10\`, TareaFinal10   AS \`Final 10\`,
        TareaInicio11   AS \`Inicia 11\`, TareaFinal11   AS \`Final 11\`,
        TareaInicio12   AS \`Inicia 12\`, TareaFinal12   AS \`Final 12\`,
        TareaInicio13   AS \`Inicia 13\`, TareaFinal13   AS \`Final 13\`,
        TareaInicio14   AS \`Inicia 14\`, TareaFinal14   AS \`Final 14\`,
        TareaInicio15   AS \`Inicia 15\`, TareaFinal15   AS \`Final 15\`
      FROM terminales.loteslineas
      WHERE FabricacionNumeroManual = ?`;

  try {
    const [rows] = await pool.execute(sql, [num_manual]);
    res.json(rows);
  } catch (err) {
    console.error("❌ /loteslineas:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// 3) lotesfabricaciones — sólo CodigoTarea1–10 y tiempos Inicia/Final 1–15
router.get("/lotesfabricaciones", async (req, res) => {
  const { num_manual, modulo } = req.query;
  if (!num_manual || !modulo) {
    return res.status(400).json({
      status: "error",
      message: "Faltan parámetros num_manual y/o modulo",
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT
           LL.Modulo                                    AS Módulo,
           LF.CodigoTarea1       AS \`Tarea General 1\`,  LF.TC1  AS \`Inicia 1\`,  LF.TPO1 AS \`Final 1\`,
           LF.CodigoTarea2       AS \`Tarea General 2\`,  LF.TC2  AS \`Inicia 2\`,  LF.TPO2 AS \`Final 2\`,
           LF.CodigoTarea3       AS \`Tarea General 3\`,  LF.TC3  AS \`Inicia 3\`,  LF.TPO3 AS \`Final 3\`,
           LF.CodigoTarea4       AS \`Tarea General 4\`,  LF.TC4  AS \`Inicia 4\`,  LF.TPO4 AS \`Final 4\`,
           LF.CodigoTarea5       AS \`Tarea General 5\`,  LF.TC5  AS \`Inicia 5\`,  LF.TPO5 AS \`Final 5\`,
           LF.CodigoTarea6       AS \`Tarea General 6\`,  LF.TC6  AS \`Inicia 6\`,  LF.TPO6 AS \`Final 6\`,
           LF.CodigoTarea7       AS \`Tarea General 7\`,  LF.TC7  AS \`Inicia 7\`,  LF.TPO7 AS \`Final 7\`,
           LF.CodigoTarea8       AS \`Tarea General 8\`,  LF.TC8  AS \`Inicia 8\`,  LF.TPO8 AS \`Final 8\`,
           LF.CodigoTarea9       AS \`Tarea General 9\`,  LF.TC9  AS \`Inicia 9\`,  LF.TPO9 AS \`Final 9\`,
           LF.CodigoTarea10      AS \`Tarea General 10\`, LF.TC10 AS \`Inicia 10\`, LF.TPO10 AS \`Final 10\`,
           LF.TC11               AS \`Inicia 11\`,       LF.TPO11 AS \`Final 11\`,
           LF.TC12               AS \`Inicia 12\`,       LF.TPO12 AS \`Final 12\`,
           LF.TC13               AS \`Inicia 13\`,       LF.TPO13 AS \`Final 13\`,
           LF.TC14               AS \`Inicia 14\`,       LF.TPO14 AS \`Final 14\`,
           LF.TC15               AS \`Inicia 15\`,       LF.TPO15 AS \`Final 15\`
         FROM terminales.lotesfabricaciones LF
         JOIN terminales.loteslineas       LL
           ON LF.NumeroManual     = LL.FabricacionNumeroManual
          AND LF.FabricacionSerie = LL.FabricacionSerie
         WHERE LF.NumeroManual = ?
           AND LL.Modulo       = ?`,
      [num_manual, modulo]
    );
    res.status(200).json(rows);
  } catch (error) {
    console.error("❌ ERROR EN /lotesfabricaciones:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

//tiempo acumulado de las tareas de un lote
router.get("/tiempos-acumulados", async (req, res) => {
  const sql = `
    SELECT Modulo, 1 AS NumeroTarea, TiempoAcumulado01 AS TiempoAcumulado FROM terminales.loteslineas WHERE TiempoAcumulado01 IS NOT NULL
    UNION ALL
    SELECT Modulo, 2, TiempoAcumulado02 FROM terminales.loteslineas WHERE TiempoAcumulado02 IS NOT NULL
    UNION ALL
    SELECT Modulo, 3, TiempoAcumulado03 FROM terminales.loteslineas WHERE TiempoAcumulado03 IS NOT NULL
    UNION ALL
    SELECT Modulo, 4, TiempoAcumulado04 FROM terminales.loteslineas WHERE TiempoAcumulado04 IS NOT NULL
    UNION ALL
    SELECT Modulo, 5, TiempoAcumulado05 FROM terminales.loteslineas WHERE TiempoAcumulado05 IS NOT NULL
    UNION ALL
    SELECT Modulo, 6, TiempoAcumulado06 FROM terminales.loteslineas WHERE TiempoAcumulado06 IS NOT NULL
    UNION ALL
    SELECT Modulo, 7, TiempoAcumulado07 FROM terminales.loteslineas WHERE TiempoAcumulado07 IS NOT NULL
    UNION ALL
    SELECT Modulo, 8, TiempoAcumulado08 FROM terminales.loteslineas WHERE TiempoAcumulado08 IS NOT NULL
    UNION ALL
    SELECT Modulo, 9, TiempoAcumulado09 FROM terminales.loteslineas WHERE TiempoAcumulado09 IS NOT NULL
    UNION ALL
    SELECT Modulo, 10, TiempoAcumulado10 FROM terminales.loteslineas WHERE TiempoAcumulado10 IS NOT NULL
    UNION ALL
    SELECT Modulo, 11, TiempoAcumulado11 FROM terminales.loteslineas WHERE TiempoAcumulado11 IS NOT NULL
    UNION ALL
    SELECT Modulo, 12, TiempoAcumulado12 FROM terminales.loteslineas WHERE TiempoAcumulado12 IS NOT NULL
    UNION ALL
    SELECT Modulo, 13, TiempoAcumulado13 FROM terminales.loteslineas WHERE TiempoAcumulado13 IS NOT NULL
    UNION ALL
    SELECT Modulo, 14, TiempoAcumulado14 FROM terminales.loteslineas WHERE TiempoAcumulado14 IS NOT NULL
    UNION ALL
    SELECT Modulo, 15, TiempoAcumulado15 FROM terminales.loteslineas WHERE TiempoAcumulado15 IS NOT NULL
    UNION ALL
    SELECT Modulo, 16, TiempoAcumulado16 FROM terminales.loteslineas WHERE TiempoAcumulado16 IS NOT NULL
    UNION ALL
    SELECT Modulo, 17, TiempoAcumulado17 FROM terminales.loteslineas WHERE TiempoAcumulado17 IS NOT NULL
    UNION ALL
    SELECT Modulo, 18, TiempoAcumulado18 FROM terminales.loteslineas WHERE TiempoAcumulado18 IS NOT NULL
    UNION ALL
    SELECT Modulo, 19, TiempoAcumulado19 FROM terminales.loteslineas WHERE TiempoAcumulado19 IS NOT NULL
    UNION ALL
    SELECT Modulo, 20, TiempoAcumulado20 FROM terminales.loteslineas WHERE TiempoAcumulado20 IS NOT NULL
    ORDER BY Modulo, NumeroTarea;
  `;

  try {
    const [rows] = await pool.execute(sql);
    res.json(rows);
  } catch (err) {
    console.error("❌ /loteslineas/tiempos-acumulados:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// 4timpo acumulado por numero manual y modulo
router.get("/tiempos-acumulados-modulo", async (req, res) => {
  const { num_manual, modulo } = req.query;

  if (!num_manual || !modulo) {
    return res.status(400).json({
      status: "error",
      message: "Faltan parámetros: num_manual o modulo",
    });
  }

  const sql = `
  SELECT Modulo, 1 AS NumeroTarea, TiempoAcumulado01 AS TiempoAcumulado FROM terminales.loteslineas 
  WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado01 IS NOT NULL
  UNION ALL
  SELECT Modulo, 2, TiempoAcumulado02 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado02 IS NOT NULL
  UNION ALL
  SELECT Modulo, 3, TiempoAcumulado03 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado03 IS NOT NULL
  UNION ALL
  SELECT Modulo, 4, TiempoAcumulado04 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado04 IS NOT NULL
  UNION ALL
  SELECT Modulo, 5, TiempoAcumulado05 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado05 IS NOT NULL
  UNION ALL
  SELECT Modulo, 6, TiempoAcumulado06 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado06 IS NOT NULL
  UNION ALL
  SELECT Modulo, 7, TiempoAcumulado07 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado07 IS NOT NULL
  UNION ALL
  SELECT Modulo, 8, TiempoAcumulado08 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado08 IS NOT NULL
  UNION ALL
  SELECT Modulo, 9, TiempoAcumulado09 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado09 IS NOT NULL
  UNION ALL
  SELECT Modulo, 10, TiempoAcumulado10 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado10 IS NOT NULL
  UNION ALL
  SELECT Modulo, 11, TiempoAcumulado11 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado11 IS NOT NULL
  UNION ALL
  SELECT Modulo, 12, TiempoAcumulado12 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado12 IS NOT NULL
  UNION ALL
  SELECT Modulo, 13, TiempoAcumulado13 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado13 IS NOT NULL
  UNION ALL
  SELECT Modulo, 14, TiempoAcumulado14 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado14 IS NOT NULL
  UNION ALL
  SELECT Modulo, 15, TiempoAcumulado15 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado15 IS NOT NULL
  UNION ALL
  SELECT Modulo, 16, TiempoAcumulado16 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado16 IS NOT NULL
  UNION ALL
  SELECT Modulo, 17, TiempoAcumulado17 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado17 IS NOT NULL
  UNION ALL
  SELECT Modulo, 18, TiempoAcumulado18 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado18 IS NOT NULL
  UNION ALL
  SELECT Modulo, 19, TiempoAcumulado19 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado19 IS NOT NULL
  UNION ALL
  SELECT Modulo, 20, TiempoAcumulado20 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado20 IS NOT NULL
  ORDER BY NumeroTarea
`;

  const params = [];
  for (let i = 1; i <= 20; i++) {
    params.push(num_manual, modulo);
  }

  try {
    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ /control-terminales/tiempos-acumulados:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// GET /control-terminales/tiempo-real
// Trae todas las filas de vpartestodo filtrando por la fecha de hoy
router.get('/tiempo-real', async (req, res) => {
  console.log('PETICION para tiempo-real TERMINALES');
  try {
    const sql = `SELECT * FROM vpartestodo WHERE Fecha = CURDATE() ORDER BY FechaInicio, HoraInicio;`;
    const [rows] = await pool.execute(sql);
  res.status(200).json(rows);
  } catch (error) {
    console.error('❌ ERROR EN /control-terminales/tiempo-real:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});


router.get('/tiempo-real-nueva', async (req, res) => {
  console.log('PETICION para tiempo-real TERMINALES');
  try {
    const sql = `
      SELECT
          h.Serie, h.Numero, h.Fecha, h.CodigoOperario, h.OperarioNombre, h.Tipo,
          h.Gastos1, h.Gastos2, h.Kms1, h.Kms2,
          hl.CodigoSerie, hl.CodigoNumero, hl.Linea,
          hl.FechaInicio, hl.HoraInicio, hl.FechaFin, hl.HoraFin,
          hl.CodigoPuesto, hl.CodigoTarea,
          hl.ObraSerie, hl.ObraNumero,
          hl.FabricacionSerie, hl.FabricacionNumero, hl.FabricacionLinea,
          hl.NumeroManual, hl.CodigoLote, hl.LoteLinea, hl.Modulo,
          hl.TiempoDedicado, hl.Abierta, hl.TipoTarea
      FROM hpartes h
      JOIN hparteslineas hl
        ON h.Serie = hl.CodigoSerie
       AND h.Numero = hl.CodigoNumero
      WHERE h.Fecha = CURDATE()

      UNION   -- sin ALL para deduplicar

      SELECT
          p.Serie, p.Numero, p.Fecha, p.CodigoOperario, p.OperarioNombre, p.Tipo,
          p.Gastos1, p.Gastos2, p.Kms1, p.Kms2,
          pl.CodigoSerie, pl.CodigoNumero, pl.Linea,
          pl.FechaInicio, pl.HoraInicio, pl.FechaFin, pl.HoraFin,
          pl.CodigoPuesto, pl.CodigoTarea,
          pl.ObraSerie, pl.ObraNumero,
          pl.FabricacionSerie, pl.FabricacionNumero, pl.FabricacionLinea,
          pl.NumeroManual, pl.CodigoLote, pl.LoteLinea, pl.Modulo,
          pl.TiempoDedicado, pl.Abierta, pl.TipoTarea
      FROM partes p
      JOIN parteslineas pl
        ON p.Serie = pl.CodigoSerie
       AND p.Numero = pl.CodigoNumero
      WHERE p.Fecha = CURDATE()

      ORDER BY FechaInicio, HoraInicio;
    `;

    const [rows] = await pool.execute(sql);
    res.status(200).json(rows);
  } catch (error) {
    console.error('❌ ERROR EN /control-terminales/tiempo-real-nueva:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

  // GET /control-terminales/production-analytics?start=YYYY-MM-DD&end=YYYY-MM-DD
// GET /control-terminales/production-analytics?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/production-analytics', async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ status: 'error', message: 'Faltan parámetros start y end' });
  }

  try {
    const sql = `
      SELECT
          h.Serie, h.Numero, h.Fecha, h.CodigoOperario, h.OperarioNombre, h.Tipo,
          h.Gastos1, h.Gastos2, h.Kms1, h.Kms2,
          hl.CodigoSerie, hl.CodigoNumero, hl.Linea,
          hl.FechaInicio, hl.HoraInicio, hl.FechaFin, hl.HoraFin,
          hl.CodigoPuesto, hl.CodigoTarea,
          hl.ObraSerie, hl.ObraNumero,
          hl.FabricacionSerie, hl.FabricacionNumero, hl.FabricacionLinea,
          hl.NumeroManual, hl.CodigoLote, hl.LoteLinea, hl.Modulo,
          hl.TiempoDedicado, hl.Abierta, hl.TipoTarea
      FROM hpartes h
      JOIN hparteslineas hl
        ON h.Serie = hl.CodigoSerie
       AND h.Numero = hl.CodigoNumero
      WHERE h.Fecha BETWEEN ? AND ?

      UNION

      SELECT
          p.Serie, p.Numero, p.Fecha, p.CodigoOperario, p.OperarioNombre, p.Tipo,
          p.Gastos1, p.Gastos2, p.Kms1, p.Kms2,
          pl.CodigoSerie, pl.CodigoNumero, pl.Linea,
          pl.FechaInicio, pl.HoraInicio, pl.FechaFin, pl.HoraFin,
          pl.CodigoPuesto, pl.CodigoTarea,
          pl.ObraSerie, pl.ObraNumero,
          pl.FabricacionSerie, pl.FabricacionNumero, pl.FabricacionLinea,
          pl.NumeroManual, pl.CodigoLote, pl.LoteLinea, pl.Modulo,
          pl.TiempoDedicado, pl.Abierta, pl.TipoTarea
      FROM partes p
      JOIN parteslineas pl
        ON p.Serie = pl.CodigoSerie
       AND p.Numero = pl.CodigoNumero
      WHERE p.Fecha BETWEEN ? AND ?

      ORDER BY FechaInicio, HoraInicio;
    `;

    const [rows] = await pool.execute(sql, [start, end, start, end]);
    res.status(200).json(rows);
  } catch (error) {
    console.error('❌ ERROR EN /control-terminales/production-analytics:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// GET /control-terminales/production-analytics sin fecha
router.get('/production-analytics-sin-fechas', async (req, res) => {
  try {
    const sql = `
      SELECT
          h.Serie, h.Numero, h.Fecha, h.CodigoOperario, h.OperarioNombre, h.Tipo,
          h.Gastos1, h.Gastos2, h.Kms1, h.Kms2,
          hl.CodigoSerie, hl.CodigoNumero, hl.Linea,
          hl.FechaInicio, hl.HoraInicio, hl.FechaFin, hl.HoraFin,
          hl.CodigoPuesto, hl.CodigoTarea,
          hl.ObraSerie, hl.ObraNumero,
          hl.FabricacionSerie, hl.FabricacionNumero, hl.FabricacionLinea,
          hl.NumeroManual, hl.CodigoLote, hl.LoteLinea, hl.Modulo,
          hl.TiempoDedicado, hl.Abierta, hl.TipoTarea
      FROM hpartes h
      JOIN hparteslineas hl
        ON h.Serie = hl.CodigoSerie
       AND h.Numero = hl.CodigoNumero
     

      UNION

      SELECT
          p.Serie, p.Numero, p.Fecha, p.CodigoOperario, p.OperarioNombre, p.Tipo,
          p.Gastos1, p.Gastos2, p.Kms1, p.Kms2,
          pl.CodigoSerie, pl.CodigoNumero, pl.Linea,
          pl.FechaInicio, pl.HoraInicio, pl.FechaFin, pl.HoraFin,
          pl.CodigoPuesto, pl.CodigoTarea,
          pl.ObraSerie, pl.ObraNumero,
          pl.FabricacionSerie, pl.FabricacionNumero, pl.FabricacionLinea,
          pl.NumeroManual, pl.CodigoLote, pl.LoteLinea, pl.Modulo,
          pl.TiempoDedicado, pl.Abierta, pl.TipoTarea
      FROM partes p
      JOIN parteslineas pl
        ON p.Serie = pl.CodigoSerie
       AND p.Numero = pl.CodigoNumero
     

      ORDER BY FechaInicio, HoraInicio;
    `;

    const [rows] = await pool.execute(sql);
    res.status(200).json(rows);
  } catch (error) {
    console.error('❌ ERROR EN /control-terminales/production-analytics-sin-fechas:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});



// GET /control-terminales/pedidos-en-fabrica
// Solo trae pedidos ACTIVOS (partes + parteslineas), NO histórico
router.get('/pedidos-en-fabrica', async (req, res) => {
  try {
    const sql = `
      SELECT
          p.Serie, p.Numero, p.Fecha, 
          p.CodigoOperario, p.OperarioNombre,
          pl.CodigoSerie, pl.CodigoNumero, pl.Linea,
          pl.FechaInicio, pl.HoraInicio, 
          pl.FechaFin, pl.HoraFin,
          pl.CodigoPuesto, pl.CodigoTarea,
          pl.FabricacionSerie, 
          pl.FabricacionNumero, 
          pl.FabricacionLinea,
          pl.NumeroManual, 
          pl.Modulo,
          pl.TiempoDedicado, 
          pl.Abierta
      FROM partes p
      JOIN parteslineas pl
        ON p.Serie = pl.CodigoSerie
       AND p.Numero = pl.CodigoNumero
      WHERE pl.NumeroManual IS NOT NULL
        AND pl.NumeroManual != ''
      ORDER BY p.Fecha DESC, pl.FechaInicio DESC;
    `;

    const [rows] = await pool.execute(sql);
    res.status(200).json(rows);
  } catch (error) {
    console.error('❌ ERROR EN /pedidos-en-fabrica:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});




///////////////////////////////////////////////////////////////////////////////////////////////
// GET /control-terminales/lotes/columns
router.get("/lotes/columns", async (req, res) => {
  try {
    const [cols] = await pool.execute(
      `SELECT COLUMN_NAME
         FROM information_schema.columns
         WHERE table_schema = 'terminales'
           AND table_name   = 'lotes'
         ORDER BY ORDINAL_POSITION`
    );
    res.status(200).json(cols.map((c) => c.COLUMN_NAME));
  } catch (error) {
    console.error("❌ ERROR EN /lotes/columns:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// GET /control-terminales/loteslineas/columns
router.get("/loteslineas/columns", async (req, res) => {
  try {
    const [cols] = await pool.execute(
      `SELECT COLUMN_NAME
         FROM information_schema.columns
         WHERE table_schema = 'terminales'
           AND table_name   = 'loteslineas'
         ORDER BY ORDINAL_POSITION`
    );
    res.status(200).json(cols.map((c) => c.COLUMN_NAME));
  } catch (error) {
    console.error("❌ ERROR EN /loteslineas/columns:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// GET /control-terminales/lotesfabricaciones/columns
router.get("/lotesfabricaciones/columns", async (req, res) => {
  try {
    const [cols] = await pool.execute(
      `SELECT COLUMN_NAME
         FROM information_schema.columns
         WHERE table_schema = 'terminales'
           AND table_name   = 'lotesfabricaciones'
         ORDER BY ORDINAL_POSITION`
    );
    res.status(200).json(cols.map((c) => c.COLUMN_NAME));
  } catch (error) {
    console.error("❌ ERROR EN /lotesfabricaciones/columns:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});


// ...existing code...
// Reporte completo para un NumeroManual
// Reporte completo para un NumeroManual
// Reporte completo para un NumeroManual
// Reporte completo para un NumeroManual
// Reporte completo para un NumeroManual
// Reporte completo para un NumeroManual
// Reporte completo para un NumeroManual
// Reporte completo para un NumeroManual
// Reporte completo para un NumeroManual

// Reporte completo para un NumeroManual
// Reporte completo para un NumeroManual
// Reporte completo para un NumeroManual
// Reporte completo para un NumeroManual
// Reporte completo para un NumeroManual

// Reporte completo para un NumeroManual
router.get('/reporte', async (req, res) => {
  const { num_manual } = req.query;
  if (!num_manual) {
    return res.status(400).json({ status: 'error', message: 'Falta num_manual' });
  }

  try {
    // Obtener Codigo de lote a partir de NumeroManual
    const [loteRows] = await pool.execute(
      'SELECT Codigo FROM lotes WHERE NumeroManual = ? LIMIT 1',
      [num_manual]
    );

    if (loteRows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Lote no encontrado para el NumeroManual proporcionado' });
    }

    const codigoLote = loteRows[0].Codigo;

    // A) Quién trabajó
    const [quienTrabajo] = await pool.execute(
      `SELECT CodigoOperario, OperarioNombre
       FROM vw_operarios_por_lote
       WHERE CodigoLote = ?
       ORDER BY OperarioNombre`,
      [codigoLote]
    );

    // B) Tiempos por operario y tarea
    const [tiemposPorOperario] = await pool.execute(
      `SELECT OperarioNombre, CodigoOperario, Tarea, SegundosDedicados, HH_MM_SS
       FROM vw_tiempos_por_operario_lote
       WHERE CodigoLote = ?
       ORDER BY OperarioNombre, Tarea`,
      [codigoLote]
    );

    // C) Actividades abiertas ahora mismo
    const [activasAhora] = await pool.execute(
      `SELECT OperarioNombre, CodigoOperario, CodigoTarea, FechaInicio, HoraInicio, Abierta
       FROM vw_abiertas_por_lote
       WHERE CodigoLote = ?
       ORDER BY FechaInicio, HoraInicio`,
      [codigoLote]
    );

    // D) Línea de tiempo completa
    const [timeline] = await pool.execute(
      `SELECT OperarioNombre, CodigoOperario, CodigoTarea,
              FechaInicio, HoraInicio, FechaFin, HoraFin, TiempoDedicado
       FROM vw_timeline
       WHERE CodigoLote = ?
       ORDER BY CONCAT(FechaInicio, ' ', HoraInicio), Linea`,
      [codigoLote]
    );

    // E) Operarios actualmente “enganchados” al lote (estado operativo)
    const [operariosEnganchados] = await pool.execute(
      `SELECT Codigo, Nombre, CodigoTareaActual, Momento
       FROM operarios
       WHERE LoteActual = ?
       ORDER BY Nombre`,
      [codigoLote]
    );

    return res.status(200).json({
      status: 'ok',
      num_manual,
      codigoLote,
      reporte: {
        quienTrabajo,
        tiemposPorOperario,
        activasAhora,
        timeline,
        operariosEnganchados,
      },
    });
  } catch (error) {
    console.error('❌ ERROR EN /control-terminales/reporte:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});


router.get('/tiempos-operario-lote', async (req, res) => {
  const { num_manual } = req.query;
  if (!num_manual) {
    return res.status(400).json({ status: 'error', message: 'Falta num_manual' });
  }

  const sql = `
    SELECT
      OperarioNombre,
      CodigoOperario,
      COALESCE(CodigoTarea,'(SIN TAREA)') AS Tarea,
      SUM(COALESCE(TiempoDedicado,0))    AS SegundosDedicados,
      SEC_TO_TIME(SUM(COALESCE(TiempoDedicado,0))) AS HH_MM_SS
    FROM vpartestodo
    WHERE CodigoLote = (SELECT Codigo FROM lotes WHERE NumeroManual = ?)
    GROUP BY OperarioNombre, CodigoOperario, CodigoTarea
    ORDER BY OperarioNombre, Tarea
  `;

  try {
    const [rows] = await pool.execute(sql, [num_manual]);
    res.status(200).json(rows);
  } catch (error) {
    console.error('❌ ERROR EN /control-terminales/tiempos-por-operario:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

router.get('/historico-operarios-lotes-actuales', async (req, res) => {
  const sql = `
    SELECT
      v.OperarioNombre,
      COALESCE(v.CodigoTarea,'(SIN TAREA)') AS Tarea,
      COUNT(*)                      AS Registros,
      COUNT(DISTINCT v.CodigoLote)  AS LotesDistintos,
      ROUND(SUM(COALESCE(v.TiempoDedicado,0))/86400, 2) AS DiasTotales
    FROM vpartestodo v
    INNER JOIN lotes l
      ON v.CodigoLote = l.Codigo
    GROUP BY v.OperarioNombre, v.CodigoTarea
    ORDER BY v.OperarioNombre, Tarea
  `;

  try {
    const [rows] = await pool.execute(sql);
    res.status(200).json(rows);
  } catch (error) {
    console.error('❌ ERROR EN /control-terminales/operarios-por-lotes-actuales:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
