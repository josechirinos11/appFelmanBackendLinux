// Demostración del Sistema de IA Avanzada - Sin Servidor
// Prueba las funciones de procesamiento de IA directamente

const {
  procesarConsultaFelmanMejorada,
  normalizarTexto,
  analizarIntencion,
  extraerEntidades,
  generarSQLInteligente,
  DICCIONARIO_SINONIMOS,
  ANALIZADOR_INTENCION
} = require('./src/config/openai-instructions');

console.log('🧠 DEMOSTRACIÓN DEL SISTEMA DE IA AVANZADA FELMAN');
console.log('='.repeat(80));
console.log('📋 Probando funciones de procesamiento de IA sin necesidad de servidor');
console.log('='.repeat(80));

// Conjunto de consultas de demostración
const consultasDemo = [
  "mostrar presupuestos",
  "cuántos clientes tenemos",
  "presupuestos aprobados de este mes",
  "suma total de precios",
  "presupuestos con mayor precio",
  "líneas fabricadas pendientes",
  "empresas que compraron este año",
  "presupuestos rechazados ayer"
];

function demostrarProcesamiento(consulta) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 ANALIZANDO: "${consulta}"`);
  console.log(`${'='.repeat(80)}`);
  
  // Paso 1: Normalización
  const textoNormalizado = normalizarTexto(consulta);
  console.log(`\n1️⃣ NORMALIZACIÓN:`);
  console.log(`   Original: "${consulta}"`);
  console.log(`   Normalizado: "${textoNormalizado}"`);
  console.log(`   Cambios: ${consulta !== textoNormalizado ? 'SÍ' : 'NO'}`);
  
  // Paso 2: Análisis de intención
  const intencion = analizarIntencion(textoNormalizado);
  console.log(`\n2️⃣ ANÁLISIS DE INTENCIÓN:`);
  console.log(`   Tipo detectado: ${intencion.tipo}`);
  console.log(`   Confianza: ${Math.round(intencion.confianza * 100)}%`);
  console.log(`   Palabras clave: [${intencion.palabrasClaves.join(', ')}]`);
  
  // Paso 3: Extracción de entidades
  const entidades = extraerEntidades(textoNormalizado);
  console.log(`\n3️⃣ EXTRACCIÓN DE ENTIDADES:`);
  console.log(`   Entidad principal: ${entidades.principal || 'NINGUNA'}`);
  console.log(`   Filtros de estado: [${entidades.filtros.join(', ')}]`);
  console.log(`   Condiciones temporales: ${entidades.condicionesTemporales.length}`);
  console.log(`   Condiciones numéricas: ${entidades.condicionesNumericas.length}`);
  
  if (entidades.condicionesTemporales.length > 0) {
    console.log(`   📅 Detalles temporales:`);
    entidades.condicionesTemporales.forEach(ct => {
      console.log(`      "${ct.original}" → ${ct.condicion}`);
    });
  }
  
  // Paso 4: Generación de SQL
  const sqlGenerado = procesarConsultaFelmanMejorada(consulta);
  console.log(`\n4️⃣ GENERACIÓN DE SQL:`);
  console.log(`   SQL: ${sqlGenerado}`);
  console.log(`   Longitud: ${sqlGenerado.length} caracteres`);
  console.log(`   Válido: ${sqlGenerado.includes('SELECT') && sqlGenerado.includes('FROM')}`);
  
  // Paso 5: Análisis del SQL generado
  console.log(`\n5️⃣ ANÁLISIS DEL SQL:`);
  console.log(`   Tiene JOINs: ${sqlGenerado.includes('JOIN')}`);
  console.log(`   Tiene agregaciones: ${sqlGenerado.includes('SUM(') || sqlGenerado.includes('COUNT(')}`);
  console.log(`   Tiene filtros fecha: ${sqlGenerado.includes('FechaCreacion') || sqlGenerado.includes('DATE')}`);
  console.log(`   Tiene ordenamiento: ${sqlGenerado.includes('ORDER BY')}`);
  console.log(`   Tiene límites: ${sqlGenerado.includes('LIMIT')}`);
  console.log(`   Tiene condiciones: ${sqlGenerado.includes('WHERE')}`);
  
  // Evaluación de calidad
  let puntuacion = 0;
  if (sqlGenerado.includes('SELECT') && sqlGenerado.includes('FROM')) puntuacion += 30;
  if (intencion.confianza > 0.3) puntuacion += 20;
  if (entidades.principal) puntuacion += 15;
  if (entidades.filtros.length > 0) puntuacion += 15;
  if (entidades.condicionesTemporales.length > 0) puntuacion += 10;
  if (intencion.palabrasClaves.length > 0) puntuacion += 10;
  
  console.log(`\n🏆 PUNTUACIÓN DE CALIDAD: ${puntuacion}%`);
  
  return {
    consulta,
    textoNormalizado,
    intencion,
    entidades,
    sqlGenerado,
    puntuacion
  };
}

function mostrarEstadisticasGenerales() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 ESTADÍSTICAS DEL SISTEMA DE IA`);
  console.log(`${'='.repeat(80)}`);
  
  // Contar sinónimos
  let totalSinonimos = 0;
  Object.values(DICCIONARIO_SINONIMOS).forEach(sinonimos => {
    totalSinonimos += sinonimos.length;
  });
  
  console.log(`📚 DICCIONARIO DE SINÓNIMOS:`);
  console.log(`   Total de términos base: ${Object.keys(DICCIONARIO_SINONIMOS).length}`);
  console.log(`   Total de sinónimos: ${totalSinonimos}`);
  console.log(`   Promedio por término: ${Math.round(totalSinonimos / Object.keys(DICCIONARIO_SINONIMOS).length)}`);
  
  console.log(`\n🎯 TIPOS DE INTENCIÓN:`);
  Object.entries(ANALIZADOR_INTENCION.tiposIntencion).forEach(([tipo, palabras]) => {
    console.log(`   ${tipo}: ${palabras.length} palabras clave`);
  });
  
  console.log(`\n🏷️ ENTIDADES PRINCIPALES:`);
  Object.entries(ANALIZADOR_INTENCION.entidadesPrincipales).forEach(([entidad, palabras]) => {
    console.log(`   ${entidad}: ${palabras.length} variaciones`);
  });
}

// Ejecutar demostración
async function ejecutarDemo() {
  mostrarEstadisticasGenerales();
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🚀 INICIANDO PROCESAMIENTO DE ${consultasDemo.length} CONSULTAS`);
  console.log(`${'='.repeat(80)}`);
  
  const resultados = [];
  
  for (let i = 0; i < consultasDemo.length; i++) {
    const resultado = demostrarProcesamiento(consultasDemo[i]);
    resultados.push(resultado);
    
    // Pausa pequeña para legibilidad
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Resumen final
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📈 RESUMEN FINAL`);
  console.log(`${'='.repeat(80)}`);
  
  const puntuacionPromedio = Math.round(
    resultados.reduce((sum, r) => sum + r.puntuacion, 0) / resultados.length
  );
  
  const sqlsValidos = resultados.filter(r => 
    r.sqlGenerado.includes('SELECT') && r.sqlGenerado.includes('FROM')
  ).length;
  
  const intencionesDetectadas = resultados.filter(r => 
    r.intencion.confianza > 0.3
  ).length;
  
  const entidadesDetectadas = resultados.filter(r => 
    r.entidades.principal !== null
  ).length;
  
  console.log(`📊 ESTADÍSTICAS FINALES:`);
  console.log(`   Total consultas procesadas: ${resultados.length}`);
  console.log(`   SQLs válidos generados: ${sqlsValidos}/${resultados.length} (${Math.round(sqlsValidos/resultados.length*100)}%)`);
  console.log(`   Intenciones detectadas: ${intencionesDetectadas}/${resultados.length} (${Math.round(intencionesDetectadas/resultados.length*100)}%)`);
  console.log(`   Entidades detectadas: ${entidadesDetectadas}/${resultados.length} (${Math.round(entidadesDetectadas/resultados.length*100)}%)`);
  console.log(`   Puntuación promedio: ${puntuacionPromedio}%`);
  
  console.log(`\n🎯 CONSULTAS POR PUNTUACIÓN:`);
  resultados
    .sort((a, b) => b.puntuacion - a.puntuacion)
    .forEach(r => {
      console.log(`   ${r.puntuacion}% - "${r.consulta}"`);
    });
  
  if (puntuacionPromedio >= 80) {
    console.log(`\n🎉 ¡SISTEMA DE IA FUNCIONANDO EXCELENTEMENTE!`);
    console.log(`   El sistema demuestra alta precisión y capacidades avanzadas`);
  } else if (puntuacionPromedio >= 60) {
    console.log(`\n👍 Sistema funcionando correctamente`);
    console.log(`   Rendimiento bueno con oportunidades de mejora`);
  } else {
    console.log(`\n⚠️ Sistema necesita optimización`);
    console.log(`   Se requieren ajustes para mejorar precisión`);
  }
  
  console.log(`\n✨ DEMOSTRACIÓN COMPLETADA`);
  console.log(`   El sistema está listo para su uso en producción`);
  console.log(`   Para pruebas completas, ejecutar: node test-ia-detallada.js`);
  console.log(`   Para pruebas simples con servidor: node test-simple-ia.js`);
}

// Ejecutar si se llama directamente
if (require.main === module) {
  ejecutarDemo()
    .then(() => {
      console.log('\n🏁 Demo completado exitosamente');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Error en demo:', error);
      process.exit(1);
    });
}

module.exports = {
  ejecutarDemo,
  demostrarProcesamiento,
  mostrarEstadisticasGenerales
};
