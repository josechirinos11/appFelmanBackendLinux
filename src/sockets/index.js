const OperadoresHandler = require('./operadores.handler');
const MaquinasHandler = require('./maquinas.handler');
const PedidosHandler = require('./pedidos.handler');
const { SocketIO } = require('./config');
// const TerminalesMonitor = require('./monitor/terminalesMonitor');

class SocketHandlers {
  constructor(socketIO) {
    this.socketIO = socketIO;
    this.operadores = new OperadoresHandler(socketIO);
    this.maquinas = new MaquinasHandler(socketIO);
    this.pedidos = new PedidosHandler(socketIO);
  // Iniciar monitor de terminales que emite por sockets
  // try {
  //   this.terminalesMonitor = new TerminalesMonitor(this);
  //   this.terminalesMonitor.start();
  // } catch (e) {
  //   console.error('❌ No se pudo iniciar TerminalesMonitor:', e.message || e);
  // }
  }

  // Método para obtener la instancia de io
  getIO() {
    return this.socketIO.getIO();
  }

  // Método para obtener las salas activas
  getActiveRooms() {
    return this.socketIO.getActiveRooms();
  }
}

module.exports = SocketHandlers;
