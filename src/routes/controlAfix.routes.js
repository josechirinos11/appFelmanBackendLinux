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
    return res.status(500).json({ status: 'error', error: err.message, stderr: err.stderr, stdout: err.stdout });
  }
});

// GET /control-afix/cli/by-dni?dni=XXXXXXXXX
router.get('/cli/by-dni', async (req, res) => {
  console.log('Se solicitó la ruta: /control-afix/cli/by-dni', req.query);
  try {
    const { dni } = req.query;
    if (!dni) return res.status(400).json({ status: 'error', error: 'dni requerido' });
    const { rows } = await Afix.getClienteByDni(dni);
    return res.json({ status: 'ok', rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

// GET /control-afix/cli/search?text=CRISTALERIA*
router.get('/cli/search', async (req, res) => {
  console.log('Se solicitó la ruta: /control-afix/cli/search', req.query);
  try {
    const { text } = req.query;
    if (!text) return res.status(400).json({ status: 'error', error: 'text requerido' });
    const { rows } = await Afix.searchClientesByRazonSocial(text);
    return res.json({ status: 'ok', count: rows.length, rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
});


// === Consola SQL SOLO-LECTURA (Informix SE) ===
// POST /control-afix/sql
// Body JSON: { "sql": "select ...", "first": 200 }
// Opcional: ?raw=1 para devolver líneas tal cual del UNLOAD
app.post('/control-afix/sql', async (req, res) => {
  try {
    const sqlIn = String((req.body && req.body.sql) || '').trim();
    const firstIn = Number.isFinite(+req.body?.first) ? Math.max(1, Math.min(5000, +req.body.first)) : 200;
    const rawMode = String(req.query.raw || '') === '1';

    // 1) Validaciones duras (solo SELECT; un statement; sin ; intermedios)
    if (!sqlIn) return res.status(400).json({ ok: false, error: 'sql requerido' });

    // Prohibidos (escritura / sistema / trucos)
    const banned = /\b(update|insert|delete|create|alter|drop|truncate|grant|revoke|load|unload|system|execute|call|database|start|stop)\b/i;
    if (banned.test(sqlIn)) {
      return res.status(400).json({ ok: false, error: 'solo se permite SELECT (instrucción bloqueada)' });
    }

    // Debe empezar por SELECT (permite espacios/comentarios iniciales simples)
    const startsWithSelect = /^\s*select\b/i.test(sqlIn);
    if (!startsWithSelect) {
      return res.status(400).json({ ok: false, error: 'solo se permite SELECT' });
    }

    // Un único statement: no permitimos múltiples ';'
    const innerSemicolons = /;.+/s.test(sqlIn.replace(/;+$/,''));
    if (innerSemicolons) {
      return res.status(400).json({ ok: false, error: 'no se permiten múltiples statements' });
    }

    // 2) Inyectar FIRST si no lo trae (Informix SE no tiene LIMIT)
    let sql = sqlIn.replace(/;+$/,''); // quita ; final si viene
    const hasFirst = /^\s*select\s+first\s+\d+\b/i.test(sql);
    if (!hasFirst) {
      // INSERTA FIRST N tras SELECT
      sql = sql.replace(/^\s*select\b/i, m => `${m} first ${firstIn}`);
    }

    // 3) Ejecutar
    const raw = await runAfixSelect(sql);

    // 4) Parseo simple del UNLOAD (sin cabeceras)
    const lines = raw
      .split('\n')
      .map(s => s.trim())
      .filter(s => s && !/^Database (selected|closed)\./i.test(s) && !/row\(s\) unloaded/i.test(s));

    if (rawMode) {
      return res.json({ ok: true, rows_text: lines, count: lines.length });
    }

    // Devuelve array de arrays; cada fila -> columnas separadas por '|'
    const rows = lines.map(line => line.split('|'));
    return res.json({ ok: true, count: rows.length, rows });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});


module.exports = router;
