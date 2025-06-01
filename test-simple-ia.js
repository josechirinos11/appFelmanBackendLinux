// Test Simple del Sistema de IA Detallada
// Prueba rápida del endpoint /mock-sql mejorado

const axios = require('axios');

const SERVIDOR_URL = 'http://localhost:3001';

async function testSimple() {
  console.log('🧪 Test Simple del Sistema de IA Detallada');
  console.log('='.repeat(50));
  
  const consultaPrueba = "mostrar presupuestos aprobados de este mes";
  
  try {
    console.log(`📝 Enviando consulta: "${consultaPrueba}"`);
    
    const respuesta = await axios.post(`${SERVIDOR_URL}/openai/mock-sql`, {
      textoUsuario: consultaPrueba
    });
    
    if (respuesta.data.success) {
      console.log('\n✅ RESPUESTA EXITOSA');
      console.log('='.repeat(50));
      
      // Verificar estructura básica
      console.log('📊 ESTRUCTURA DE RESPUESTA:');
      console.log(`   ✅ SQL generado: ${!!respuesta.data.consulta}`);
      console.log(`   ✅ Resumen ejecutivo: ${!!respuesta.data.resumenEjecutivo}`);
      console.log(`   ✅ Análisis técnico: ${!!respuesta.data.analisisTecnico}`);
      console.log(`   ✅ Características IA: ${!!respuesta.data.caracteristicasIA}`);
      console.log(`   ✅ Explicación: ${!!respuesta.data.explicacion}`);
      
      // Mostrar SQL generado
      if (respuesta.data.consulta) {
        console.log(`\n💫 SQL GENERADO:`);
        console.log(`   ${respuesta.data.consulta}`);
      }
      
      // Mostrar resumen ejecutivo
      if (respuesta.data.resumenEjecutivo) {
        console.log(`\n🎯 RESUMEN EJECUTIVO:`);
        console.log(`   Intención: ${respuesta.data.resumenEjecutivo.intencionPrincipal}`);
        console.log(`   Entidad: ${respuesta.data.resumenEjecutivo.entidadPrincipal}`);
        console.log(`   Complejidad: ${respuesta.data.resumenEjecutivo.complejidadSQL}`);
        console.log(`   Recomendación: ${respuesta.data.resumenEjecutivo.recomendacion}`);
      }
      
      // Mostrar análisis técnico (resumen)
      if (respuesta.data.analisisTecnico) {
        const tecnico = respuesta.data.analisisTecnico;
        console.log(`\n🔬 ANÁLISIS TÉCNICO:`);
        
        if (tecnico.intencionDetectada) {
          console.log(`   Intención detectada: ${tecnico.intencionDetectada.tipo} (${tecnico.intencionDetectada.confianza})`);
          console.log(`   Palabras clave: [${tecnico.intencionDetectada.palabrasClaves.join(', ')}]`);
        }
        
        if (tecnico.entidadesIdentificadas) {
          console.log(`   Entidad principal: ${tecnico.entidadesIdentificadas.entidadPrincipal || 'NINGUNA'}`);
          console.log(`   Filtros de estado: [${tecnico.entidadesIdentificadas.filtrosEstado.join(', ')}]`);
        }
        
        if (tecnico.analisisSQL) {
          console.log(`   Complejidad SQL: ${tecnico.analisisSQL.complejidad}`);
          console.log(`   Tablas usadas: [${tecnico.analisisSQL.tablas.join(', ')}]`);
        }
        
        if (tecnico.calidad) {
          console.log(`   Puntuación de calidad: ${tecnico.calidad.puntuacionGeneral}%`);
        }
      }
      
      // Mostrar características de IA (resumen)
      if (respuesta.data.caracteristicasIA) {
        console.log(`\n🤖 CARACTERÍSTICAS DE IA:`);
        if (respuesta.data.caracteristicasIA.procesamientoNLP) {
          const nlp = respuesta.data.caracteristicasIA.procesamientoNLP;
          console.log(`   Normalización: ${nlp.normalizacionTexto}`);
          console.log(`   Análisis semántico: ${nlp.analisisSemantico}`);
          console.log(`   Extracción entidades: ${nlp.extraccionEntidades}`);
        }
      }
      
      console.log('\n🎉 ¡SISTEMA DE IA DETALLADA FUNCIONANDO CORRECTAMENTE!');
      return true;
      
    } else {
      console.log('\n❌ ERROR EN RESPUESTA:', respuesta.data.message);
      return false;
    }
    
  } catch (error) {
    console.log('\n💥 ERROR DE CONEXIÓN:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n⚠️  El servidor no está ejecutándose.');
      console.log('   Para iniciar el servidor, ejecuta:');
      console.log('   npm start');
      console.log('   o');
      console.log('   node src/index.js');
    }
    
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    return false;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testSimple()
    .then(resultado => {
      if (resultado) {
        console.log('\n✨ Test completado exitosamente');
        process.exit(0);
      } else {
        console.log('\n❌ Test falló');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Error fatal:', error);
      process.exit(1);
    });
}

module.exports = { testSimple };
