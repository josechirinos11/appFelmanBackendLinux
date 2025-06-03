const axios = require('axios');

// Configuración del servidor
const BASE_URL = 'http://localhost:3000/ai21';

async function probarEndpoints() {
  console.log('🚀 Iniciando pruebas de endpoints AI21...\n');

  // Test 1: Verificar estado del servicio
  console.log('📋 Test 1: Verificando estado del servicio...');
  try {
    const response = await axios.get(`${BASE_URL}/estado`);
    console.log('✅ Estado:', response.data.success ? 'OK' : 'ERROR');
    console.log('📊 Respuesta:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Error en estado:', error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Generar SQL
  console.log('📋 Test 2: Generando SQL...');
  try {
    const response = await axios.post(`${BASE_URL}/generar-sql-inteligente`, {
      textoUsuario: 'mostrar todos los presupuestos de clientes',
      instruccionesPersonalizadas: 'incluir fecha de creación'
    });
    console.log('✅ SQL generado exitosamente');
    console.log('📊 SQL:', response.data.data.sqlGenerado);
  } catch (error) {
    console.log('❌ Error generando SQL:', error.response?.data || error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Consulta completa (con modo demo si no hay BD)
  console.log('📋 Test 3: Consulta completa...');
  try {
    const response = await axios.post(`${BASE_URL}/consulta-completa`, {
      textoUsuario: 'clientes con presupuestos recientes',
      instruccionesPersonalizadas: 'mostrar Serie, Numero y ClienteNombre'
    });
    console.log('✅ Consulta completa exitosa');
    console.log('🎭 Modo:', response.data.data.modoDemo ? 'DEMO' : 'REAL');
    console.log('📊 Resultados:', response.data.data.totalFilas);
    console.log('🔍 Muestra de datos:', JSON.stringify(response.data.data.resultados.slice(0, 2), null, 2));
  } catch (error) {
    console.log('❌ Error en consulta completa:', error.response?.data || error.message);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 4: Ejecutar SQL específico
  console.log('📋 Test 4: Ejecutando SQL específico...');
  try {
    const sqlTest = `
      SELECT 
        fpresupuestos.Serie,
        fpresupuestos.Numero,
        fpresupuestos.ClienteNombre,
        fpresupuestos.FechaCreacion
      FROM fpresupuestos 
      LIMIT 5
    `;
    
    const response = await axios.post(`${BASE_URL}/ejecutar-sql`, {
      sql: sqlTest,
      consultaOriginal: 'Test de SQL directo'
    });
    console.log('✅ SQL ejecutado exitosamente');
    console.log('🎭 Modo:', response.data.data.modoDemo ? 'DEMO' : 'REAL');
    console.log('📊 Resultados:', response.data.data.totalFilas);
  } catch (error) {
    console.log('❌ Error ejecutando SQL:', error.response?.data || error.message);
  }

  console.log('\n🎉 Pruebas completadas!');
  console.log('\n💡 Notas:');
  console.log('- Si ves "Modo: DEMO", significa que no hay conexión a la base de datos');
  console.log('- Para usar datos reales, configura las variables de entorno en .env');
  console.log('- El sistema AI21 está funcionando correctamente si generas SQL');
}

// Ejecutar pruebas
probarEndpoints().catch(console.error);
