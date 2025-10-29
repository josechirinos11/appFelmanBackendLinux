// src/routes/controlAfix.routes.js
const express = require('express');
const router = express.Router();
const Afix = require('../services/informix.service');

// GET /control-afix/ping
router.get('/ping', async (req, res) => {
  try {
    const r = await Afix.ping();
    return res.json({ status: 'ok', data: r.out });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message, stderr: err.stderr, stdout: err.stdout });
  }
});

// GET /control-afix/cli/by-dni?dni=XXXXXXXXX
router.get('/cli/by-dni', async (req, res) => {
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
  try {
    const { text } = req.query;
    if (!text) return res.status(400).json({ status: 'error', error: 'text requerido' });
    const { rows } = await Afix.searchClientesByRazonSocial(text);
    return res.json({ status: 'ok', count: rows.length, rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

module.exports = router;
