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
// POST /control-pedido/modulos-info
router.post('/modulos-info', async (req, res) => {
  const modulos = Array.isArray(req.body?.modulos) ? req.body.modulos : [];
  if (!modulos.length) return res.status(400).json({ error: 'Array de modulos vacío' });

  try {
    // 1) Normaliza y desduplica (Serie/Numero/Linea) de PRESUPUESTO
    const key = (s, n, l) => `${String(s)}|${Number(n)}|${Number(l)}`;
    const presuTuplas = [];
    const seen = new Set();
    for (const m of modulos) {
      const Serie = String(m.Serie ?? m.serie ?? '').trim();
      const Numero = Number(m.Numero ?? m.numero ?? m.Num ?? m.num);
      const Linea = Number(m.Linea ?? m.linea);
      if (!Serie || !Number.isFinite(Numero) || !Number.isFinite(Linea)) continue;
      const k = key(Serie, Numero, Linea);
      if (!seen.has(k)) { seen.add(k); presuTuplas.push([Serie, Numero, Linea]); }
    }
    if (!presuTuplas.length) return res.json([]);

    // 2) Mapea (PRE) -> (FAB) usando fpresupuestoslineas
    //    Usamos tuplas para evitar combinaciones cruzadas.
    const tuplePlaceholders = presuTuplas.map(() => '(?,?,?)').join(',');
    const mapSql = `
      SELECT 
        pl.CodigoPresupSerie  AS PresupSerie,
        pl.CodigoPresupNumero AS PresupNumero,
        pl.Linea              AS Linea,
        pl.CodigoSerie        AS FabSerie,
        pl.CodigoNumero       AS FabNumero
      FROM z_felman2023.fpresupuestoslineas pl
      WHERE (pl.CodigoPresupSerie, pl.CodigoPresupNumero, pl.Linea) IN (${tuplePlaceholders})
    `;
    const mapParams = presuTuplas.flat();
    const [rowsMap] = await pool.query(mapSql, mapParams);

    // Construye diccionario PRE->FAB
    const pre2fab = new Map();
    for (const r of rowsMap) {
      pre2fab.set(key(r.PresupSerie, r.PresupNumero, r.Linea), { FabSerie: r.FabSerie, FabNumero: r.FabNumero });
    }
    // ➜ NUEVO: si no hay mapeos, asumimos que las tuplas de entrada YA son FAB
    if (rowsMap.length === 0) {
      for (const [Serie, Numero, Linea] of presuTuplas) {
        pre2fab.set(key(Serie, Numero, Linea), { FabSerie: Serie, FabNumero: Numero });
      }
    }

    // 3) Prepara tuplas de FABRICACIÓN (para artículos por Serie/Numero y cristales por Serie/Numero/Linea)
    const fabPairsSet = new Set();
    const fabTriples = [];
    for (const [k3, v] of pre2fab.entries()) {
      const [pSerie, pNumero, pLinea] = k3.split('|');
      const pairKey = `${v.FabSerie}|${v.FabNumero}`;
      if (!fabPairsSet.has(pairKey)) fabPairsSet.add(pairKey);
      fabTriples.push([v.FabSerie, v.FabNumero, Number(pLinea)]);
    }
    const fabPairs = Array.from(fabPairsSet).map(s => s.split('|')); // [[Serie,Numero],...]

    // Si no hay mapeos válidos, devolvemos todo false
    if (!fabPairs.length) {
      return res.json(modulos.map(m => ({ id: m.id ?? `${m.Serie}-${m.Numero}-${m.Linea}`, solape: false, guias: false, cristal: false })));
    }

    // 4) Consultas calificadas a z_felman2023 (BOOLEANS como =1)

    // 4.1 Guías (por par Serie/Numero FAB)
    const pairPlaceholders = fabPairs.map(() => '(?,?)').join(',');
    const guiasSql = `
      SELECT fa.CodigoSerie, fa.CodigoNumero
      FROM z_felman2023.fpresupuestosarticulos fa
      WHERE (fa.CodigoSerie, fa.CodigoNumero) IN (${pairPlaceholders})
        AND fa.Tipo = 1 AND fa.Log01 = 1 AND fa.Log04 = 1
        AND fa.num18 = 2
      GROUP BY fa.CodigoSerie, fa.CodigoNumero
    `;
    const guiasParams = fabPairs.flat();
    const [rowsGuias] = await pool.query(guiasSql, guiasParams);
    const haveGuias = new Set(rowsGuias.map(r => `${r.CodigoSerie}|${r.CodigoNumero}`));

    // 4.2 Solape (por par Serie/Numero FAB)
    const solapeSql = `
      SELECT fa.CodigoSerie, fa.CodigoNumero
      FROM z_felman2023.fpresupuestosarticulos fa
      WHERE (fa.CodigoSerie, fa.CodigoNumero) IN (${pairPlaceholders})
        AND fa.Tipo = 1 AND fa.Log01 = 1 AND fa.Log04 = 1
        AND (
          fa.num15 = 11 OR (fa.num15 = 5 AND fa.CodigoArticulo IN
            ('VEK109014','VEK109014REC','VEK109132','VEK109208','VEK109295','VEK109597')
          )
        )
      GROUP BY fa.CodigoSerie, fa.CodigoNumero
    `;
    const [rowsSolape] = await pool.query(solapeSql, guiasParams);
    const haveSolape = new Set(rowsSolape.map(r => `${r.CodigoSerie}|${r.CodigoNumero}`));

    // 4.3 Cristales (por triple Serie/Numero/Linea FAB)
    const triplePlaceholders = fabTriples.map(() => '(?,?,?)').join(',');
    const cristalSql = `
      SELECT plc.CodigoSerie, plc.CodigoNumero, plc.Linea
      FROM z_felman2023.fpresupuestoslineascomponentes plc
      WHERE (plc.CodigoSerie, plc.CodigoNumero, plc.Linea) IN (${triplePlaceholders})
        AND plc.TipoArticulo = 5
      GROUP BY plc.CodigoSerie, plc.CodigoNumero, plc.Linea
    `;
    const cristalParams = fabTriples.flat();
    const [rowsCristal] = await pool.query(cristalSql, cristalParams);
    const haveCristal = new Set(rowsCristal.map(r => `${r.CodigoSerie}|${r.CodigoNumero}|${r.Linea}`));

    // 5) Respuesta: para cada módulo de entrada (PRE), marcamos flags según su FAB mapeado
 // ... tras construir haveSolape, haveGuias, haveCristal

const out = modulos.map(m => {
  const Serie = String(m.Serie ?? m.serie ?? '').trim();
  const Numero = Number(m.Numero ?? m.numero ?? m.Num ?? m.num);
  const Linea  = Number(m.Linea  ?? m.linea);

  // id PRE (tal como lo recibiste)
  const preId = `${Serie}-${Numero}-${Linea}`;

  const fab = pre2fab.get(key(Serie, Numero, Linea));
  if (!fab) {
    // sin mapeo: devuelves lo mismo y alias vacío
    return { id: preId, alias: [preId], solape:false, guias:false, cristal:false };
  }

  // id FAB canónico
  const fabId = `${fab.FabSerie}-${fab.FabNumero}-${Linea}`;

  const pairK = `${fab.FabSerie}|${fab.FabNumero}`;
  const tripK = `${fab.FabSerie}|${fab.FabNumero}|${Linea}`;

  return {
    id: fabId,                 // canónico: FAB
    alias: [fabId, preId],     // incluye PRE para casar con el front
    solape:  haveSolape.has(pairK),
    guias:   haveGuias.has(pairK),
    cristal: haveCristal.has(tripK)
  };
});


    return res.json(out);
  } catch (error) {
    console.error('[API] ❌ Error modulos-info:', error);
    return res.status(500).json({ error: 'Error al consultar módulos', detail: String(error?.sqlMessage || error?.message || error) });
  }
});

// Ruta para obtener información para terminales verificacion de cambioscc
router.post('/info-para-terminales', async (req, res, next) => {
  const { codigoPresupuesto } = req.body;
  
  // Validar parámetros
  if (!codigoPresupuesto) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Falta el parámetro codigoPresupuesto' 
    });
  }

  try {
    // 1. Obtener ClienteNombre de fpresupuestos
    const [clienteRows] = await pool.execute(
      `SELECT ClienteNombre 
       FROM z_felman2023.fpresupuestos 
       WHERE NumeroManual = ?`,
      [codigoPresupuesto]
    );

    if (clienteRows.length === 0) {
      return res.status(404).json({ 
        status: 'error', 
        message: 'No se encontró el presupuesto con el código proporcionado' 
      });
    }

    const clienteNombre = clienteRows[0].ClienteNombre;

    // 2. Obtener Serie1Desc, CodigoSerie, CodigoNumero de fpresupuestoslineas (TODOS los módulos del presupuesto)
    const [lineasRows] = await pool.execute(
      `SELECT Serie1Desc, CodigoSerie, CodigoNumero, Modulo
       FROM z_felman2023.fpresupuestoslineas 
       WHERE PresupNumMan = ?
       ORDER BY Modulo`,
      [codigoPresupuesto]
    );

    // 3. Preparar respuesta
    const response = {
      status: 'ok',
      codigoPresupuesto,
      clienteNombre,
      modulos: lineasRows
    };

    return res.status(200).json(response);
    
  } catch (error) {
    console.error('❌ ERROR EN /info-para-terminales:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Error al consultar la información', 
      detail: error.message 
    });
  }
});


module.exports = router;



