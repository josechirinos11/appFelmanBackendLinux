/**
 * Test completo del sistema de IA avanzada para procesamiento de consultas
 * Prueba las nuevas capacidades de interpretación de lenguaje natural
 */

const axios = require('axios');

// Configuración del servidor
const BASE_URL = 'http://localhost:3001';
const ENDPOINT = '/openai/mock-sql';

// Casos de prueba avanzados para IA
const CASOS_PRUEBA_IA = [
  // === PRUEBAS DE ANÁLISIS SEMÁNTICO ===
  {
    categoria: '🧠 ANÁLISIS SEMÁNTICO',
    consulta: 'Cuántos consumidores tengo en mi base de datos',
    esperado: 'Debe detectar "consumidores" = "clientes" y usar COUNT(DISTINCT ClienteNombre)'
  },
  {
    categoria: '🧠 ANÁLISIS SEMÁNTICO',
    consulta: 'Mostrame las ofertas que están esperando aprobación',
    esperado: 'Debe detectar "ofertas" = "presupuestos", "esperando" = "pendiente"'
  },
  {
    categoria: '🧠 ANÁLISIS SEMÁNTICO',
    consulta: 'Necesito ver las empresas que han comprado productos',
    esperado: 'Debe detectar "empresas" = "clientes", "comprado" = presupuestos entregados/facturados'
  },
  
  // === PRUEBAS DE EXTRACCIÓN DE ENTIDADES TEMPORALES ===
  {
    categoria: '📅 ENTIDADES TEMPORALES',
    consulta: 'Presupuestos creados hoy',
    esperado: 'Debe usar DATE(FechaCreacion) = CURDATE()'
  },
  {
    categoria: '📅 ENTIDADES TEMPORALES',
    consulta: 'Ventas de ayer',
    esperado: 'Debe usar DATE(FechaCreacion) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)'
  },
  {
    categoria: '📅 ENTIDADES TEMPORALES',
    consulta: 'Cotizaciones de esta semana',
    esperado: 'Debe usar WEEK(FechaCreacion) = WEEK(CURDATE())'
  },
  {
    categoria: '📅 ENTIDADES TEMPORALES',
    consulta: 'Trabajos de los últimos 15 días',
    esperado: 'Debe usar FechaCreacion >= DATE_SUB(CURDATE(), INTERVAL 15 DAY)'
  },
  
  // === PRUEBAS DE ANÁLISIS DE INTENCIÓN ===
  {
    categoria: '🎯 ANÁLISIS DE INTENCIÓN',
    consulta: 'Cuál es el total de todos los presupuestos aprobados',
    esperado: 'Intención SUMAR + estado aprobado → SUM(Precio) WHERE Aprobado = 1'
  },
  {
    categoria: '🎯 ANÁLISIS DE INTENCIÓN',
    consulta: 'Cuántas propuestas tengo pendientes de revisión',
    esperado: 'Intención CONTAR + estado pendiente → COUNT(*) WHERE Estado = 1'
  },
  {
    categoria: '🎯 ANÁLISIS DE INTENCIÓN',
    consulta: 'Listame los clientes que más dinero me han traído',
    esperado: 'Intención BUSCAR + ORDENAR → GROUP BY ClienteNombre ORDER BY SUM(Precio) DESC'
  },
  
  // === PRUEBAS DE EXTRACCIÓN NUMÉRICA ===
  {
    categoria: '🔢 ENTIDADES NUMÉRICAS',
    consulta: 'Presupuestos de más de 10000 euros',
    esperado: 'Debe usar Precio > 10000'
  },
  {
    categoria: '🔢 ENTIDADES NUMÉRICAS',
    consulta: 'Ofertas entre 5000 y 15000',
    esperado: 'Debe usar Precio BETWEEN 5000 AND 15000'
  },
  {
    categoria: '🔢 ENTIDADES NUMÉRICAS',
    consulta: 'Cotizaciones menores a 2500',
    esperado: 'Debe usar Precio < 2500'
  },
  
  // === PRUEBAS DE CONSULTAS COMPLEJAS ===
  {
    categoria: '🔥 CONSULTAS COMPLEJAS',
    consulta: 'Clientes con presupuestos aprobados este mes de más de 8000 euros',
    esperado: 'Debe combinar: fecha (mes actual) + estado (aprobado) + precio (> 8000)'
  },
  {
    categoria: '🔥 CONSULTAS COMPLEJAS',
    consulta: 'Total facturado a empresas esta semana',
    esperado: 'Debe usar SUM(Precio) + WHERE Facturado = 1 + condición de semana actual'
  },
  {
    categoria: '🔥 CONSULTAS COMPLEJAS',
    consulta: 'Los 5 clientes que más han gastado en presupuestos entregados',
    esperado: 'Debe usar GROUP BY ClienteNombre + SUM(Precio) + WHERE Entregado = 1 + ORDER BY DESC + LIMIT 5'
  },
  
  // === PRUEBAS DE RESISTENCIA (LENGUAJE COLOQUIAL) ===
  {
    categoria: '💬 LENGUAJE COLOQUIAL',
    consulta: 'A ver los curritos que tengo por aprobar',
    esperado: 'Debe interpretar como presupuestos pendientes'
  },
  {
    categoria: '💬 LENGUAJE COLOQUIAL',
    consulta: 'Enséñame la pasta que he ganado hoy',
    esperado: 'Debe interpretar como suma de precios de hoy'
  },
  {
    categoria: '💬 LENGUAJE COLOQUIAL',
    consulta: 'Cuánta gente me ha comprado cosas',
    esperado: 'Debe interpretar como clientes únicos con presupuestos'
  }
];

// Función para ejecutar una prueba individual
async function ejecutarPrueba(caso, indice) {
  try {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 PRUEBA ${indice + 1}/${CASOS_PRUEBA_IA.length} - ${caso.categoria}`);
    console.log(`📝 Consulta: "${caso.consulta}"`);
    console.log(`🎯 Esperado: ${caso.esperado}`);
    console.log(`${'='.repeat(80)}`);
    
    const inicio = Date.now();
    
    const response = await axios.post(`${BASE_URL}${ENDPOINT}`, {
      textoUsuario: caso.consulta
    }, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const tiempoRespuesta = Date.now() - inicio;
    
    if (response.status === 200 && response.data.success) {
      console.log(`✅ ÉXITO en ${tiempoRespuesta}ms`);
      console.log(`🤖 Modelo: ${response.data.modelo}`);
      console.log(`📊 SQL: ${response.data.consulta}`);
      
      if (response.data.caracteristicasIA) {
        console.log(`🧠 Características IA:`);
        Object.entries(response.data.caracteristicasIA).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }
      
      if (response.data.analisisConsulta) {
        console.log(`📈 Análisis:`);
        console.log(`   Complejidad SQL: ${response.data.analisisConsulta.complejidadSQL} palabras`);
        console.log(`   Tiene JOINs: ${response.data.analisisConsulta.tieneJoins ? '✅' : '❌'}`);
        console.log(`   Tiene agregaciones: ${response.data.analisisConsulta.tieneAgregaciones ? '✅' : '❌'}`);
        console.log(`   Filtros de fecha: ${response.data.analisisConsulta.tieneFiltrosFecha ? '✅' : '❌'}`);
        console.log(`   Ordenamiento: ${response.data.analisisConsulta.tieneOrdenamiento ? '✅' : '❌'}`);
      }
      
      return {
        exito: true,
        tiempo: tiempoRespuesta,
        sql: response.data.consulta,
        categoria: caso.categoria,
        consulta: caso.consulta,
        analisis: response.data.analisisConsulta || {},
        sistema: response.data.debugging?.sistemaUsado || 'DESCONOCIDO'
      };
      
    } else {
      console.log(`❌ FALLÓ: ${response.data.message || 'Error desconocido'}`);
      return {
        exito: false,
        error: response.data.message,
        categoria: caso.categoria,
        consulta: caso.consulta
      };
    }
    
  } catch (error) {
    console.log(`💥 ERROR: ${error.message}`);
    if (error.response) {
      console.log(`📱 Status: ${error.response.status}`);
      console.log(`📄 Data:`, error.response.data);
    }
    
    return {
      exito: false,
      error: error.message,
      categoria: caso.categoria,
      consulta: caso.consulta
    };
  }
}

// Función principal de testing
async function ejecutarPruebasIA() {
  console.log(`🚀 INICIANDO PRUEBAS DEL SISTEMA DE IA AVANZADA`);
  console.log(`📊 Total de casos de prueba: ${CASOS_PRUEBA_IA.length}`);
  console.log(`🌐 Endpoint: ${BASE_URL}${ENDPOINT}`);
  console.log(`⏰ Iniciado: ${new Date().toLocaleString()}`);
  
  const resultados = [];
  let exitosos = 0;
  let fallidos = 0;
  
  // Ejecutar todas las pruebas
  for (let i = 0; i < CASOS_PRUEBA_IA.length; i++) {
    const resultado = await ejecutarPrueba(CASOS_PRUEBA_IA[i], i);
    resultados.push(resultado);
    
    if (resultado.exito) {
      exitosos++;
    } else {
      fallidos++;
    }
    
    // Pausa entre pruebas para no sobrecargar
    if (i < CASOS_PRUEBA_IA.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Análisis de resultados
  console.log(`\n${'🎉'.repeat(50)}`);
  console.log(`📊 RESUMEN DE PRUEBAS DEL SISTEMA IA AVANZADA`);
  console.log(`${'🎉'.repeat(50)}`);
  console.log(`✅ Exitosas: ${exitosos}/${CASOS_PRUEBA_IA.length} (${((exitosos/CASOS_PRUEBA_IA.length)*100).toFixed(1)}%)`);
  console.log(`❌ Fallidas: ${fallidos}/${CASOS_PRUEBA_IA.length} (${((fallidos/CASOS_PRUEBA_IA.length)*100).toFixed(1)}%)`);
  
  // Análisis por categoría
  const porCategoria = {};
  resultados.forEach(r => {
    if (!porCategoria[r.categoria]) {
      porCategoria[r.categoria] = { exitosos: 0, total: 0 };
    }
    porCategoria[r.categoria].total++;
    if (r.exito) porCategoria[r.categoria].exitosos++;
  });
  
  console.log(`\n📈 RESULTADOS POR CATEGORÍA:`);
  Object.entries(porCategoria).forEach(([categoria, stats]) => {
    const porcentaje = ((stats.exitosos/stats.total)*100).toFixed(1);
    console.log(`   ${categoria}: ${stats.exitosos}/${stats.total} (${porcentaje}%)`);
  });
  
  // Análisis de rendimiento
  const tiemposExitosos = resultados.filter(r => r.exito && r.tiempo).map(r => r.tiempo);
  if (tiemposExitosos.length > 0) {
    const tiempoPromedio = tiemposExitosos.reduce((a, b) => a + b, 0) / tiemposExitosos.length;
    const tiempoMin = Math.min(...tiemposExitosos);
    const tiempoMax = Math.max(...tiemposExitosos);
    
    console.log(`\n⚡ ANÁLISIS DE RENDIMIENTO:`);
    console.log(`   Tiempo promedio: ${tiempoPromedio.toFixed(0)}ms`);
    console.log(`   Tiempo mínimo: ${tiempoMin}ms`);
    console.log(`   Tiempo máximo: ${tiempoMax}ms`);
  }
  
  // Análisis de sistemas utilizados
  const sistemasUsados = {};
  resultados.filter(r => r.exito && r.sistema).forEach(r => {
    sistemasUsados[r.sistema] = (sistemasUsados[r.sistema] || 0) + 1;
  });
  
  if (Object.keys(sistemasUsados).length > 0) {
    console.log(`\n🧠 SISTEMAS DE IA UTILIZADOS:`);
    Object.entries(sistemasUsados).forEach(([sistema, cantidad]) => {
      console.log(`   ${sistema}: ${cantidad} consultas`);
    });
  }
  
  // Mostrar fallos detallados
  const fallos = resultados.filter(r => !r.exito);
  if (fallos.length > 0) {
    console.log(`\n❌ FALLOS DETALLADOS:`);
    fallos.forEach((fallo, i) => {
      console.log(`   ${i+1}. "${fallo.consulta}" - ${fallo.error}`);
    });
  }
  
  console.log(`\n⏰ Completado: ${new Date().toLocaleString()}`);
  console.log(`${'🎉'.repeat(50)}\n`);
  
  return {
    total: CASOS_PRUEBA_IA.length,
    exitosos,
    fallidos,
    porcentajeExito: ((exitosos/CASOS_PRUEBA_IA.length)*100).toFixed(1),
    resultados,
    porCategoria,
    rendimiento: tiemposExitosos.length > 0 ? {
      promedio: tiemposExitosos.reduce((a, b) => a + b, 0) / tiemposExitosos.length,
      min: Math.min(...tiemposExitosos),
      max: Math.max(...tiemposExitosos)
    } : null
  };
}

// Ejecutar si se llama directamente
if (require.main === module) {
  ejecutarPruebasIA()
    .then(resumen => {
      console.log('🎯 Pruebas completadas. Resumen:', {
        exitosos: resumen.exitosos,
        fallidos: resumen.fallidos,
        porcentaje: resumen.porcentajeExito + '%'
      });
      process.exit(resumen.fallidos > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('💥 Error fatal en las pruebas:', error);
      process.exit(1);
    });
}

module.exports = { ejecutarPruebasIA, CASOS_PRUEBA_IA };
