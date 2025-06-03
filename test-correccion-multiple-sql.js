#!/usr/bin/env node

/**
 * Test para verificar que el endpoint /consulta-completa
 * maneja correctamente múltiples consultas SQL y evita errores
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testCorreccionMultipleSQL() {
  console.log('🧪 Probando corrección de múltiples consultas SQL...\n');

  const testCases = [
    {
      nombre: 'Consulta que generaba múltiples SQL',
      data: {
        textoUsuario: 'información de Numero 2815',
        instruccionesPersonalizadas: 'para fechas usar fpresupuestos.FechaCreacion TABLE fpresupuestos:SELECT Serie, Numero, ClienteNombre, FechaCreacion / TABLE fpresupuestoslineas:SELECT CodigoSerie, CodigoNumero, Serie1Desc. DEVOLVER SIEMPRE:TABLE fpresupuestos: SELECT Serie, Numero, ClienteNombre, FechaCreacion . TABLE presupuestoslineas: SELECT CodigoSerie, CodigoNumero, Serie1Desc'
      }
    },
    {
      nombre: 'Consulta simple de clientes',
      data: {
        textoUsuario: 'Mostrar todos los clientes'
      }
    },
    {
      nombre: 'Consulta específica por número',
      data: {
        textoUsuario: 'presupuesto número 2800'
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(`📋 Test: ${testCase.nombre}`);
    console.log(`💬 Consulta: "${testCase.data.textoUsuario}"`);
    
    try {
      const response = await axios.post(`${BASE_URL}/ai21/consulta-completa`, testCase.data, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        console.log('✅ Success');
        console.log(`📊 Resultados: ${response.data.data.totalFilas} filas`);
        console.log(`🔍 SQL ejecutado: ${response.data.data.sqlEjecutado}`);
        
        // Verificar que no hay múltiples consultas
        const sqlCount = (response.data.data.sqlEjecutado.match(/SELECT/gi) || []).length;
        if (sqlCount === 1) {
          console.log('✅ SQL correcto: Solo una consulta');
        } else {
          console.log(`⚠️ SQL con múltiples consultas: ${sqlCount} SELECT encontrados`);
        }
        
        console.log(`🎯 Modo: ${response.data.data.modoDemo ? 'Demostración' : 'Base de datos real'}`);
      } else {
        console.log('❌ Error en respuesta:', response.data.message);
      }

    } catch (error) {
      if (error.response) {
        console.log('❌ Error del servidor:', error.response.data.message);
        console.log('📝 Código de error:', error.response.data.errorCode);
        if (error.response.data.sqlGenerado) {
          console.log('🔍 SQL que causó error:', error.response.data.sqlGenerado);
        }
      } else {
        console.log('❌ Error de conexión:', error.message);
      }
    }
    
    console.log('─'.repeat(60));
  }
}

// Ejecutar el test
testCorreccionMultipleSQL()
  .then(() => {
    console.log('\n🎯 Test de corrección completado');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error ejecutando test:', error.message);
    process.exit(1);
  });
