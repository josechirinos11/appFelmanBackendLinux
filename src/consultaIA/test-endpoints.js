// Test script para endpoints AI21 SQL
// Archivo de prueba para validar los nuevos endpoints

const API_BASE = 'http://localhost:3000/api/ai21';

async function testEndpoints() {
  console.log('🧪 Iniciando pruebas de endpoints AI21...\n');

  // Test 1: Generar SQL
  console.log('📝 Test 1: Generar SQL');
  try {
    const response1 = await fetch(`${API_BASE}/generar-sql-inteligente`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textoUsuario: 'Muéstrame todos los presupuestos del cliente con código CLI001'
      })
    });
    const result1 = await response1.json();
    console.log('✅ Resultado:', result1);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Ejecutar SQL predefinido
  console.log('⚡ Test 2: Ejecutar SQL predefinido');
  const sqlTest = `
    SELECT CodigoCliente, Serie, Numero, Fecha, Total 
    FROM fpresupuestos 
    WHERE CodigoCliente = 'CLI001' 
    LIMIT 5
  `;
  
  try {
    const response2 = await fetch(`${API_BASE}/ejecutar-sql`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: sqlTest,
        consultaOriginal: 'Presupuestos del cliente CLI001'
      })
    });
    const result2 = await response2.json();
    console.log('✅ Resultado:', result2);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Proceso completo
  console.log('🚀 Test 3: Proceso completo (Generar + Ejecutar)');
  try {
    const response3 = await fetch(`${API_BASE}/consulta-completa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        textoUsuario: 'Muéstrame los 3 presupuestos más recientes'
      })
    });
    const result3 = await response3.json();
    console.log('✅ Resultado:', result3);
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n🏁 Pruebas completadas');
}

// Función para usar en Node.js
if (typeof require !== 'undefined') {
  // Para Node.js
  const fetch = require('node-fetch');
  testEndpoints();
}

// Para usar en navegador
if (typeof window !== 'undefined') {
  window.testAI21Endpoints = testEndpoints;
  console.log('💡 Usa testAI21Endpoints() en la consola del navegador');
}

module.exports = { testEndpoints };
