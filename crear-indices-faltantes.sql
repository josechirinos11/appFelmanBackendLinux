-- ============================================================================
-- CREAR ÍNDICES FALTANTES (Compatible con MySQL/MariaDB antiguo)
-- ============================================================================
-- Este script crea SOLO los índices que faltan
-- Sin usar IF NOT EXISTS para compatibilidad
-- ============================================================================

USE terminales;

-- ============================================================================
-- TABLA: lotes
-- ============================================================================

-- Verificar si existe: SHOW INDEX FROM lotes WHERE Key_name = 'idx_lotes_fabricado';
-- Si no existe, ejecutar:
CREATE INDEX idx_lotes_fabricado ON lotes(Fabricado);

-- Verificar si existe: SHOW INDEX FROM lotes WHERE Key_name = 'idx_lotes_fechareal';
-- Si no existe, ejecutar:
CREATE INDEX idx_lotes_fechareal ON lotes(FechaRealInicio);

-- Verificar si existe: SHOW INDEX FROM lotes WHERE Key_name = 'idx_lotes_nummanual';
-- Si no existe, ejecutar:
CREATE INDEX idx_lotes_nummanual ON lotes(NumeroManual);

-- Verificar si existe: SHOW INDEX FROM lotes WHERE Key_name = 'idx_lotes_fabricado_fecha';
-- Si no existe, ejecutar:
CREATE INDEX idx_lotes_fabricado_fecha ON lotes(Fabricado, FechaRealInicio);

-- Verificar si existe: SHOW INDEX FROM lotes WHERE Key_name = 'idx_lotes_descripcion';
-- Si no existe, ejecutar:
CREATE INDEX idx_lotes_descripcion ON lotes(Descripcion(255));

-- ============================================================================
-- TABLA: hpartes
-- ============================================================================

-- Verificar si existe: SHOW INDEX FROM hpartes WHERE Key_name = 'idx_hpartes_operario';
-- Si no existe, ejecutar:
CREATE INDEX idx_hpartes_operario ON hpartes(CodigoOperario);

-- Verificar si existe: SHOW INDEX FROM hpartes WHERE Key_name = 'idx_hpartes_serie_numero';
-- Si no existe, ejecutar:
CREATE INDEX idx_hpartes_serie_numero ON hpartes(Serie, Numero);

-- ============================================================================
-- TABLA: partes
-- ============================================================================

-- Verificar si existe: SHOW INDEX FROM partes WHERE Key_name = 'idx_partes_operario';
-- Si no existe, ejecutar:
CREATE INDEX idx_partes_operario ON partes(CodigoOperario);

-- Verificar si existe: SHOW INDEX FROM partes WHERE Key_name = 'idx_partes_serie_numero';
-- Si no existe, ejecutar:
CREATE INDEX idx_partes_serie_numero ON partes(Serie, Numero);

-- ============================================================================
-- TABLA: hparteslineas
-- ============================================================================

-- Verificar si existe: SHOW INDEX FROM hparteslineas WHERE Key_name = 'idx_hparteslineas_serie_numero';
-- Si no existe, ejecutar:
CREATE INDEX idx_hparteslineas_serie_numero ON hparteslineas(CodigoSerie, CodigoNumero);

-- Verificar si existe: SHOW INDEX FROM hparteslineas WHERE Key_name = 'idx_hparteslineas_tarea';
-- Si no existe, ejecutar:
CREATE INDEX idx_hparteslineas_tarea ON hparteslineas(CodigoTarea);

-- Verificar si existe: SHOW INDEX FROM hparteslineas WHERE Key_name = 'idx_hparteslineas_nummanual';
-- Si no existe, ejecutar:
CREATE INDEX idx_hparteslineas_nummanual ON hparteslineas(NumeroManual);

-- Verificar si existe: SHOW INDEX FROM hparteslineas WHERE Key_name = 'idx_hparteslineas_abierta';
-- Si no existe, ejecutar:
CREATE INDEX idx_hparteslineas_abierta ON hparteslineas(Abierta);

-- Verificar si existe: SHOW INDEX FROM hparteslineas WHERE Key_name = 'idx_hparteslineas_fechainicio';
-- Si no existe, ejecutar:
CREATE INDEX idx_hparteslineas_fechainicio ON hparteslineas(FechaInicio, HoraInicio);

-- ============================================================================
-- TABLA: parteslineas
-- ============================================================================

-- Verificar si existe: SHOW INDEX FROM parteslineas WHERE Key_name = 'idx_parteslineas_serie_numero';
-- Si no existe, ejecutar:
CREATE INDEX idx_parteslineas_serie_numero ON parteslineas(CodigoSerie, CodigoNumero);

-- Verificar si existe: SHOW INDEX FROM parteslineas WHERE Key_name = 'idx_parteslineas_tarea';
-- Si no existe, ejecutar:
CREATE INDEX idx_parteslineas_tarea ON parteslineas(CodigoTarea);

-- Verificar si existe: SHOW INDEX FROM parteslineas WHERE Key_name = 'idx_parteslineas_nummanual';
-- Si no existe, ejecutar:
CREATE INDEX idx_parteslineas_nummanual ON parteslineas(NumeroManual);

-- Verificar si existe: SHOW INDEX FROM parteslineas WHERE Key_name = 'idx_parteslineas_abierta';
-- Si no existe, ejecutar:
CREATE INDEX idx_parteslineas_abierta ON parteslineas(Abierta);

-- Verificar si existe: SHOW INDEX FROM parteslineas WHERE Key_name = 'idx_parteslineas_fechainicio';
-- Si no existe, ejecutar:
CREATE INDEX idx_parteslineas_fechainicio ON parteslineas(FechaInicio, HoraInicio);

-- ============================================================================
-- TABLA: loteslineas
-- ============================================================================

-- Verificar si existe: SHOW INDEX FROM loteslineas WHERE Key_name = 'idx_loteslineas_nummanual';
-- Si no existe, ejecutar:
CREATE INDEX idx_loteslineas_nummanual ON loteslineas(FabricacionNumeroManual);

-- Verificar si existe: SHOW INDEX FROM loteslineas WHERE Key_name = 'idx_loteslineas_modulo';
-- Si no existe, ejecutar:
CREATE INDEX idx_loteslineas_modulo ON loteslineas(Modulo);

-- Verificar si existe: SHOW INDEX FROM loteslineas WHERE Key_name = 'idx_loteslineas_fabricada';
-- Si no existe, ejecutar:
CREATE INDEX idx_loteslineas_fabricada ON loteslineas(Fabricada);

-- Verificar si existe: SHOW INDEX FROM loteslineas WHERE Key_name = 'idx_loteslineas_codigolote';
-- Si no existe, ejecutar:
CREATE INDEX idx_loteslineas_codigolote ON loteslineas(CodigoLote);

-- ============================================================================
-- TABLA: lotesfabricaciones
-- ============================================================================

-- Verificar si existe: SHOW INDEX FROM lotesfabricaciones WHERE Key_name = 'idx_lotesfabricaciones_nummanual';
-- Si no existe, ejecutar:
CREATE INDEX idx_lotesfabricaciones_nummanual ON lotesfabricaciones(NumeroManual);

-- Verificar si existe: SHOW INDEX FROM lotesfabricaciones WHERE Key_name = 'idx_lotesfabricaciones_serie';
-- Si no existe, ejecutar:
CREATE INDEX idx_lotesfabricaciones_serie ON lotesfabricaciones(FabricacionSerie, NumeroManual);

-- ============================================================================
-- ANALIZAR TABLAS DESPUÉS DE CREAR ÍNDICES
-- ============================================================================

ANALYZE TABLE lotes;
ANALYZE TABLE loteslineas;
ANALYZE TABLE lotesfabricaciones;
ANALYZE TABLE hpartes;
ANALYZE TABLE hparteslineas;
ANALYZE TABLE partes;
ANALYZE TABLE parteslineas;

-- ============================================================================
-- VERIFICAR ÍNDICES CREADOS
-- ============================================================================

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

SELECT '✅ Proceso completado!' AS Status;
