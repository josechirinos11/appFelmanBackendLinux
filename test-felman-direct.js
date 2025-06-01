/**
 * Test directo de las funciones de generación SQL de Felman
 * Sin necesidad de servidor en ejecución
 */

const { FELMAN_SQL_INSTRUCTIONS, procesarConsultaFelman, limpiarSQLQuery } = require('./src/config/openai-instructions');

console.log('🧪 Iniciando tests directos del sistema SQL de Felman...\n');

// Test de casos reales de consultas
const consultasFelman = [
  'Dame todos los clientes',
  '¿Cuántos clientes tenemos?',
  'Muéstrame los presupuestos aprobados',
  '¿Qué presupuestos están entregados?',
  '¿Cuál es el total de todos los precios?',
  'Muéstrame las líneas con presupuesto',
  'Dame los números de fabricación por serie',
  '¿Qué presupuestos se crearon hoy?',
  'Muéstrame los últimos presupuestos',
  'Dame los clientes con presupuestos',
  'Dame el resumen de estados',
  '¿Cuáles están facturados?',
  '¿Qué líneas están pendientes fabricar?',
  'Muéstrame los presupuestos más caros',
  'Presupuestos de este mes'
];

let exitosos = 0;
let conErrores = 0;

console.log('📋 Probando generación de consultas SQL mock...\n');

consultasFelman.forEach((consulta, index) => {
  console.log(`🔍 Test ${index + 1}: "${consulta}"`);
  
  try {
    const sqlGenerado = procesarConsultaFelman(consulta);
    
    // Verificar que no hay caracteres \n literales problemáticos
    const tieneCaracteresProblematicos = sqlGenerado.includes('\\n') || 
                                        sqlGenerado.includes('\\r') || 
                                        sqlGenerado.includes('\\t');
    
    // Verificar que es SQL válido básico
    const esSQLValido = sqlGenerado.toLowerCase().includes('select') &&
                       sqlGenerado.toLowerCase().includes('from');
    
    console.log(`   SQL: ${sqlGenerado}`);
    console.log(`   ✅ Sin caracteres \\n: ${!tieneCaracteresProblematicos ? 'SÍ' : 'NO'}`);
    console.log(`   ✅ SQL válido: ${esSQLValido ? 'SÍ' : 'NO'}`);
    
    if (!tieneCaracteresProblematicos && esSQLValido) {
      console.log(`   ✅ ÉXITO\n`);
      exitosos++;
    } else {
      console.log(`   ❌ PROBLEMA\n`);
      conErrores++;
    }
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}\n`);
    conErrores++;
  }
});

// Test específico de limpieza de SQL con problemas
console.log('🧽 Probando función de limpieza con SQL problemático...\n');

const sqlConProblemas = [
  'SELECT Serie,\\nNumero\\nFROM fpresupuestos\\nWHERE Estado = 1',
  `SELECT p.Serie,
    p.Numero,
    l.Serie1Desc
FROM fpresupuestos p
JOIN fpresupuestoslineas l
    ON p.Serie = l.CodigoSerie`,
  'SELECT\\tSerie,\\nNumero\\rFROM\\tfpresupuestos'
];

sqlConProblemas.forEach((sql, index) => {
  console.log(`🔧 Limpieza ${index + 1}:`);
  console.log(`   Original: "${sql}"`);
  
  const sqlLimpio = limpiarSQLQuery(sql);
  console.log(`   Limpio: "${sqlLimpio}"`);
  
  const sinProblemas = !sqlLimpio.includes('\\n') && 
                      !sqlLimpio.includes('\\r') && 
                      !sqlLimpio.includes('\\t');
  
  console.log(`   ✅ ${sinProblemas ? 'LIMPIO' : 'TODAVÍA TIENE PROBLEMAS'}\n`);
});

// Test de las instrucciones de OpenAI
console.log('📋 Verificando instrucciones de OpenAI...\n');

const instruccionesValidas = FELMAN_SQL_INSTRUCTIONS.includes('fpresupuestos') &&
                           FELMAN_SQL_INSTRUCTIONS.includes('fpresupuestoslineas') &&
                           FELMAN_SQL_INSTRUCTIONS.includes('Serie1Desc') &&
                           FELMAN_SQL_INSTRUCTIONS.includes('ClienteNombre') &&
                           FELMAN_SQL_INSTRUCTIONS.includes('NUNCA uses saltos de línea literales');

console.log(`✅ Instrucciones contienen schema de Felman: ${instruccionesValidas ? 'SÍ' : 'NO'}`);
console.log(`✅ Longitud de instrucciones: ${FELMAN_SQL_INSTRUCTIONS.length} caracteres`);

// Resumen final
console.log('\n📊 RESUMEN FINAL:');
console.log(`✅ Consultas exitosas: ${exitosos}/${consultasFelman.length}`);
console.log(`❌ Consultas con errores: ${conErrores}/${consultasFelman.length}`);
console.log(`📈 Porcentaje de éxito: ${Math.round((exitosos / consultasFelman.length) * 100)}%`);

if (exitosos === consultasFelman.length) {
  console.log('\n🎉 ¡PERFECTO! Todas las consultas se generan correctamente');
  console.log('🔒 No hay caracteres \\n literales que causen errores de sintaxis');
  console.log('✨ El sistema está listo para producción');
} else {
  console.log('\n⚠️ Algunas consultas necesitan ajustes');
}

// Test adicional: Verificar que las tablas principales estén en las instrucciones
console.log('\n🔍 Verificando schema en instrucciones...');
const tablasPrincipales = ['fpresupuestos', 'fpresupuestoslineas'];
const columnasClave = ['Serie1Desc', 'ClienteNombre', 'CodigoSerie', 'CodigoNumero'];

tablasPrincipales.forEach(tabla => {
  const presente = FELMAN_SQL_INSTRUCTIONS.includes(tabla);
  console.log(`   ✅ ${tabla}: ${presente ? 'PRESENTE' : 'FALTA'}`);
});

columnasClave.forEach(columna => {
  const presente = FELMAN_SQL_INSTRUCTIONS.includes(columna);
  console.log(`   ✅ ${columna}: ${presente ? 'PRESENTE' : 'FALTA'}`);
});

console.log('\n✅ Tests completados. El sistema está preparado para manejar consultas SQL sin errores de sintaxis.');
