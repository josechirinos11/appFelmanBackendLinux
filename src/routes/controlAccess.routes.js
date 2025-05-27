const express = require('express');
const ADODB = require('node-adodb');
const router = express.Router();

// Ajusta la ruta a tu archivo .accdb
//const connection = ADODB.open(
//  'Provider=Microsoft.ACE.OLEDB.12.0;Data Source=C:/ruta/controlPedidos.accdb;Persist Security Info=False;'
//);

// Ajusta la ruta a tu archivo .accdb (local o remoto)
// LOCAL: 'C:/ruta/controlPedidos.accdb'
// REMOTO (PC 192.168.1.81 compartido):
// '\\\\192.168.1.81\\DBShare\\controlPedidos.accdb'
const connection = ADODB.open(
  'Provider=Microsoft.ACE.OLEDB.12.0;Data Source="\\\\192.168.1.81\\DBShare\\controlPedidos.accdb";Persist Security Info=False;'
);



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