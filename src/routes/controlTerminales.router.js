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
      const [result] = await pool.execute(
        `SELECT
           NumeroManual    AS \`Num. manual\`,
           Fabricado       AS Fabricado,
           -- calculamos % completado sobre tiempo total previsto
           ROUND(TotalTiempo / TotalTiempoPrevisto * 100, 2) AS \`% Comp.\`,
           TotalUnidades   AS Cargado
         FROM terminales.lotes`
      );
      res.json(result);
    } catch (error) {
      console.error('❌ ERROR EN /control-terminales/lotes:', error);
      res.status(500).json({ status:'error', message:error.message });
    }
  });
  
  // 2) /loteslineas?num_manual=… → filtra por NumeroManual y saca módulo + TareaInicio/Final 1–15
  // src/routes/controlTerminales.router.js
router.get('/loteslineas', async (req, res) => {
    const { num_manual } = req.query;
    if (!num_manual) return res.status(400).json({ status:'error', message:'Falta num_manual' });
  
    try {
      const [rows] = await pool.execute(
        `SELECT
           Modulo                                        AS Módulo,
           CodigoTarea01                                 AS \`Tarea General 1\`,
           CodigoTarea02                                 AS \`Tarea General 2\`,
           CodigoTarea03                                 AS \`Tarea General 3\`,
           CodigoTarea04                                 AS \`Tarea General 4\`,
           CodigoTarea05                                 AS \`Tarea General 5\`,
           CodigoTarea06                                 AS \`Tarea General 6\`,
           CodigoTarea07                                 AS \`Tarea General 7\`,
           CodigoTarea08                                 AS \`Tarea General 8\`,
           CodigoTarea09                                 AS \`Tarea General 9\`,
           CodigoTarea10                                 AS \`Tarea General 10\`,
           CodigoTarea11                                 AS \`Tarea General 11\`,
           CodigoTarea12                                 AS \`Tarea General 12\`,
           CodigoTarea13                                 AS \`Tarea General 13\`,
           CodigoTarea14                                 AS \`Tarea General 14\`,
           CodigoTarea15                                 AS \`Tarea General 15\`,
           TareaInicio01                                 AS \`Inicia 1\`,  TareaFinal01  AS \`Final 1\`,
           TareaInicio02                                 AS \`Inicia 2\`,  TareaFinal02  AS \`Final 2\`,
           TareaInicio03                                 AS \`Inicia 3\`,  TareaFinal03  AS \`Final 3\`,
           TareaInicio04                                 AS \`Inicia 4\`,  TareaFinal04  AS \`Final 4\`,
           TareaInicio05                                 AS \`Inicia 5\`,  TareaFinal05  AS \`Final 5\`,
           TareaInicio06                                 AS \`Inicia 6\`,  TareaFinal06  AS \`Final 6\`,
           TareaInicio07                                 AS \`Inicia 7\`,  TareaFinal07  AS \`Final 7\`,
           TareaInicio08                                 AS \`Inicia 8\`,  TareaFinal08  AS \`Final 8\`,
           TareaInicio09                                 AS \`Inicia 9\`,  TareaFinal09  AS \`Final 9\`,
           TareaInicio10                                 AS \`Inicia 10\`, TareaFinal10  AS \`Final 10\`,
           TareaInicio11                                 AS \`Inicia 11\`, TareaFinal11  AS \`Final 11\`,
           TareaInicio12                                 AS \`Inicia 12\`, TareaFinal12  AS \`Final 12\`,
           TareaInicio13                                 AS \`Inicia 13\`, TareaFinal13  AS \`Final 13\`,
           TareaInicio14                                 AS \`Inicia 14\`, TareaFinal14  AS \`Final 14\`,
           TareaInicio15                                 AS \`Inicia 15\`, TareaFinal15  AS \`Final 15\`
         FROM terminales.loteslineas
         WHERE FabricacionNumeroManual = ?`,
        [num_manual]
      );
      res.json(rows);
    } catch (err) {
      console.error('❌ /loteslineas:', err);
      res.status(500).json({ status:'error', message: err.message });
    }
  });
  
  
  // 3) /lotesfabricaciones?num_manual=… (&opcional: fabricacionSerie=…)
  // src/routes/controlTerminales.router.js
router.get('/lotesfabricaciones', async (req, res) => {
    const { num_manual, fabricacionSerie } = req.query;
    if (!num_manual || !fabricacionSerie) {
      return res.status(400).json({ status:'error', message:'Falta num_manual y/o fabricacionSerie' });
    }
  
    try {
      const [rows] = await pool.execute(
        `SELECT
           CodigoTarea1   AS \`Tarea General 1\`,   TC1   AS \`Inicia 1\`,   TPO1   AS \`Final 1\`,
           CodigoTarea2   AS \`Tarea General 2\`,   TC2   AS \`Inicia 2\`,   TPO2   AS \`Final 2\`,
           CodigoTarea3   AS \`Tarea General 3\`,   TC3   AS \`Inicia 3\`,   TPO3   AS \`Final 3\`,
           CodigoTarea4   AS \`Tarea General 4\`,   TC4   AS \`Inicia 4\`,   TPO4   AS \`Final 4\`,
           CodigoTarea5   AS \`Tarea General 5\`,   TC5   AS \`Inicia 5\`,   TPO5   AS \`Final 5\`,
           CodigoTarea6   AS \`Tarea General 6\`,   TC6   AS \`Inicia 6\`,   TPO6   AS \`Final 6\`,
           CodigoTarea7   AS \`Tarea General 7\`,   TC7   AS \`Inicia 7\`,   TPO7   AS \`Final 7\`,
           CodigoTarea8   AS \`Tarea General 8\`,   TC8   AS \`Inicia 8\`,   TPO8   AS \`Final 8\`,
           CodigoTarea9   AS \`Tarea General 9\`,   TC9   AS \`Inicia 9\`,   TPO9   AS \`Final 9\`,
           CodigoTarea10  AS \`Tarea General 10\`,  TC10  AS \`Inicia 10\`,  TPO10  AS \`Final 10\`,
           CodigoTarea11  AS \`Tarea General 11\`,  TC11  AS \`Inicia 11\`,  TPO11  AS \`Final 11\`,
           CodigoTarea12  AS \`Tarea General 12\`,  TC12  AS \`Inicia 12\`,  TPO12  AS \`Final 12\`,
           CodigoTarea13  AS \`Tarea General 13\`,  TC13  AS \`Inicia 13\`,  TPO13  AS \`Final 13\`,
           CodigoTarea14  AS \`Tarea General 14\`,  TC14  AS \`Inicia 14\`,  TPO14  AS \`Final 14\`,
           CodigoTarea15  AS \`Tarea General 15\`,  TC15  AS \`Inicia 15\`,  TPO15  AS \`Final 15\`
         FROM terminales.lotesfabricaciones
         WHERE NumeroManual     = ?
           AND FabricacionSerie = ?`,
        [num_manual, fabricacionSerie]
      );
      res.json(rows);
    } catch (err) {
      console.error('❌ /lotesfabricaciones:', err);
      res.status(500).json({ status:'error', message: err.message });
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
