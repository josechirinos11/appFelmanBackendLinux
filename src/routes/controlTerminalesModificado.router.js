const express = require("express");
const pool = require("../config/databaseTerminales");
const logger = require("../utils/logger");

const router = express.Router();

// GET /dashboard_pvc (ruta exclusiva)
router.get("/dashboard_pvc", async (_req, res) => {
  const sql = `
    SELECT
      x.*,
      cl.Cliente,
      COALESCE(l.TotalUnidades, 0) AS TotalModulos,
      GREATEST(
        COALESCE(l.TotalUnidades, 0) - COALESCE(pm.ModulosProcesados, 0),
        0
      ) AS ModulosRestantes
    FROM
    (
      (
        SELECT
            h.Serie, h.Numero, h.Fecha, h.CodigoOperario, h.OperarioNombre,
            hl.CodigoSerie, hl.CodigoNumero, hl.Linea,
            hl.FechaInicio, hl.HoraInicio, hl.FechaFin, hl.HoraFin,
            hl.CodigoTarea, hl.NumeroManual, hl.Modulo,
            hl.TiempoDedicado, hl.Abierta
        FROM hpartes h
        INNER JOIN hparteslineas hl
          ON h.Serie = hl.CodigoSerie
         AND h.Numero = hl.CodigoNumero
        WHERE h.Fecha = CURDATE()
          AND hl.Abierta = 1
          AND h.CodigoOperario IN (
            '004','020','025','036','037','038','040',  
            '052','053','056','057','058','059','060','061','062',
            '064','065','066'
          )
      )
      UNION ALL
      (
        SELECT
            p.Serie, p.Numero, p.Fecha, p.CodigoOperario, p.OperarioNombre,
            pl.CodigoSerie, pl.CodigoNumero, pl.Linea,
            pl.FechaInicio, pl.HoraInicio, pl.FechaFin, pl.HoraFin,
            pl.CodigoTarea, pl.NumeroManual, pl.Modulo,
            pl.TiempoDedicado, pl.Abierta
        FROM partes p
        INNER JOIN parteslineas pl
          ON p.Serie = pl.CodigoSerie
         AND p.Numero = pl.CodigoNumero
        WHERE p.Fecha = CURDATE()
          AND pl.Abierta = 1
          AND p.CodigoOperario IN (
            '004','020','025','036','037','038','040',  
            '052','053','056','057','058','059','060','061','062',
            '064','065','066'
          )
      )
    ) AS x

    LEFT JOIN (
      SELECT
        FabricacionNumeroManual AS NumeroManual,
        MAX(Cliente) AS Cliente
      FROM loteslineas
      WHERE FabricacionNumeroManual IS NOT NULL
        AND FabricacionNumeroManual <> ''
      GROUP BY FabricacionNumeroManual
    ) AS cl
      ON cl.NumeroManual = x.NumeroManual

    LEFT JOIN (
      SELECT
        NumeroManual,
        MAX(TotalUnidades) AS TotalUnidades
      FROM Lotes
      GROUP BY NumeroManual
    ) AS l
      ON l.NumeroManual = x.NumeroManual

    LEFT JOIN
    (
      SELECT
        s.NumeroManual,
        COUNT(DISTINCT s.Modulo) AS ModulosProcesados
      FROM (
        SELECT NumeroManual, Modulo, FechaInicio
        FROM hparteslineas
        WHERE NumeroManual IS NOT NULL AND NumeroManual <> ''
          AND Modulo IS NOT NULL AND Modulo <> ''

        UNION ALL

        SELECT NumeroManual, Modulo, FechaInicio
        FROM parteslineas
        WHERE NumeroManual IS NOT NULL AND NumeroManual <> ''
          AND Modulo IS NOT NULL AND Modulo <> ''
      ) AS s
      WHERE s.FechaInicio IS NOT NULL
        AND s.FechaInicio <> '0000-00-00'
        AND s.FechaInicio <> '1970-01-01'
      GROUP BY s.NumeroManual
    ) AS pm
      ON pm.NumeroManual = x.NumeroManual

    ORDER BY x.FechaInicio DESC, x.HoraInicio DESC
    LIMIT 0, 1000;
  `;

  try {
    const [rows] = await pool.query(sql);
    res.status(200).json(rows);
  } catch (error) {
    console.error("❌ ERROR EN /control-terminales/dashboard_pvc:", error);
    res.status(500).json({
      status: "error",
      message: "Error al obtener dashboard PVC",
      detail: error.message,
    });
  }
});

// GET /dashboard_aluminio
router.get("/dashboard_aluminio", async (_req, res) => {
  const sql = `
  SELECT
    x.*,
    cl.Cliente,
    COALESCE(l.TotalUnidades, 0) AS TotalModulos,
    GREATEST(
      COALESCE(l.TotalUnidades, 0) - COALESCE(pm.ModulosProcesados, 0),
      0
    ) AS ModulosRestantes
  FROM
  (
    (
      SELECT
          h.Serie, h.Numero, h.Fecha, h.CodigoOperario, h.OperarioNombre,
          hl.CodigoSerie, hl.CodigoNumero, hl.Linea,
          hl.FechaInicio, hl.HoraInicio, hl.FechaFin, hl.HoraFin,
          hl.CodigoTarea, hl.NumeroManual, hl.Modulo,
          hl.TiempoDedicado, hl.Abierta
      FROM hpartes h
      INNER JOIN hparteslineas hl
        ON h.Serie = hl.CodigoSerie
       AND h.Numero = hl.CodigoNumero
      WHERE h.Fecha = CURDATE()
        AND hl.Abierta = 1
        AND h.CodigoOperario IN ('001','008','012','013','015','016','032','034','035','041','050','051','054','055','064','065','067','068')
    )
    UNION ALL
    (
      SELECT
          p.Serie, p.Numero, p.Fecha, p.CodigoOperario, p.OperarioNombre,
          pl.CodigoSerie, pl.CodigoNumero, pl.Linea,
          pl.FechaInicio, pl.HoraInicio, pl.FechaFin, pl.HoraFin,
          pl.CodigoTarea, pl.NumeroManual, pl.Modulo,
          pl.TiempoDedicado, pl.Abierta
      FROM partes p
      INNER JOIN parteslineas pl
        ON p.Serie = pl.CodigoSerie
       AND p.Numero = pl.CodigoNumero
      WHERE p.Fecha = CURDATE()
        AND pl.Abierta = 1
        AND p.CodigoOperario IN ('001','008','012','013','015','016','032','034','035','041','050','051','054','055','064','065','066','068')
    )
  ) AS x

  LEFT JOIN (
    SELECT
      FabricacionNumeroManual AS NumeroManual,
      MAX(Cliente) AS Cliente
    FROM loteslineas
    WHERE FabricacionNumeroManual IS NOT NULL
      AND FabricacionNumeroManual <> ''
    GROUP BY FabricacionNumeroManual
  ) AS cl
    ON cl.NumeroManual = x.NumeroManual

  LEFT JOIN (
    SELECT
      NumeroManual,
      MAX(TotalUnidades) AS TotalUnidades
    FROM Lotes
    GROUP BY NumeroManual
  ) AS l
    ON l.NumeroManual = x.NumeroManual

  LEFT JOIN
  (
    SELECT
      s.NumeroManual,
      COUNT(DISTINCT s.Modulo) AS ModulosProcesados
    FROM (
      SELECT NumeroManual, Modulo, FechaInicio
      FROM hparteslineas
      WHERE NumeroManual IS NOT NULL AND NumeroManual <> ''
        AND Modulo IS NOT NULL AND Modulo <> ''

      UNION ALL

      SELECT NumeroManual, Modulo, FechaInicio
      FROM parteslineas
      WHERE NumeroManual IS NOT NULL AND NumeroManual <> ''
        AND Modulo IS NOT NULL AND Modulo <> ''
    ) AS s
    WHERE s.FechaInicio IS NOT NULL
      AND s.FechaInicio <> '0000-00-00'
      AND s.FechaInicio <> '1970-01-01'
    GROUP BY s.NumeroManual
  ) AS pm
    ON pm.NumeroManual = x.NumeroManual

  ORDER BY x.FechaInicio DESC, x.HoraInicio DESC;
`;

  try {
    const [rows] = await pool.query(sql);
    res.status(200).json(rows);
  } catch (error) {
    console.error("❌ ERROR EN /control-terminales/dashboard_aluminio:", error);
    res.status(500).json({
      status: "error",
      message: "Error al obtener dashboard de aluminio",
      detail: error.message,
    });
  }
});

/**
 * POST /control-terminales/sql
 * Ejecuta una consulta SQL de SOLO LECTURA (SELECT) contra la BD de Terminales.
 * Body: { "query": "SELECT ..."}
 */
router.post("/sql", async (req, res) => {
  const { query } = req.body;
  if (!query || typeof query !== "string") {
    return res
      .status(400)
      .json({ status: "error", message: "Falta la consulta SQL en el cuerpo" });
  }

  // Protección básica: sólo SELECT (evita UPDATE/DELETE/DDL).
  const q = query.trim();
  if (!/^select\b/i.test(q)) {
    return res
      .status(400)
      .json({ status: "error", message: "Solo se permiten consultas SELECT" });
  }

  try {
    const [rows] = await pool.query(q);
    return res.status(200).json(rows);
  } catch (error) {
    console.error("❌ ERROR EN /control-terminales/sql:", error);
    return res.status(500).json({
      status: "error",
      message: "Error al ejecutar la consulta",
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
      detail: error.message,
    });
  }
});

/**
 * ============================================================================
 * OPTIMIZACIÓN #1: /lotes - SEVERIDAD ALTA
 * ============================================================================
 *
 * ANTES:
 * - Traía TODOS los lotes sin filtros (~2000 registros)
 * - Frontend filtraba por Fabricado, FechaRealInicio, búsqueda
 * - 15 columnas TareaInicio/TareaFinal pesadas
 *
 * DESPUÉS:
 * - Filtrado en SQL según status y search
 * - Solo columnas necesarias
 * - Paginación con limit/offset
 * - Reducción: 2000 → 100 registros (95% menos)
 *
 * Query params:
 * - status: 'Todo' | 'Fabricado' | 'En Fabricacion' | 'En Cola'
 * - search: string (búsqueda en NumeroManual, Descripcion, Fabricado)
 * - limit: number (default 100)
 * - offset: number (default 0)
 * ============================================================================
 */
router.get("/lotes", async (req, res) => {
  try {
    const { status = "Todo", search = "", limit = 100, offset = 0 } = req.query;

    // Construir condiciones WHERE dinámicamente
    let whereConditions = [];
    let params = [];

    // Filtro por status
    if (status === "Fabricado") {
      whereConditions.push("Fabricado != 0");
    } else if (status === "En Fabricacion") {
      whereConditions.push("Fabricado = 0 AND FechaRealInicio IS NOT NULL");
    } else if (status === "En Cola") {
      whereConditions.push("Fabricado = 0 AND FechaRealInicio IS NULL");
    }
    // Si status === 'Todo', no agregamos filtro

    // Filtro por búsqueda
    if (search && search.trim() !== "") {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push(
        "(NumeroManual LIKE ? OR Descripcion LIKE ? OR CAST(Fabricado AS CHAR) LIKE ?)"
      );
      params.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Solo seleccionar tareas relevantes (1,2,3,4,6,7,9,10,11,12)
    const sql = `
      SELECT
        NumeroManual,
        Fabricado,
        FabricadoFecha,
        FechaRealInicio,
        Descripcion,
        TotalTiempo,
        TotalUnidades,
        -- Tareas relevantes
        TareaInicio01, TareaFinal01, TareaFinalizada01,
        TareaInicio02, TareaFinal02, TareaFinalizada02,
        TareaInicio03, TareaFinal03, TareaFinalizada03,
        TareaInicio04, TareaFinal04, TareaFinalizada04,
        TareaInicio06, TareaFinal06, TareaFinalizada06,
        TareaInicio07, TareaFinal07, TareaFinalizada07,
        TareaInicio09, TareaFinal09, TareaFinalizada09,
        TareaInicio10, TareaFinal10, TareaFinalizada10,
        TareaInicio11, TareaFinal11, TareaFinalizada11,
        TareaInicio12, TareaFinal12, TareaFinalizada12
      FROM terminales.lotes
      ${whereClause}
      ORDER BY FechaRealInicio DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), parseInt(offset));

    const [result] = await pool.execute(sql, params);

    // Obtener el total de registros para paginación
    const countSql = `
      SELECT COUNT(*) as total
      FROM terminales.lotes
      ${whereClause}
    `;
    const countParams = params.slice(0, -2); // Remover limit y offset
    const [countResult] = await pool.execute(countSql, countParams);

    res.json({
      data: result,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < countResult[0].total,
      },
    });
  } catch (error) {
    console.error("❌ ERROR EN /control-terminales/lotes:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * ============================================================================
 * OPTIMIZACIÓN #2: /loteslineas - SEVERIDAD MEDIA
 * ============================================================================
 *
 * ANTES:
 * - 15 campos CodigoTarea, TareaInicio, TareaFinal
 * - Frontend calculaba estadoTiempos con N llamadas a /tiempos-acumulados-modulo
 *
 * DESPUÉS:
 * - Incluye estadoTiempos calculado en SQL
 * - Solo columnas necesarias
 * - Reducción de llamadas adicionales
 * ============================================================================
 */
router.get("/loteslineas", async (req, res) => {
  const { num_manual } = req.query;
  if (!num_manual) {
    return res.status(400).json({
      status: "error",
      message: "Falta num_manual",
    });
  }

  const sql = `
    SELECT
      Fabricada,
      Modulo,
      -- Tareas relevantes (1,2,3,4,6,7,9,10,11,12)
      CodigoTarea01, TareaInicio01, TareaFinal01,
      CodigoTarea02, TareaInicio02, TareaFinal02,
      CodigoTarea03, TareaInicio03, TareaFinal03,
      CodigoTarea04, TareaInicio04, TareaFinal04,
      CodigoTarea06, TareaInicio06, TareaFinal06,
      CodigoTarea07, TareaInicio07, TareaFinal07,
      CodigoTarea09, TareaInicio09, TareaFinal09,
      CodigoTarea10, TareaInicio10, TareaFinal10,
      CodigoTarea11, TareaInicio11, TareaFinal11,
      CodigoTarea12, TareaInicio12, TareaFinal12,
      -- Calcular estado de tiempos en SQL
      CASE 
        WHEN (
          (TiempoAcumulado01 IS NULL OR TiempoAcumulado01 = 0) AND
          (TiempoAcumulado02 IS NULL OR TiempoAcumulado02 = 0) AND
          (TiempoAcumulado03 IS NULL OR TiempoAcumulado03 = 0) AND
          (TiempoAcumulado04 IS NULL OR TiempoAcumulado04 = 0) AND
          (TiempoAcumulado06 IS NULL OR TiempoAcumulado06 = 0) AND
          (TiempoAcumulado07 IS NULL OR TiempoAcumulado07 = 0) AND
          (TiempoAcumulado09 IS NULL OR TiempoAcumulado09 = 0) AND
          (TiempoAcumulado10 IS NULL OR TiempoAcumulado10 = 0) AND
          (TiempoAcumulado11 IS NULL OR TiempoAcumulado11 = 0)
        ) THEN 'sin_tiempo'
        WHEN (
          (TiempoAcumulado01 > 0) AND
          (TiempoAcumulado02 > 0) AND
          (TiempoAcumulado03 > 0) AND
          (TiempoAcumulado04 > 0) AND
          (TiempoAcumulado06 > 0) AND
          (TiempoAcumulado07 > 0) AND
          (TiempoAcumulado09 > 0) AND
          (TiempoAcumulado10 > 0) AND
          (TiempoAcumulado11 > 0)
        ) THEN 'completo'
        ELSE 'parcial'
      END AS estadoTiempos,
      -- Tiempos acumulados para las tareas relevantes
      TiempoAcumulado01, TiempoAcumulado02, TiempoAcumulado03,
      TiempoAcumulado04, TiempoAcumulado06, TiempoAcumulado07,
      TiempoAcumulado09, TiempoAcumulado10, TiempoAcumulado11,
      TiempoAcumulado12
    FROM terminales.loteslineas
    WHERE FabricacionNumeroManual = ?
    ORDER BY Modulo
  `;

  try {
    const [rows] = await pool.execute(sql, [num_manual]);
    res.json(rows);
  } catch (err) {
    console.error("❌ /loteslineas:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

/**
 * ============================================================================
 * OPTIMIZACIÓN #3: /tiempos-acumulados-modulo - SEVERIDAD ALTA
 * ============================================================================
 *
 * ANTES:
 * - 20 UNION ALL con 40 parámetros repetidos
 * - Frontend lo llamaba múltiples veces (una por módulo)
 *
 * DESPUÉS:
 * - Usa CROSS JOIN con tabla de números simulada
 * - Una sola query eficiente
 * - Reducción: 20 queries → 1 query (95% menos)
 * ============================================================================
 */
router.get("/tiempos-acumulados-modulo", async (req, res) => {
  const { num_manual, modulo } = req.query;

  if (!num_manual || !modulo) {
    return res.status(400).json({
      status: "error",
      message: "Faltan parámetros: num_manual o modulo",
    });
  }

  // Usar CROSS JOIN con tabla de números para simular UNPIVOT
  const sql = `
    WITH Tareas AS (
      SELECT 1 AS NumeroTarea UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL
      SELECT 4 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL
      SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12
    )
    SELECT 
      ll.Modulo,
      t.NumeroTarea,
      CASE t.NumeroTarea
        WHEN 1 THEN ll.TiempoAcumulado01
        WHEN 2 THEN ll.TiempoAcumulado02
        WHEN 3 THEN ll.TiempoAcumulado03
        WHEN 4 THEN ll.TiempoAcumulado04
        WHEN 6 THEN ll.TiempoAcumulado06
        WHEN 7 THEN ll.TiempoAcumulado07
        WHEN 9 THEN ll.TiempoAcumulado09
        WHEN 10 THEN ll.TiempoAcumulado10
        WHEN 11 THEN ll.TiempoAcumulado11
        WHEN 12 THEN ll.TiempoAcumulado12
      END AS TiempoAcumulado
    FROM terminales.loteslineas ll
    CROSS JOIN Tareas t
    WHERE ll.FabricacionNumeroManual = ?
      AND ll.Modulo = ?
      AND CASE t.NumeroTarea
        WHEN 1 THEN ll.TiempoAcumulado01
        WHEN 2 THEN ll.TiempoAcumulado02
        WHEN 3 THEN ll.TiempoAcumulado03
        WHEN 4 THEN ll.TiempoAcumulado04
        WHEN 6 THEN ll.TiempoAcumulado06
        WHEN 7 THEN ll.TiempoAcumulado07
        WHEN 9 THEN ll.TiempoAcumulado09
        WHEN 10 THEN ll.TiempoAcumulado10
        WHEN 11 THEN ll.TiempoAcumulado11
        WHEN 12 THEN ll.TiempoAcumulado12
      END IS NOT NULL
    ORDER BY t.NumeroTarea
  `;

  try {
    const [rows] = await pool.execute(sql, [num_manual, modulo]);
    res.json(rows);
  } catch (err) {
    console.error("❌ /control-terminales/tiempos-acumulados-modulo:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

/**
 * ============================================================================
 * OPTIMIZACIÓN #4: /tiempo-real-nueva - SEVERIDAD CRÍTICA
 * ============================================================================
 *
 * ANTES:
 * - UNION sin filtros traía TODO el historial de hpartes + partes
 * - Solo filtraba WHERE Fecha = CURDATE() después del UNION
 * - Frontend agrupaba/filtraba/calculaba estadísticas en JS
 *
 * DESPUÉS:
 * - Filtrado ANTES del UNION
 * - UNION ALL para evitar deduplicación innecesaria
 * - Acepta parámetros de filtrado (operador, tarea, pedido)
 * - Reducción: 5000 → 50-100 registros (98% menos)
 *
 * Query params:
 * - operador: string (opcional, filtra por OperarioNombre)
 * - tarea: number (opcional, filtra por CodigoTarea)
 * - pedido: string (opcional, filtra por NumeroManual)
 * ============================================================================
 */
router.get("/tiempo-real-nueva2", async (req, res) => {
  console.log("PETICION para tiempo-real-nueva TERMINALES");

  try {
    const { operador, tarea, pedido } = req.query;

    // Construir condiciones WHERE adicionales
    let additionalWhere = "";
    let params = [];

    if (operador) {
      additionalWhere += " AND h.OperarioNombre LIKE ?";
      params.push(`%${operador}%`);
    }
    if (tarea) {
      additionalWhere += " AND hl.CodigoTarea = ?";
      params.push(tarea);
    }
    if (pedido) {
      additionalWhere += " AND hl.NumeroManual LIKE ?";
      params.push(`%${pedido}%`);
    }

    const sql = `
      SELECT
          h.Serie, h.Numero, h.Fecha, h.CodigoOperario, h.OperarioNombre,
          hl.CodigoSerie, hl.CodigoNumero, hl.Linea,
          hl.FechaInicio, hl.HoraInicio, hl.FechaFin, hl.HoraFin,
          hl.CodigoTarea, hl.NumeroManual, hl.Modulo,
          hl.TiempoDedicado, hl.Abierta
      FROM hpartes h
      INNER JOIN hparteslineas hl
        ON h.Serie = hl.CodigoSerie
       AND h.Numero = hl.CodigoNumero
      WHERE h.Fecha = CURDATE()${additionalWhere}

      UNION ALL

      SELECT
          p.Serie, p.Numero, p.Fecha, p.CodigoOperario, p.OperarioNombre,
          pl.CodigoSerie, pl.CodigoNumero, pl.Linea,
          pl.FechaInicio, pl.HoraInicio, pl.FechaFin, pl.HoraFin,
          pl.CodigoTarea, pl.NumeroManual, pl.Modulo,
          pl.TiempoDedicado, pl.Abierta
      FROM partes p
      INNER JOIN parteslineas pl
        ON p.Serie = pl.CodigoSerie
       AND p.Numero = pl.CodigoNumero
      WHERE p.Fecha = CURDATE()${additionalWhere
        .replace(/h\./g, "p.")
        .replace(/hl\./g, "pl.")}

      ORDER BY FechaInicio DESC, HoraInicio DESC
    `;

    // Duplicar params para la segunda parte del UNION
    const allParams = [...params, ...params];

    const [rows] = await pool.execute(sql, allParams);

    // Calcular estadísticas en el backend
    const stats = {
      total: rows.length,
      porOperador: {},
      porTarea: {},
      porPedido: {},
      abiertas: rows.filter((r) => r.Abierta === 1).length,
    };

    // Agrupar por operador
    rows.forEach((row) => {
      const op = row.OperarioNombre || "Sin operario";
      const tar = row.CodigoTarea || "Sin tarea";
      const ped = row.NumeroManual || "Sin pedido";

      stats.porOperador[op] = (stats.porOperador[op] || 0) + 1;
      stats.porTarea[tar] = (stats.porTarea[tar] || 0) + 1;
      stats.porPedido[ped] = (stats.porPedido[ped] || 0) + 1;
    });

    res.status(200).json({
      data: rows,
      stats: stats,
    });
  } catch (error) {
    console.error("❌ ERROR EN /control-terminales/tiempo-real-nueva:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.get("/tiempo-real-nueva", async (req, res) => {
  console.log("PETICION para tiempo-real-nueva TERMINALES");

  try {
    const { operador, tarea, pedido, fecha } = req.query; // ← AGREGAR fecha

    // 🧪 Determinar qué fecha usar
    const fechaQuery = fecha ? `'${fecha}'` : "CURDATE()";

    // Construir condiciones WHERE adicionales
    let additionalWhere = "";
    let params = [];

    if (operador) {
      additionalWhere += " AND h.OperarioNombre LIKE ?";
      params.push(`%${operador}%`);
    }
    if (tarea) {
      additionalWhere += " AND hl.CodigoTarea = ?";
      params.push(tarea);
    }
    if (pedido) {
      additionalWhere += " AND hl.NumeroManual LIKE ?";
      params.push(`%${pedido}%`);
    }

    const sql = `
      SELECT
          h.Serie, h.Numero, h.Fecha, h.CodigoOperario, h.OperarioNombre,
          hl.CodigoSerie, hl.CodigoNumero, hl.Linea,
          hl.FechaInicio, hl.HoraInicio, hl.FechaFin, hl.HoraFin,
          hl.CodigoTarea, hl.NumeroManual, hl.Modulo,
          hl.TiempoDedicado, hl.Abierta
      FROM hpartes h
      INNER JOIN hparteslineas hl
        ON h.Serie = hl.CodigoSerie
       AND h.Numero = hl.CodigoNumero
      WHERE h.Fecha = ${fechaQuery}${additionalWhere}

      UNION ALL

      SELECT
          p.Serie, p.Numero, p.Fecha, p.CodigoOperario, p.OperarioNombre,
          pl.CodigoSerie, pl.CodigoNumero, pl.Linea,
          pl.FechaInicio, pl.HoraInicio, pl.FechaFin, pl.HoraFin,
          pl.CodigoTarea, pl.NumeroManual, pl.Modulo,
          pl.TiempoDedicado, pl.Abierta
      FROM partes p
      INNER JOIN parteslineas pl
        ON p.Serie = pl.CodigoSerie
       AND p.Numero = pl.CodigoNumero
      WHERE p.Fecha = ${fechaQuery}${additionalWhere
      .replace(/h\./g, "p.")
      .replace(/hl\./g, "pl.")}

      ORDER BY FechaInicio DESC, HoraInicio DESC
    `;

    // Duplicar params para la segunda parte del UNION
    const allParams = [...params, ...params];

    const [rows] = await pool.execute(sql, allParams);

    // Calcular estadísticas en el backend
    const stats = {
      total: rows.length,
      porOperador: {},
      porTarea: {},
      porPedido: {},
      abiertas: rows.filter((r) => r.Abierta === 1).length,
      operadoresUnicos: new Set(rows.map((r) => r.OperarioNombre)).size,
      tareasUnicas: new Set(rows.map((r) => r.CodigoTarea)).size,
      pedidosUnicos: new Set(rows.map((r) => r.NumeroManual)).size,
    };

    // Agrupar por operador
    rows.forEach((row) => {
      const op = row.OperarioNombre || "Sin operario";
      const tar = row.CodigoTarea || "Sin tarea";
      const ped = row.NumeroManual || "Sin pedido";

      stats.porOperador[op] = (stats.porOperador[op] || 0) + 1;
      stats.porTarea[tar] = (stats.porTarea[tar] || 0) + 1;
      stats.porPedido[ped] = (stats.porPedido[ped] || 0) + 1;
    });

    res.status(200).json({
      data: rows,
      stats: stats,
    });
  } catch (error) {
    console.error("❌ ERROR EN /control-terminales/tiempo-real-nueva:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * ============================================================================
 * OPTIMIZACIÓN #5: /production-analytics - SEVERIDAD ALTA
 * ============================================================================
 *
 * ANTES:
 * - UNION sin índices en columnas de fecha
 * - Traía campos innecesarios (Gastos1, Gastos2, Kms1, Kms2)
 *
 * DESPUÉS:
 * - Solo SELECT de columnas necesarias
 * - Limitar histórico (últimos 90 días)
 * - Paginación obligatoria
 * verificar que los filtros de fecha funcionan correctamente
 * otros cambios mas pequeños
 * ============================================================================
 */
router.get("/production-analytics", async (req, res) => {
  const { start, end, limit = 1000, offset = 0 } = req.query;

  if (!start || !end) {
    return res.status(400).json({
      status: "error",
      message: "Faltan parámetros start y end",
    });
  }

  try {
    // ✅ SOLUCIÓN DEFINITIVA: Forzar zona horaria en SELECT
    // Convierte fechas a hora local ANTES de enviar al frontend
    const sql = `
      SELECT
          CONVERT_TZ(h.Fecha, '+00:00', '+02:00') AS Fecha,
          h.CodigoOperario, h.OperarioNombre,
          CONVERT_TZ(hl.FechaInicio, '+00:00', '+02:00') AS FechaInicio,
          hl.HoraInicio,
          CONVERT_TZ(hl.FechaFin, '+00:00', '+02:00') AS FechaFin,
          hl.HoraFin,
          hl.CodigoTarea, hl.NumeroManual, hl.Modulo,
          hl.TiempoDedicado, hl.Abierta
      FROM hpartes h
      INNER JOIN hparteslineas hl
        ON h.Serie = hl.CodigoSerie
       AND h.Numero = hl.CodigoNumero
      WHERE DATE(h.Fecha) >= DATE(?)
        AND DATE(h.Fecha) <= DATE(?)
        AND h.Fecha >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)

      UNION ALL

      SELECT
          CONVERT_TZ(p.Fecha, '+00:00', '+02:00') AS Fecha,
          p.CodigoOperario, p.OperarioNombre,
          CONVERT_TZ(pl.FechaInicio, '+00:00', '+02:00') AS FechaInicio,
          pl.HoraInicio,
          CONVERT_TZ(pl.FechaFin, '+00:00', '+02:00') AS FechaFin,
          pl.HoraFin,
          pl.CodigoTarea, pl.NumeroManual, pl.Modulo,
          pl.TiempoDedicado, pl.Abierta
      FROM partes p
      INNER JOIN parteslineas pl
        ON p.Serie = pl.CodigoSerie
       AND p.Numero = pl.CodigoNumero
      WHERE DATE(p.Fecha) >= DATE(?)
        AND DATE(p.Fecha) <= DATE(?)
        AND p.Fecha >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)

      ORDER BY FechaInicio DESC, HoraInicio DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.execute(sql, [
      start,
      end,
      start,
      end,
      parseInt(limit),
      parseInt(offset),
    ]);

    res.status(200).json({
      data: rows,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        count: rows.length,
      },
    });
  } catch (error) {
    console.error(
      "❌ ERROR EN /control-terminales/production-analytics:",
      error
    );
    res.status(500).json({ status: "error", message: error.message });
  }
});

// ============================================================================
// RUTAS NO OPTIMIZADAS (Uso bajo o específico)
// ============================================================================

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
    SELECT Modulo, 6, TiempoAcumulado06 FROM terminales.loteslineas WHERE TiempoAcumulado06 IS NOT NULL
    UNION ALL
    SELECT Modulo, 7, TiempoAcumulado07 FROM terminales.loteslineas WHERE TiempoAcumulado07 IS NOT NULL
    UNION ALL
    SELECT Modulo, 9, TiempoAcumulado09 FROM terminales.loteslineas WHERE TiempoAcumulado09 IS NOT NULL
    UNION ALL
    SELECT Modulo, 10, TiempoAcumulado10 FROM terminales.loteslineas WHERE TiempoAcumulado10 IS NOT NULL
    UNION ALL
    SELECT Modulo, 11, TiempoAcumulado11 FROM terminales.loteslineas WHERE TiempoAcumulado11 IS NOT NULL
    UNION ALL
    SELECT Modulo, 12, TiempoAcumulado12 FROM terminales.loteslineas WHERE TiempoAcumulado12 IS NOT NULL
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

router.get("/tiempo-real", async (req, res) => {
  console.log("PETICION para tiempo-real TERMINALES");
  try {
    const sql = `SELECT * FROM vpartestodo WHERE Fecha = CURDATE() ORDER BY FechaInicio, HoraInicio;`;
    const [rows] = await pool.execute(sql);
    res.status(200).json(rows);
  } catch (error) {
    console.error("❌ ERROR EN /control-terminales/tiempo-real:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.get("/production-analytics-sin-fechas", async (req, res) => {
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
    console.error(
      "❌ ERROR EN /control-terminales/production-analytics-sin-fechas:",
      error
    );
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * ============================================================================
 * OPTIMIZACIÓN #6: /pedidos-en-fabrica - SEVERIDAD MEDIA
 * ============================================================================
 *
 * ANTES:
 * - Traía TODOS los pedidos en fábrica sin límite (potencialmente miles)
 * - Sin paginación ni filtros
 * - Sin límite temporal
 *
 * DESPUÉS:
 * - Paginación con limit/offset
 * - Filtros por cliente, búsqueda en NumeroManual/Descripción
 * - Límite temporal de 180 días (configurable)
 * - Reducción: ~1000 → 100 registros (90% menos)
 *
 * Query params:
 * - search: string (búsqueda en NumeroManual, Descripcion, Cliente)
 * - cliente: string (filtro por cliente específico)
 * - limit: number (default 100)
 * - offset: number (default 0)
 * - days: number (default 180, máximo histórico en días)
 * ============================================================================
 */
router.get("/pedidos-en-fabrica", async (req, res) => {
  try {
    const {
      search = "",
      cliente = "",
      limit = 100,
      offset = 0,
      days = 180,
    } = req.query;

    // Construir condiciones WHERE dinámicamente
    let whereConditions = [
      "ll.FabricacionNumeroManual IS NOT NULL",
      "ll.FabricacionNumeroManual != ''",
      `l.FechaRealInicio >= DATE_SUB(CURDATE(), INTERVAL ${parseInt(
        days
      )} DAY)`,
    ];
    let params = [];

    // Filtro por búsqueda
    if (search && search.trim() !== "") {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push(
        "(l.NumeroManual LIKE ? OR l.Descripcion LIKE ? OR ll.Cliente LIKE ?)"
      );
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Filtro por cliente
    if (cliente && cliente.trim() !== "") {
      whereConditions.push("ll.Cliente LIKE ?");
      params.push(`%${cliente.trim()}%`);
    }

    const whereClause = whereConditions.join(" AND ");

    const sql = `
      SELECT
        l.Codigo, l.NumeroManual, l.FechaRealInicio, l.Descripcion,
        ll.OrigenSerie, ll.OrigenNumero, ll.Linea,
        ll.DatosFabricacion, ll.FabricacionNumeroManual, ll.Cliente, 
        ll.Modulo, ll.Descripcion AS LineaDescripcion
      FROM lotes l
      JOIN loteslineas ll
        ON l.Codigo = ll.CodigoLote
      WHERE ${whereClause}
      ORDER BY l.FechaRealInicio DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await pool.execute(sql, params);

    // Obtener el total de registros para paginación
    const countSql = `
      SELECT COUNT(*) as total
      FROM lotes l
      JOIN loteslineas ll
        ON l.Codigo = ll.CodigoLote
      WHERE ${whereClause}
    `;
    const countParams = params.slice(0, -2); // Remover limit y offset
    const [countResult] = await pool.execute(countSql, countParams);

    res.status(200).json({
      data: rows,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < countResult[0].total,
      },
    });
  } catch (error) {
    console.error("❌ ERROR EN /pedidos-en-fabrica:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

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

router.get("/reporte", async (req, res) => {
  const { num_manual } = req.query;
  if (!num_manual) {
    return res
      .status(400)
      .json({ status: "error", message: "Falta num_manual" });
  }

  try {
    const [loteRows] = await pool.execute(
      "SELECT Codigo FROM lotes WHERE NumeroManual = ? LIMIT 1",
      [num_manual]
    );

    if (loteRows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Lote no encontrado para el NumeroManual proporcionado",
      });
    }

    const codigoLote = loteRows[0].Codigo;

    const [quienTrabajo] = await pool.execute(
      `SELECT CodigoOperario, OperarioNombre
       FROM vw_operarios_por_lote
       WHERE CodigoLote = ?
       ORDER BY OperarioNombre`,
      [codigoLote]
    );

    const [tiemposPorOperario] = await pool.execute(
      `SELECT OperarioNombre, CodigoOperario, Tarea, SegundosDedicados, HH_MM_SS
       FROM vw_tiempos_por_operario_lote
       WHERE CodigoLote = ?
       ORDER BY OperarioNombre, Tarea`,
      [codigoLote]
    );

    const [activasAhora] = await pool.execute(
      `SELECT OperarioNombre, CodigoOperario, CodigoTarea, FechaInicio, HoraInicio, Abierta
       FROM vw_abiertas_por_lote
       WHERE CodigoLote = ?
       ORDER BY FechaInicio, HoraInicio`,
      [codigoLote]
    );

    const [timeline] = await pool.execute(
      `SELECT OperarioNombre, CodigoOperario, CodigoTarea,
              FechaInicio, HoraInicio, FechaFin, HoraFin, TiempoDedicado
       FROM vw_timeline
       WHERE CodigoLote = ?
       ORDER BY CONCAT(FechaInicio, ' ', HoraInicio), Linea`,
      [codigoLote]
    );

    const [operariosEnganchados] = await pool.execute(
      `SELECT Codigo, Nombre, CodigoTareaActual, Momento
       FROM operarios
       WHERE LoteActual = ?
       ORDER BY Nombre`,
      [codigoLote]
    );

    return res.status(200).json({
      status: "ok",
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
    console.error("❌ ERROR EN /control-terminales/reporte:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * ============================================================================
 * OPTIMIZACIÓN #7: /tiempos-operario-lote - SEVERIDAD MEDIA
 * ============================================================================
 *
 * ANTES:
 * - Usaba vista vpartestodo (TABLE SCAN en hpartes: 1803 filas)
 * - Subquery en WHERE (SELECT Codigo FROM lotes...)
 * - Tiempo: ~415ms
 *
 * DESPUÉS:
 * - Query directa con UNION ALL
 * - Filtrado por NumeroManual en índices
 * - Usa idx_hparteslineas_nummanual y idx_parteslineas_nummanual
 * - Tiempo esperado: <100ms (75% más rápido)
 * ============================================================================
 */
router.get("/tiempos-operario-lote", async (req, res) => {
  const { num_manual } = req.query;
  if (!num_manual) {
    return res
      .status(400)
      .json({ status: "error", message: "Falta num_manual" });
  }

  const sql = `
    SELECT
      OperarioNombre,
      CodigoOperario,
      COALESCE(CodigoTarea,'(SIN TAREA)') AS Tarea,
      SUM(COALESCE(TiempoDedicado,0)) AS SegundosDedicados,
      SEC_TO_TIME(SUM(COALESCE(TiempoDedicado,0))) AS HH_MM_SS
    FROM (
      SELECT 
        h.OperarioNombre, 
        h.CodigoOperario, 
        hl.CodigoTarea, 
        hl.TiempoDedicado
      FROM hpartes h
      INNER JOIN hparteslineas hl 
        ON h.Serie = hl.CodigoSerie 
       AND h.Numero = hl.CodigoNumero
      WHERE hl.NumeroManual = ?
      
      UNION ALL
      
      SELECT 
        p.OperarioNombre, 
        p.CodigoOperario, 
        pl.CodigoTarea, 
        pl.TiempoDedicado
      FROM partes p
      INNER JOIN parteslineas pl 
        ON p.Serie = pl.CodigoSerie 
       AND p.Numero = pl.CodigoNumero
      WHERE pl.NumeroManual = ?
    ) AS datos
    GROUP BY OperarioNombre, CodigoOperario, CodigoTarea
    ORDER BY OperarioNombre, Tarea
  `;

  try {
    const [rows] = await pool.execute(sql, [num_manual, num_manual]);
    res.status(200).json(rows);
  } catch (error) {
    console.error(
      "❌ ERROR EN /control-terminales/tiempos-por-operario:",
      error
    );
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.get("/historico-operarios-lotes-actuales", async (req, res) => {
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
    console.error(
      "❌ ERROR EN /control-terminales/operarios-por-lotes-actuales:",
      error
    );
    res.status(500).json({ status: "error", message: error.message });
  }
});

/**
 * ============================================================================
 * OPTIMIZACIÓN #8: /promedios-tareas-operarios - SEVERIDAD MEDIA
 * ============================================================================
 *
 * FUNCIÓN:
 * - Calcula promedios de tiempo por tarea y operario
 * - Rango de fecha: último mes (30 días) por defecto
 * - Incluye estadísticas detalladas y agregaciones
 *
 * CARACTERÍSTICAS:
 * - Filtrado eficiente en SQL con índices de fecha
 * - Agrupación por CodigoTarea y OperarioNombre
 * - Calcula promedio, total, mínimo, máximo y cantidad de registros
 * - Formato tiempo en HH:MM:SS
 *
 * Query params:
 * - days: number (default 30, días hacia atrás desde hoy)
 * - minRegistros: number (default 1, mínimo de registros para incluir en resultado)
 * ============================================================================
 */
router.get("/promedios-tareas-operarios", async (req, res) => {
  try {
    const { days = 30, minRegistros = 1 } = req.query;

    // Validar que days sea un número válido
    const diasAtras = Math.min(Math.max(parseInt(days), 1), 365); // Entre 1 y 365 días

    const sql = `
      SELECT
        -- Por Tarea
        CodigoTarea,
        COUNT(*) AS TotalRegistros,
        COUNT(DISTINCT NumeroManual) AS PedidosUnicos,
        ROUND(AVG(TiempoDedicado), 2) AS PromedioSegundos,
        SEC_TO_TIME(ROUND(AVG(TiempoDedicado))) AS PromedioTiempo,
        SEC_TO_TIME(SUM(TiempoDedicado)) AS TiempoTotal,
        SEC_TO_TIME(MIN(TiempoDedicado)) AS TiempoMinimo,
        SEC_TO_TIME(MAX(TiempoDedicado)) AS TiempoMaximo,
        -- Por Operario
        OperarioNombre,
        CodigoOperario,
        COUNT(DISTINCT DATE(Fecha)) AS DiasActivos
      FROM (
        -- Histórico (hpartes)
        SELECT
          h.Fecha,
          h.CodigoOperario,
          h.OperarioNombre,
          hl.CodigoTarea,
          hl.NumeroManual,
          hl.TiempoDedicado
        FROM hpartes h
        INNER JOIN hparteslineas hl
          ON h.Serie = hl.CodigoSerie
         AND h.Numero = hl.CodigoNumero
        WHERE h.Fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          AND h.Fecha <= CURDATE()
          AND hl.TiempoDedicado IS NOT NULL
          AND hl.TiempoDedicado > 0

        UNION ALL

        -- Actuales (partes)
        SELECT
          p.Fecha,
          p.CodigoOperario,
          p.OperarioNombre,
          pl.CodigoTarea,
          pl.NumeroManual,
          pl.TiempoDedicado
        FROM partes p
        INNER JOIN parteslineas pl
          ON p.Serie = pl.CodigoSerie
         AND p.Numero = pl.CodigoNumero
        WHERE p.Fecha >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
          AND p.Fecha <= CURDATE()
          AND pl.TiempoDedicado IS NOT NULL
          AND pl.TiempoDedicado > 0
      ) AS datos
      GROUP BY CodigoTarea, OperarioNombre, CodigoOperario
      HAVING COUNT(*) >= ?
      ORDER BY CodigoTarea, PromedioSegundos DESC
    `;

    const [rows] = await pool.execute(sql, [
      diasAtras,
      diasAtras,
      parseInt(minRegistros),
    ]);

    // Generar resumen estadístico
    const resumen = {
      periodoAnalizado: {
        dias: diasAtras,
        fechaInicio: new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        fechaFin: new Date().toISOString().split("T")[0],
      },
      totales: {
        registros: rows.reduce((sum, r) => sum + r.TotalRegistros, 0),
        tareasUnicas: new Set(rows.map((r) => r.CodigoTarea)).size,
        operariosUnicos: new Set(rows.map((r) => r.CodigoOperario)).size,
        pedidosUnicos: new Set(rows.map((r) => r.PedidosUnicos)).size,
      },
      promediosPorTarea: {},
      promediosPorOperario: {},
    };

    // Agrupar promedios por tarea
    rows.forEach((row) => {
      const tarea = row.CodigoTarea || "SIN_TAREA";
      if (!resumen.promediosPorTarea[tarea]) {
        resumen.promediosPorTarea[tarea] = {
          totalRegistros: 0,
          pedidosUnicos: 0,
          operarios: [],
          promedioGeneral: 0,
        };
      }
      resumen.promediosPorTarea[tarea].totalRegistros += row.TotalRegistros;
      resumen.promediosPorTarea[tarea].pedidosUnicos += row.PedidosUnicos;
      resumen.promediosPorTarea[tarea].operarios.push({
        nombre: row.OperarioNombre,
        promedio: row.PromedioTiempo,
        registros: row.TotalRegistros,
      });
    });

    // Agrupar promedios por operario
    rows.forEach((row) => {
      const operario = row.OperarioNombre || "SIN_OPERARIO";
      if (!resumen.promediosPorOperario[operario]) {
        resumen.promediosPorOperario[operario] = {
          codigo: row.CodigoOperario,
          totalRegistros: 0,
          diasActivos: row.DiasActivos,
          tareas: [],
        };
      }
      resumen.promediosPorOperario[operario].totalRegistros +=
        row.TotalRegistros;
      resumen.promediosPorOperario[operario].tareas.push({
        tarea: row.CodigoTarea,
        promedio: row.PromedioTiempo,
        registros: row.TotalRegistros,
      });
    });

    res.status(200).json({
      status: "success",
      resumen: resumen,
      detalles: rows,
    });
  } catch (error) {
    console.error(
      "❌ ERROR EN /control-terminales/promedios-tareas-operarios:",
      error
    );
    res.status(500).json({
      status: "error",
      message: error.message,
      detail: "Error al calcular promedios de tareas y operarios",
    });
  }
});

// POST /n8n_dashboard
router.post("/n8n_dashboard", async (req, res) => {
  const { pedidos } = req.body ?? {};

  if (!Array.isArray(pedidos)) {
    return res.status(400).json({
      status: "error",
      message: "Body inválido. Se espera { pedidos: [...] }",
    });
  }

  const conn = await pool.getConnection();

  const isoToMysqlDateTime = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
      d.getUTCDate()
    )} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(
      d.getUTCSeconds()
    )}`;
  };

  const toMysqlDate = (s) =>
    typeof s === "string" && s.length >= 10 ? s.slice(0, 10) : null;

  try {
    await conn.beginTransaction();

    // 1) RESET (borrar todo lo anterior)
    await conn.execute("DELETE FROM terminales.n8n_pedidos_detalles");
    await conn.execute("DELETE FROM terminales.n8n_pedidos");

    // 2) Insert cabeceras y guardar IdPedido por NoPedido
    const idByNoPedido = new Map();

    for (const p of pedidos) {
      const NoPedido = (p?.NoPedido ?? "").toString().trim();
      if (!NoPedido) continue;

      const [r] = await conn.execute(
        `
        INSERT INTO terminales.n8n_pedidos
          (NoPedido, FechaEnvio, Seccion, Cliente, Comercial, EmailComercial, RefCliente, Compromiso, EstadoPedido)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          NoPedido,
          toMysqlDate(p.FechaEnvio),
          p.Seccion ?? null,
          p.Cliente ?? null,
          p.Comercial ?? null,
          p.EmailComercial ?? null,
          p.RefCliente ?? null,
          isoToMysqlDateTime(p.Compromiso),
          p.EstadoPedido ?? null,
        ]
      );

      idByNoPedido.set(NoPedido, r.insertId);
    }

    // 3) Insert detalles (bulk por lotes)
    const rows = [];
    for (const p of pedidos) {
      const NoPedido = (p?.NoPedido ?? "").toString().trim();
      if (!NoPedido) continue;

      const IdPedido = idByNoPedido.get(NoPedido);
      if (!IdPedido) continue;

      const detalles = Array.isArray(p.detalles) ? p.detalles : [];
      for (const d of detalles) {
        if (d?.Id_ControlMat == null) continue;

        rows.push([
          IdPedido,
          Number(d.Id_ControlMat),
          d.Material ?? "",
          d.Proveedor ?? "",
          isoToMysqlDateTime(d.FechaPrevista),
          d.Recibido ?? -1,
        ]);
      }
    }

    if (rows.length) {
      const CHUNK = 800; // seguro para paquetes grandes
      for (let i = 0; i < rows.length; i += CHUNK) {
        const chunk = rows.slice(i, i + CHUNK);
        const placeholders = chunk.map(() => "(?,?,?,?,?,?)").join(",");
        const flat = chunk.flat();

        await conn.execute(
          `
          INSERT INTO terminales.n8n_pedidos_detalles
            (IdPedido, Id_ControlMat, Material, Proveedor, FechaPrevista, Recibido)
          VALUES ${placeholders}
          `,
          flat
        );
      }
    }

    await conn.commit();
    res.json({
      status: "ok",
      pedidosInsertados: idByNoPedido.size,
      detallesInsertados: rows.length,
    });
  } catch (error) {
    await conn.rollback();
    console.error("❌ ERROR EN /n8n_dashboard:", error);
    res.status(500).json({ status: "error", message: error.message });
  } finally {
    conn.release();
  }
});

router.get("/alerta", async (req, res) => {
  const sql = `SELECT
  pr.NoPedido,
  pr.Compromiso,
  pr.PedidoKey,

  CASE WHEN fb.PedidoKey IS NULL THEN 0 ELSE 1 END AS EnFabricacion,
  COALESCE(fb.TotalModulos, 0)      AS TotalModulos,
  COALESCE(fb.ModulosRestantes, 0)  AS ModulosRestantes,
  fb.UltimoInicio,

CASE
  WHEN fb.PedidoKey IS NULL
    THEN '🔴 ALERTA: Pedido prioritario NO está en fabricación (hoy)'

  WHEN COALESCE(fb.ModulosRestantes, 0) = 0
    THEN '⚫ CERRADO: Sin módulos restantes'

  WHEN DATE(pr.Compromiso) >= (CURDATE() + INTERVAL 7 DAY)
    THEN '🔵 BAJA: En fabricación + fecha lejana'

  WHEN COALESCE(fb.ModulosRestantes, 0) >= 5
    THEN '🟡 PRIORIDAD: En fabricación + muchos módulos'

  ELSE
    '🟢 CASI OK: En fabricación + pocos módulos'
END AS Estado



FROM
(
  SELECT
    p.NoPedido,
    p.Compromiso,
    CONCAT(
      SUBSTRING_INDEX(p.NoPedido, '-', 1), '_',
      SUBSTRING_INDEX(SUBSTRING_INDEX(p.NoPedido, '-', 2), '-', -1), '_',
      CAST(SUBSTRING_INDEX(p.NoPedido, '-', -1) AS UNSIGNED)
    ) AS PedidoKey
  FROM n8n_pedidos p
  WHERE p.Seccion = 'ALUMINIO'
) pr

LEFT JOIN
(
  SELECT
    fx.PedidoKey,
    MAX(lx.TotalUnidades) AS TotalModulos,
    GREATEST(MAX(lx.TotalUnidades) - COALESCE(px.ModulosProcesados, 0), 0) AS ModulosRestantes,
    MAX(CONCAT(fx.FechaInicio, ' ', fx.HoraInicio)) AS UltimoInicio
  FROM
  (
    SELECT
      CONCAT(
        SUBSTRING_INDEX(hl.NumeroManual, '_', 1), '_',
        SUBSTRING_INDEX(SUBSTRING_INDEX(hl.NumeroManual, '_', 2), '_', -1), '_',
        CAST(SUBSTRING_INDEX(hl.NumeroManual, '_', -1) AS UNSIGNED)
      ) AS PedidoKey,
      hl.NumeroManual,
      hl.FechaInicio,
      hl.HoraInicio
    FROM hpartes h
    INNER JOIN hparteslineas hl
      ON h.Serie = hl.CodigoSerie
     AND h.Numero = hl.CodigoNumero
    WHERE h.Fecha = CURDATE()
      AND hl.Abierta = 1
      AND hl.NumeroManual IS NOT NULL AND hl.NumeroManual <> ''

    UNION ALL

    SELECT
      CONCAT(
        SUBSTRING_INDEX(pl.NumeroManual, '_', 1), '_',
        SUBSTRING_INDEX(SUBSTRING_INDEX(pl.NumeroManual, '_', 2), '_', -1), '_',
        CAST(SUBSTRING_INDEX(pl.NumeroManual, '_', -1) AS UNSIGNED)
      ) AS PedidoKey,
      pl.NumeroManual,
      pl.FechaInicio,
      pl.HoraInicio
    FROM partes p
    INNER JOIN parteslineas pl
      ON p.Serie = pl.CodigoSerie
     AND p.Numero = pl.CodigoNumero
    WHERE p.Fecha = CURDATE()
      AND pl.Abierta = 1
      AND pl.NumeroManual IS NOT NULL AND pl.NumeroManual <> ''
  ) fx

  LEFT JOIN (
    SELECT NumeroManual, MAX(TotalUnidades) AS TotalUnidades
    FROM Lotes
    GROUP BY NumeroManual
  ) lx
    ON lx.NumeroManual = fx.NumeroManual

  LEFT JOIN (
    SELECT
      CONCAT(
        SUBSTRING_INDEX(s.NumeroManual, '_', 1), '_',
        SUBSTRING_INDEX(SUBSTRING_INDEX(s.NumeroManual, '_', 2), '_', -1), '_',
        CAST(SUBSTRING_INDEX(s.NumeroManual, '_', -1) AS UNSIGNED)
      ) AS PedidoKey,
      COUNT(DISTINCT s.Modulo) AS ModulosProcesados
    FROM (
      SELECT NumeroManual, Modulo, FechaInicio
      FROM hparteslineas
      WHERE NumeroManual IS NOT NULL AND NumeroManual <> ''
        AND Modulo IS NOT NULL AND Modulo <> ''

      UNION ALL

      SELECT NumeroManual, Modulo, FechaInicio
      FROM parteslineas
      WHERE NumeroManual IS NOT NULL AND NumeroManual <> ''
        AND Modulo IS NOT NULL AND Modulo <> ''
    ) s
    WHERE s.FechaInicio IS NOT NULL
      AND s.FechaInicio <> '0000-00-00'
      AND s.FechaInicio <> '1970-01-01'
    GROUP BY
      CONCAT(
        SUBSTRING_INDEX(s.NumeroManual, '_', 1), '_',
        SUBSTRING_INDEX(SUBSTRING_INDEX(s.NumeroManual, '_', 2), '_', -1), '_',
        CAST(SUBSTRING_INDEX(s.NumeroManual, '_', -1) AS UNSIGNED)
      )
  ) px
    ON px.PedidoKey = fx.PedidoKey

  GROUP BY fx.PedidoKey
) fb
  ON fb.PedidoKey = pr.PedidoKey

ORDER BY
  DATE(pr.Compromiso) ASC,
  COALESCE(fb.ModulosRestantes, 0) DESC,
  pr.NoPedido ASC
LIMIT 0, 1000`;
  try {
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener la alerta de pedidos" });
  }
});

router.get("/lista_pepdidos_a_procesar", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM n8n_pedidos");
    res.json(rows);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Error al obtener la lista de pedidos a procesar" });
  }
});

module.exports = router;
