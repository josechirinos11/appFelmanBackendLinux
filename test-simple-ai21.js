const axios = require('axios');

async function testBasic() {
  try {
    console.log('🔍 Probando conexión básica a AI21...');
    
    // Test 1: Estado del servicio
    const response1 = await axios.get('http://127.0.0.1:3000/ai21/estado');
    console.log('✅ Estado:', response1.data);
    
    // Test 2: Información del servicio
    const response2 = await axios.get('http://127.0.0.1:3000/ai21/info');
    console.log('✅ Info:', response2.data);
    
    // Test 3: Prueba básica de texto
    const response3 = await axios.post('http://127.0.0.1:3000/ai21/generar-texto', {
      prompt: 'Explica qué es la IA en una línea.',
      opciones: { maxTokens: 50 }
    });
    console.log('✅ Generación de texto:', response3.data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status:', error.response.status);
    }
  }
}

testBasic();
