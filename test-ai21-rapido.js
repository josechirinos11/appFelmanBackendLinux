#!/usr/bin/env node

/**
 * Test rápido para verificar la conexión básica con AI21
 */

require('dotenv').config();
const { AI21Service } = require('./src/consultaIA');

async function testConexionRapida() {
  console.log('🔍 TEST RÁPIDO DE CONEXIÓN AI21');
  console.log('================================================================================');
  
  try {
    const ai21 = new AI21Service();
    console.log('✅ Servicio inicializado');
    
    // Test muy simple
    console.log('🧪 Probando conexión básica...');
    const resultado = await ai21.validarConexion();
    
    if (resultado) {
      console.log('✅ ¡Conexión exitosa con AI21!');
      
      // Test de texto muy simple
      console.log('📝 Probando generación de texto...');
      const texto = await ai21.generarTexto('Di hola', {
        max_tokens: 10,
        temperature: 0.1
      });
      
      console.log(`✅ Texto generado: "${texto}"`);
      console.log('🎉 ¡AI21 está funcionando correctamente!');
    } else {
      console.log('❌ Error en la conexión');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n🔧 Revisa:');
    console.log('   1. FELMAN_AI21API_KEY en .env');
    console.log('   2. Conexión a internet');
    console.log('   3. Validez de la API key');
  }
}

testConexionRapida();
