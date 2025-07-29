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
  router.get('/loteslineas', async (req, res) => {
    const { num_manual } = req.query;
    if (!num_manual) return res.status(400).json({ status:'error', message:'Falta num_manual' });
  
    try {
      const [result] = await pool.execute(
        `SELECT
           Modulo                                AS Módulo,
           TareaInicio01  AS \`Tarea 1 Inicia\`,  TareaFinal01  AS \`Tarea 1 Final\`,
           TareaInicio02  AS \`Tarea 2 Inicia\`,  TareaFinal02  AS \`Tarea 2 Final\`,
           /* … repite hasta … */
           TareaInicio15  AS \`Tarea 15 Inicia\`, TareaFinal15  AS \`Tarea 15 Final\`
         FROM terminales.loteslineas
         WHERE FabricacionNumeroManual = ?`,
        [num_manual]
      );
      res.json(result);
    } catch (error) {
      console.error('❌ ERROR EN /control-terminales/loteslineas:', error);
      res.status(500).json({ status:'error', message:error.message });
    }
  });
  
  // 3) /lotesfabricaciones?num_manual=… (&opcional: fabricacionSerie=…)
  //    → filtra sólo por NumeroManual (no hay columna “Modulo” en esta tabla)
  router.get('/lotesfabricaciones', async (req, res) => {
    const { num_manual, fabricacionSerie } = req.query;
    if (!num_manual) return res.status(400).json({ status:'error', message:'Falta num_manual' });
  
    // armamos filtro adicional si quieren serie
    const filters = ['NumeroManual = ?'];
    const params  = [num_manual];
    if (fabricacionSerie) {
      filters.push('FabricacionSerie = ?');
      params.push(fabricacionSerie);
    }
  
    try {
      const [result] = await pool.execute(
        `SELECT
           -- aquí, como no hay TareaInicio/Final, sacamos solo códigos y tiempos si quieres
           CodigoTarea1    AS \`Tarea 1 Código\`,
           TiempoPrevisto1 AS \`Tarea 1 Previsto\`,
           TiempoAcumulado1 AS \`Tarea 1 Acum.\`,
           /* … repite hasta … */
           CodigoTarea15   AS \`Tarea 15 Código\`,
           TiempoPrevisto15 AS \`Tarea 15 Previsto\`,
           TiempoAcumulado15 AS \`Tarea 15 Acum.\`
         FROM terminales.lotesfabricaciones
         WHERE ${filters.join(' AND ')}`,
        params
      );
      res.json(result);
    } catch (error) {
      console.error('❌ ERROR EN /control-terminales/lotesfabricaciones:', error);
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
