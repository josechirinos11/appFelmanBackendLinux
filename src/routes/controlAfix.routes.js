// src/routes/controlAfix.routes.js
const express = require('express');
const router = express.Router();
const Afix = require('../services/informix.service');

router.get('/ping', async (req, res) => {
  try {
    const r = await Afix.ping();
    res.json(r);
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

router.get('/cli/by-dni', async (req, res) => {
  const dni = (req.query.dni || '').trim();
  if (!/^[A-Za-z0-9]+$/.test(dni)) return res.status(400).json({ ok: false, error: 'dni inválido' });
  try {
    const { rows } = await Afix.getClienteByDni(dni);
    res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

router.get('/cli/search', async (req, res) => {
  const text = (req.query.text || '').trim();
  if (!text) return res.status(400).json({ ok: false, error: 'text requerido' });
  try {
    const { rows } = await Afix.searchClientesByRazonSocial(text);
    res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

router.post('/sql', async (req, res) => {
  try {
    const sqlIn = String(req.body?.sql || '').trim();
    const limitRows = Number(req.body?.first) || 1000;
    if (!/^\s*select\b/i.test(sqlIn)) return res.status(400).json({ ok: false, error: 'Solo SELECT' });

    const raw = await Afix.queryRawSelect(sqlIn);
    let lines = raw.split('\n').map(s => s.trim()).filter(s => s && !s.includes('unloaded'));
    if (lines.length > limitRows) lines = lines.slice(0, limitRows);

    res.json({ ok: true, count: lines.length, rows: lines.map(l => l.split('|')) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;