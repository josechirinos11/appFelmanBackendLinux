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
app.get('/control-afix/cli/by-dni', async (req, res) => {
  try {
    const dni = (req.query.dni || '').trim();

    // Validación estricta (evita inyección por shell/SQL)
    if (!/^[A-Za-z0-9]+$/.test(dni)) {
      return res.status(400).json({ ok: false, error: 'dni inválido' });
    }

    // Selecciona columnas útiles y estables
    const sql = `
      select rowid, ras, dni, te1, e_mail
      from cli
      where dni = '${dni}'
    `;

    // 🔧 AHORA usamos el helper que ya definiste arriba
    const raw = await runAfixSelect(sql);

    // Limpieza del ruido típico de afix_select
    const lines = raw
      .split('\n')
      .map(s => s.trim())
      .filter(s =>
        s &&
        !/^Database (selected|closed)\./i.test(s) &&
        !/row\(s\) unloaded/i.test(s)
      );

    const data = lines.map(line => {
      const [rowid, ras, dniVal, te1, email] = line.split('|');
      return { rowid, ras, dni: dniVal, telefono: te1, email };
    });

    return res.json({ ok: true, count: data.length, data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'afix_select falló', detail: e.message });
  }
});

// GET /control-afix/cli/search?text=CRISTALERIA*
app.get('/control-afix/cli/search', async (req, res) => {
  try {
    let text = (req.query.text || '').trim();

    // Validación: solo letras, números, espacios, .-_/ y comodines * ?
    if (!/^[A-Za-z0-9 \.\-_/*\?]+$/.test(text)) {
      return res.status(400).json({ ok: false, error: 'text inválido' });
    }

    // Normalizamos doble espacio y recortamos
    text = text.replace(/\s+/g, ' ').toUpperCase();

    // SQL: ras MATCHES 'PATRÓN' (usa * y ?)
    const sql = `
      select first 50 rowid, ras, dni, te1, e_mail
      from cli
      where upper(ras) matches '${text}'
      order by ras
    `;

    const raw = await runAfixSelect(sql);

    const lines = raw
      .split('\n')
      .map(s => s.trim())
      .filter(s => s && !/^Database (selected|closed)\./i.test(s) && !/row\(s\) unloaded/i.test(s));

    const data = lines.map(line => {
      const [rowid, ras, dni, te1, email] = line.split('|');
      return { rowid, ras, dni, telefono: te1, email };
    });

    return res.json({ ok: true, count: data.length, data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'afix_select falló', detail: e.message });
  }
});




// === Consola SQL SOLO-LECTURA (Informix SE) ===
// POST /control-afix/sql
// Body JSON: { "sql": "select ...", "first": 200 }
// Opcional: ?raw=1 para devolver líneas tal cual del UNLOAD
router.post('/sql', async (req, res) => {
  try {
    const sqlIn = String((req.body && req.body.sql) || '').trim();
    const firstIn = Number.isFinite(+req.body?.first) ? Math.max(1, Math.min(5000, +req.body.first)) : 200;
    const rawMode = String(req.query.raw || '') === '1';

    if (!sqlIn) return res.status(400).json({ ok: false, error: 'sql requerido' });

    // Solo SELECT; bloquea cosas peligrosas
    const banned = /\b(update|insert|delete|create|alter|drop|truncate|grant|revoke|load|unload|system|execute|call|database|start|stop)\b/i;
    if (banned.test(sqlIn)) return res.status(400).json({ ok: false, error: 'solo se permite SELECT (bloqueado)' });
    if (!/^\s*select\b/i.test(sqlIn)) return res.status(400).json({ ok: false, error: 'solo se permite SELECT' });

    // Un solo statement
    if (/;.+/s.test(sqlIn.replace(/;+$/,''))) {
      return res.status(400).json({ ok: false, error: 'no se permiten múltiples statements' });
    }

    // Inyecta FIRST si no viene (Informix SE no tiene LIMIT)
    let sql = sqlIn.replace(/;+$/,'');
    if (!/^\s*select\s+first\s+\d+\b/i.test(sql)) {
      sql = sql.replace(/^\s*select\b/i, m => `${m} first ${firstIn}`);
    }

    const raw = await Afix.queryRawSelect(sql); // << método del service
    const lines = raw
      .split('\n')
      .map(s => s.trim())
      .filter(s => s && !/^Database (selected|closed)\./i.test(s) && !/row\(s\) unloaded/i.test(s));

    if (rawMode) return res.json({ ok: true, count: lines.length, rows_text: lines });

    const rows = lines.map(line => line.split('|'));
    return res.json({ ok: true, count: rows.length, rows });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});




module.exports = router;
