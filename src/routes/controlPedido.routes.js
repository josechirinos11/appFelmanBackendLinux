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

module.exports = router;



