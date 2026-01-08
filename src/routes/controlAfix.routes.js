// src/routes/controlAfix.routes.js
const express = require('express');
const router = express.Router();
const Afix = require('../services/informix.service');

/**
 * GET /control-afix/ping
 * Verifica la conexión básica con la base de datos.
 */
router.get('/ping', async (req, res) => {
  console.log('[AFIX] GET /ping');
  try {
    const r = await Afix.ping();
    return res.json({ ok: true, data: r.out });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /control-afix/cli/by-dni?dni=XXXXXXXXX
 */
router.get('/cli/by-dni', async (req, res) => {
  const dni = (req.query.dni || '').trim();
  console.log('[AFIX] GET /cli/by-dni', { dni });

  if (!/^[A-Za-z0-9]+$/.test(dni)) {
    return res.status(400).json({ ok: false, error: 'dni inválido' });
  }

  try {
    // Usamos el service que ya gestiona el UNLOAD y parseo
    const { rows } = await Afix.getClienteByDni(dni);
    return res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * GET /control-afix/cli/search?text=PALABRA*
 */
router.get('/cli/search', async (req, res) => {
  let text = (req.query.text || '').trim();
  console.log('[AFIX] GET /cli/search', { text });

  if (!text) return res.status(400).json({ ok: false, error: 'text requerido' });
  
  // Validación básica para evitar caracteres extraños en shell
  if (!/^[A-Za-z0-9 \.\-_/*\?]+$/.test(text)) {
    return res.status(400).json({ ok: false, error: 'caracteres no permitidos' });
  }

  try {
    const { rows } = await Afix.searchClientesByRazonSocial(text);
    return res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

/**
 * POST /control-afix/sql
 * Ejecución de SQL arbitrario (solo SELECT) con límite manual de seguridad.
 */
router.post('/sql', async (req, res) => {
  console.log('[AFIX] POST /sql', { body: req.body });

  try {
    const sqlIn = String(req.body?.sql || '').trim();
    const limitRows = Number.isFinite(+req.body?.first) 
      ? Math.max(1, Math.min(5000, +req.body.first)) 
      : 1000; // Por defecto 1000 según tu index.js
    const rawMode = String(req.query.raw || '') === '1';

    if (!sqlIn) return res.status(400).json({ ok: false, error: 'sql requerido' });

    // Seguridad: Bloqueo de comandos de escritura y validación SELECT
    const banned = /\b(update|insert|delete|create|alter|drop|truncate|grant|revoke|load|unload|system|execute|call|database|start|stop)\b/i;
    if (banned.test(sqlIn)) {
      return res.status(400).json({ ok: false, error: 'Comando no permitido (solo SELECT)' });
    }
    if (!/^\s*select\b/i.test(sqlIn)) {
      return res.status(400).json({ ok: false, error: 'Debe comenzar con SELECT' });
    }

    // Ejecución mediante el service (que usa queryRawSelect)
    const raw = await Afix.queryRawSelect(sqlIn.replace(/;+$/, ''));

    // Procesamiento y limpieza de ruido de Informix SE
    let lines = raw
      .split('\n')
      .map(s => s.trim())
      .filter(s => s && !/^Database (selected|closed)\./i.test(s) && !/row\(s\) unloaded/i.test(s));

    // Límite manual (slice) porque SE no soporta "FIRST n"
    if (lines.length > limitRows) {
      lines = lines.slice(0, limitRows);
    }

    if (rawMode) {
      return res.json({ ok: true, count: lines.length, rows_text: lines });
    }

    const rows = lines.map(line => line.split('|'));
    return res.json({ ok: true, count: rows.length, rows });

  } catch (e) {
    console.error('[AFIX] Error POST /sql:', e.message);
    return res.status(500).json({ ok: false, error: 'Error en base de datos', detail: e.message });
  }
});

module.exports = router;