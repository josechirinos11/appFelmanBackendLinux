/**
 * Middleware para diagnosticar errores de JSON parsing
 * Este middleware captura y analiza los errores de JSON malformado
 */

const express = require('express');

// Middleware para logging de body raw antes del parsing
const logRawBody = (req, res, next) => {
  let data = '';
  
  req.on('data', chunk => {
    data += chunk;
  });
  
  req.on('end', () => {
    console.log('📄 RAW BODY RECIBIDO:');
    console.log('Longitud:', data.length);
    console.log('Contenido:', data);
    console.log('Caracteres alrededor posición 77:');
    if (data.length > 77) {
      console.log('...', data.substring(70, 85), '...');
      console.log('Carácter en posición 77:', data.charAt(77), '(código:', data.charCodeAt(77), ')');
    }
    console.log('---');
    
    // Verificar si es JSON válido
    try {
      JSON.parse(data);
      console.log('✅ JSON válido');
    } catch (error) {
      console.log('❌ JSON inválido:', error.message);
      
      // Mostrar contexto del error
      const match = error.message.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1]);
        const start = Math.max(0, position - 10);
        const end = Math.min(data.length, position + 10);
        console.log('Contexto del error:');
        console.log(data.substring(start, end));
        console.log(' '.repeat(position - start) + '^');
      }
    }
  });
  
  next();
};

// Middleware de manejo de errores JSON
const handleJSONError = (error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    console.error('🚨 ERROR DE JSON PARSING:');
    console.error('Mensaje:', error.message);
    console.error('Body recibido:', req.body);
    console.error('Headers:', req.headers);
    console.error('Content-Type:', req.get('Content-Type'));
    
    return res.status(400).json({
      success: false,
      error: 'JSON_PARSE_ERROR',
      message: 'El JSON enviado está malformado',
      details: error.message,
      position: error.message.match(/position (\d+)/) ? parseInt(error.message.match(/position (\d+)/)[1]) : null
    });
  }
  next(error);
};

// Función para validar y limpiar JSON
const validateAndCleanJSON = (jsonString) => {
  try {
    // Limpiar caracteres problemáticos
    let cleaned = jsonString
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Caracteres de control
      .replace(/,(\s*[}\]])/g, '$1') // Comas extra antes de cerrar
      .trim();
    
    // Intentar parsear
    const parsed = JSON.parse(cleaned);
    return { success: true, data: parsed, cleaned };
  } catch (error) {
    return { success: false, error: error.message, original: jsonString };
  }
};

// Función para diagnosticar una petición específica
const diagnoseRequest = (req) => {
  console.log('🔍 DIAGNÓSTICO DE PETICIÓN:');
  console.log('URL:', req.url);
  console.log('Método:', req.method);
  console.log('Headers:', req.headers);
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('Content-Length:', req.get('Content-Length'));
  console.log('User-Agent:', req.get('User-Agent'));
  console.log('Body:', req.body);
};

module.exports = {
  logRawBody,
  handleJSONError,
  validateAndCleanJSON,
  diagnoseRequest
};
