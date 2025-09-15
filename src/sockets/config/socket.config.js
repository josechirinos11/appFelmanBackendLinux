const socketIO = require('socket.io');

class SocketIO {
  constructor(server) {
    this.io = socketIO(server, {
      cors: {
        origin: '*', // En producción, especifica los orígenes permitidos
        methods: ['GET', 'POST']
      },
      // Opciones adicionales de configuración
      pingTimeout: 60000,
      pingInterval: 25000,
      transports: ['websocket', 'polling']
    });
    
    // Inicializar eventos
    this.initializeEvents();
  }

  initializeEvents() {
    this.io.on('connection', (socket) => {
      console.log('🔌 Nuevo cliente conectado:', socket.id);

      // Unirse a una sala específica
      socket.on('subscribe', (room) => {
        socket.join(room);
        console.log(`🔔 Cliente ${socket.id} se unió a la sala: ${room}`);
      });

      // Salir de una sala
      socket.on('unsubscribe', (room) => {
        socket.leave(room);
        console.log(`🚪 Cliente ${socket.id} salió de la sala: ${room}`);
      });

      // Manejar desconexión
      socket.on('disconnect', (reason) => {
        console.log(`❌ Cliente desconectado: ${socket.id} - Razón: ${reason}`);
      });

      // Manejar errores
      socket.on('error', (error) => {
        console.error('❌ Error en el socket:', error);
      });
    });
  }

  // Método para emitir eventos a una sala específica
  emitToRoom(room, event, data) {
    try {
      this.io.to(room).emit(event, data);
      console.log(`📤 Evento '${event}' emitido a la sala '${room}'`);
    } catch (error) {
      console.error(`❌ Error al emitir evento '${event}' a la sala '${room}':`, error);
    }
  }

  // Método para emitir a todos los clientes
  emitToAll(event, data) {
    try {
      this.io.emit(event, data);
      console.log(`📢 Evento '${event}' emitido a todos los clientes`);
    } catch (error) {
      console.error(`❌ Error al emitir evento '${event}' a todos los clientes:`, error);
    }
  }

  // Obtener instancia de io
  getIO() {
    return this.io;
  }

  // Obtener todas las salas activas
  getActiveRooms() {
    return this.io.sockets.adapter.rooms;
  }
}

module.exports = SocketIO;
