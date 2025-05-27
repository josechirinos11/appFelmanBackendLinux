// src/routes/controlAccess.routes.js
require('dotenv').config();
const express = require('express');

const router  = express.Router();

const PROXY = process.env.PROXY_URL;



router.get('/formularioControlPedido', async (req, res) => {
  try {
    const response = await fetch('http://192.168.1.81:3001/api/pedidos');
    const data = await response.json();
    res.json(data);
  } catch (err) {
   console.error('Error consumiendo el proxy:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
