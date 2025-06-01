/**
 * Script para diagnosticar el problema del JSON y determinar qué modelo se está usando
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/openai';

// Función para hacer peticiones con debugging
async function testEndpoint(endpoint, data, requiresAuth = false) {
  console.log(`\n🔍 TESTING: ${endpoint}`);
  console.log(`📤 Datos enviados: ${JSON.stringify(data)}`);
  
  try {
    const config = {
      method: 'POST',
      url: `${BASE_URL}${endpoint}`,
      data: data,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Agregar autenticación si es necesaria
    if (requiresAuth) {
      config.headers['Authorization'] = 'Bearer test-token'; // Token de prueba
    }
    
    const response = await axios(config);
    
    console.log(`✅ ÉXITO - Status: ${response.status}`);
    console.log(`📝 Respuesta:`, JSON.stringify(response.data, null, 2));
    
    if (response.data.modelo) {
      console.log(`🤖 MODELO USADO: ${response.data.modelo}`);
    }
    
    return response.data;
    
  } catch (error) {
    console.log(`❌ ERROR - Status: ${error.response?.status || 'N/A'}`);
    console.log(`💥 Mensaje: ${error.message}`);
    
    if (error.response?.data) {
      console.log(`📄 Detalles:`, JSON.stringify(error.response.data, null, 2));
    }
    
    // Analizar si es un error de JSON parsing
    if (error.message.includes('JSON at position')) {
      console.log(`🔧 DIAGNÓSTICO: Error de parsing JSON detectado`);
      console.log(`📍 Problema en posición: ${error.message.match(/position (\\d+)/)?.[1] || 'desconocida'}`);
    }
    
    return null;
  }
}

async function runDiagnostics() {
  console.log('🔬 INICIANDO DIAGNÓSTICO DEL SISTEMA SQL DE FELMAN');
  console.log('=' .repeat(60));
  
  // Test 1: Endpoint mock (sin autenticación)
  console.log('\n📋 TEST 1: Endpoint Mock (sin autenticación)');
  await testEndpoint('/mock-sql', {
    textoUsuario: 'Dame todos los clientes'
  });
  
  // Test 2: Endpoint de prueba simple
  console.log('\n📋 TEST 2: Endpoint de prueba simple');
  try {
    const response = await axios.get(`${BASE_URL}/test`);
    console.log(`✅ Test endpoint OK: ${response.data.message}`);
  } catch (error) {
    console.log(`❌ Test endpoint FALLO: ${error.message}`);
  }
  
  // Test 3: Datos malformados para reproducir el error JSON
  console.log('\n📋 TEST 3: Datos malformados (para reproducir error JSON)');
  await testEndpoint('/mock-sql', {
    textoUsuario: 'Dame todos los clientes',
    datosExtra: 'esto puede causar problemas si hay caracteres especiales\\n\\r\\t'
  });
  
  // Test 4: Endpoint real de OpenAI (con autenticación)
  console.log('\n📋 TEST 4: Endpoint real OpenAI (con autenticación)');
  await testEndpoint('/generate-sql', {
    textoUsuario: 'Dame todos los clientes'
  }, true);
  
  // Test 5: String muy largo para encontrar posición 77
  console.log('\n📋 TEST 5: String largo para encontrar posición problemática');
  const textoLargo = 'a'.repeat(50) + '\\n' + 'b'.repeat(50); // Posición 77 aprox
  await testEndpoint('/mock-sql', {
    textoUsuario: textoLargo
  });
  
  // Test 6: Diferentes tipos de caracteres problemáticos
  console.log('\n📋 TEST 6: Caracteres problemáticos específicos');
  const textosProblematicos = [
    'Dame los presupuestos\\naprobados',
    'SELECT Serie,\\nNumero FROM fpresupuestos',
    'Consulta con\ttabs\ty\nsaltos de línea',
    'Texto con "comillas" y \\caracteres\\ especiales'
  ];
  
  for (let i = 0; i < textosProblematicos.length; i++) {
    console.log(`\n   🔬 Sub-test 6.${i + 1}:`);
    await testEndpoint('/mock-sql', {
      textoUsuario: textosProblematicos[i]
    });
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ DIAGNÓSTICO COMPLETADO');
  console.log('\n📊 RESUMEN:');
  console.log('   - Si /mock-sql funciona: El problema está en OpenAI o autenticación');
  console.log('   - Si /mock-sql falla: El problema está en el parsing JSON del servidor');
  console.log('   - Revisa los logs del servidor para más detalles');
}

// Ejecutar diagnóstico si el servidor está corriendo
runDiagnostics().catch(error => {
  console.error('\n💥 ERROR CRÍTICO EN DIAGNÓSTICO:', error.message);
  console.log('\n🚨 ACCIONES RECOMENDADAS:');
  console.log('   1. Verificar que el servidor esté ejecutándose en puerto 3000');
  console.log('   2. Revisar los logs del servidor');
  console.log('   3. Verificar que las rutas estén correctamente configuradas');
});
