#!/usr/bin/env node

/**
 * Ejemplo básico de uso de AI21 - Prueba directa del servicio
 */

require('dotenv').config();
const { AI21Service } = require('./src/consultaIA');

async function ejemploBasicoAI21() {
  console.log('🤖 EJEMPLO BÁSICO DE AI21 STUDIO');
  console.log('================================================================================');
  
  try {
    // Crear instancia del servicio
    console.log('🔧 Inicializando AI21 Service...');
    const ai21 = new AI21Service();
    
    // Test 1: Generar texto simple
    console.log('\n🧪 TEST 1: Generación de texto simple');
    console.log('📝 Prompt: "Explica qué es la inteligencia artificial"');
    
    const respuesta1 = await ai21.generarTexto(
      'Explica en pocas palabras qué es la inteligencia artificial y por qué importa.',
      {
        maxTokens: 150,
        temperature: 0.7
      }
    );
    
    console.log('✅ Respuesta generada:');
    console.log(respuesta1);
    
    // Test 2: Análisis de negocio
    console.log('\n🧪 TEST 2: Análisis de negocio');
    console.log('📊 Contexto: Empresa industrial con sistema de presupuestos');
    
    const respuesta2 = await ai21.generarAnalisisNegocio(
      'Empresa Felman manufactura productos industriales. Tenemos un sistema que maneja presupuestos de clientes con estados: pendiente, aprobado, rechazado.',
      '¿Cómo podemos optimizar nuestro proceso de seguimiento de presupuestos para aumentar la tasa de aprobación?'
    );
    
    console.log('✅ Análisis generado:');
    console.log(respuesta2);
    
    // Test 3: Sugerencias de consultas
    console.log('\n🧪 TEST 3: Sugerencias de consultas');
    console.log('💡 Consulta original: "Mostrar presupuestos del mes"');
    
    const sugerencias = await ai21.generarSugerenciasConsultas('Mostrar presupuestos del mes');
    
    console.log('✅ Sugerencias generadas:');
    sugerencias.forEach((sugerencia, index) => {
      console.log(`   ${index + 1}. ${sugerencia}`);
    });
    
    // Test 4: Validar conexión
    console.log('\n🧪 TEST 4: Validación de conexión');
    const conexionOK = await ai21.validarConexion();
    console.log(`✅ Estado de conexión: ${conexionOK ? 'Activo' : 'Inactivo'}`);
    
    console.log('\n🎉 ¡Todos los ejemplos ejecutados exitosamente!');
    console.log('================================================================================');
    console.log('🚀 AI21 Studio está listo para usar en tu proyecto');
    
  } catch (error) {
    console.error('❌ Error ejecutando ejemplos:', error.message);
    console.log('\n🔧 Posibles soluciones:');
    console.log('   1. Verificar que FELMAN_AI21API_KEY esté configurado en .env');
    console.log('   2. Verificar conexión a internet');
    console.log('   3. Verificar que la API key de AI21 sea válida');
  }
}

// Ejecutar el ejemplo
if (require.main === module) {
  ejemploBasicoAI21();
}

module.exports = { ejemploBasicoAI21 };
