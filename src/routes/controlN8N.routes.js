const express = require("express");
const pool = require("../config/databaseAlamcen");

const router = express.Router();

router.post("/n8n_dashboard_BEFORE", async (req, res) => {
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
        await conn.execute("DELETE FROM almacen.n8n_pedidos_detalles");
        await conn.execute("DELETE FROM almacen.n8n_pedidos");

        // 2) Insert cabeceras y guardar IdPedido por NoPedido
        const idByNoPedido = new Map();

        for (const p of pedidos) {
            const NoPedido = (p?.NoPedido ?? "").toString().trim();
            if (!NoPedido) continue;

            const [r] = await conn.execute(
                `
        INSERT INTO almacen.n8n_pedidos
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

        // 3) Insert detalles (bulk por lotes) con DEDUPE por (IdPedido, Id_ControlMat)
        const rows = [];
        const seen = new Set(); // clave compuesta para evitar duplicados en el payload

        for (const p of pedidos) {
            const NoPedido = (p?.NoPedido ?? "").toString().trim();
            if (!NoPedido) continue;

            const IdPedido = idByNoPedido.get(NoPedido);
            if (!IdPedido) continue;

            const detalles = Array.isArray(p.detalles) ? p.detalles : [];

            for (const d of detalles) {
                if (d?.Id_ControlMat == null) continue;

                const Id_ControlMat = Number(d.Id_ControlMat);
                if (Number.isNaN(Id_ControlMat)) continue;

                const key = `${IdPedido}-${Id_ControlMat}`;
                if (seen.has(key)) continue; // <-- evita duplicados en el mismo batch
                seen.add(key);

                rows.push([
                    IdPedido,
                    Id_ControlMat,
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
          INSERT INTO almacen.n8n_pedidos_detalles
            (IdPedido, Id_ControlMat, Material, Proveedor, FechaPrevista, Recibido)
          VALUES ${placeholders}
          ON DUPLICATE KEY UPDATE
            Material = VALUES(Material),
            Proveedor = VALUES(Proveedor),
            FechaPrevista = VALUES(FechaPrevista),
            Recibido = VALUES(Recibido)
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
            // si quieres, puedes exponer cuántos duplicados se filtraron:
            // duplicadosFiltrados: (totalDetallesOriginales - rows.length),
        });
    } catch (error) {
        await conn.rollback();
        console.error("❌ ERROR EN /n8n_dashboard:", error);
        res.status(500).json({ status: "error", message: error.message });
    } finally {
        conn.release();
    }
});

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
        await conn.execute("DELETE FROM almacen.n8n_pedidos_tipo_trabajo");
        await conn.execute("DELETE FROM almacen.n8n_pedidos_detalles");
        await conn.execute("DELETE FROM almacen.n8n_pedidos");

        // 2) Insert cabeceras y guardar IdPedido por NoPedido
        const idByNoPedido = new Map();
        let pedidosInsertados = 0;

        for (const p of pedidos) {
            const NoPedido = (p?.NoPedido ?? "").toString().trim();
            if (!NoPedido) continue;

            const [r] = await conn.execute(
                `
        INSERT INTO almacen.n8n_pedidos
          (NoPedido, FechaEnvio, Seccion, Cliente, Comercial, EmailComercial, 
           RefCliente, Compromiso, EstadoPedido, ColorGeneral, FechaAltaPedido, FormatoTrabajo)
        VALUES
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
                [
                    NoPedido,
                    toMysqlDate(p.FechaEnvio),
                    p.Seccion ?? null,
                    p.Cliente ?? null,
                    p.Comercial ?? null,
                    p.EmailComercial ?? null,
                    p.RefCliente ?? null,
                    isoToMysqlDateTime(p.Compromiso) || toMysqlDate(p.Compromiso),
                    p.EstadoPedido ?? null,
                    p.ColorGeneral ?? null,
                    toMysqlDate(p.FechaAltaPedido),
                    p.FormatoTrabajo ?? null,
                ]
            );

            idByNoPedido.set(NoPedido, r.insertId);
            pedidosInsertados++;
        }

        // 3) Insert detalles de materiales (bulk por lotes) con DEDUPE
        const rowsMateriales = [];
        const seenMateriales = new Set();

        for (const p of pedidos) {
            const NoPedido = (p?.NoPedido ?? "").toString().trim();
            if (!NoPedido) continue;

            const IdPedido = idByNoPedido.get(NoPedido);
            if (!IdPedido) continue;

            // CAMBIO: ahora se llama "detallesMateriales" en lugar de "detalles"
            const detalles = Array.isArray(p.detallesMateriales) ? p.detallesMateriales : [];

            for (const d of detalles) {
                if (d?.Id_ControlMat == null) continue;

                const Id_ControlMat = Number(d.Id_ControlMat);
                if (Number.isNaN(Id_ControlMat)) continue;

                const key = `${IdPedido}-${Id_ControlMat}`;
                if (seenMateriales.has(key)) continue;
                seenMateriales.add(key);

                rowsMateriales.push([
                    IdPedido,
                    Id_ControlMat,
                    d.Material ?? "",
                    d.Proveedor ?? "",
                    isoToMysqlDateTime(d.FechaPrevista) || toMysqlDate(d.FechaPrevista),
                    d.Recibido ?? -1,
                    d.NumeroPedido ?? null, // NUEVO CAMPO
                ]);
            }
        }

        if (rowsMateriales.length) {
            const CHUNK = 800;
            for (let i = 0; i < rowsMateriales.length; i += CHUNK) {
                const chunk = rowsMateriales.slice(i, i + CHUNK);
                const placeholders = chunk.map(() => "(?,?,?,?,?,?,?)").join(",");
                const flat = chunk.flat();

                await conn.execute(
                    `
          INSERT INTO almacen.n8n_pedidos_detalles
            (IdPedido, Id_ControlMat, Material, Proveedor, FechaPrevista, Recibido, NumeroPedido)
          VALUES ${placeholders}
          ON DUPLICATE KEY UPDATE
            Material = VALUES(Material),
            Proveedor = VALUES(Proveedor),
            FechaPrevista = VALUES(FechaPrevista),
            Recibido = VALUES(Recibido),
            NumeroPedido = VALUES(NumeroPedido)
          `,
                    flat
                );
            }
        }

        // 4) Insert detalles de tipo de trabajo (NUEVA TABLA)
        const rowsTipoTrabajo = [];

        for (const p of pedidos) {
            const NoPedido = (p?.NoPedido ?? "").toString().trim();
            if (!NoPedido) continue;

            const IdPedido = idByNoPedido.get(NoPedido);
            if (!IdPedido) continue;

            const detallesTrabajo = Array.isArray(p.detallesTipoTrabajo)
                ? p.detallesTipoTrabajo
                : [];

            for (const dt of detallesTrabajo) {
                rowsTipoTrabajo.push([
                    IdPedido,
                    dt.TipoTrabajo ?? null,
                    dt.NFab ?? null,
                    dt.Unidades ?? 0,
                ]);
            }
        }

        if (rowsTipoTrabajo.length) {
            const CHUNK = 800;
            for (let i = 0; i < rowsTipoTrabajo.length; i += CHUNK) {
                const chunk = rowsTipoTrabajo.slice(i, i + CHUNK);
                const placeholders = chunk.map(() => "(?,?,?,?)").join(",");
                const flat = chunk.flat();

                await conn.execute(
                    `
          INSERT INTO almacen.n8n_pedidos_tipo_trabajo
            (IdPedido, TipoTrabajo, NFab, Unidades)
          VALUES ${placeholders}
          `,
                    flat
                );
            }
        }

        await conn.commit();

        res.json({
            status: "ok",
            pedidosInsertados: pedidosInsertados,
            detallesMaterialesInsertados: rowsMateriales.length,
            detallesTipoTrabajoInsertados: rowsTipoTrabajo.length,
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
  FROM almacen.n8n_pedidos p
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

router.get("/alerta2", async (req, res) => {
    const sql = `SELECT
  pr.NoPedido,
  pr.FechaEnvio,
  pr.Compromiso,
  pr.PedidoKey,
  pr.Cliente,
  pr.Comercial,
  pr.RefCliente,
  
  -- Antigüedad del pedido
  DATEDIFF(CURDATE(), pr.FechaEnvio) AS DiasDesdeEnvio,
  DATEDIFF(pr.Compromiso, CURDATE()) AS DiasHastaCompromiso,

  CASE WHEN fb.PedidoKey IS NULL THEN 0 ELSE 1 END AS SeHaFabricado,
  COALESCE(fb.TotalModulos, 0) AS TotalModulos,
  COALESCE(fb.ModulosRestantes, 0) AS ModulosRestantes,
  fb.UltimaFabricacion,
  fb.UltimoInicio,
  
  -- Estado mejorado con más criterios
  CASE
    -- 🔴 CRÍTICO: Nunca fabricado + compromiso vencido/próximo
    WHEN fb.PedidoKey IS NULL AND DATEDIFF(pr.Compromiso, CURDATE()) <= 0
      THEN '🔴 CRÍTICO: NO fabricado + compromiso VENCIDO'
    
    WHEN fb.PedidoKey IS NULL AND DATEDIFF(pr.Compromiso, CURDATE()) BETWEEN 1 AND 3
      THEN '🔴 URGENTE: NO fabricado + compromiso en 1-3 días'
    
    WHEN fb.PedidoKey IS NULL AND DATEDIFF(pr.Compromiso, CURDATE()) BETWEEN 4 AND 7
      THEN '🟠 ALERTA: NO fabricado + compromiso en 4-7 días'
    
    WHEN fb.PedidoKey IS NULL
      THEN '🟡 PENDIENTE: NO fabricado + compromiso lejano'
    
    -- Fabricado pero evaluando progreso
    WHEN COALESCE(fb.ModulosRestantes, 0) = 0
      THEN '✅ COMPLETADO: Todos los módulos fabricados'
    
    WHEN DATEDIFF(pr.Compromiso, CURDATE()) <= 0 AND COALESCE(fb.ModulosRestantes, 0) > 0
      THEN '🔴 CRÍTICO: Compromiso vencido + módulos pendientes'
    
    WHEN DATEDIFF(pr.Compromiso, CURDATE()) BETWEEN 1 AND 3 AND COALESCE(fb.ModulosRestantes, 0) >= 5
      THEN '🟠 URGENTE: Compromiso próximo + muchos módulos'
    
    WHEN DATEDIFF(pr.Compromiso, CURDATE()) BETWEEN 1 AND 3
      THEN '🟡 MONITOREAR: Compromiso próximo + pocos módulos'
    
    WHEN COALESCE(fb.ModulosRestantes, 0) >= 10
      THEN '🟡 PRIORIDAD: Muchos módulos pendientes'
    
    WHEN DATEDIFF(pr.Compromiso, CURDATE()) >= 14
      THEN '🔵 NORMAL: En fabricación + compromiso lejano'
    
    ELSE '🟢 EN CURSO: Progreso adecuado'
  END AS Estado

FROM
(
  SELECT
    p.NoPedido,
    p.FechaEnvio,
    p.Compromiso,
    p.Cliente,
    p.Comercial,
    p.RefCliente,
    CONCAT(
      SUBSTRING_INDEX(p.NoPedido, '-', 1), '_',
      SUBSTRING_INDEX(SUBSTRING_INDEX(p.NoPedido, '-', 2), '-', -1), '_',
      CAST(SUBSTRING_INDEX(p.NoPedido, '-', -1) AS UNSIGNED)
    ) AS PedidoKey
  FROM almacen.n8n_pedidos p
  WHERE p.Seccion = 'ALUMINIO'
) pr

LEFT JOIN
(
  SELECT
    fx.PedidoKey,
    MAX(lx.TotalUnidades) AS TotalModulos,
    GREATEST(MAX(lx.TotalUnidades) - COALESCE(px.ModulosProcesados, 0), 0) AS ModulosRestantes,
    MAX(fx.FechaInicio) AS UltimaFabricacion,
    MAX(CONCAT(fx.FechaInicio, ' ', fx.HoraInicio)) AS UltimoInicio
  FROM
  (
    -- 🔥 CAMBIO: Búsqueda HISTÓRICA (sin filtro de CURDATE())
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
    WHERE hl.NumeroManual IS NOT NULL AND hl.NumeroManual <> ''
      AND hl.FechaInicio IS NOT NULL
      AND hl.FechaInicio <> '0000-00-00'
      AND hl.FechaInicio <> '1970-01-01'

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
    WHERE pl.NumeroManual IS NOT NULL AND pl.NumeroManual <> ''
      AND pl.FechaInicio IS NOT NULL
      AND pl.FechaInicio <> '0000-00-00'
      AND pl.FechaInicio <> '1970-01-01'
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
        AND FechaInicio IS NOT NULL
        AND FechaInicio <> '0000-00-00'
        AND FechaInicio <> '1970-01-01'

      UNION ALL

      SELECT NumeroManual, Modulo, FechaInicio
      FROM parteslineas
      WHERE NumeroManual IS NOT NULL AND NumeroManual <> ''
        AND Modulo IS NOT NULL AND Modulo <> ''
        AND FechaInicio IS NOT NULL
        AND FechaInicio <> '0000-00-00'
        AND FechaInicio <> '1970-01-01'
    ) s
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

-- Ordenar por criticidad: compromiso más cercano primero, luego por módulos pendientes
ORDER BY
  CASE
    WHEN fb.PedidoKey IS NULL THEN 0  -- Sin fabricar primero
    ELSE 1
  END,
  DATEDIFF(pr.Compromiso, CURDATE()) ASC,  -- Compromiso más urgente
  COALESCE(fb.ModulosRestantes, 999) DESC,  -- Más módulos pendientes
  pr.FechaEnvio ASC  -- Más antiguos primero
LIMIT 0, 1000`;

    try {
        const [rows] = await pool.query(sql);
        res.json(rows);
    } catch (error) {
        console.error("❌ ERROR EN /control-terminales/alerta2:", error);
        res.status(500).json({
            status: "error",
            message: "Error al obtener alerta mejorada de pedidos",
            detail: error.message
        });
    }
});

router.get("/lista_pepdidos_a_procesar", async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT * FROM almacen.n8n_pedidos");
        res.json(rows);
    } catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: "Error al obtener la lista de pedidos a procesar" });
    }
});

module.exports = router;
