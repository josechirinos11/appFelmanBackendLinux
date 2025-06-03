// Test para verificar corrección de endpoints AI21
const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:3000/ai21';

async function testAnalisisNegocio() {
  console.log('🧪 Probando endpoint /analizar-negocio...');
  
  try {
    const response = await axios.post(`${BASE_URL}/analizar-negocio`, {
      contexto: "Empresa de retail con 500 empleados, ventas en declive 15% último trimestre",
      pregunta: "¿Qué estrategias puedo implementar para recuperar las ventas?"
    });

    console.log('✅ Respuesta exitosa:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error en /analizar-negocio:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function testEstado() {
  console.log('\n🧪 Probando endpoint /estado...');
  
  try {
    const response = await axios.get(`${BASE_URL}/estado`);

    console.log('✅ Respuesta exitosa:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error en /estado:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

async function testTodosLosEndpoints() {
  console.log('🚀 Iniciando pruebas de corrección AI21...\n');
  
  await testEstado();
  await testAnalisisNegocio();
  
  console.log('\n✨ Pruebas completadas!');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testTodosLosEndpoints()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error en las pruebas:', error);
      process.exit(1);
    });
}

module.exports = { testAnalisisNegocio, testEstado };
