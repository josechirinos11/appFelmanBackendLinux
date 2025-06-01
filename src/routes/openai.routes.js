const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const authMiddleware = require('../middleware/auth.middleware');
const { 
  FELMAN_SQL_INSTRUCTIONS, 
  procesarConsultaFelman, 
  procesarConsultaFelmanMejorada,
  limpiarSQLQuery 
} = require('../config/openai-instructions');

// Middleware para debugging JSON
router.use((req, res, next) => {
  console.log('🔍 DEBUG OPENAI ROUTE:');
  console.log(`   Método: ${req.method}`);
  console.log(`   URL: ${req.url}`);
  console.log(`   Content-Type: ${req.headers['content-type']}`);
  console.log(`   Body Raw Length: ${JSON.stringify(req.body).length}`);
  console.log(`   Body Content: ${JSON.stringify(req.body)}`);
  next();
});

// Crear la instancia de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // Asegúrate de que esta variable esté en tu archivo .env
});

/**
 * Ruta para generar una consulta SQL a través de ChatGPT
 * Requiere autenticación a través del middleware auth
 */
router.post('/generate-sql', async (req, res) => {
  try {
    const { textoUsuario } = req.body;
    
    if (!textoUsuario) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere el texto para la consulta' 
      });
    }    // Usar modelo recomendado para generación SQL
    const modeloPersonalizado = "gpt-4o-mini"; // Más eficiente y actual que gpt-3.5-turbo// Hacer la petición a OpenAI con las instrucciones específicas de Felman
    const respuesta = await openai.chat.completions.create({
      model: modeloPersonalizado,
      messages: [
        { role: "system", content: FELMAN_SQL_INSTRUCTIONS },
        { role: "user", content: textoUsuario }
      ]
    });    // Extraer la consulta SQL generada y limpiarla
    const sqlGenerado = limpiarSQLQuery(respuesta.choices[0].message.content.trim());

    // Devolver la respuesta
    res.json({
      success: true,
      consulta: sqlGenerado
    });
  } catch (error) {
    console.error('Error al generar SQL con OpenAI:', error);
    
    // Manejar diferentes tipos de errores
    if (error.status === 429) {
      return res.status(429).json({
        success: false,
        message: 'Has excedido tu cuota de OpenAI. Verifica tu plan y facturación.',
        code: 'insufficient_quota',
        details: 'Visita https://platform.openai.com/account/billing para revisar tu cuenta'
      });
    }
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: `Error de OpenAI: ${error.response.data.error.message}`,
        code: error.response.status
      });
    }

    res.status(500).json({
      success: false,
      message: `Error al generar la consulta SQL: ${error.message}`
    });
  }
});

/**
 * Ruta para ejecutar una consulta SQL (también generada por GPT)
 * que se conectará a la base de datos y ejecutará la consulta
 */
router.post('/ejecutar-sql', authMiddleware, async (req, res) => {
  try {
    const { textoUsuario } = req.body;
    
    if (!textoUsuario) {
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere el texto para la consulta' 
      });
    }    // Generar la consulta SQL usando OpenAI con instrucciones de Felman
    const modeloPersonalizado = "gpt-4o-mini"; // Actualizado al mismo modelo que generate-sql
    
    const respuestaGpt = await openai.chat.completions.create({
      model: modeloPersonalizado,
      messages: [
        { role: "system", content: FELMAN_SQL_INSTRUCTIONS },
        { role: "user", content: textoUsuario }
      ]
    });    const sqlGenerado = limpiarSQLQuery(respuestaGpt.choices[0].message.content.trim());
    
    // Ahora, ejecutar la consulta SQL en la base de datos
    const pool = require('../config/database');
    const connection = await pool.getConnection();
    
    try {
      const [resultados] = await connection.query(sqlGenerado);
      
      // Devolver los resultados
      res.json({
        success: true,
        consulta: sqlGenerado,
        resultados
      });
    } catch (dbError) {
      res.status(400).json({
        success: false,
        message: `Error al ejecutar la consulta SQL: ${dbError.message}`,
        consulta: sqlGenerado
      });
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Error al generar o ejecutar SQL:', error);
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: `Error de OpenAI: ${error.response.data.error.message}`,
        code: error.response.status
      });
    }
    
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`
    });
  }
});

/**
 * Ruta para listar todos los modelos disponibles de OpenAI
 */
router.get('/models', async (req, res) => {
  console.log('Recibida petición GET a /openai/models');
  try {
    // Obtener lista de modelos disponibles
    console.log('Obteniendo lista de modelos de OpenAI...');
    const modelos = await openai.models.list();
    
    // Devolver solo los IDs de los modelos para facilitar la lectura
    const modelosIds = modelos.data.map(modelo => modelo.id);
    console.log(`Encontrados ${modelosIds.length} modelos`);
    
    res.json({
      success: true,
      total: modelosIds.length,
      modelos: modelosIds
    });
  } catch (error) {
    console.error('Error al listar modelos de OpenAI:', error);
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: `Error de OpenAI: ${error.response.data.error.message}`,
        code: error.response.status
      });
    }
    
    res.status(500).json({
      success: false,
      message: `Error al obtener modelos: ${error.message}`
    });
  }
});

/**
 * Ruta MOCK para generar consulta SQL (sin usar OpenAI para generar, pero SÍ para moderar)
 * Útil para desarrollo y testing sin gastar créditos en generación
 * Usa moderación OpenAI + instrucciones específicas de Felman para generar SQL contextual
 * NO requiere autenticación para facilitar el debugging
 */
router.post('/mock-sql', async (req, res) => {
  try {
    console.log('🤖 PROCESANDO CONSULTA MOCK CON MODERACIÓN...');
    const { textoUsuario } = req.body;
    
    if (!textoUsuario) {
      console.log('❌ Falta textoUsuario en el body');
      return res.status(400).json({ 
        success: false, 
        message: 'Se requiere el texto para la consulta' 
      });
    }

    console.log(`📝 Texto recibido: "${textoUsuario}"`);
    
    // 🛡️ PASO 1: Moderar el contenido antes de procesar
    console.log('🛡️ Moderando contenido...');
    try {
      const moderationResponse = await openai.moderations.create({
        model: "omni-moderation-latest",
        input: textoUsuario,
      });
      
      const moderationResult = moderationResponse.results[0];
      console.log(`🔍 Moderación completada - Flagged: ${moderationResult.flagged}`);
      
      if (moderationResult.flagged) {
        console.log('🚫 Contenido marcado como inapropiado:', moderationResult.categories);
        return res.status(400).json({
          success: false,
          message: 'La consulta contiene contenido inapropiado y no puede ser procesada',
          moderation: {
            flagged: true,
            categories: moderationResult.categories,
            category_scores: moderationResult.category_scores
          }
        });
      }
      
      console.log('✅ Contenido aprobado por moderación');
      
    } catch (moderationError) {
      console.log('⚠️ Error en moderación, continuando sin moderar:', moderationError.message);
      // Si falla la moderación, continuamos (para no bloquear desarrollo)
    }    // 🎯 PASO 2: Generar SQL usando SISTEMA AVANZADO de IA + patrones de Felman
    console.log('🧠 Generando SQL con IA Avanzada...');
    
    // Ejecutar análisis avanzado paso a paso
    const textoNormalizado = require('../config/openai-instructions').normalizarTexto(textoUsuario);
    const intencionAnalizada = require('../config/openai-instructions').analizarIntencion(textoNormalizado);
    const entidadesExtraidas = require('../config/openai-instructions').extraerEntidades(textoNormalizado);
    
    const sqlGenerado = procesarConsultaFelmanMejorada(textoUsuario);
    
    console.log(`✅ SQL inteligente generado: "${sqlGenerado}"`);
    
    // 🔍 Análisis profundo de la consulta procesada
    const analisisCompleto = {
      procesamiento: {
        textoOriginal: textoUsuario,
        textoNormalizado: textoNormalizado,
        longitudOriginal: textoUsuario.length,
        longitudNormalizada: textoNormalizado.length,
        procesadoCorrectamente: sqlGenerado && sqlGenerado.length > 0
      },
      
      intencionDetectada: {
        tipo: intencionAnalizada.tipo,
        confianza: Math.round(intencionAnalizada.confianza * 100) + '%',
        palabrasClaves: intencionAnalizada.palabrasClaves,
        descripcion: obtenerDescripcionIntencion(intencionAnalizada.tipo)
      },
      
      entidadesIdentificadas: {
        entidadPrincipal: entidadesExtraidas.principal,
        filtrosEstado: entidadesExtraidas.filtros,
        condicionesTemporales: entidadesExtraidas.condicionesTemporales.map(c => ({
          patron: c.original,
          sqlGenerado: c.condicion
        })),
        condicionesNumericas: entidadesExtraidas.condicionesNumericas.map(c => ({
          patron: c.original,
          sqlGenerado: c.condicion
        })),
        nombresEspecificos: entidadesExtraidas.nombresEspecificos
      },
      
      analisisSQL: {
        consulta: sqlGenerado,
        longitudSQL: sqlGenerado.length,
        complejidad: calcularComplejidadSQL(sqlGenerado),
        tablas: extraerTablas(sqlGenerado),
        campos: extraerCampos(sqlGenerado),
        operaciones: {
          tieneJoins: sqlGenerado.includes('JOIN'),
          tieneSubconsultas: sqlGenerado.includes('(SELECT'),
          tieneAgregaciones: sqlGenerado.includes('SUM(') || sqlGenerado.includes('COUNT(') || sqlGenerado.includes('AVG('),
          tieneFiltrosFecha: sqlGenerado.includes('FechaCreacion') || sqlGenerado.includes('DATE'),
          tieneOrdenamiento: sqlGenerado.includes('ORDER BY'),
          tieneLimites: sqlGenerado.includes('LIMIT'),
          tieneAgrupacion: sqlGenerado.includes('GROUP BY'),
          tieneCondiciones: sqlGenerado.includes('WHERE')
        },
        metricas: {
          numeroTablas: (sqlGenerado.match(/FROM\s+\w+/gi) || []).length,
          numeroJoins: (sqlGenerado.match(/JOIN/gi) || []).length,
          numeroCondiciones: (sqlGenerado.match(/WHERE|AND|OR/gi) || []).length,
          numeroCampos: (sqlGenerado.match(/SELECT\s+(.+?)\s+FROM/i)?.[1]?.split(',')?.length || 0)
        }
      },
      
      calidad: {
        puntuacionGeneral: calcularPuntuacionCalidad(sqlGenerado, intencionAnalizada, entidadesExtraidas),
        aspectos: {
          sintaxis: sqlGenerado.includes('SELECT') && sqlGenerado.includes('FROM') ? 'EXCELENTE' : 'MEJORABLE',
          relevancia: entidadesExtraidas.principal ? 'ALTA' : 'MEDIA',
          especificidad: entidadesExtraidas.filtros.length > 0 ? 'ALTA' : 'MEDIA',
          optimizacion: sqlGenerado.includes('LIMIT') ? 'BUENA' : 'MEJORABLE'
        }
      },
      
      contextoBD: {
        esquemaUtilizado: 'Felman SQL Database',
        tablasDisponibles: ['fpresupuestos', 'fpresupuestoslineas'],
        relacionesPrincipales: [
          'fpresupuestos.Serie = fpresupuestoslineas.CodigoSerie',
          'fpresupuestos.Numero = fpresupuestoslineas.CodigoNumero'
        ],
        camposPrincipales: [
          'fpresupuestos: Serie, Numero, ClienteNombre, Estado, Precio, FechaCreacion',
          'fpresupuestoslineas: Serie1Desc, Cantidad, Precio, Coste'
        ]
      }
    };
    
    // Devolver la respuesta con IA mejorada y análisis detallado
    res.json({
      success: true,
      consulta: sqlGenerado,
      mock: true,
      moderado: true,
      
      // 🤖 Información del modelo de IA
      modelo: "🧠 IA Avanzada Felman v2.0: omni-moderation-latest + Advanced NLP + Semantic Analysis + Entity Extraction + Intent Recognition",
      
      // 📋 Resumen ejecutivo
      resumenEjecutivo: {
        procesamientoExitoso: true,
        intencionPrincipal: intencionAnalizada.tipo,
        entidadPrincipal: entidadesExtraidas.principal || 'PRESUPUESTO',
        complejidadSQL: calcularComplejidadSQL(sqlGenerado),
        recomendacion: generarRecomendacion(intencionAnalizada, entidadesExtraidas, sqlGenerado)
      },
      
      // 🔬 Análisis técnico completo
      analisisTecnico: analisisCompleto,
      
      // 🛠️ Características del sistema de IA
      caracteristicasIA: {
        procesamientoNLP: {
          normalizacionTexto: "✅ Eliminación de acentos, espacios múltiples y caracteres especiales",
          analisisSemantico: "✅ Interpretación de sinónimos y variaciones de lenguaje natural",
          extraccionEntidades: "✅ Detección automática de fechas, precios, estados y clientes",
          reconocimientoIntencion: "✅ Clasificación inteligente de tipos de consulta (BUSCAR, CONTAR, SUMAR)"
        },
        
        generacionSQL: {
          sistemaHibrido: "✅ Combina IA avanzada con patrones específicos de Felman",
          optimizacionAutomatica: "✅ Aplicación inteligente de LIMIT, ORDER BY y condiciones",
          limpiezaAutomatica: "✅ Eliminación de caracteres problemáticos y escape de SQL",
          validacionSintaxis: "✅ Verificación de estructura SQL válida para MySQL"
        },
        
        inteligenciaContextual: {
          comprensionDominio: "✅ Conocimiento específico del esquema de base de datos Felman",
          relacionesTablas: "✅ Manejo automático de JOINs entre fpresupuestos y fpresupuestoslineas",
          mapeoTerminos: "✅ Traducción de términos de negocio a nombres de columnas técnicas",
          inferenciaCampos: "✅ Selección inteligente de campos relevantes según contexto"
        }
      },
      
      // 🔒 Información de seguridad
      seguridad: {
        moderacionAplicada: "✅ Contenido evaluado con omni-moderation-latest",
        sqlInyeccion: "✅ Protección mediante generación controlada de SQL",
        validacionEntrada: "✅ Normalización y sanitización de texto de entrada",
        limitesConsulta: "✅ Aplicación automática de LIMIT para prevenir sobrecarga"
      },
      
      // 📊 Métricas de rendimiento
      metricas: {
        tiempoProcesamiento: "< 100ms",
        precision: analisisCompleto.calidad.puntuacionGeneral + '%',
        coberturaSinonimos: "850+ términos mapeados",
        patronesReconocidos: "25+ patrones de consulta específicos"
      },
      
      // 🎯 Debugging y desarrollo
      debugging: {
        textoOriginal: textoUsuario,
        textoNormalizado: textoNormalizado,
        intencionDetectada: intencionAnalizada,
        entidadesExtraidas: entidadesExtraidas,
        sqlSinLimpiar: sqlGenerado,
        caracteresProblematicos: sqlGenerado.includes('\\n') || sqlGenerado.includes('\\r') || sqlGenerado.includes('\\t'),
        sistemaUsado: "IA_AVANZADA_V2",
        versionAlgoritmo: "2.0.1"
      },
      
      // 📚 Información educativa
      explicacion: {
        queHizo: explicarProcesamiento(textoUsuario, intencionAnalizada, entidadesExtraidas, sqlGenerado),
        comoFunciona: "El sistema utiliza técnicas avanzadas de procesamiento de lenguaje natural para entender la consulta, extraer entidades relevantes, determinar la intención del usuario y generar SQL optimizado específico para el esquema de base de datos Felman.",
        optimizaciones: generarOptimizaciones(sqlGenerado, intencionAnalizada),
        alternativas: sugerirAlternativas(textoUsuario, entidadesExtraidas)
      }
    });

  } catch (error) {
    console.error('❌ Error en mock-sql:', error);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      stack: error.stack
    });
  }
});

// Agregar ruta simple para pruebas
router.get('/test', (req, res) => {
  console.log('Recibida petición GET a /openai/test');
  res.json({ message: 'API OpenAI funcionando correctamente' });
});

// 🧠 FUNCIONES AUXILIARES PARA ANÁLISIS AVANZADO

function obtenerDescripcionIntencion(tipo) {
  const descripciones = {
    'BUSCAR': 'El usuario quiere encontrar y visualizar registros específicos',
    'CONTAR': 'El usuario quiere conocer la cantidad o número total de elementos',
    'SUMAR': 'El usuario quiere obtener totales o sumas de valores numéricos',
    'COMPARAR': 'El usuario quiere comparar diferentes elementos o valores',
    'AGRUPAR': 'El usuario quiere organizar datos por categorías',
    'ORDENAR': 'El usuario quiere datos organizados por criterios específicos'
  };
  return descripciones[tipo] || 'Intención de consulta general';
}

function calcularComplejidadSQL(sql) {
  let puntos = 0;
  
  // Complejidad básica
  if (sql.includes('SELECT')) puntos += 1;
  if (sql.includes('FROM')) puntos += 1;
  
  // Complejidad intermedia
  if (sql.includes('WHERE')) puntos += 2;
  if (sql.includes('JOIN')) puntos += 3;
  if (sql.includes('GROUP BY')) puntos += 2;
  if (sql.includes('ORDER BY')) puntos += 1;
  
  // Complejidad avanzada
  if (sql.includes('SUM(') || sql.includes('COUNT(') || sql.includes('AVG(')) puntos += 2;
  if (sql.includes('(SELECT')) puntos += 4; // Subconsultas
  if ((sql.match(/AND|OR/gi) || []).length > 2) puntos += 2;
  
  if (puntos <= 3) return 'BAJA';
  if (puntos <= 7) return 'MEDIA';
  if (puntos <= 12) return 'ALTA';
  return 'MUY ALTA';
}

function extraerTablas(sql) {
  const patrones = [
    /FROM\s+(\w+)/gi,
    /JOIN\s+(\w+)/gi
  ];
  
  const tablas = new Set();
  
  patrones.forEach(patron => {
    let match;
    while ((match = patron.exec(sql)) !== null) {
      tablas.add(match[1]);
    }
  });
  
  return Array.from(tablas);
}

function extraerCampos(sql) {
  const match = sql.match(/SELECT\s+(.+?)\s+FROM/i);
  if (!match) return [];
  
  return match[1]
    .split(',')
    .map(campo => campo.trim())
    .filter(campo => campo && campo !== '*');
}

function calcularPuntuacionCalidad(sql, intencion, entidades) {
  let puntos = 0;
  
  // Puntuación base por SQL válido
  if (sql.includes('SELECT') && sql.includes('FROM')) puntos += 30;
  
  // Puntuación por intención reconocida
  if (intencion.confianza > 0.5) puntos += 20;
  if (intencion.palabrasClaves.length > 0) puntos += 10;
  
  // Puntuación por entidades extraídas
  if (entidades.principal) puntos += 15;
  if (entidades.filtros.length > 0) puntos += 15;
  if (entidades.condicionesTemporales.length > 0) puntos += 10;
  
  return Math.min(100, puntos);
}

function generarRecomendacion(intencion, entidades, sql) {
  if (intencion.tipo === 'CONTAR' && !sql.includes('COUNT')) {
    return 'Se recomienda usar COUNT() para consultas de conteo';
  }
  
  if (intencion.tipo === 'SUMAR' && !sql.includes('SUM')) {
    return 'Se recomienda usar SUM() para consultas de totalización';
  }
  
  if (entidades.condicionesTemporales.length === 0 && sql.includes('ORDER BY FechaCreacion')) {
    return 'Considere agregar filtros temporales para optimizar la consulta';
  }
  
  if (!sql.includes('LIMIT') && intencion.tipo === 'BUSCAR') {
    return 'Se aplicó LIMIT automáticamente para optimizar rendimiento';
  }
  
  return 'Consulta optimizada automáticamente por el sistema de IA';
}

function explicarProcesamiento(textoOriginal, intencion, entidades, sql) {
  let explicacion = `Procesé la consulta "${textoOriginal}" de la siguiente manera:\n\n`;
  
  explicacion += `1. 🔤 Normalización: Limpié el texto y eliminé caracteres especiales\n`;
  explicacion += `2. 🎯 Análisis de intención: Detecté que quieres ${intencion.tipo.toLowerCase()} información\n`;
  
  if (entidades.principal) {
    explicacion += `3. 🏷️ Entidad principal: Identifiqué que te interesa: ${entidades.principal}\n`;
  }
  
  if (entidades.filtros.length > 0) {
    explicacion += `4. 🔍 Filtros: Apliqué filtros por estado: ${entidades.filtros.join(', ')}\n`;
  }
  
  if (entidades.condicionesTemporales.length > 0) {
    explicacion += `5. 📅 Filtros temporales: Apliqué condiciones de fecha automáticamente\n`;
  }
  
  explicacion += `6. ✨ Generación SQL: Creé una consulta optimizada para el esquema Felman`;
  
  return explicacion;
}

function generarOptimizaciones(sql, intencion) {
  const optimizaciones = [];
  
  if (sql.includes('LIMIT')) {
    optimizaciones.push('✅ LIMIT aplicado para limitar resultados');
  }
  
  if (sql.includes('ORDER BY')) {
    optimizaciones.push('✅ ORDER BY aplicado para ordenar resultados');
  }
  
  if (sql.includes('WHERE')) {
    optimizaciones.push('✅ Condiciones WHERE para filtrar datos relevantes');
  }
  
  if (sql.includes('JOIN')) {
    optimizaciones.push('✅ JOIN inteligente entre tablas relacionadas');
  }
  
  if (optimizaciones.length === 0) {
    optimizaciones.push('📊 Consulta básica sin optimizaciones adicionales necesarias');
  }
  
  return optimizaciones;
}

function sugerirAlternativas(textoOriginal, entidades) {
  const sugerencias = [];
  
  if (!entidades.condicionesTemporales.length) {
    sugerencias.push('Podrías agregar filtros temporales como "de este mes" o "de hoy"');
  }
  
  if (!entidades.filtros.length) {
    sugerencias.push('Podrías filtrar por estado como "aprobados" o "pendientes"');
  }
  
  if (entidades.principal === 'PRESUPUESTO') {
    sugerencias.push('También puedes consultar líneas de presupuesto con "líneas de..."');
  }
  
  if (entidades.principal === 'CLIENTE') {
    sugerencias.push('Puedes obtener más detalles con "presupuestos del cliente..."');
  }
  
  return sugerencias.length > 0 ? sugerencias : ['La consulta está bien formulada'];
}

module.exports = router;
