class PedidosHandler {
  constructor(socketIO) {
    this.socketIO = socketIO;
  }

  // Emitir cuando se actualiza un pedido
  emitPedidoActualizado(pedidoData) {
    this.socketIO.emitToRoom('pedidos', 'pedido:actualizado', pedidoData);
  }

  // Emitir cuando se crea un nuevo pedido
  emitNuevoPedido(pedidoData) {
    this.socketIO.emitToRoom('pedidos', 'pedido:nuevo', pedidoData);
  }

  // Emitir cuando se elimina un pedido
  emitPedidoEliminado(pedidoId) {
    this.socketIO.emitToRoom('pedidos', 'pedido:eliminado', { id: pedidoId });
  }

  // Emitir cuando cambia el estado de un pedido
  emitEstadoPedido(pedidoId, estado) {
    this.socketIO.emitToRoom('pedidos', 'pedido:estado', {
      id: pedidoId,
      estado: estado
    });
  }

  // Emitir cuando se asigna un operador a un pedido
  emitOperadorAsignado(pedidoId, operadorId) {
    this.socketIO.emitToRoom('pedidos', 'pedido:operador-asignado', {
      pedidoId: pedidoId,
      operadorId: operadorId
    });
  }
}

module.exports = PedidosHandler;
