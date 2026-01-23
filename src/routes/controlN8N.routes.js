const express = require("express");
const pool = require("../config/databaseAlamcen");
const poolTerminales = require("../config/databaseTerminales");

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
    try {
        // 1. Obtener PEDIDOS desde ALMACÉN (n8n)
        // Recuperamos los campos base
        const sqlPedidos = `
            SELECT
                p.NoPedido,
                p.FechaEnvio,
                p.Compromiso,
                p.Cliente,
                p.Comercial,
                p.RefCliente,
                -- Generamos PedidoKey en SQL igual que antes para mantener consistencia
                CONCAT(
                    SUBSTRING_INDEX(p.NoPedido, '-', 1), '_',
                    SUBSTRING_INDEX(SUBSTRING_INDEX(p.NoPedido, '-', 2), '-', -1), '_',
                    CAST(SUBSTRING_INDEX(p.NoPedido, '-', -1) AS UNSIGNED)
                ) AS PedidoKey
            FROM n8n_pedidos p
            WHERE p.Seccion = 'ALUMINIO'
        `;
        const [pedidosRows] = await pool.query(sqlPedidos);

        if (pedidosRows.length === 0) {
            return res.json([]);
        }

        // 2. Extraer las Keys para filtrar en Terminales (Optimización)
        // Generamos un array de PedidoKeys para usar en el WHERE IN
        const pedidoKeys = pedidosRows
            .map(p => p.PedidoKey)
            .filter(k => k); // eliminar nulos

        if (pedidoKeys.length === 0) {
            return res.json([]);
        }

        // 3. Consultar DATOS DE FABRICACIÓN en TERMINALES
        // Hacemos el "machacado" de datos grouping por PedidoKey calculado dinámicamente
        // Usamos IN (?) para filtrar solo los pedidos que nos interesan
        const sqlTerminales = `
            SELECT
                fx.PedidoKey,
                MAX(lx.TotalUnidades) AS TotalModulos,
                GREATEST(MAX(lx.TotalUnidades) - COALESCE(px.ModulosProcesados, 0), 0) AS ModulosRestantes,
                MAX(fx.FechaInicio) AS UltimaFabricacion,
                MAX(CONCAT(fx.FechaInicio, ' ', fx.HoraInicio)) AS UltimoInicio
            FROM
            (
                -- Buscamos en hpartes (Histórico)
                SELECT
                    CONCAT(
                        SUBSTRING_INDEX(hl.NumeroManual, '_', 1), '_',
                        SUBSTRING_INDEX(SUBSTRING_INDEX(hl.NumeroManual, '_', 2), '_', -1), '_',
                        CAST(SUBSTRING_INDEX(hl.NumeroManual, '_', -1) AS UNSIGNED)
                    ) AS PedidoKey,
                    hl.FechaInicio,
                    hl.HoraInicio,
                    hl.NumeroManual
                FROM hpartes h
                INNER JOIN hparteslineas hl ON h.Serie = hl.CodigoSerie AND h.Numero = hl.CodigoNumero
                WHERE hl.NumeroManual IS NOT NULL AND hl.NumeroManual <> ''
                  AND hl.FechaInicio IS NOT NULL AND hl.FechaInicio <> '0000-00-00'
                  -- Filtro clave: Solo traemos datos de los pedidos N8N
                  AND CONCAT(
                        SUBSTRING_INDEX(hl.NumeroManual, '_', 1), '_',
                        SUBSTRING_INDEX(SUBSTRING_INDEX(hl.NumeroManual, '_', 2), '_', -1), '_',
                        CAST(SUBSTRING_INDEX(hl.NumeroManual, '_', -1) AS UNSIGNED)
                    ) IN (${pedidoKeys.map(() => '?').join(',')})

                UNION ALL

                -- Buscamos en partes (Actual)
                SELECT
                    CONCAT(
                        SUBSTRING_INDEX(pl.NumeroManual, '_', 1), '_',
                        SUBSTRING_INDEX(SUBSTRING_INDEX(pl.NumeroManual, '_', 2), '_', -1), '_',
                        CAST(SUBSTRING_INDEX(pl.NumeroManual, '_', -1) AS UNSIGNED)
                    ) AS PedidoKey,
                    pl.FechaInicio,
                    pl.HoraInicio,
                    pl.NumeroManual
                FROM partes p
                INNER JOIN parteslineas pl ON p.Serie = pl.CodigoSerie AND p.Numero = pl.CodigoNumero
                WHERE pl.NumeroManual IS NOT NULL AND pl.NumeroManual <> ''
                  AND pl.FechaInicio IS NOT NULL AND pl.FechaInicio <> '0000-00-00'
                  AND CONCAT(
                        SUBSTRING_INDEX(pl.NumeroManual, '_', 1), '_',
                        SUBSTRING_INDEX(SUBSTRING_INDEX(pl.NumeroManual, '_', 2), '_', -1), '_',
                        CAST(SUBSTRING_INDEX(pl.NumeroManual, '_', -1) AS UNSIGNED)
                    ) IN (${pedidoKeys.map(() => '?').join(',')})
            ) fx

            LEFT JOIN (
                SELECT NumeroManual, MAX(TotalUnidades) AS TotalUnidades
                FROM Lotes
                GROUP BY NumeroManual
            ) lx ON lx.NumeroManual = fx.NumeroManual

            LEFT JOIN (
                SELECT
                    CONCAT(
                        SUBSTRING_INDEX(s.NumeroManual, '_', 1), '_',
                        SUBSTRING_INDEX(SUBSTRING_INDEX(s.NumeroManual, '_', 2), '_', -1), '_',
                        CAST(SUBSTRING_INDEX(s.NumeroManual, '_', -1) AS UNSIGNED)
                    ) AS PedidoKey,
                    COUNT(DISTINCT s.Modulo) AS ModulosProcesados
                FROM (
                    SELECT NumeroManual, Modulo 
                    FROM hparteslineas 
                    WHERE Modulo IS NOT NULL AND Modulo <> ''
                    UNION ALL
                    SELECT NumeroManual, Modulo 
                    FROM parteslineas 
                    WHERE Modulo IS NOT NULL AND Modulo <> ''
                ) s
                GROUP BY
                    CONCAT(
                        SUBSTRING_INDEX(s.NumeroManual, '_', 1), '_',
                        SUBSTRING_INDEX(SUBSTRING_INDEX(s.NumeroManual, '_', 2), '_', -1), '_',
                        CAST(SUBSTRING_INDEX(s.NumeroManual, '_', -1) AS UNSIGNED)
                    )
            ) px ON px.PedidoKey = fx.PedidoKey

            GROUP BY fx.PedidoKey
        `;

        // Pasamos los parámetros dos veces (una para hpartes, otra para partes)
        const params = [...pedidoKeys, ...pedidoKeys];
        const [terminalesRows] = await poolTerminales.query(sqlTerminales, params);

        // 4. Indexar resultados de Terminales
        const fabricacionMap = new Map();
        terminalesRows.forEach(row => {
            fabricacionMap.set(row.PedidoKey, row);
        });

        // 5. MERGE + Lógica de negocio (Cálculo de Estados)
        const resultado = pedidosRows.map(pr => {
            // Buscamos info de fabricación
            const fb = fabricacionMap.get(pr.PedidoKey) || {};

            const now = new Date();
            const fechaCompromiso = pr.Compromiso ? new Date(pr.Compromiso) : null;
            const fechaEnvio = pr.FechaEnvio ? new Date(pr.FechaEnvio) : null;

            // Cálculos de fecha
            const diasDesdeEnvio = fechaEnvio
                ? Math.floor((now - fechaEnvio) / (1000 * 60 * 60 * 24))
                : null;
            const diasHastaCompromiso = fechaCompromiso
                ? Math.ceil((fechaCompromiso - now) / (1000 * 60 * 60 * 24))
                : null;

            const seHaFabricado = fb.PedidoKey ? 1 : 0;
            const totalModulos = Number(fb.TotalModulos) || 0;
            const modulosRestantes = Number(fb.ModulosRestantes) || 0;

            // Determinación de Estado (Lógica replicada del SQL original)
            let estado = '🟢 EN CURSO: Progreso adecuado';

            if (!seHaFabricado) {
                // No fabricado
                if (diasHastaCompromiso !== null && diasHastaCompromiso <= 0) {
                    estado = '🔴 CRÍTICO: NO fabricado + compromiso VENCIDO';
                } else if (diasHastaCompromiso !== null && diasHastaCompromiso <= 3) {
                    estado = '🔴 URGENTE: NO fabricado + compromiso en 1-3 días';
                } else if (diasHastaCompromiso !== null && diasHastaCompromiso <= 7) {
                    estado = '🟠 ALERTA: NO fabricado + compromiso en 4-7 días';
                } else {
                    estado = '🟡 PENDIENTE: NO fabricado + compromiso lejano';
                }
            } else {
                // Sí fabricado
                if (modulosRestantes === 0) {
                    estado = '✅ COMPLETADO: Todos los módulos fabricados';
                } else if (diasHastaCompromiso !== null && diasHastaCompromiso <= 0 && modulosRestantes > 0) {
                    estado = '🔴 CRÍTICO: Compromiso vencido + módulos pendientes';
                } else if (diasHastaCompromiso !== null && diasHastaCompromiso <= 3 && modulosRestantes >= 5) {
                    estado = '🟠 URGENTE: Compromiso próximo + muchos módulos';
                } else if (diasHastaCompromiso !== null && diasHastaCompromiso <= 3) {
                    estado = '🟡 MONITOREAR: Compromiso próximo + pocos módulos';
                } else if (modulosRestantes >= 10) {
                    estado = '🟡 PRIORIDAD: Muchos módulos pendientes';
                } else if (diasHastaCompromiso !== null && diasHastaCompromiso >= 14) {
                    estado = '🔵 NORMAL: En fabricación + compromiso lejano';
                }
            }

            return {
                NoPedido: pr.NoPedido,
                FechaEnvio: pr.FechaEnvio,
                Compromiso: pr.Compromiso,
                PedidoKey: pr.PedidoKey,
                Cliente: pr.Cliente,
                Comercial: pr.Comercial,
                RefCliente: pr.RefCliente,
                DiasDesdeEnvio: diasDesdeEnvio,
                DiasHastaCompromiso: diasHastaCompromiso,
                SeHaFabricado: seHaFabricado,
                TotalModulos: totalModulos,
                ModulosRestantes: modulosRestantes,
                UltimaFabricacion: fb.UltimaFabricacion || null,
                UltimoInicio: fb.UltimoInicio || null,
                Estado: estado
            };
        });

        // 6. Ordenamiento final (Sort)
        resultado.sort((a, b) => {
            // Crit 1: Sin fabricar primero
            if (a.SeHaFabricado !== b.SeHaFabricado) return a.SeHaFabricado - b.SeHaFabricado;

            // Crit 2: Compromiso más cercano
            const diasA = a.DiasHastaCompromiso ?? 9999;
            const diasB = b.DiasHastaCompromiso ?? 9999;
            if (diasA !== diasB) return diasA - diasB;

            // Crit 3: Módulos restantes (DESC)
            const modA = a.ModulosRestantes;
            const modB = b.ModulosRestantes;
            if (modA !== modB) return modB - modA;

            // Crit 4: Fecha Envío (ASC)
            const fA = new Date(a.FechaEnvio || '9999-12-31').getTime();
            const fB = new Date(b.FechaEnvio || '9999-12-31').getTime();
            return fA - fB;
        });

        // Limit
        res.json(resultado.slice(0, 1000));

    } catch (error) {
        console.error("❌ ERROR EN /control-n8n/alerta2:", error);
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
