const express = require('express');
const router = express.Router();

// Estado rápido del sistema de sockets
router.get('/status', (req, res) => {
  try {
    const handlers = global.socketHandlers;
    const available = !!handlers;
    let rooms = null;
    if (available && handlers.getActiveRooms) {
      const adapterRooms = handlers.getActiveRooms();
      // adapterRooms puede ser un Map o un objeto; intentamos normalizar
      try {
        rooms = Array.from(adapterRooms.keys ? adapterRooms.keys() : Object.keys(adapterRooms));
      } catch (e) {
        rooms = null;
      }
    }
    return res.json({ ok: true, socketHandlers: available, rooms });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

// Emitir un nuevo pedido a la sala 'pedidos'
router.post('/emit-pedido-nuevo', (req, res) => {
  const payload = req.body && Object.keys(req.body).length ? req.body : { id: Date.now(), cliente: 'prueba', total: 0 };
  if (global.socketHandlers && global.socketHandlers.pedidos) {
    try {
      global.socketHandlers.pedidos.emitNuevoPedido(payload);
      return res.status(200).json({ ok: true, emitted: payload });
    } catch (err) {
      return res.status(500).json({ ok: false, error: String(err) });
    }
  }
  return res.status(500).json({ ok: false, error: 'socketHandlers.pedidos no disponible' });
});

// Emisión genérica a room/event: { room, event, data }
router.post('/emit', (req, res) => {
  const { room, event, data } = req.body || {};
  if (!room || !event) return res.status(400).json({ ok: false, error: 'Falta room o event en body' });

  if (global.socketHandlers && global.socketHandlers.getIO) {
    try {
      const io = global.socketHandlers.getIO();
      io.to(room).emit(event, data);
      return res.json({ ok: true, room, event });
    } catch (err) {
      return res.status(500).json({ ok: false, error: String(err) });
    }
  }

  return res.status(500).json({ ok: false, error: 'socketHandlers no disponible' });
});

module.exports = router;
