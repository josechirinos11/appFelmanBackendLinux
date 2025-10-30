// src/routes/control-afix.js
const express = require('express');
const router = express.Router();
const Afix = require('../models/Afix');

// GET /control-afix/healthz
router.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'control-afix', time: new Date().toISOString(), pid: process.pid });
});




// GET /control-afix/cli/search?text=CRISTALERIA* [&limit=50&offset=0]
router.get('/cli/search', async (req, res) => {
  try {
    const { text, limit = '50', offset = '0' } = req.query;
    if (!text) return res.status(400).json({ status: 'error', error: 'text requerido' });

    const rows = await Afix.searchClientesByRazonSocial(String(text), {
      limit: Number(limit),
      offset: Number(offset),
    });
    return res.json({ status: 'ok', count: rows.length, rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: String(err.message || err) });
  }
});

// GET /control-afix/cli/by-dni?dni=B46388690
router.get('/cli/by-dni', async (req, res) => {
  try {
    const { dni } = req.query;
    if (!dni) return res.status(400).json({ status: 'error', error: 'dni requerido' });

    const row = await Afix.getClienteByDni(String(dni));
    if (!row) return res.status(404).json({ status: 'not_found' });
    return res.json({ status: 'ok', row });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: String(err.message || err) });
  }
});

// GET /control-afix/cli/latest?limit=10&order=asc|desc
router.get('/cli/latest', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 10);
    const order = String(req.query.order || 'desc');
    const rows = await Afix.getLatestClientes(limit, order);
    return res.json({ status: 'ok', count: rows.length, rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: String(err.message || err) });
  }
});

// DEBUG: ver qué exporta el modelo en runtime
router.get('/__debug/afix-exports', (_req, res) => {
  try {
    const Afix = require('../models/Afix');
    res.json({ ok: true, keys: Object.keys(Afix) });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

module.exports = router;
