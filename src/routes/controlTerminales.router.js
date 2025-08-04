const express = require('express');
const pool = require('../config/databaseTerminales');

const router = express.Router();

router.get('/inicio', async (req, res) => {
  try {
    const [result] = await pool.execute('SHOW TABLES');
    res.status(200).json(result);
  } catch (error) {
    console.error('❌ ERROR EN /control-terminales/inicio:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor',
      detail: error.message, // Esto te mostrará el error exacto
    });
  }
});










// 1) /lotes → Num. manual, Fabricado, % Comp. y Cargado
router.get('/lotes', async (req, res) => {
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
    console.error('❌ ERROR EN /control-terminales/lotes:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

  
// src/routes/controlTerminales.router.js

// 2) loteslineas — usando CódigoTarea01–15 y TareaInicio01–15
router.get('/loteslineas', async (req, res) => {
    const { num_manual } = req.query;
    if (!num_manual) return res.status(400).json({ status:'error', message:'Falta num_manual' });
  
    const sql = `
      SELECT
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
      console.error('❌ /loteslineas:', err);
      res.status(500).json({ status:'error', message:err.message });
    }
  });
  
  // 3) lotesfabricaciones — sólo CodigoTarea1–10 y tiempos Inicia/Final 1–15
  router.get('/lotesfabricaciones', async (req, res) => {
    const { num_manual, modulo } = req.query;
    if (!num_manual || !modulo) {
      return res.status(400).json({
        status: 'error',
        message: 'Faltan parámetros num_manual y/o modulo'
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
      console.error('❌ ERROR EN /lotesfabricaciones:', error);
      res.status(500).json({ status:'error', message:error.message });
    }
  });
  
  





  





///////////////////////////////////////////////////////////////////////////////////////////////
// GET /control-terminales/lotes/columns
router.get('/lotes/columns', async (req, res) => {
    try {
      const [cols] = await pool.execute(
        `SELECT COLUMN_NAME
         FROM information_schema.columns
         WHERE table_schema = 'terminales'
           AND table_name   = 'lotes'
         ORDER BY ORDINAL_POSITION`
      );
      res.status(200).json(cols.map(c => c.COLUMN_NAME));
    } catch (error) {
      console.error('❌ ERROR EN /lotes/columns:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });
  
  // GET /control-terminales/loteslineas/columns
  router.get('/loteslineas/columns', async (req, res) => {
    try {
      const [cols] = await pool.execute(
        `SELECT COLUMN_NAME
         FROM information_schema.columns
         WHERE table_schema = 'terminales'
           AND table_name   = 'loteslineas'
         ORDER BY ORDINAL_POSITION`
      );
      res.status(200).json(cols.map(c => c.COLUMN_NAME));
    } catch (error) {
      console.error('❌ ERROR EN /loteslineas/columns:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });
  
  // GET /control-terminales/lotesfabricaciones/columns
  router.get('/lotesfabricaciones/columns', async (req, res) => {
    try {
      const [cols] = await pool.execute(
        `SELECT COLUMN_NAME
         FROM information_schema.columns
         WHERE table_schema = 'terminales'
           AND table_name   = 'lotesfabricaciones'
         ORDER BY ORDINAL_POSITION`
      );
      res.status(200).json(cols.map(c => c.COLUMN_NAME));
    } catch (error) {
      console.error('❌ ERROR EN /lotesfabricaciones/columns:', error);
      res.status(500).json({ status: 'error', message: error.message });
    }
  });
  


module.exports = router;
