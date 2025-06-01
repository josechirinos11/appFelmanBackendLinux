// Test de Optimización del Sistema de IA - Comparativo Antes vs Después
// Mide mejoras en detección de intención y análisis general

const { 
  analizarIntencion, 
  extraerEntidades, 
  normalizarTexto,
  procesarConsultaFelmanMejorada 
} = require('./src/config/openai-instructions');

// 🧪 Casos de prueba específicos para medir mejoras
const casosPruebaOptimizacion = [
  // Casos donde el sistema anterior fallaba
  {
    id: 1,
    consulta: "presupuestos aprobados de este mes",
    intencionEsperada: "BUSCAR",
    confianzaMinima: 0.6,
    descripcion: "Consulta compleja con filtros temporales y estado"
  },
  {
    id: 2,
    consulta: "¿Cuántos clientes nuevos tenemos?",
    intencionEsperada: "CONTAR",
    confianzaMinima: 0.7,
    descripcion: "Pregunta directa de conteo"
  },
  {
    id: 3,
    consulta: "Dame el total de ventas del año",
    intencionEsperada: "SUMAR",
    confianzaMinima: 0.8,
    descripcion: "Solicitud de agregación monetaria"
  },
  {
    id: 4,
    consulta: "Muéstrame los presupuestos con mayor precio",
    intencionEsperada: "ORDENAR",
    confianzaMinima: 0.6,
    descripcion: "Solicitud de ordenamiento por valor"
  },
  {
    id: 5,
    consulta: "líneas fabricadas pendientes",
    intencionEsperada: "BUSCAR",
    confianzaMinima: 0.5,
    descripcion: "Consulta técnica con filtro de estado"
  },
  {
    id: 6,
    consulta: "empresas que compraron este año",
    intencionEsperada: "BUSCAR",
    confianzaMinima: 0.5,
    descripcion: "Consulta temporal con relación"
  },
  {
    id: 7,
    consulta: "¿Hay presupuestos rechazados ayer?",
    intencionEsperada: "BUSCAR",
    confianzaMinima: 0.6,
    descripcion: "Pregunta temporal específica"
  },
  {
    id: 8,
    consulta: "suma total de precios",
    intencionEsperada: "SUMAR",
    confianzaMinima: 0.9,
    descripcion: "Agregación directa y clara"
  },
  // Casos nuevos para probar capacidades expandidas
  {
    id: 9,
    consulta: "Necesito ver todos los clientes activos",
    intencionEsperada: "BUSCAR",
    confianzaMinima: 0.7,
    descripcion: "Comando informal con filtro"
  },
  {
    id: 10,
    consulta: "¿Qué cantidad de productos fabricamos?",
    intencionEsperada: "CONTAR",
    confianzaMinima: 0.8,
    descripcion: "Pregunta formal de cantidad"
  },
  {
    id: 11,
    consulta: "Calcular el importe total de ofertas",
    intencionEsperada: "SUMAR",
    confianzaMinima: 0.8,
    descripcion: "Comando matemático explícito"
  },
  {
    id: 12,
    consulta: "Top 10 empresas por facturación",
    intencionEsperada: "ORDENAR",
    confianzaMinima: 0.7,
    descripcion: "Ranking con límite específico"
  }
];

// 📊 Función para ejecutar pruebas de optimización
function ejecutarPruebasOptimizacion() {
  console.log('🚀 INICIANDO PRUEBAS DE OPTIMIZACIÓN DEL SISTEMA DE IA');
  console.log('================================================================================');
  console.log(`📋 Total de casos de prueba: ${casosPruebaOptimizacion.length}`);
  console.log('================================================================================\n');

  const resultados = {
    total: casosPruebaOptimizacion.length,
    exitosos: 0,
    fallidos: 0,
    confianzaPromedio: 0,
    intencionesCorrectas: 0,
    detalles: []
  };

  casosPruebaOptimizacion.forEach((caso, index) => {
    console.log(`🧪 CASO ${caso.id}: ${caso.descripcion}`);
    console.log(`   Consulta: "${caso.consulta}"`);
    console.log(`   Intención esperada: ${caso.intencionEsperada}`);
    console.log(`   Confianza mínima: ${caso.confianzaMinima * 100}%`);
    
    try {
      // Normalizar texto
      const textoNormalizado = normalizarTexto(caso.consulta);
      
      // Analizar intención con el sistema optimizado
      const intencionAnalizada = analizarIntencion(textoNormalizado);
      
      // Extraer entidades
      const entidadesExtraidas = extraerEntidades(textoNormalizado);
      
      // Evaluar resultados
      const intencionCorrecta = intencionAnalizada.tipo === caso.intencionEsperada;
      const confianzaSuficiente = intencionAnalizada.confianza >= caso.confianzaMinima;
      const casoExitoso = intencionCorrecta && confianzaSuficiente;
      
      // Estadísticas
      if (casoExitoso) {
        resultados.exitosos++;
        console.log(`   ✅ EXITOSO`);
      } else {
        resultados.fallidos++;
        console.log(`   ❌ FALLIDO`);
      }
      
      if (intencionCorrecta) {
        resultados.intencionesCorrectas++;
      }
      
      resultados.confianzaPromedio += intencionAnalizada.confianza;
      
      // Mostrar análisis detallado
      console.log(`   📊 Resultados:`);
      console.log(`      Intención detectada: ${intencionAnalizada.tipo} (${intencionCorrecta ? '✅' : '❌'})`);
      console.log(`      Confianza: ${Math.round(intencionAnalizada.confianza * 100)}% (${confianzaSuficiente ? '✅' : '❌'})`);
      console.log(`      Palabras clave: [${intencionAnalizada.palabrasClaves.join(', ')}]`);
      console.log(`      Entidad principal: ${entidadesExtraidas.principal || 'No detectada'}`);
      
      if (intencionAnalizada.contexto?.ajusteSemantico) {
        console.log(`      🧠 Ajuste semántico: ${intencionAnalizada.contexto.ajusteSemantico}`);
      }
      
      // Guardar detalles para reporte final
      resultados.detalles.push({
        caso: caso.id,
        consulta: caso.consulta,
        esperado: caso.intencionEsperada,
        detectado: intencionAnalizada.tipo,
        confianza: intencionAnalizada.confianza,
        exitoso: casoExitoso,
        palabrasClave: intencionAnalizada.palabrasClaves.length,
        entidad: entidadesExtraidas.principal
      });
      
    } catch (error) {
      console.log(`   💥 ERROR: ${error.message}`);
      resultados.fallidos++;
      resultados.detalles.push({
        caso: caso.id,
        consulta: caso.consulta,
        error: error.message,
        exitoso: false
      });
    }
    
    console.log('');
  });

  // Calcular métricas finales
  resultados.confianzaPromedio = resultados.confianzaPromedio / resultados.total;
  const porcentajeExito = (resultados.exitosos / resultados.total) * 100;
  const porcentajeIntencion = (resultados.intencionesCorrectas / resultados.total) * 100;

  // Reporte final
  console.log('================================================================================');
  console.log('📈 REPORTE FINAL DE OPTIMIZACIÓN');
  console.log('================================================================================');
  console.log(`🎯 Casos exitosos: ${resultados.exitosos}/${resultados.total} (${porcentajeExito.toFixed(1)}%)`);
  console.log(`🧠 Intenciones correctas: ${resultados.intencionesCorrectas}/${resultados.total} (${porcentajeIntencion.toFixed(1)}%)`);
  console.log(`📊 Confianza promedio: ${(resultados.confianzaPromedio * 100).toFixed(1)}%`);
  console.log(`❌ Casos fallidos: ${resultados.fallidos}`);
  
  // Análisis de mejora
  console.log('\n🔍 ANÁLISIS DE MEJORA:');
  
  if (porcentajeIntencion >= 80) {
    console.log('   🎊 EXCELENTE: Detección de intención optimizada exitosamente');
  } else if (porcentajeIntencion >= 60) {
    console.log('   ✅ BUENO: Mejora significativa en detección de intención');
  } else {
    console.log('   ⚠️ MEJORABLE: Se requiere más optimización');
  }
  
  if (resultados.confianzaPromedio >= 0.7) {
    console.log('   💪 ALTA CONFIANZA: Sistema muy seguro en sus predicciones');
  } else if (resultados.confianzaPromedio >= 0.5) {
    console.log('   👍 CONFIANZA MODERADA: Sistema con buena precisión');
  } else {
    console.log('   🤔 BAJA CONFIANZA: Se requiere calibración adicional');
  }

  // Top casos exitosos
  console.log('\n🏆 TOP CASOS EXITOSOS:');
  const topExitosos = resultados.detalles
    .filter(d => d.exitoso)
    .sort((a, b) => b.confianza - a.confianza)
    .slice(0, 3);
    
  topExitosos.forEach((caso, i) => {
    console.log(`   ${i + 1}. Caso ${caso.caso}: "${caso.consulta}" - ${(caso.confianza * 100).toFixed(1)}% confianza`);
  });

  // Casos que necesitan atención
  const casosFallidos = resultados.detalles.filter(d => !d.exitoso);
  if (casosFallidos.length > 0) {
    console.log('\n⚠️ CASOS QUE NECESITAN ATENCIÓN:');
    casosFallidos.forEach(caso => {
      if (caso.error) {
        console.log(`   • Caso ${caso.caso}: ERROR - ${caso.error}`);
      } else {
        console.log(`   • Caso ${caso.caso}: "${caso.consulta}" - Esperado: ${caso.esperado}, Detectado: ${caso.detectado}`);
      }
    });
  }

  console.log('\n🎯 Sistema de IA optimizado y evaluado completamente');
  return resultados;
}

// Ejecutar las pruebas
if (require.main === module) {
  ejecutarPruebasOptimizacion();
}

module.exports = {
  ejecutarPruebasOptimizacion,
  casosPruebaOptimizacion
};
