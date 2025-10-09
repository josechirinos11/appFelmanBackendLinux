-- ============================================================================
-- PRUEBAS DE RUTAS OPTIMIZADAS - num_manual = '2025_40_659'
-- ============================================================================
-- Datos del lote:
-- - Codigo: 2302930
-- - NumeroManual: 2025_40_659
-- - Fabricado: 0 (En Fabricación)
-- - FechaRealInicio: 2025-07-10
-- - Módulos: V01.01 hasta V01.07
-- - Rango de fechas: 2025-07-10
-- ============================================================================

USE terminales;

-- ============================================================================
-- RUTA #1: GET /control-terminales/lotes
-- ============================================================================
-- Parámetros de prueba: 
-- ?status=En Fabricacion&search=2025_40_659&limit=100&offset=0
-- ============================================================================

-- CONSULTA PRINCIPAL (con filtros)
EXPLAIN
SELECT
  NumeroManual,
  Fabricado,
  FabricadoFecha,
  FechaRealInicio,
  Descripcion,
  TotalTiempo,
  TotalUnidades,
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
WHERE Fabricado = 0 
  AND FechaRealInicio IS NOT NULL
  AND (NumeroManual LIKE '%2025_40_659%' 
    OR Descripcion LIKE '%2025_40_659%' 
    OR CAST(Fabricado AS CHAR) LIKE '%2025_40_659%')
ORDER BY FechaRealInicio DESC
LIMIT 100 OFFSET 0;

-- Ejecutar la consulta real
SELECT
  NumeroManual,
  Fabricado,
  FabricadoFecha,
  FechaRealInicio,
  Descripcion,
  TotalTiempo,
  TotalUnidades
FROM terminales.lotes
WHERE Fabricado = 0 
  AND FechaRealInicio IS NOT NULL
  AND (NumeroManual LIKE '%2025_40_659%' 
    OR Descripcion LIKE '%2025_40_659%' 
    OR CAST(Fabricado AS CHAR) LIKE '%2025_40_659%')
ORDER BY FechaRealInicio DESC
LIMIT 100 OFFSET 0;

-- Consulta de conteo
SELECT COUNT(*) as total
FROM terminales.lotes
WHERE Fabricado = 0 
  AND FechaRealInicio IS NOT NULL
  AND (NumeroManual LIKE '%2025_40_659%' 
    OR Descripcion LIKE '%2025_40_659%' 
    OR CAST(Fabricado AS CHAR) LIKE '%2025_40_659%');

SELECT '✅ RUTA #1: /lotes - COMPLETADA' AS Status;
SELECT '---' AS Separador;

-- ============================================================================
-- RUTA #2: GET /control-terminales/loteslineas
-- ============================================================================
-- Parámetros: ?num_manual=2025_40_659
-- ============================================================================

EXPLAIN
SELECT
  Fabricada,
  Modulo,
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
  TiempoAcumulado01, TiempoAcumulado02, TiempoAcumulado03,
  TiempoAcumulado04, TiempoAcumulado06, TiempoAcumulado07,
  TiempoAcumulado09, TiempoAcumulado10, TiempoAcumulado11,
  TiempoAcumulado12
FROM terminales.loteslineas
WHERE FabricacionNumeroManual = '2025_40_659'
ORDER BY Modulo;

-- Ejecutar la consulta real
SELECT
  Fabricada,
  Modulo,
  TiempoAcumulado01, TiempoAcumulado02, TiempoAcumulado03,
  TiempoAcumulado04, TiempoAcumulado06, TiempoAcumulado07,
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
  END AS estadoTiempos
FROM terminales.loteslineas
WHERE FabricacionNumeroManual = '2025_40_659'
ORDER BY Modulo;

SELECT '✅ RUTA #2: /loteslineas - COMPLETADA' AS Status;
SELECT '---' AS Separador;

-- ============================================================================
-- RUTA #3: GET /control-terminales/tiempos-acumulados-modulo
-- ============================================================================
-- Parámetros: ?num_manual=2025_40_659&modulo=V01.01
-- Probar con cada módulo: V01.01, V01.02, V01.03, V01.04, V01.05, V01.06, V01.07
-- ============================================================================

-- Prueba con V01.01
EXPLAIN
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
WHERE ll.FabricacionNumeroManual = '2025_40_659'
  AND ll.Modulo = 'V01.01'
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
ORDER BY t.NumeroTarea;

-- Ejecutar para V01.01
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
WHERE ll.FabricacionNumeroManual = '2025_40_659'
  AND ll.Modulo = 'V01.01'
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
ORDER BY t.NumeroTarea;

SELECT '✅ RUTA #3: /tiempos-acumulados-modulo - COMPLETADA' AS Status;
SELECT '---' AS Separador;

-- ============================================================================
-- RUTA #4: GET /control-terminales/tiempo-real-nueva
-- ============================================================================
-- Parámetros: ?pedido=2025_40_659
-- Nota: No hay registros hoy (CURDATE), usar fecha 2025-07-10
-- ============================================================================

-- Prueba con fecha específica (modificar WHERE Fecha = CURDATE() por fecha real)
EXPLAIN
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
WHERE h.Fecha = '2025-07-10'
  AND hl.NumeroManual LIKE '%2025_40_659%'

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
WHERE p.Fecha = '2025-07-10'
  AND pl.NumeroManual LIKE '%2025_40_659%'

ORDER BY FechaInicio DESC, HoraInicio DESC;

-- Ejecutar consulta real
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
WHERE h.Fecha = '2025-07-10'
  AND hl.NumeroManual = '2025_40_659'

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
WHERE p.Fecha = '2025-07-10'
  AND pl.NumeroManual = '2025_40_659'

ORDER BY FechaInicio DESC, HoraInicio DESC;

SELECT '✅ RUTA #4: /tiempo-real-nueva - COMPLETADA' AS Status;
SELECT '---' AS Separador;

-- ============================================================================
-- RUTA #5: GET /control-terminales/production-analytics
-- ============================================================================
-- Parámetros: ?start=2025-07-10&end=2025-07-10&limit=1000&offset=0
-- ============================================================================

EXPLAIN
SELECT
    h.Fecha, h.CodigoOperario, h.OperarioNombre,
    hl.FechaInicio, hl.HoraInicio, hl.FechaFin, hl.HoraFin,
    hl.CodigoTarea, hl.NumeroManual, hl.Modulo,
    hl.TiempoDedicado, hl.Abierta
FROM hpartes h
INNER JOIN hparteslineas hl
  ON h.Serie = hl.CodigoSerie
 AND h.Numero = hl.CodigoNumero
WHERE h.Fecha BETWEEN '2025-07-10' AND '2025-07-10'
  AND h.Fecha >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
  AND hl.NumeroManual = '2025_40_659'

UNION ALL

SELECT
    p.Fecha, p.CodigoOperario, p.OperarioNombre,
    pl.FechaInicio, pl.HoraInicio, pl.FechaFin, pl.HoraFin,
    pl.CodigoTarea, pl.NumeroManual, pl.Modulo,
    pl.TiempoDedicado, pl.Abierta
FROM partes p
INNER JOIN parteslineas pl
  ON p.Serie = pl.CodigoSerie
 AND p.Numero = pl.CodigoNumero
WHERE p.Fecha BETWEEN '2025-07-10' AND '2025-07-10'
  AND p.Fecha >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
  AND pl.NumeroManual = '2025_40_659'

ORDER BY FechaInicio DESC, HoraInicio DESC
LIMIT 1000 OFFSET 0;

-- Ejecutar consulta real
SELECT
    h.Fecha, h.CodigoOperario, h.OperarioNombre,
    hl.FechaInicio, hl.HoraInicio, hl.FechaFin, hl.HoraFin,
    hl.CodigoTarea, hl.NumeroManual, hl.Modulo,
    hl.TiempoDedicado, hl.Abierta
FROM hpartes h
INNER JOIN hparteslineas hl
  ON h.Serie = hl.CodigoSerie
 AND h.Numero = hl.CodigoNumero
WHERE h.Fecha BETWEEN '2025-07-10' AND '2025-07-10'
  AND h.Fecha >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
  AND hl.NumeroManual = '2025_40_659'

UNION ALL

SELECT
    p.Fecha, p.CodigoOperario, p.OperarioNombre,
    pl.FechaInicio, pl.HoraInicio, pl.FechaFin, pl.HoraFin,
    pl.CodigoTarea, pl.NumeroManual, pl.Modulo,
    pl.TiempoDedicado, pl.Abierta
FROM partes p
INNER JOIN parteslineas pl
  ON p.Serie = pl.CodigoSerie
 AND p.Numero = pl.CodigoNumero
WHERE p.Fecha BETWEEN '2025-07-10' AND '2025-07-10'
  AND p.Fecha >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
  AND pl.NumeroManual = '2025_40_659'

ORDER BY FechaInicio DESC, HoraInicio DESC
LIMIT 1000 OFFSET 0;

SELECT '✅ RUTA #5: /production-analytics - COMPLETADA' AS Status;
SELECT '---' AS Separador;

-- ============================================================================
-- RUTA #6: GET /control-terminales/tiempos-operario-lote (NO OPTIMIZADA)
-- ============================================================================
-- Parámetros: ?num_manual=2025_40_659
-- Nota: Esta ruta usa vpartestodo (vista) - puede ser lenta
-- ============================================================================

EXPLAIN
SELECT
  OperarioNombre,
  CodigoOperario,
  COALESCE(CodigoTarea,'(SIN TAREA)') AS Tarea,
  SUM(COALESCE(TiempoDedicado,0))    AS SegundosDedicados,
  SEC_TO_TIME(SUM(COALESCE(TiempoDedicado,0))) AS HH_MM_SS
FROM vpartestodo
WHERE CodigoLote = (SELECT Codigo FROM lotes WHERE NumeroManual = '2025_40_659')
GROUP BY OperarioNombre, CodigoOperario, CodigoTarea
ORDER BY OperarioNombre, Tarea;

-- Ejecutar consulta real
SELECT
  OperarioNombre,
  CodigoOperario,
  COALESCE(CodigoTarea,'(SIN TAREA)') AS Tarea,
  SUM(COALESCE(TiempoDedicado,0))    AS SegundosDedicados,
  SEC_TO_TIME(SUM(COALESCE(TiempoDedicado,0))) AS HH_MM_SS
FROM vpartestodo
WHERE CodigoLote = 2302930
GROUP BY OperarioNombre, CodigoOperario, CodigoTarea
ORDER BY OperarioNombre, Tarea;

SELECT '⚠️ RUTA #6: /tiempos-operario-lote - NO OPTIMIZADA (usa vista)' AS Status;
SELECT '---' AS Separador;

-- ============================================================================
-- RESUMEN DE VERIFICACIÓN DE ÍNDICES
-- ============================================================================

-- Verificar que los índices se están usando en las consultas
SELECT 
    'lotes' AS Tabla,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as Columnas
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'terminales'
    AND TABLE_NAME = 'lotes'
    AND INDEX_NAME LIKE 'idx_%'
GROUP BY INDEX_NAME

UNION ALL

SELECT 
    'loteslineas' AS Tabla,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as Columnas
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'terminales'
    AND TABLE_NAME = 'loteslineas'
    AND INDEX_NAME LIKE 'idx_%'
GROUP BY INDEX_NAME

UNION ALL

SELECT 
    'hparteslineas' AS Tabla,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as Columnas
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'terminales'
    AND TABLE_NAME = 'hparteslineas'
    AND INDEX_NAME LIKE 'idx_%'
GROUP BY INDEX_NAME

UNION ALL

SELECT 
    'parteslineas' AS Tabla,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as Columnas
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'terminales'
    AND TABLE_NAME = 'parteslineas'
    AND INDEX_NAME LIKE 'idx_%'
GROUP BY INDEX_NAME;

-- ============================================================================
-- FIN DE LAS PRUEBAS
-- ============================================================================

SELECT '🎉 TODAS LAS PRUEBAS COMPLETADAS' AS Status;
SELECT 'Revisar los resultados de EXPLAIN para verificar el uso de índices' AS Nota;
SELECT 'Buscar "type: ref" o "type: index" en los resultados de EXPLAIN (BUENO)' AS Consejo1;
SELECT 'Evitar "type: ALL" que indica table scan completo (MALO)' AS Consejo2;
