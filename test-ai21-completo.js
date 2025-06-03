#!/usr/bin/env node

/**
 * Test completo de AI21 con llamada real a la API
 */

require('dotenv').config();
const AI21Service = require('./src/consultaIA/ai21.service.js');

async function testCompletaAI21() {
  console.log('🚀 TEST COMPLETO DE AI21 CON LLAMADA REAL');
  console.log('================================================================================');
  
  try {
    const ai21 = new AI21Service();
    console.log('✅ Servicio inicializado');
    
    // Test 1: Llamada real a la API
    console.log('\n🧪 TEST 1: Generación de texto real');
    console.log('📝 Enviando prompt: "Hola, ¿cómo estás?"');
    
    const respuesta = await ai21.generarTexto('Hola, ¿cómo estás?', {
      max_tokens: 50,
      temperature: 0.7
    });
    
    console.log('✅ Respuesta recibida:');
    console.log(`"${respuesta}"`);
    
    // Test 2: Análisis de negocio
    console.log('\n🧪 TEST 2: Análisis de negocio');
    const analisis = await ai21.generarAnalisisNegocio(
      'Empresa de manufactura con sistema de presupuestos',
      '¿Cómo mejorar la eficiencia?'
    );
    
    console.log('✅ Análisis generado:');
    console.log(`"${analisis.substring(0, 200)}..."`);
    
    console.log('\n🎉 ¡Todos los tests pasaron! AI21 funcionando correctamente');
    
  } catch (error) {
    console.error('❌ Error en test completo:', error.message);
    
    if (error.message.includes('401')) {
      console.log('🔑 Error de autenticación - verificar API key');
    } else if (error.message.includes('429')) {
      console.log('⏰ Rate limit alcanzado - esperar un momento');
    } else if (error.message.includes('timeout')) {
      console.log('⏱️ Timeout - la API puede estar lenta');
    } else {
      console.log('🔧 Error general - verificar configuración');
    }
  }
}

testCompletaAI21();
