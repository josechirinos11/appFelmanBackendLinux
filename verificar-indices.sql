-- ============================================================================
-- VERIFICAR ÍNDICES EXISTENTES
-- ============================================================================

USE terminales;

-- Ver todos los índices actuales
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





+--------------------+----------------------------------+-----------------------------------------------------+------------+------------+
| TABLE_NAME         | INDEX_NAME                       | COLUMNS                                             | INDEX_TYPE | NON_UNIQUE |
+--------------------+----------------------------------+-----------------------------------------------------+------------+------------+
| hpartes            | idx_hpartes_fecha                | Fecha                                               | BTREE      |          1 |
| hpartes            | idx_hpartes_operario             | CodigoOperario                                      | BTREE      |          1 |
| hpartes            | idx_hpartes_serie_numero         | Serie,Numero                                        | BTREE      |          1 |
| hpartes            | PRIMARY                          | Serie,Numero,Fecha,CodigoOperario                   | BTREE      |          0 |
| hparteslineas      | fabricacion                      | FabricacionSerie,FabricacionNumero,FabricacionLinea | BTREE      |          1 |
| hparteslineas      | idx_hparteslineas_abierta        | Abierta                                             | BTREE      |          1 |
| hparteslineas      | idx_hparteslineas_fechainicio    | FechaInicio,HoraInicio                              | BTREE      |          1 |
| hparteslineas      | idx_hparteslineas_inicio         | FechaInicio,HoraInicio                              | BTREE      |          1 |
| hparteslineas      | idx_hparteslineas_lote_operario  | CodigoLote,CodigoSerie,CodigoNumero                 | BTREE      |          1 |
| hparteslineas      | idx_hparteslineas_nummanual      | NumeroManual                                        | BTREE      |          1 |
| hparteslineas      | idx_hparteslineas_serie_numero   | CodigoSerie,CodigoNumero                            | BTREE      |          1 |
| hparteslineas      | idx_hparteslineas_tarea          | CodigoTarea                                         | BTREE      |          1 |
| hparteslineas      | idx_hpl_codigolote_tarea         | CodigoLote,CodigoTarea                              | BTREE      |          1 |
| hparteslineas      | PRIMARY                          | CodigoSerie,CodigoNumero,Linea                      | BTREE      |          0 |
| lotes              | idx_lotes_descripcion            | Descripcion                                         | BTREE      |          1 |
| lotes              | idx_lotes_fabricado              | Fabricado                                           | BTREE      |          1 |
| lotes              | idx_lotes_fabricado_fecha        | Fabricado,FechaRealInicio                           | BTREE      |          1 |
| lotes              | idx_lotes_fechareal              | FechaRealInicio                                     | BTREE      |          1 |
| lotes              | idx_lotes_nummanual              | NumeroManual                                        | BTREE      |          1 |
| lotes              | orden                            | NumeroManual,Codigo                                 | BTREE      |          1 |
| lotes              | PRIMARY                          | Codigo                                              | BTREE      |          0 |
| lotesfabricaciones | idx_lotesfabricaciones_nummanual | NumeroManual                                        | BTREE      |          1 |
| lotesfabricaciones | idx_lotesfabricaciones_serie     | FabricacionSerie,NumeroManual                       | BTREE      |          1 |
| lotesfabricaciones | PRIMARY                          | CodigoLote,FabricacionSerie,FabricacionNumero       | BTREE      |          0 |
| loteslineas        | clave                            | Clave                                               | BTREE      |          1 |
| loteslineas        | fabricacion                      | FabricacionSerie,FabricacionNumero,FabricacionLinea | BTREE      |          1 |
| loteslineas        | idx_ll_fabnum_mod                | FabricacionNumeroManual,Modulo                      | BTREE      |          1 |
| loteslineas        | idx_loteslineas_codigolote       | CodigoLote                                          | BTREE      |          1 |
| loteslineas        | idx_loteslineas_fabricada        | Fabricada                                           | BTREE      |          1 |
| loteslineas        | idx_loteslineas_modulo           | Modulo                                              | BTREE      |          1 |
| loteslineas        | idx_loteslineas_nummanual        | FabricacionNumeroManual                             | BTREE      |          1 |
| loteslineas        | PRIMARY                          | CodigoLote,Modulo,Linea                             | BTREE      |          0 |
| partes             | idx_partes_fecha                 | Fecha                                               | BTREE      |          1 |
| partes             | idx_partes_operario              | CodigoOperario                                      | BTREE      |          1 |
| partes             | idx_partes_serie_numero          | Serie,Numero                                        | BTREE      |          1 |
| partes             | PRIMARY                          | Fecha,CodigoOperario                                | BTREE      |          0 |
| parteslineas       | fabricacion                      | FabricacionSerie,FabricacionNumero,FabricacionLinea | BTREE      |          1 |
| parteslineas       | idx_parteslineas_abierta         | Abierta                                             | BTREE      |          1 |
| parteslineas       | idx_parteslineas_fechainicio     | FechaInicio,HoraInicio                              | BTREE      |          1 |
| parteslineas       | idx_parteslineas_inicio          | FechaInicio,HoraInicio                              | BTREE      |          1 |
| parteslineas       | idx_parteslineas_lote_operario   | CodigoLote,CodigoSerie,CodigoNumero                 | BTREE      |          1 |
| parteslineas       | idx_parteslineas_nummanual       | NumeroManual                                        | BTREE      |          1 |
| parteslineas       | idx_parteslineas_serie_numero    | CodigoSerie,CodigoNumero                            | BTREE      |          1 |
| parteslineas       | idx_parteslineas_tarea           | CodigoTarea                                         | BTREE      |          1 |
| parteslineas       | idx_pl_codigolote_tarea          | CodigoLote,CodigoTarea                              | BTREE      |          1 |
| parteslineas       | PRIMARY                          | CodigoSerie,CodigoNumero,Linea                      | BTREE      |          0 |
+--------------------+----------------------------------+-----------------------------------------------------+------------+------------+
46 rows in set (0,084 sec)