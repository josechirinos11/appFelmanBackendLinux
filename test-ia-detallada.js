// Test del Sistema de IA Detallada - Felman Advanced Analysis System
// Prueba el endpoint /mock-sql con capacidades avanzadas de análisis

const axios = require('axios');

const SERVIDOR_URL = 'http://localhost:3001';

// 🧪 Conjunto de pruebas comprehensivas para el análisis detallado
const consultasPrueba = [
  // Consultas básicas
  {
    categoria: "CONSULTAS_BASICAS",
    descripcion: "Consulta simple de presupuestos",
    texto: "mostrar presupuestos",
    esperado: {
      intencion: "BUSCAR",
      entidad: "PRESUPUESTO",
      complejidad: "BAJA"
    }
  },
  
  // Consultas con intención de conteo
  {
    categoria: "INTENCION_CONTEO",
    descripcion: "Contar clientes únicos",
    texto: "cuántos clientes tenemos",
    esperado: {
      intencion: "CONTAR",
      entidad: "CLIENTE",
      tieneAgregacion: true
    }
  },
  
  // Consultas con filtros temporales
  {
    categoria: "FILTROS_TEMPORALES",
    descripcion: "Presupuestos del día actual",
    texto: "presupuestos de hoy",
    esperado: {
      intencion: "BUSCAR",
      entidad: "PRESUPUESTO",
      tieneCondicionTemporal: true
    }
  },
  
  // Consultas con estados específicos
  {
    categoria: "FILTROS_ESTADO",
    descripcion: "Presupuestos aprobados",
    texto: "presupuestos aprobados",
    esperado: {
      intencion: "BUSCAR",
      entidad: "PRESUPUESTO",
      tieneFiltroEstado: true
    }
  },
  
  // Consultas de suma/totalización
  {
    categoria: "INTENCION_SUMA",
    descripcion: "Total de precios",
    texto: "suma total de precios",
    esperado: {
      intencion: "SUMAR",
      tieneAgregacion: true,
      usaSum: true
    }
  },
  
  // Consultas complejas con múltiples condiciones
  {
    categoria: "CONSULTAS_COMPLEJAS",
    descripcion: "Presupuestos aprobados de este mes por cliente",
    texto: "presupuestos aprobados de este mes agrupados por cliente",
    esperado: {
      intencion: "BUSCAR",
      entidad: "PRESUPUESTO",
      complejidad: "ALTA",
      tieneCondicionTemporal: true,
      tieneFiltroEstado: true
    }
  },
  
  // Consultas con comparaciones
  {
    categoria: "COMPARACIONES",
    descripcion: "Presupuestos más caros",
    texto: "presupuestos con mayor precio",
    esperado: {
      intencion: "BUSCAR",
      tieneOrdenamiento: true,
      usaOrderBy: true
    }
  },
  
  // Consultas con líneas de presupuesto
  {
    categoria: "LINEAS_PRESUPUESTO",
    descripcion: "Líneas de productos fabricadas",
    texto: "líneas fabricadas pendientes de entrega",
    esperado: {
      intencion: "BUSCAR",
      entidad: "LINEA",
      tieneJoin: true
    }
  },
  
  // Consultas con variaciones de lenguaje
  {
    categoria: "VARIACIONES_LENGUAJE",
    descripcion: "Sinónimos de cliente",
    texto: "empresas que compraron este año",
    esperado: {
      intencion: "BUSCAR",
      entidad: "CLIENTE",
      tieneCondicionTemporal: true
    }
  },
  
  // Consultas de fabricación
  {
    categoria: "FABRICACION",
    descripcion: "Números de fabricación enviados",
    texto: "números de fabricación enviados a fábrica",
    esperado: {
      intencion: "BUSCAR",
      entidad: "PRESUPUESTO",
      tieneFiltroEstado: true
    }
  }
];

// 🔍 Función para analizar respuesta detallada
function analizarRespuestaDetallada(respuesta, consulta) {
  console.log(`\n🔬 ANÁLISIS DETALLADO DE: "${consulta.texto}"`);
  console.log(`📂 Categoría: ${consulta.categoria}`);
  console.log(`📝 Descripción: ${consulta.descripcion}`);
  
  const data = respuesta.data;
  
  // Verificar estructura básica de respuesta
  const estructuraCompleta = {
    tieneSQL: !!data.consulta,
    tieneResumenEjecutivo: !!data.resumenEjecutivo,
    tieneAnalisisTecnico: !!data.analisisTecnico,
    tieneCaracteristicasIA: !!data.caracteristicasIA,
    tieneSeguridad: !!data.seguridad,
    tieneMetricas: !!data.metricas,
    tieneDebugging: !!data.debugging,
    tieneExplicacion: !!data.explicacion
  };
  
  console.log(`\n📊 ESTRUCTURA DE RESPUESTA:`);
  Object.entries(estructuraCompleta).forEach(([key, value]) => {
    console.log(`   ${value ? '✅' : '❌'} ${key}: ${value}`);
  });
  
  // Analizar SQL generado
  if (data.consulta) {
    console.log(`\n💫 SQL GENERADO:`);
    console.log(`   📝 Consulta: ${data.consulta}`);
    console.log(`   📏 Longitud: ${data.consulta.length} caracteres`);
    console.log(`   🔧 Válido: ${data.consulta.includes('SELECT') && data.consulta.includes('FROM')}`);
  }
  
  // Analizar resumen ejecutivo
  if (data.resumenEjecutivo) {
    console.log(`\n🎯 RESUMEN EJECUTIVO:`);
    console.log(`   🎪 Intención: ${data.resumenEjecutivo.intencionPrincipal}`);
    console.log(`   🏷️ Entidad: ${data.resumenEjecutivo.entidadPrincipal}`);
    console.log(`   🌟 Complejidad: ${data.resumenEjecutivo.complejidadSQL}`);
    console.log(`   💡 Recomendación: ${data.resumenEjecutivo.recomendacion}`);
  }
  
  // Analizar análisis técnico
  if (data.analisisTecnico) {
    const tecnico = data.analisisTecnico;
    
    console.log(`\n🔬 ANÁLISIS TÉCNICO:`);
    
    if (tecnico.procesamiento) {
      console.log(`   📝 Texto normalizado: "${tecnico.procesamiento.textoNormalizado}"`);
      console.log(`   ✅ Procesado correctamente: ${tecnico.procesamiento.procesadoCorrectamente}`);
    }
    
    if (tecnico.intencionDetectada) {
      console.log(`   🎯 Intención: ${tecnico.intencionDetectada.tipo} (${tecnico.intencionDetectada.confianza})`);
      console.log(`   🔑 Palabras clave: [${tecnico.intencionDetectada.palabrasClaves.join(', ')}]`);
    }
    
    if (tecnico.entidadesIdentificadas) {
      const entidades = tecnico.entidadesIdentificadas;
      console.log(`   🏷️ Entidad principal: ${entidades.entidadPrincipal || 'NINGUNA'}`);
      console.log(`   🔍 Filtros estado: [${entidades.filtrosEstado.join(', ')}]`);
      console.log(`   📅 Condiciones temporales: ${entidades.condicionesTemporales.length}`);
      console.log(`   🔢 Condiciones numéricas: ${entidades.condicionesNumericas.length}`);
    }
    
    if (tecnico.analisisSQL) {
      const sqlAnalisis = tecnico.analisisSQL;
      console.log(`   📊 Complejidad SQL: ${sqlAnalisis.complejidad}`);
      console.log(`   📋 Tablas: [${sqlAnalisis.tablas.join(', ')}]`);
      console.log(`   🔧 Operaciones:`);
      Object.entries(sqlAnalisis.operaciones).forEach(([op, value]) => {
        console.log(`      ${value ? '✅' : '❌'} ${op}`);
      });
      console.log(`   📈 Métricas:`);
      Object.entries(sqlAnalisis.metricas).forEach(([metric, value]) => {
        console.log(`      📊 ${metric}: ${value}`);
      });
    }
    
    if (tecnico.calidad) {
      console.log(`   🌟 Puntuación calidad: ${tecnico.calidad.puntuacionGeneral}%`);
      console.log(`   🎖️ Aspectos:`);
      Object.entries(tecnico.calidad.aspectos).forEach(([aspecto, valor]) => {
        console.log(`      ${aspecto}: ${valor}`);
      });
    }
  }
  
  // Verificar expectativas
  console.log(`\n🎯 VERIFICACIÓN DE EXPECTATIVAS:`);
  const resultados = {};
  
  if (consulta.esperado.intencion) {
    const intencionCorrecta = data.resumenEjecutivo?.intencionPrincipal === consulta.esperado.intencion;
    resultados.intencion = intencionCorrecta;
    console.log(`   ${intencionCorrecta ? '✅' : '❌'} Intención esperada: ${consulta.esperado.intencion}`);
  }
  
  if (consulta.esperado.entidad) {
    const entidadCorrecta = data.resumenEjecutivo?.entidadPrincipal === consulta.esperado.entidad;
    resultados.entidad = entidadCorrecta;
    console.log(`   ${entidadCorrecta ? '✅' : '❌'} Entidad esperada: ${consulta.esperado.entidad}`);
  }
  
  if (consulta.esperado.complejidad) {
    const complejidadCorrecta = data.resumenEjecutivo?.complejidadSQL === consulta.esperado.complejidad;
    resultados.complejidad = complejidadCorrecta;
    console.log(`   ${complejidadCorrecta ? '✅' : '❌'} Complejidad esperada: ${consulta.esperado.complejidad}`);
  }
  
  if (consulta.esperado.tieneAgregacion) {
    const tieneAgregacion = data.analisisTecnico?.analisisSQL?.operaciones?.tieneAgregaciones;
    resultados.agregacion = tieneAgregacion === consulta.esperado.tieneAgregacion;
    console.log(`   ${resultados.agregacion ? '✅' : '❌'} Agregación esperada: ${consulta.esperado.tieneAgregacion}`);
  }
  
  // Calcular puntuación general
  const puntuacionesValidas = Object.values(resultados).filter(r => r !== undefined);
  const aciertos = puntuacionesValidas.filter(r => r === true).length;
  const puntuacionFinal = puntuacionesValidas.length > 0 ? Math.round((aciertos / puntuacionesValidas.length) * 100) : 100;
  
  console.log(`\n🏆 PUNTUACIÓN FINAL: ${puntuacionFinal}% (${aciertos}/${puntuacionesValidas.length})`);
  
  return {
    puntuacion: puntuacionFinal,
    aciertos: aciertos,
    total: puntuacionesValidas.length,
    detalles: resultados
  };
}

// 🚀 Función principal de testing
async function ejecutarTestsDetallados() {
  console.log('🎯 INICIANDO TESTS DEL SISTEMA DE IA DETALLADA');
  console.log('='.repeat(80));
  
  const resultadosGlobales = {
    totalTests: consultasPrueba.length,
    exitos: 0,
    fallos: 0,
    errores: 0,
    puntuacionPromedio: 0,
    detallesPorCategoria: {}
  };
  
  for (let i = 0; i < consultasPrueba.length; i++) {
    const consulta = consultasPrueba[i];
    
    try {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`🧪 TEST ${i + 1}/${consultasPrueba.length}`);
      
      const respuesta = await axios.post(`${SERVIDOR_URL}/openai/mock-sql`, {
        textoUsuario: consulta.texto
      });
      
      if (respuesta.data.success) {
        const analisis = analizarRespuestaDetallada(respuesta, consulta);
        
        resultadosGlobales.puntuacionPromedio += analisis.puntuacion;
        
        if (analisis.puntuacion >= 80) {
          resultadosGlobales.exitos++;
          console.log(`\n🎉 TEST EXITOSO (${analisis.puntuacion}%)`);
        } else {
          resultadosGlobales.fallos++;
          console.log(`\n⚠️ TEST CON FALLOS (${analisis.puntuacion}%)`);
        }
        
        // Agrupar por categoría
        if (!resultadosGlobales.detallesPorCategoria[consulta.categoria]) {
          resultadosGlobales.detallesPorCategoria[consulta.categoria] = {
            tests: 0,
            puntuacionTotal: 0,
            promedio: 0
          };
        }
        
        const categoria = resultadosGlobales.detallesPorCategoria[consulta.categoria];
        categoria.tests++;
        categoria.puntuacionTotal += analisis.puntuacion;
        categoria.promedio = Math.round(categoria.puntuacionTotal / categoria.tests);
        
      } else {
        resultadosGlobales.errores++;
        console.log(`\n❌ ERROR EN RESPUESTA: ${respuesta.data.message}`);
      }
      
    } catch (error) {
      resultadosGlobales.errores++;
      console.log(`\n💥 ERROR DE CONEXIÓN: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // Pausa entre tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Calcular estadísticas finales
  resultadosGlobales.puntuacionPromedio = Math.round(
    resultadosGlobales.puntuacionPromedio / resultadosGlobales.totalTests
  );
  
  // Mostrar resumen final
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🏁 RESUMEN FINAL DE TESTS`);
  console.log(`${'='.repeat(80)}`);
  console.log(`📊 Total de tests ejecutados: ${resultadosGlobales.totalTests}`);
  console.log(`✅ Tests exitosos: ${resultadosGlobales.exitos}`);
  console.log(`⚠️ Tests con fallos: ${resultadosGlobales.fallos}`);
  console.log(`❌ Errores de sistema: ${resultadosGlobales.errores}`);
  console.log(`🎯 Puntuación promedio: ${resultadosGlobales.puntuacionPromedio}%`);
  
  console.log(`\n📂 RESULTADOS POR CATEGORÍA:`);
  Object.entries(resultadosGlobales.detallesPorCategoria).forEach(([categoria, stats]) => {
    console.log(`   ${categoria}: ${stats.promedio}% (${stats.tests} tests)`);
  });
  
  const tasaExito = Math.round((resultadosGlobales.exitos / resultadosGlobales.totalTests) * 100);
  console.log(`\n🏆 TASA DE ÉXITO GENERAL: ${tasaExito}%`);
  
  if (tasaExito >= 80) {
    console.log(`\n🎉 ¡SISTEMA DE IA DETALLADA FUNCIONANDO EXCELENTEMENTE!`);
  } else if (tasaExito >= 60) {
    console.log(`\n👍 Sistema funcionando bien, con oportunidades de mejora`);
  } else {
    console.log(`\n⚠️ Sistema necesita optimización`);
  }
  
  return resultadosGlobales;
}

// Ejecutar si se llama directamente
if (require.main === module) {
  ejecutarTestsDetallados()
    .then(resultados => {
      console.log(`\n✨ Tests completados. Puntuación final: ${resultados.puntuacionPromedio}%`);
      process.exit(resultados.puntuacionPromedio >= 70 ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Error fatal en tests:', error);
      process.exit(1);
    });
}

module.exports = {
  ejecutarTestsDetallados,
  consultasPrueba,
  analizarRespuestaDetallada
};
