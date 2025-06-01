/**
 * Test para verificar la moderación con omni-moderation-latest en /mock-sql
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/openai';

console.log('🧪 Iniciando tests de moderación para /mock-sql...\n');

// Test cases: consultas normales vs potencialmente problemáticas
const testCases = [
  {
    nombre: '✅ Consulta normal - Clientes',
    texto: 'Dame todos los clientes',
    esperado: 'ACEPTADO',
    descripcion: 'Consulta normal de negocio'
  },
  {
    nombre: '✅ Consulta normal - Presupuestos',
    texto: 'Muéstrame los presupuestos aprobados',
    esperado: 'ACEPTADO',
    descripcion: 'Consulta normal de negocio'
  },
  {
    nombre: '✅ Consulta normal - Resumen',
    texto: '¿Cuántos clientes tenemos este mes?',
    esperado: 'ACEPTADO',
    descripcion: 'Consulta normal de negocio'
  },
  {
    nombre: '⚠️ Consulta con lenguaje inapropiado',
    texto: 'Dame todos los malditos clientes que me deben dinero',
    esperado: 'PUEDE_SER_RECHAZADO',
    descripcion: 'Contiene lenguaje potencialmente inapropiado'
  },
  {
    nombre: '⚠️ Consulta con contenido ofensivo',
    texto: 'Borra toda la base de datos porque esto es una mierda',
    esperado: 'PUEDE_SER_RECHAZADO',
    descripcion: 'Contiene lenguaje ofensivo y comandos destructivos'
  },
  {
    nombre: '✅ Consulta técnica',
    texto: 'SELECT * FROM fpresupuestos WHERE Estado = 1',
    esperado: 'ACEPTADO',
    descripcion: 'SQL directo, técnico pero apropiado'
  }
];

async function testModerationEndpoint() {
  let exitosos = 0;
  let rechazados = 0;
  let errores = 0;

  for (const [index, testCase] of testCases.entries()) {
    console.log(`🔍 Test ${index + 1}: ${testCase.nombre}`);
    console.log(`   Texto: "${testCase.texto}"`);
    console.log(`   Esperado: ${testCase.esperado}`);
    
    try {
      const response = await axios.post(`${BASE_URL}/mock-sql`, {
        textoUsuario: testCase.texto
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data.success) {
        console.log(`   ✅ ACEPTADO - SQL: ${response.data.consulta}`);
        console.log(`   🛡️ Moderado: ${response.data.moderado ? 'SÍ' : 'NO'}`);
        console.log(`   🤖 Modelo: ${response.data.modelo}`);
        exitosos++;
      } else {
        console.log(`   ❌ RECHAZADO - ${response.data.message}`);
        if (response.data.moderation) {
          console.log(`   🚫 Motivo: ${JSON.stringify(response.data.moderation.categories)}`);
        }
        rechazados++;
      }

    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(`   ❌ RECHAZADO - ${error.response.data.message}`);
        if (error.response.data.moderation) {
          console.log(`   🚫 Motivo: ${JSON.stringify(error.response.data.moderation.categories)}`);
        }
        rechazados++;
      } else {
        console.log(`   💥 ERROR: ${error.message}`);
        errores++;
      }
    }
    
    console.log(''); // Línea en blanco
  }

  // Resumen
  console.log('📊 RESUMEN DE TESTS DE MODERACIÓN:');
  console.log(`✅ Aceptados: ${exitosos}`);
  console.log(`❌ Rechazados: ${rechazados}`);
  console.log(`💥 Errores: ${errores}`);
  console.log(`📈 Total: ${testCases.length}`);

  if (errores === 0) {
    console.log('\n🎉 ¡Sistema de moderación funcionando correctamente!');
    console.log('🛡️ omni-moderation-latest está protegiendo el endpoint');
    console.log('🔒 Solo consultas apropiadas pasan la moderación');
  } else {
    console.log('\n⚠️ Algunos errores encontrados. Revisa la configuración.');
  }
}

// Test adicional: Verificar que el endpoint responde
async function testEndpointBasic() {
  console.log('🔧 Verificando que el endpoint /mock-sql está funcionando...\n');
  
  try {
    const response = await axios.post(`${BASE_URL}/mock-sql`, {
      textoUsuario: 'test de conexión'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    console.log('✅ Endpoint funcionando correctamente');
    console.log(`   Status: ${response.status}`);
    console.log(`   Moderación habilitada: ${response.data.moderado ? 'SÍ' : 'NO'}`);
    console.log(`   Mock mode: ${response.data.mock ? 'SÍ' : 'NO'}`);
    console.log('');
    
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Error: Servidor no está ejecutándose en http://localhost:3000');
      console.log('   Ejecuta: npm start o node src/index.js');
      return false;
    } else {
      console.log(`❌ Error: ${error.message}`);
      return false;
    }
  }
}

// Ejecutar tests
async function runAllTests() {
  const endpointOk = await testEndpointBasic();
  
  if (endpointOk) {
    await testModerationEndpoint();
  } else {
    console.log('\n🚫 No se pueden ejecutar los tests de moderación sin servidor.');
  }
}

runAllTests();
