#!/usr/bin/env node

/**
 * Test completo para verificar la integración de AI21 Studio
 */

const axios = require('axios');

const SERVER_URL = 'http://127.0.0.1:3000';

console.log('🧪 INICIANDO PRUEBAS DE AI21 STUDIO INTEGRATION');
console.log('================================================================================');

async function testAI21Endpoints() {
  const tests = [
    {
      name: 'Verificar Estado del Servicio',
      method: 'GET',
      url: `${SERVER_URL}/ai21/estado`,
      body: null
    },
    {
      name: 'Información del Servicio',
      method: 'GET',
      url: `${SERVER_URL}/ai21/info`,
      body: null
    },
    {
      name: 'Generar Texto Simple',
      method: 'POST',
      url: `${SERVER_URL}/ai21/generar-texto`,
      body: {
        prompt: 'Explica en pocas palabras qué es la inteligencia artificial y por qué importa.',
        opciones: {
          maxTokens: 150,
          temperature: 0.7
        }
      }
    },
    {
      name: 'Análisis de Negocio',
      method: 'POST',
      url: `${SERVER_URL}/ai21/analizar-negocio`,
      body: {
        contexto: 'Empresa Felman manufactura productos industriales y maneja presupuestos de clientes',
        pregunta: '¿Cómo podemos mejorar nuestro proceso de seguimiento de presupuestos?'
      }
    },
    {
      name: 'Explicar Resultado SQL',
      method: 'POST',
      url: `${SERVER_URL}/ai21/explicar-sql`,
      body: {
        consultaUsuario: 'Cuántos clientes tenemos activos',
        resultadoSQL: { total_clientes: 150, clientes_activos: 120 }
      }
    },
    {
      name: 'Generar Sugerencias',
      method: 'POST',
      url: `${SERVER_URL}/ai21/sugerencias`,
      body: {
        consultaOriginal: 'Muéstrame los presupuestos del mes'
      }
    },
    {
      name: 'Consulta Avanzada',
      method: 'POST',
      url: `${SERVER_URL}/ai21/consulta-avanzada`,
      body: {
        textoUsuario: 'Necesito analizar el rendimiento de ventas de este trimestre'
      }
    }
  ];

  let testsPasados = 0;
  let testsFallidos = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n🧪 TEST ${i + 1}: ${test.name}`);
    console.log(`   ${test.method} ${test.url}`);

    try {
      let response;
      const config = {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (test.method === 'GET') {
        response = await axios.get(test.url, config);
      } else {
        response = await axios.post(test.url, test.body, config);
      }

      if (response.data.success) {
        console.log(`   ✅ EXITOSO`);
        console.log(`   📊 Respuesta:`, JSON.stringify(response.data, null, 2).substring(0, 200) + '...');
        testsPasados++;
      } else {
        console.log(`   ❌ FALLIDO`);
        console.log(`   📊 Respuesta:`, response.data);
        testsFallidos++;
      }

    } catch (error) {
      console.log(`   💥 ERROR: ${error.message}`);
      if (error.response) {
        console.log(`   📊 Status: ${error.response.status}`);
        console.log(`   📊 Data:`, error.response.data);
      }
      testsFallidos++;
    }

    // Pausa entre tests para no sobrecargar
    if (i < tests.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('\n================================================================================');
  console.log('📈 REPORTE FINAL DE PRUEBAS AI21');
  console.log('================================================================================');
  console.log(`✅ Tests exitosos: ${testsPasados}/${tests.length}`);
  console.log(`❌ Tests fallidos: ${testsFallidos}/${tests.length}`);
  console.log(`📊 Porcentaje de éxito: ${((testsPasados / tests.length) * 100).toFixed(1)}%`);

  if (testsPasados === tests.length) {
    console.log('\n🎉 ¡TODOS LOS TESTS PASARON! AI21 integración exitosa');
  } else if (testsPasados > 0) {
    console.log('\n⚠️ Algunos tests fallaron, revisar configuración');
  } else {
    console.log('\n❌ Todos los tests fallaron, verificar servidor y configuración');
  }
}

// Verificar que el servidor esté corriendo antes de ejecutar tests
async function verificarServidor() {
  try {
    console.log('🔍 Verificando que el servidor esté corriendo...');
    await axios.get(`${SERVER_URL}/ai21/info`, { timeout: 5000 });
    console.log('✅ Servidor respondiendo correctamente\n');
    return true;
  } catch (error) {
    console.log('❌ Error conectando al servidor:', error.message);
    console.log('💡 Asegúrate de que el servidor esté corriendo en puerto 3000');
    return false;
  }
}

// Ejecutar las pruebas
async function ejecutarPruebas() {
  const servidorOK = await verificarServidor();
  
  if (servidorOK) {
    await testAI21Endpoints();
  } else {
    console.log('\n🚨 No se pueden ejecutar las pruebas sin el servidor');
    process.exit(1);
  }
}

if (require.main === module) {
  ejecutarPruebas();
}

module.exports = { testAI21Endpoints, verificarServidor };
