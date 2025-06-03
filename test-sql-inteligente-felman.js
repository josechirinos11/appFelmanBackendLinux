// Test específico para el endpoint generar-sql-inteligente de AI21
const axios = require('axios');

const BASE_URL = 'http://127.0.0.1:3000/ai21';

// Casos de prueba específicos para Felman
const casosPruebaFelman = [
  {
    id: 1,
    consulta: "Dame todos los presupuestos aprobados de este mes",
    descripcion: "Consulta con filtro temporal y estado",
    categoria: "FILTROS_ESTADO_TEMPORAL"
  },
  {
    id: 2, 
    consulta: "¿Cuántos clientes diferentes han hecho presupuestos?",
    descripcion: "Conteo de clientes únicos",
    categoria: "AGREGACION_CLIENTES"
  },
  {
    id: 3,
    consulta: "Suma total de importes de presupuestos facturados",
    descripcion: "Agregación con filtro de estado",
    categoria: "SUMA_CON_FILTRO"
  },
  {
    id: 4,
    consulta: "Presupuestos con líneas pendientes de fabricar",
    descripcion: "Consulta con JOIN entre tablas",
    categoria: "JOIN_COMPLEJOS"
  },
  {
    id: 5,
    consulta: "Top 5 clientes por importe total",
    descripcion: "Ranking con límite",
    categoria: "RANKING_CLIENTES"
  },
  {
    id: 6,
    consulta: "líneas fabricadas de la serie ventanas",
    descripcion: "Búsqueda en Serie1Desc con filtro",
    categoria: "BUSQUEDA_LINEAS"
  },
  {
    id: 7,
    consulta: "números de fabricación enviados a fábrica",
    descripcion: "Consulta con campos de fabricación",
    categoria: "FABRICACION"
  },
  {
    id: 8,
    consulta: "presupuestos del cliente GARCIA SL",
    descripcion: "Filtro por cliente específico",
    categoria: "FILTRO_CLIENTE"
  },
  {
    id: 9,
    consulta: "total facturado por provincias",
    descripcion: "Agrupación geográfica",
    categoria: "AGRUPACION_GEOGRAFICA"
  },
  {
    id: 10,
    consulta: "presupuestos entregados pero no facturados",
    descripcion: "Filtros múltiples de estado",
    categoria: "FILTROS_MULTIPLES"
  }
];

async function testSQLInteligenteFelman() {
  console.log('🧠 Iniciando pruebas de SQL Inteligente específico para Felman...\n');
  console.log('🎯 Casos de prueba: ', casosPruebaFelman.length);
  console.log('📊 Evaluando precisión del modelo AI21 + Instrucciones Felman\n');

  let exitos = 0;
  let errores = 0;

  for (const caso of casosPruebaFelman) {
    console.log(`📝 Caso ${caso.id}: ${caso.categoria}`);
    console.log(`❓ Consulta: "${caso.consulta}"`);
    console.log(`📋 Esperado: ${caso.descripcion}`);
    
    try {
      const response = await axios.post(`${BASE_URL}/generar-sql-inteligente`, {
        textoUsuario: caso.consulta
      });

      if (response.data.success) {
        const sqlGenerado = response.data.data.sqlGenerado;
        console.log(`✅ SQL generado:`);
        console.log(`   ${sqlGenerado}`);
        
        // Validaciones básicas
        const esValido = sqlGenerado.includes('SELECT') && sqlGenerado.includes('FROM');
        const usaTablasFelman = sqlGenerado.includes('fpresupuestos') || sqlGenerado.includes('fpresupuestoslineas');
        const sinCaracteresProblematicos = !sqlGenerado.includes('\\n') && !sqlGenerado.includes('\\r');
        
        console.log(`🔍 Validaciones:`);
        console.log(`   SQL válido: ${esValido ? '✅' : '❌'}`);
        console.log(`   Usa tablas Felman: ${usaTablasFelman ? '✅' : '❌'}`);
        console.log(`   Sin caracteres problemáticos: ${sinCaracteresProblematicos ? '✅' : '❌'}`);
        
        if (esValido && usaTablasFelman && sinCaracteresProblematicos) {
          exitos++;
          console.log(`🎉 CASO EXITOSO`);
        } else {
          errores++;
          console.log(`⚠️ CASO CON PROBLEMAS`);
        }
        
        console.log(`🤖 Modelo: ${response.data.data.modelo}`);
        console.log(`📅 Timestamp: ${response.data.data.timestamp}`);
      } else {
        errores++;
        console.log(`❌ Error: ${response.data.message}`);
      }
      
    } catch (error) {
      errores++;
      console.log(`❌ Error en la petición:`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data)}`);
      } else {
        console.log(`   ${error.message}`);
      }
    }
    
    console.log('─'.repeat(80));
  }

  // Resumen final
  console.log('\n📊 RESUMEN FINAL:');
  console.log(`✅ Casos exitosos: ${exitos}/${casosPruebaFelman.length}`);
  console.log(`❌ Casos con errores: ${errores}/${casosPruebaFelman.length}`);
  console.log(`📈 Tasa de éxito: ${Math.round((exitos / casosPruebaFelman.length) * 100)}%`);
  
  if (exitos === casosPruebaFelman.length) {
    console.log('\n🎉 ¡PERFECTO! Todos los casos SQL se generan correctamente');
    console.log('🚀 El sistema está listo para producción con Felman');
  } else if (exitos >= Math.floor(casosPruebaFelman.length * 0.8)) {
    console.log('\n✅ BUENO: La mayoría de casos funcionan correctamente');
    console.log('🔧 Revisar casos específicos que fallaron');
  } else {
    console.log('\n⚠️ NECESITA MEJORAS: Muchos casos requieren ajustes');
    console.log('🛠️ Revisar las instrucciones del modelo');
  }

  console.log('\n✨ Pruebas completadas!');
}

// Función para probar con instrucciones personalizadas
async function testConInstruccionesPersonalizadas() {
  console.log('\n🎯 Probando con instrucciones personalizadas...\n');

  const instruccionesPersonalizadas = `
- SIEMPRE incluye el nombre del cliente en las consultas de presupuestos
- Ordena los resultados por fecha de creación descendente por defecto
- Para consultas de importe, siempre muestra dos decimales con ROUND()
- Si mencionan "recientes", filtra por últimos 7 días
- Si mencionan "mes", filtra por mes actual usando MONTH() y YEAR()
- Usa alias descriptivos en español para las columnas
  `;

  const consultasPersonalizadas = [
    "Dame los presupuestos recientes",
    "Clientes con mayor facturación del mes", 
    "Presupuestos pendientes de mayor importe"
  ];

  for (const consulta of consultasPersonalizadas) {
    console.log(`❓ Consulta: "${consulta}"`);
    
    try {
      const response = await axios.post(`${BASE_URL}/generar-sql-inteligente`, {
        textoUsuario: consulta,
        instruccionesPersonalizadas: instruccionesPersonalizadas
      });

      if (response.data.success) {
        console.log(`✅ SQL con instrucciones personalizadas:`);
        console.log(`   ${response.data.data.sqlGenerado}`);
        console.log(`🔧 Instrucciones aplicadas: ${response.data.data.instruccionesUsadas}`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('─'.repeat(60));
  }
}

// Ejecutar pruebas
async function ejecutarTodasLasPruebas() {
  await testSQLInteligenteFelman();
  await testConInstruccionesPersonalizadas();
}

// Ejecutar si se llama directamente
if (require.main === module) {
  ejecutarTodasLasPruebas()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error en las pruebas:', error);
      process.exit(1);
    });
}

module.exports = { 
  testSQLInteligenteFelman, 
  testConInstruccionesPersonalizadas,
  casosPruebaFelman 
};
