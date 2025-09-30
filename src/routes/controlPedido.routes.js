const express = require('express');
const pool = require('../config/database');

const router = express.Router();

router.get('/inicio', async (req, res, next) => {
  try {
    const [result] = await pool.execute(`
      SELECT DISTINCT CONCAT(CodigoPresupSerie, '/', CodigoPresupNumero) AS Presupuesto_No
      FROM z_felman2023.fpresupuestoslineas
      ORDER BY CodigoPresupNumero DESC
    `);

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});




// Ruta para contro-fabrica optimizada para array de pedidos/modulos
router.post('/contro-fabrica', async (req, res, next) => {
  const pedidos = Array.isArray(req.body) ? req.body : [];
  if (!pedidos.length) {
    return res.status(400).json({ error: 'Debes enviar un array de pedidos/modulos' });
  }
  try {
    // Construir listas únicas para las consultas
    const series = [...new Set(pedidos.map(p => p.Serie))];
    const numeros = [...new Set(pedidos.map(p => p.Numero))];
    // Para cristales, necesitamos Serie, Numero, Linea
    const lineas = pedidos.map(p => [p.Serie, p.Numero, p.Linea]);

    // Consultar guías y solape en lote
    const [guias] = await pool.query(
      `SELECT CodigoSerie, CodigoNumero FROM fpresupuestosArticulos WHERE CodigoSerie IN (?) AND CodigoNumero IN (?) and (Tipo=1) and (Log01=true) and (Log04=true) and (num18=2)`,
      [series, numeros]
    );
    const [solapes] = await pool.query(
      `SELECT CodigoSerie, CodigoNumero FROM fpresupuestosArticulos WHERE CodigoSerie IN (?) AND CodigoNumero IN (?) AND Tipo = 1 AND Log01 = TRUE AND Log04 = TRUE AND (num15 = 11 OR (num15 = 5 AND CodigoArticulo IN ('VEK109014','VEK109014REC','VEK109132','VEK109208','VEK109295','VEK109597')))`,
      [series, numeros]
    );

    // Consultar cristales en lote
    // Para eficiencia, buscamos todos los posibles y luego filtramos en JS
    const [cristalesAll] = await pool.query(
      `SELECT plc.CodigoSerie, plc.CodigoNumero, plc.Linea, a.Descripcion FROM fPresupuestosLineasComponentes AS plc JOIN Articulos AS a ON a.Codigo = plc.CodigoArticulo JOIN fpresupuestoslineas AS pl ON pl.CodigoSerie = plc.CodigoSerie AND pl.CodigoNumero = plc.CodigoNumero AND pl.Linea = plc.Linea WHERE plc.CodigoSerie IN (?) AND plc.CodigoNumero IN (?) AND plc.TipoArticulo = 5`,
      [series, numeros]
    );

    // Armar respuesta por cada pedido/módulo
    const respuesta = pedidos.map(p => {
      const tieneGuias = guias.some(g => g.CodigoSerie === p.Serie && g.CodigoNumero === p.Numero);
      const tieneSolape = solapes.some(s => s.CodigoSerie === p.Serie && s.CodigoNumero === p.Numero);
      const cristales = cristalesAll
        .filter(c => c.CodigoSerie === p.Serie && c.CodigoNumero === p.Numero && c.Linea === p.Linea)
        .map(c => c.Descripcion);
      return {
        Serie: p.Serie,
        Numero: p.Numero,
        Linea: p.Linea,
        tieneGuias,
        tieneSolape,
        cristales
      };
    });
    res.json(respuesta);
  } catch (error) {
    next(error);
  }
});



// POST /control-pedido/modulos-info (corregir nombre)
router.post('/modulos-info', async (req, res, next) => {
  const modulos = Array.isArray(req.body.modulos) ? req.body.modulos : [];
  if (!modulos.length) {
    return res.status(400).json({ error: 'Array de modulos vacío' });
  }
  
  console.log(`[API] Consultando info de ${modulos.length} módulos`);
  
  try {
    const series = [...new Set(modulos.map(m => m.Serie))];
    const numeros = [...new Set(modulos.map(m => m.Numero))];

    // Consultar guías
    const [guias] = await pool.query(
      `SELECT CodigoSerie, CodigoNumero 
       FROM fpresupuestosArticulos 
       WHERE CodigoSerie IN (?) 
         AND CodigoNumero IN (?) 
         AND Tipo = 1 
         AND Log01 = TRUE 
         AND Log04 = TRUE 
         AND num18 = 2`,
      [series, numeros]
    );

    // Consultar solape
    const [solapes] = await pool.query(
      `SELECT CodigoSerie, CodigoNumero 
       FROM fpresupuestosArticulos 
       WHERE CodigoSerie IN (?) 
         AND CodigoNumero IN (?) 
         AND Tipo = 1 
         AND Log01 = TRUE 
         AND Log04 = TRUE 
         AND (num15 = 11 OR (num15 = 5 AND CodigoArticulo IN (
           'VEK109014','VEK109014REC','VEK109132',
           'VEK109208','VEK109295','VEK109597'
         )))`,
      [series, numeros]
    );

    // Consultar cristales
    const [cristales] = await pool.query(
      `SELECT plc.CodigoSerie, plc.CodigoNumero, plc.Linea 
       FROM fPresupuestosLineasComponentes plc
       WHERE plc.CodigoSerie IN (?) 
         AND plc.CodigoNumero IN (?) 
         AND plc.TipoArticulo = 5`,
      [series, numeros]
    );

    // Construir respuesta
    const respuesta = modulos.map(m => {
      const tieneGuias = guias.some(g => 
        g.CodigoSerie === m.Serie && g.CodigoNumero === m.Numero
      );
      const tieneSolape = solapes.some(s => 
        s.CodigoSerie === m.Serie && s.CodigoNumero === m.Numero
      );
      const tieneCristal = cristales.some(c => 
        c.CodigoSerie === m.Serie && 
        c.CodigoNumero === m.Numero && 
        c.Linea === m.Linea
      );

      return {
        Serie: m.Serie,
        Numero: m.Numero,
        Linea: m.Linea,
        solape: tieneSolape,
        guias: tieneGuias,
        cristal: tieneCristal // Boolean, no array
      };
    });

    console.log(`[API] ✅ Respondiendo con ${respuesta.length} módulos procesados`);
    res.json(respuesta);
  } catch (error) {
    console.error('[API] ❌ Error en modulos-info:', error);
    next(error);
  }
});

module.exports = router;



