require('dotenv').config();
const express = require('express');
const fetch   = require('node-fetch');
const router  = express.Router();

const PROXY = process.env.PROXY_URL;

// GET /control-access/formularioControlPedido
router.get('/formularioControlPedido', async (req, res) => {
  try {
    const sql = `SELECT
      [BPedidos]![Ejercicio] & '-' & [BPedidos]![Serie] & '-' & [BPedidos]![NPedido] AS NºPedido,
      AEstadosPedido.Estado AS EstadoPedido,
      BPedidos.Incidencia,
      BPedidos.FechaCompromiso AS Compromiso
    FROM BPedidos
    LEFT JOIN AEstadosPedido ON BPedidos.Id_EstadoPedido = AEstadosPedido.Id_EstadoPedido`; // ajusta joins si hay más tablas involucradas

    const resultados = await connection.query(sql);
    res.json(resultados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;