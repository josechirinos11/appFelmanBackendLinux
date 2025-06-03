/**
 * Módulo de Consulta IA - AI21 Studio Integration
 * 
 * Este módulo proporciona integración completa con AI21 Studio
 * para generar respuestas inteligentes y análisis de negocio.
 */

const AI21Service = require('./ai21.service');
const AI21Controller = require('./ai21.controller');
const ai21Routes = require('./ai21.routes');

module.exports = {
  AI21Service,
  AI21Controller,
  ai21Routes
};
