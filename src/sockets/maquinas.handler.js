class MaquinasHandler {
  constructor(socketIO) {
    this.socketIO = socketIO;
  }

  // Emitir cuando se actualiza una máquina
  emitMaquinaActualizada(maquinaData) {
    this.socketIO.emitToRoom('maquinas', 'maquina:actualizada', maquinaData);
  }

  // Emitir cuando se crea una nueva máquina
  emitNuevaMaquina(maquinaData) {
    this.socketIO.emitToRoom('maquinas', 'maquina:nueva', maquinaData);
  }

  // Emitir cuando se elimina una máquina
  emitMaquinaEliminada(maquinaId) {
    this.socketIO.emitToRoom('maquinas', 'maquina:eliminada', { id: maquinaId });
  }

  // Emitir cuando cambia el estado de una máquina
  emitEstadoMaquina(maquinaId, estado) {
    this.socketIO.emitToRoom('maquinas', 'maquina:estado', {
      id: maquinaId,
      estado: estado
    });
  }
}

module.exports = MaquinasHandler;
