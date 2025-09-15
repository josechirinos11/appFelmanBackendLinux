class OperadoresHandler {
  constructor(socketIO) {
    this.socketIO = socketIO;
  }

  // Emitir cuando se actualiza un operador
  emitOperadorActualizado(operadorData) {
    this.socketIO.emitToRoom('operadores', 'operador:actualizado', operadorData);
  }

  // Emitir cuando se crea un nuevo operador
  emitNuevoOperador(operadorData) {
    this.socketIO.emitToRoom('operadores', 'operador:nuevo', operadorData);
  }

  // Emitir cuando se elimina un operador
  emitOperadorEliminado(operadorId) {
    this.socketIO.emitToRoom('operadores', 'operador:eliminado', { id: operadorId });
  }
}

module.exports = OperadoresHandler;
