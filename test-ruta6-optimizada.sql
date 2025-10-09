-- ============================================================================
-- PRUEBA DE OPTIMIZACIÓN RUTA #6: /tiempos-operario-lote
-- ============================================================================
-- Comparación: ANTES vs DESPUÉS
-- ============================================================================

USE terminales;

-- ============================================================================
-- ANTES: Usando vista vpartestodo (LENTO - 415ms)
-- ============================================================================

SELECT '🔴 CONSULTA ORIGINAL (con vista vpartestodo)' AS Prueba;

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

-- Ejecutar consulta original
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

SELECT '---' AS Separador;

-- ============================================================================
-- DESPUÉS: Query optimizada (RÁPIDO - <100ms esperado)
-- ============================================================================

SELECT '🟢 CONSULTA OPTIMIZADA (sin vista, con índices)' AS Prueba;

EXPLAIN
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
  WHERE hl.NumeroManual = '2025_40_659'
  
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
  WHERE pl.NumeroManual = '2025_40_659'
) AS datos
GROUP BY OperarioNombre, CodigoOperario, CodigoTarea
ORDER BY OperarioNombre, Tarea;

-- Ejecutar consulta optimizada
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
  WHERE hl.NumeroManual = '2025_40_659'
  
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
  WHERE pl.NumeroManual = '2025_40_659'
) AS datos
GROUP BY OperarioNombre, CodigoOperario, CodigoTarea
ORDER BY OperarioNombre, Tarea;

SELECT '---' AS Separador;

-- ============================================================================
-- COMPARACIÓN DE RESULTADOS
-- ============================================================================

SELECT '📊 VERIFICACIÓN: Ambas consultas deben devolver los mismos resultados' AS Nota;

SELECT 'Resultado esperado:' AS Info;
SELECT 'SERGIO DE LA IGLESIA | 010 | CORTE | 37362 | 10:22:42' AS Esperado;

-- ============================================================================
-- FIN DE LA PRUEBA
-- ============================================================================

SELECT '✅ Prueba completada - Verificar que EXPLAIN muestra uso de índices' AS Status;
SELECT 'Buscar: key: idx_hparteslineas_nummanual (BUENO)' AS Consejo1;
SELECT 'Evitar: type: ALL en hpartes/partes (MALO)' AS Consejo2;
