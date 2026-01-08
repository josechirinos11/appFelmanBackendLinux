// src/routes/controlAfix.routes.js
const express = require('express');
const router = express.Router();
const Afix = require('../services/informix.service');

// GET /control-afix/ping
router.get('/ping', async (req, res) => {
  console.log('Se solicitó la ruta: /control-afix/ping');
  try {
    const r = await Afix.ping();
    return res.json({ status: 'ok', data: r.out });
  } catch (err) {
    return res.status(500).json({ 
      status: 'error', 
      error: err.message, 
      stderr: err.stderr, 
      stdout: err.stdout 
    });
  }
});

// GET /control-afix/cli/by-dni?dni=XXXXXXXXX
router.get('/cli/by-dni', async (req, res) => {
  console.log('Se solicitó la ruta: /control-afix/cli/by-dni', req.query);
  try {
    const { dni } = req.query;
    if (!dni) {
      return res.status(400).json({ ok: false, error: 'dni requerido' });
    }
    
    const { rows } = await Afix.getClienteByDni(dni);
    
    // Formato consistente
    return res.json({ 
      ok: true, 
      count: rows.length, 
      data: rows.map(r => ({
        rowid: r.cli,
        ras: r.ras,
        dni: r.dni,
        telefono: r.te1,
        email: r.e_mail
      }))
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// GET /control-afix/cli/search?text=CRISTALERIA*
router.get('/cli/search', async (req, res) => {
  console.log('Se solicitó la ruta: /control-afix/cli/search', req.query);
  try {
    const { text } = req.query;
    if (!text) {
      return res.status(400).json({ ok: false, error: 'text requerido' });
    }
    
    const { rows } = await Afix.searchClientesByRazonSocial(text);
    return res.json({ ok: true, count: rows.length, rows });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// === Consola SQL SOLO-LECTURA (Informix SE) ===
// POST /control-afix/sql
// Body JSON: { "sql": "select ...", "first": 200 }
// Opcional: ?raw=1 para devolver líneas tal cual del UNLOAD
router.post('/sql', async (req, res) => {
  console.log('POST /control-afix/sql', { body: req.body, query: req.query });
  
  try {
    const sqlIn = String((req.body && req.body.sql) || '').trim();
    const firstIn = Number.isFinite(+req.body?.first) 
      ? Math.max(1, Math.min(5000, +req.body.first)) 
      : 200;
    const rawMode = String(req.query.raw || '') === '1';

    if (!sqlIn) {
      return res.status(400).json({ ok: false, error: 'sql requerido' });
    }

    // Solo SELECT; bloquea cosas peligrosas
    const banned = /\b(update|insert|delete|create|alter|drop|truncate|grant|revoke|load|unload|system|execute|call|database|start|stop)\b/i;
    if (banned.test(sqlIn)) {
      return res.status(400).json({ ok: false, error: 'solo se permite SELECT (bloqueado)' });
    }
    if (!/^\s*select\b/i.test(sqlIn)) {
      return res.status(400).json({ ok: false, error: 'solo se permite SELECT' });
    }

    // Un solo statement
    if (/;.+/s.test(sqlIn.replace(/;+$/,''))) {
      return res.status(400).json({ ok: false, error: 'no se permiten múltiples statements' });
    }

    // Inyecta FIRST si no viene
    let sql = sqlIn.replace(/;+$/,'');
    if (!/^\s*select\s+first\s+\d+\b/i.test(sql)) {
      sql = sql.replace(/^\s*select\b/i, m => `${m} first ${firstIn}`);
    }

    console.log('[AFIX] Ejecutando SQL:', sql);
    const raw = await Afix.queryRawSelect(sql);
    
    const lines = raw
      .split('\n')
      .map(s => s.trim())
      .filter(s => s && !/^Database (selected|closed)\./i.test(s) && !/row\(s\) unloaded/i.test(s));

    if (rawMode) {
      return res.json({ ok: true, count: lines.length, rows_text: lines });
    }

    const rows = lines.map(line => line.split('|'));
    return res.json({ ok: true, count: rows.length, rows });
    
  } catch (e) {
    console.error('[AFIX] Error en POST /sql:', e);
    return res.status(500).json({ ok: false, error: 'afix_select falló', detail: e.message });
  }
});

module.exports = router;