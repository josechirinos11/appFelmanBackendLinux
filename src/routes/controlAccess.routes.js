// src/routes/controlAccess.routes.js
require('dotenv').config();
const fetch = require('node-fetch');
const express = require('express');

const router  = express.Router();

const PROXY = process.env.PROXY_URL;


router.get('/pedidos', async (req, res) => {
  try {
    const response = await fetch('http://192.168.1.81:3001/api/pedidos');
    const data = await response.json();
     console.log('Datos recibidos ACCESS pedidos');
    res.json(data);
  } catch (err) {
   console.error('Error consumiendo el proxy:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/ConsultaControlPedidoInicio', async (req, res) => {
  try {
    const response = await fetch('http://192.168.1.81:3001/api/controlPedidoInicio');
    const data = await response.json();
    console.log('Datos recibidos ACCESS ConsultaControlPedidoInicio');
    res.json(data);
  } catch (err) {
   console.error('Error consumiendo el proxy:', err);
    res.status(500).json({ error: err.message });
  }
});
router.get('/ConsultaControlPedidoInicio40Registro', async (req, res) => {
  try {
    const response = await fetch('http://192.168.1.81:3001/api/controlPedidoInicio40Registro');
    const data = await response.json();
    console.log('Datos recibidos ACCESS ConsultaControlPedidoInicio');
    res.json(data);
  } catch (err) {
   console.error('Error consumiendo el proxy:', err);
    res.status(500).json({ error: err.message });
  }
});


router.get('/controlEntregaDiaria', async (req, res) => {
  try {
    const response = await fetch('http://192.168.1.81:3001/api/controlEntregaDiariaA1DIA');
    const data = await response.json();
    console.log('Datos recibidos ACCESS controlEntregaDiariaaaaaaaaaaaaaaaaaaaaaaaa');
    res.json(data);
  } catch (err) {
   console.error('Error consumiendo el proxy:', err);
    res.status(500).json({ error: err.message });
  }
});


router.get('/incidencia', async (req, res) => {
  try {
    const response = await fetch('http://192.168.1.81:3001/api/incidencia');
    const data = await response.json();
    res.json(data);
  } catch (err) {
   console.error('Error consumiendo el proxy:', err);
    res.status(500).json({ error: err.message });
  }
});



router.get('/pedidosComerciales', async (req, res) => {
  try {
    const response = await fetch('http://192.168.1.81:3001/api/pedidosComerciales');
    const data = await response.json();
    console.log('Datos recibidos ACCESS pedidosComerciales');
    res.json(data);
  } catch (err) {
   console.error('Error consumiendo el proxy:', err);
    res.status(500).json({ error: err.message });
  }
});


router.get('/pedidosComercialesJeronimoN8N', async (req, res) => {
  try {
    const response = await fetch('http://192.168.1.81:3001/api/pedidosComercialesJeronimoN8N');
    const data = await response.json();
    console.log('Datos recibidos ACCESS pedidosComerciales');
    res.json(data);
  } catch (err) {
   console.error('Error consumiendo el proxy:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/pedidosComerciales40Registro', async (req, res) => {
  try {
    const response = await fetch('http://192.168.1.81:3001/api/pedidosComerciales40Registro');
    const data = await response.json();
    console.log('Datos recibidos ACCESS pedidosComerciales');
    res.json(data);
  } catch (err) {
   console.error('Error consumiendo el proxy:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
