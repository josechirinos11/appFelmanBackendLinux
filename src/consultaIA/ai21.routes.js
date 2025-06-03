const express = require('express');
const router = express.Router();
const AI21Controller = require('./ai21.controller');

// Crear instancia del controlador
const ai21Controller = new AI21Controller();

// Middleware para debugging
router.use((req, res, next) => {
  console.log(`🤖 AI21 Route: ${req.method} ${req.url}`);
  console.log(`📋 Body:`, req.body);
  next();
});

/**
 * @route POST /ai21/generar-texto
 * @desc Generar texto libre usando AI21 J2-Ultra
 * @body { prompt: string, opciones?: object }
 */
router.post('/generar-texto', async (req, res) => {
  await ai21Controller.generarTexto(req, res);
});

/**
 * @route POST /ai21/analizar-negocio
 * @desc Generar análisis de negocio inteligente
 * @body { contexto: string, pregunta: string }
 */
router.post('/analizar-negocio', async (req, res) => {
  await ai21Controller.analizarNegocio(req, res);
});

/**
 * @route POST /ai21/explicar-sql
 * @desc Explicar resultados SQL de manera inteligente
 * @body { consultaUsuario: string, resultadoSQL: any }
 */
router.post('/explicar-sql', async (req, res) => {
  await ai21Controller.explicarSQL(req, res);
});

/**
 * @route POST /ai21/sugerencias
 * @desc Generar sugerencias de consultas relacionadas
 * @body { consultaOriginal: string }
 */
router.post('/sugerencias', async (req, res) => {
  await ai21Controller.generarSugerencias(req, res);
});

/**
 * @route POST /ai21/consulta-avanzada
 * @desc Consulta avanzada que combina análisis + AI21
 * @body { textoUsuario: string }
 */
router.post('/consulta-avanzada', async (req, res) => {
  await ai21Controller.consultaAvanzada(req, res);
});

/**
 * @route GET /ai21/estado
 * @desc Verificar estado del servicio AI21
 */
router.get('/estado', async (req, res) => {
  await ai21Controller.verificarEstado(req, res);
});

/**
 * @route POST /ai21/generar-sql-inteligente
 * @desc Generar consultas SQL específicas para base de datos Felman
 * @body { textoUsuario: string, instruccionesPersonalizadas?: string }
 */
router.post('/generar-sql-inteligente', async (req, res) => {
  await ai21Controller.generarSQLInteligente(req, res);
});

/**
 * @route GET /ai21/info
 * @desc Información sobre las capacidades del servicio AI21
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      servicio: 'AI21 Studio Integration',
      version: '1.0.0',
      modelo: 'Jamba-mini',
      endpoints: [
        {
          ruta: 'POST /ai21/generar-texto',
          descripcion: 'Generar texto libre',
          parametros: ['prompt', 'opciones?']
        },
        {
          ruta: 'POST /ai21/analizar-negocio',
          descripcion: 'Análisis de negocio inteligente',
          parametros: ['contexto', 'pregunta']
        },
        {
          ruta: 'POST /ai21/explicar-sql',
          descripcion: 'Explicar resultados SQL',
          parametros: ['consultaUsuario', 'resultadoSQL']
        },
        {
          ruta: 'POST /ai21/sugerencias',
          descripcion: 'Sugerencias de consultas',
          parametros: ['consultaOriginal']
        },
        {
          ruta: 'POST /ai21/consulta-avanzada',
          descripcion: 'Consulta avanzada con IA',
          parametros: ['textoUsuario']
        },
        {
          ruta: 'POST /ai21/generar-sql-inteligente',
          descripcion: 'Generar SQL específico para Felman',
          parametros: ['textoUsuario', 'instruccionesPersonalizadas?']
        },
        {
          ruta: 'GET /ai21/estado',
          descripcion: 'Estado del servicio'
        }
      ],
      configuracion: {
        modelo: 'jamba-mini',
        maxTokensDefecto: 200,
        temperatureDefecto: 0.7,
        timeoutDefecto: '30s'
      }
    }
  });
});

module.exports = router;
