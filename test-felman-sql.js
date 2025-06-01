/**
 * Ejemplos de prueba para el generador SQL con instrucciones de Felman
 * Ejecutar este archivo para probar las diferentes consultas
 */

const axios = require('axios');

// Configuración del servidor
const BASE_URL = 'http://localhost:3000';
const OPENAI_ENDPOINT = `${BASE_URL}/openai/generate-sql-mock`;

// Ejemplos de consultas para probar
const ejemplosConsultas = [
  {
    descripcion: "Listar todos los clientes",
    textoUsuario: "Dame todos los clientes"
  },
  {
    descripcion: "Contar clientes",
    textoUsuario: "¿Cuántos clientes tenemos?"
  },
  {
    descripcion: "Presupuestos aprobados",
    textoUsuario: "Muéstrame los presupuestos aprobados"
  },
  {
    descripcion: "Presupuestos entregados",
    textoUsuario: "¿Qué presupuestos están entregados?"
  },
  {
    descripcion: "Total de precios",
    textoUsuario: "¿Cuál es el total de todos los precios?"
  },
  {
    descripcion: "Líneas con presupuesto",
    textoUsuario: "Muéstrame las líneas con presupuesto"
  },
  {
    descripcion: "Números de fabricación por serie",
    textoUsuario: "Dame los números de fabricación por serie"
  },
  {
    descripcion: "Presupuestos de hoy",
    textoUsuario: "¿Qué presupuestos se crearon hoy?"
  },
  {
    descripcion: "Últimos presupuestos",
    textoUsuario: "Muéstrame los últimos presupuestos"
  },
  {
    descripcion: "Clientes con presupuestos",
    textoUsuario: "Dame los clientes con presupuestos"
  },
  {
    descripcion: "Presupuestos facturados",
    textoUsuario: "¿Cuáles están facturados?"
  },
  {
    descripcion: "Presupuestos más caros",
    textoUsuario: "Muéstrame los presupuestos más caros"
  },
  {
    descripcion: "Estados de proceso",
    textoUsuario: "Dame el resumen de estados"
  },
  {
    descripcion: "Líneas pendientes de fabricar",
    textoUsuario: "¿Qué líneas están pendientes fabricar?"
  },
  {
    descripcion: "Presupuestos de este mes",
    textoUsuario: "Presupuestos de este mes"
  }
];

// Función para probar una consulta
async function probarConsulta(ejemplo) {
  try {
    console.log(`\n🔍 ${ejemplo.descripcion}`);
    console.log(`📝 Consulta: "${ejemplo.textoUsuario}"`);
    
    const response = await axios.post(OPENAI_ENDPOINT, {
      textoUsuario: ejemplo.textoUsuario
    });
    
    if (response.data.success) {
      console.log(`✅ SQL generado:`);
      console.log(`   ${response.data.consulta}`);
      console.log(`📋 Contexto: ${response.data.contexto}`);
    } else {
      console.log(`❌ Error: ${response.data.message}`);
    }
  } catch (error) {
    console.log(`❌ Error de conexión: ${error.message}`);
  }
}

// Función principal para ejecutar todos los ejemplos
async function ejecutarPruebas() {
  console.log('🚀 Iniciando pruebas del generador SQL de Felman');
  console.log('=' .repeat(60));
  
  for (const ejemplo of ejemplosConsultas) {
    await probarConsulta(ejemplo);
    // Pequeña pausa entre consultas
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('✨ Pruebas completadas');
}

// Función para probar una consulta personalizada
async function consultaPersonalizada(texto) {
  console.log('\n🔧 Consulta personalizada');
  await probarConsulta({
    descripcion: "Consulta personalizada",
    textoUsuario: texto
  });
}

// Verificar si se ejecuta directamente o se importa
if (require.main === module) {
  // Ejecutar todas las pruebas
  ejecutarPruebas().catch(console.error);
  
  // Ejemplo de consulta personalizada (descomentar para usar)
  // setTimeout(() => {
  //   consultaPersonalizada("Dame el presupuesto más alto del cliente X");
  // }, 6000);
}

module.exports = {
  probarConsulta,
  consultaPersonalizada,
  ejecutarPruebas,
  ejemplosConsultas
};
