// Test simple para verificar funcionamiento
const path = require('path');

console.log('🧪 Test simple iniciado...');

try {
  const configPath = path.join(__dirname, 'src', 'config', 'openai-instructions.js');
  console.log('📁 Cargando desde:', configPath);
  
  const { 
    analizarIntencion, 
    extraerEntidades, 
    normalizarTexto 
  } = require('./src/config/openai-instructions.js');
  
  console.log('✅ Módulos cargados correctamente');
  
  // Test básico
  const textoTest = "cuantos clientes tenemos";
  console.log(`🔍 Probando: "${textoTest}"`);
  
  const textoNormalizado = normalizarTexto(textoTest);
  console.log(`📝 Normalizado: "${textoNormalizado}"`);
  
  const intencion = analizarIntencion(textoNormalizado);
  console.log(`🎯 Intención:`, intencion);
  
  const entidades = extraerEntidades(textoNormalizado);
  console.log(`🔍 Entidades:`, entidades);
  
  console.log('🎊 Test completado exitosamente');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
}
