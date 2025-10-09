-- ============================================================================
-- ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS
-- ============================================================================
-- Este script crea los índices necesarios para mejorar el rendimiento
-- de las consultas en la base de datos terminales
--
-- IMPACTO ESPERADO:
-- - Reducción de tiempo de consulta en 70-90%
-- - Mejor rendimiento en filtros WHERE
-- - Optimización de JOINs
-- ============================================================================

USE terminales;

-- ============================================================================
-- ÍNDICES PARA TABLA: lotes
-- ============================================================================

-- Índice para filtrado por estado de fabricación
CREATE INDEX IF NOT EXISTS idx_lotes_fabricado 
ON lotes(Fabricado);

-- Índice para ordenamiento por fecha de inicio
CREATE INDEX IF NOT EXISTS idx_lotes_fechareal 
ON lotes(FechaRealInicio);

-- Índice para búsqueda por número manual
CREATE INDEX IF NOT EXISTS idx_lotes_nummanual 
ON lotes(NumeroManual);

-- Índice compuesto para filtros combinados (estado + fecha)
CREATE INDEX IF NOT EXISTS idx_lotes_fabricado_fecha 
ON lotes(Fabricado, FechaRealInicio);

-- Índice para búsqueda por descripción (si se usa frecuentemente)
-- Nota: Los índices FULLTEXT son mejores para búsquedas de texto
-- pero requieren MyISAM o InnoDB con configuración especial
CREATE INDEX IF NOT EXISTS idx_lotes_descripcion 
ON lotes(Descripcion(255));

-- ============================================================================
-- ÍNDICES PARA TABLA: hpartes (histórico de partes)
-- ============================================================================

-- Índice crítico para filtrado por fecha
CREATE INDEX IF NOT EXISTS idx_hpartes_fecha 
ON hpartes(Fecha);

-- Índice para búsqueda por operario
CREATE INDEX IF NOT EXISTS idx_hpartes_operario 
ON hpartes(CodigoOperario);

-- Índice compuesto para JOIN con hparteslineas
CREATE INDEX IF NOT EXISTS idx_hpartes_serie_numero 
ON hpartes(Serie, Numero);

-- ============================================================================
-- ÍNDICES PARA TABLA: partes (partes activas)
-- ============================================================================

-- Índice crítico para filtrado por fecha
CREATE INDEX IF NOT EXISTS idx_partes_fecha 
ON partes(Fecha);

-- Índice para búsqueda por operario
CREATE INDEX IF NOT EXISTS idx_partes_operario 
ON partes(CodigoOperario);

-- Índice compuesto para JOIN con parteslineas
CREATE INDEX IF NOT EXISTS idx_partes_serie_numero 
ON partes(Serie, Numero);

-- ============================================================================
-- ÍNDICES PARA TABLA: hparteslineas
-- ============================================================================

-- Índice compuesto para JOIN con hpartes
CREATE INDEX IF NOT EXISTS idx_hparteslineas_serie_numero 
ON hparteslineas(CodigoSerie, CodigoNumero);

-- Índice para filtrado por tarea
CREATE INDEX IF NOT EXISTS idx_hparteslineas_tarea 
ON hparteslineas(CodigoTarea);

-- Índice para filtrado por número manual (pedido)
CREATE INDEX IF NOT EXISTS idx_hparteslineas_nummanual 
ON hparteslineas(NumeroManual);

-- Índice para filtrado por estado (abierta/cerrada)
CREATE INDEX IF NOT EXISTS idx_hparteslineas_abierta 
ON hparteslineas(Abierta);

-- Índice para ordenamiento por fecha/hora
CREATE INDEX IF NOT EXISTS idx_hparteslineas_fechainicio 
ON hparteslineas(FechaInicio, HoraInicio);

-- ============================================================================
-- ÍNDICES PARA TABLA: parteslineas
-- ============================================================================

-- Índice compuesto para JOIN con partes
CREATE INDEX IF NOT EXISTS idx_parteslineas_serie_numero 
ON parteslineas(CodigoSerie, CodigoNumero);

-- Índice para filtrado por tarea
CREATE INDEX IF NOT EXISTS idx_parteslineas_tarea 
ON parteslineas(CodigoTarea);

-- Índice para filtrado por número manual (pedido)
CREATE INDEX IF NOT EXISTS idx_parteslineas_nummanual 
ON parteslineas(NumeroManual);

-- Índice para filtrado por estado (abierta/cerrada)
CREATE INDEX IF NOT EXISTS idx_parteslineas_abierta 
ON parteslineas(Abierta);

-- Índice para ordenamiento por fecha/hora
CREATE INDEX IF NOT EXISTS idx_parteslineas_fechainicio 
ON parteslineas(FechaInicio, HoraInicio);

-- ============================================================================
-- ÍNDICES PARA TABLA: loteslineas
-- ============================================================================

-- Índice para filtrado por número manual de fabricación
CREATE INDEX IF NOT EXISTS idx_loteslineas_nummanual 
ON loteslineas(FabricacionNumeroManual);

-- Índice para filtrado por módulo
CREATE INDEX IF NOT EXISTS idx_loteslineas_modulo 
ON loteslineas(Modulo);

-- Índice compuesto para consultas frecuentes (nummanual + modulo)
CREATE INDEX IF NOT EXISTS idx_loteslineas_nummanual_modulo 
ON loteslineas(FabricacionNumeroManual, Modulo);

-- Índice para filtrado por estado de fabricación
CREATE INDEX IF NOT EXISTS idx_loteslineas_fabricada 
ON loteslineas(Fabricada);

-- Índice para JOIN con lotes
CREATE INDEX IF NOT EXISTS idx_loteslineas_codigolote 
ON loteslineas(CodigoLote);

-- ============================================================================
-- ÍNDICES PARA TABLA: lotesfabricaciones
-- ============================================================================

-- Índice para filtrado por número manual
CREATE INDEX IF NOT EXISTS idx_lotesfabricaciones_nummanual 
ON lotesfabricaciones(NumeroManual);

-- Índice compuesto para JOIN con loteslineas
CREATE INDEX IF NOT EXISTS idx_lotesfabricaciones_serie 
ON lotesfabricaciones(FabricacionSerie, NumeroManual);

-- ============================================================================
-- VERIFICAR ÍNDICES CREADOS
-- ============================================================================

-- Consulta para verificar todos los índices en tabla lotes
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as COLUMNS,
    INDEX_TYPE,
    NON_UNIQUE
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'terminales'
    AND TABLE_NAME IN ('lotes', 'loteslineas', 'hpartes', 'partes', 'hparteslineas', 'parteslineas', 'lotesfabricaciones')
GROUP BY TABLE_NAME, INDEX_NAME, INDEX_TYPE, NON_UNIQUE
ORDER BY TABLE_NAME, INDEX_NAME;

-- ============================================================================
-- ANÁLISIS DE RENDIMIENTO (Opcional)
-- ============================================================================

-- Analizar tablas después de crear índices para optimizar el plan de ejecución
ANALYZE TABLE lotes;
ANALYZE TABLE loteslineas;
ANALYZE TABLE lotesfabricaciones;
ANALYZE TABLE hpartes;
ANALYZE TABLE hparteslineas;
ANALYZE TABLE partes;
ANALYZE TABLE parteslineas;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================

/*
1. ÍNDICES Y ESPACIO EN DISCO:
   Los índices ocupan espacio adicional en disco. Monitorear el crecimiento.
   
2. IMPACTO EN INSERT/UPDATE:
   Los índices ralentizan ligeramente las operaciones de escritura (INSERT/UPDATE/DELETE)
   porque deben actualizarse. En este caso, el beneficio en lecturas compensa ampliamente.
   
3. MANTENIMIENTO:
   Ejecutar ANALYZE TABLE periódicamente (mensualmente) para mantener
   las estadísticas actualizadas y el rendimiento óptimo.
   
4. MONITOREO:
   Usar EXPLAIN antes de las consultas para verificar que los índices se están usando:
   
   EXPLAIN SELECT * FROM lotes WHERE Fabricado = 0 AND FechaRealInicio IS NOT NULL;
   
   Buscar "Using index" o "ref" en la columna "type" (bueno)
   Evitar "ALL" (table scan completo - malo)
   
5. ÍNDICES NO USADOS:
   Si algún índice no se usa después de un tiempo, considerar eliminarlo:
   
   SELECT * FROM sys.schema_unused_indexes WHERE object_schema = 'terminales';
   
6. TAMAÑO DE ÍNDICES:
   Para verificar el espacio usado por índices:
   
   SELECT 
       table_name,
       index_name,
       ROUND(stat_value * @@innodb_page_size / 1024 / 1024, 2) AS size_mb
   FROM mysql.innodb_index_stats
   WHERE database_name = 'terminales'
       AND stat_name = 'size'
   ORDER BY size_mb DESC;
*/

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================

SELECT '✅ Índices creados exitosamente!' AS Status;
SELECT 'Ejecutar ANALYZE TABLE en las tablas principales para optimizar el rendimiento' AS Recomendacion;
