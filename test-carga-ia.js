// Test de Carga y Rendimiento del Sistema de IA Optimizado
// Simula múltiples consultas simultáneas para medir rendimiento bajo carga

const axios = require('axios');
const { performance } = require('perf_hooks');

const SERVIDOR_URL = 'http://127.0.0.1:3000'; // Usar IPv4 específico
const ENDPOINT = '/openai/mock-sql';

// 📋 Conjunto de consultas para pruebas de carga
const consultasCarga = [
  "mostrar presupuestos",
  "cuántos clientes tenemos",
  "suma total de precios",
  "presupuestos aprobados de este mes",
  "líneas fabricadas pendientes",
  "empresas que compraron este año",
  "presupuestos con mayor precio",
  "presupuestos rechazados ayer",
  "¿Qué cantidad de productos fabricamos?",
  "Dame el total de ventas del año",
  "Necesito ver todos los clientes activos",
  "Calcular el importe total de ofertas",
  "Top 10 empresas por facturación",
  "Lista de ofertas vigentes",
  "Contar líneas en producción",
  "Precio promedio de presupuestos",
  "Clientes más rentables del trimestre",
  "Productos fabricados hoy",
  "Valor total de inventario",
  "Estadísticas de ventas mensuales"
];

// 🎯 Configuraciones de prueba
const configuracionesPrueba = [
  {
    nombre: "Carga Ligera",
    consultasSimultaneas: 5,
    intervalos: 10,
    descripcion: "5 consultas cada 100ms durante 1 segundo"
  },
  {
    nombre: "Carga Moderada", 
    consultasSimultaneas: 15,
    intervalos: 20,
    descripcion: "15 consultas cada 50ms durante 1 segundo"
  },
  {
    nombre: "Carga Alta",
    consultasSimultaneas: 30,
    intervalos: 30,
    descripcion: "30 consultas cada 33ms durante 1 segundo"
  },
  {
    nombre: "Estrés",
    consultasSimultaneas: 50,
    intervalos: 50,
    descripcion: "50 consultas cada 20ms durante 1 segundo"
  }
];

// 📊 Función para ejecutar una consulta individual
async function ejecutarConsulta(consulta, id) {
  const inicio = performance.now();
  
  try {    const response = await axios.post(`${SERVIDOR_URL}${ENDPOINT}`, {
      textoUsuario: consulta
    }, {
      timeout: 10000, // 10 segundos timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const fin = performance.now();
    const tiempoRespuesta = fin - inicio;
    
    return {
      id,
      consulta,
      exitoso: true,
      tiempoRespuesta,
      statusCode: response.status,
      tamanoRespuesta: JSON.stringify(response.data).length,
      sqlGenerado: response.data.consulta || 'No generado',
      puntuacionIA: response.data.analisisTecnico?.calidad?.puntuacionGeneral || 0,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    const fin = performance.now();
    const tiempoRespuesta = fin - inicio;
    
    return {
      id,
      consulta,
      exitoso: false,
      tiempoRespuesta,
      error: error.message,
      statusCode: error.response?.status || 0,
      timestamp: new Date().toISOString()
    };
  }
}

// 🚀 Función para ejecutar prueba de carga
async function ejecutarPruebaCarga(configuracion) {
  console.log(`\n🚀 INICIANDO PRUEBA: ${configuracion.nombre}`);
  console.log(`📋 ${configuracion.descripcion}`);
  console.log('================================================================================');
  
  const resultados = {
    configuracion: configuracion.nombre,
    totalConsultas: 0,
    exitosas: 0,
    fallidas: 0,
    tiempoTotal: 0,
    tiempoPromedio: 0,
    tiempoMinimo: Infinity,
    tiempoMaximo: 0,
    throughput: 0,
    errores: [],
    detalles: []
  };
  
  const inicioTotal = performance.now();
  const promesas = [];
  
  // Generar consultas con intervalos
  for (let i = 0; i < configuracion.intervalos; i++) {
    setTimeout(() => {
      for (let j = 0; j < configuracion.consultasSimultaneas; j++) {
        const consultaIndex = (i * configuracion.consultasSimultaneas + j) % consultasCarga.length;
        const consulta = consultasCarga[consultaIndex];
        const id = `${i}-${j}`;
        
        const promesa = ejecutarConsulta(consulta, id);
        promesas.push(promesa);
        resultados.totalConsultas++;
      }
    }, i * (1000 / configuracion.intervalos));
  }
  
  // Esperar que todas las consultas terminen
  console.log(`⏳ Ejecutando ${resultados.totalConsultas} consultas...`);
  
  // Agregar tiempo adicional para que terminen todas las consultas
  await new Promise(resolve => setTimeout(resolve, 2000 + (1000 / configuracion.intervalos * configuracion.intervalos)));
  
  const resultadosConsultas = await Promise.allSettled(promesas);
  const finTotal = performance.now();
  
  // Procesar resultados
  resultadosConsultas.forEach(resultado => {
    if (resultado.status === 'fulfilled') {
      const data = resultado.value;
      resultados.detalles.push(data);
      
      if (data.exitoso) {
        resultados.exitosas++;
        resultados.tiempoMinimo = Math.min(resultados.tiempoMinimo, data.tiempoRespuesta);
        resultados.tiempoMaximo = Math.max(resultados.tiempoMaximo, data.tiempoRespuesta);
      } else {
        resultados.fallidas++;
        resultados.errores.push({
          consulta: data.consulta,
          error: data.error,
          tiempo: data.tiempoRespuesta
        });
      }
    } else {
      resultados.fallidas++;
      resultados.errores.push({
        consulta: 'Desconocida',
        error: resultado.reason,
        tiempo: 0
      });
    }
  });
  
  // Calcular métricas
  if (resultados.exitosas > 0) {
    const tiemposExitosos = resultados.detalles
      .filter(d => d.exitoso)
      .map(d => d.tiempoRespuesta);
    
    resultados.tiempoPromedio = tiemposExitosos.reduce((a, b) => a + b, 0) / tiemposExitosos.length;
  }
  
  resultados.tiempoTotal = finTotal - inicioTotal;
  resultados.throughput = (resultados.exitosas / (resultados.tiempoTotal / 1000)).toFixed(2);
  
  // Mostrar resultados
  console.log(`\n📊 RESULTADOS DE ${configuracion.nombre}:`);
  console.log(`   ✅ Consultas exitosas: ${resultados.exitosas}/${resultados.totalConsultas} (${((resultados.exitosas/resultados.totalConsultas)*100).toFixed(1)}%)`);
  console.log(`   ❌ Consultas fallidas: ${resultados.fallidas}`);
  console.log(`   ⏱️  Tiempo total: ${resultados.tiempoTotal.toFixed(0)}ms`);
  console.log(`   📈 Throughput: ${resultados.throughput} req/seg`);
  
  if (resultados.exitosas > 0) {
    console.log(`   ⚡ Tiempo promedio: ${resultados.tiempoPromedio.toFixed(0)}ms`);
    console.log(`   🏃 Tiempo mínimo: ${resultados.tiempoMinimo.toFixed(0)}ms`);
    console.log(`   🐌 Tiempo máximo: ${resultados.tiempoMaximo.toFixed(0)}ms`);
  }
  
  if (resultados.errores.length > 0) {
    console.log(`\n⚠️  ERRORES DETECTADOS (${resultados.errores.length}):`);
    const erroresUnicos = [...new Set(resultados.errores.map(e => e.error))];
    erroresUnicos.slice(0, 3).forEach(error => {
      const cantidad = resultados.errores.filter(e => e.error === error).length;
      console.log(`   • ${error} (${cantidad}x)`);
    });
  }
  
  // Análisis de rendimiento
  if (resultados.throughput > 10) {
    console.log(`   🎊 EXCELENTE: Sistema maneja carga sin problemas`);
  } else if (resultados.throughput > 5) {
    console.log(`   ✅ BUENO: Rendimiento aceptable bajo carga`);
  } else if (resultados.throughput > 1) {
    console.log(`   ⚠️  MODERADO: Sistema funciona pero con limitaciones`);
  } else {
    console.log(`   🚨 CRÍTICO: Sistema sobrecargado`);
  }
  
  return resultados;
}

// 🎯 Función principal de pruebas de carga
async function ejecutarPruebasCarga() {
  console.log('🏋️‍♂️ INICIANDO PRUEBAS DE CARGA DEL SISTEMA DE IA FELMAN');
  console.log('================================================================================');
  console.log(`🎯 Servidor: ${SERVIDOR_URL}${ENDPOINT}`);
  console.log(`📋 Consultas disponibles: ${consultasCarga.length}`);
  console.log(`🧪 Configuraciones de prueba: ${configuracionesPrueba.length}`);
  
  // Verificar conectividad del servidor
  console.log('\n🔍 Verificando conectividad del servidor...');
  try {    const testResponse = await axios.post(`${SERVIDOR_URL}${ENDPOINT}`, {
      textoUsuario: "test de conectividad"
    }, { timeout: 5000 });
    
    console.log('✅ Servidor disponible y respondiendo');
  } catch (error) {
    console.log('❌ Error de conectividad:', error.message);
    console.log('🛑 No se pueden ejecutar pruebas de carga sin servidor activo');
    return;
  }
  
  const resultadosGenerales = [];
  
  // Ejecutar cada configuración de prueba
  for (const configuracion of configuracionesPrueba) {
    try {
      const resultado = await ejecutarPruebaCarga(configuracion);
      resultadosGenerales.push(resultado);
      
      // Pausa entre pruebas para permitir recuperación del servidor
      console.log('\n⏸️  Pausa de recuperación...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
    } catch (error) {
      console.log(`❌ Error en prueba ${configuracion.nombre}:`, error.message);
    }
  }
  
  // Reporte final comparativo
  console.log('\n================================================================================');
  console.log('📊 REPORTE COMPARATIVO DE RENDIMIENTO');
  console.log('================================================================================');
  
  resultadosGenerales.forEach(resultado => {
    console.log(`🏷️  ${resultado.configuracion}:`);
    console.log(`   📊 Éxito: ${((resultado.exitosas/resultado.totalConsultas)*100).toFixed(1)}%`);
    console.log(`   ⚡ Throughput: ${resultado.throughput} req/seg`);
    console.log(`   🕒 Tiempo promedio: ${resultado.tiempoPromedio.toFixed(0)}ms`);
  });
  
  // Mejor configuración
  const mejorThroughput = Math.max(...resultadosGenerales.map(r => parseFloat(r.throughput)));
  const mejorConfiguracion = resultadosGenerales.find(r => parseFloat(r.throughput) === mejorThroughput);
  
  console.log(`\n🏆 MEJOR RENDIMIENTO: ${mejorConfiguracion.configuracion}`);
  console.log(`   📈 ${mejorConfiguracion.throughput} req/seg con ${((mejorConfiguracion.exitosas/mejorConfiguracion.totalConsultas)*100).toFixed(1)}% éxito`);
  
  console.log('\n🎯 Pruebas de carga completadas exitosamente');
  return resultadosGenerales;
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  ejecutarPruebasCarga().catch(console.error);
}

module.exports = {
  ejecutarPruebasCarga,
  ejecutarConsulta,
  consultasCarga,
  configuracionesPrueba
};
