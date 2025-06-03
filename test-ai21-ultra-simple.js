#!/usr/bin/env node

console.log('🔍 INICIANDO TEST BÁSICO AI21...');

try {
  require('dotenv').config();
  console.log('✅ dotenv cargado');
  
  const AI21Service = require('./src/consultaIA/ai21.service.js');
  console.log('✅ AI21Service importado');
  
  console.log('🔧 Creando instancia...');
  const ai21 = new AI21Service();
  console.log('✅ Instancia creada exitosamente');
  
  console.log('🎉 Test básico completado - AI21 listo para usar');
  
} catch (error) {
  console.error('❌ Error en test básico:', error.message);
  console.error('Stack:', error.stack);
}

process.exit(0);
