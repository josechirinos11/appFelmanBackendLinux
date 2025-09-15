const socketIO = require('socket.io');
const logger = require('../../utils/logger');

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
      logger.info('🔌 Nuevo cliente conectado:', socket.id);

      // Unirse a una sala específica
      socket.on('subscribe', (room) => {
        socket.join(room);
        logger.info(`🔔 Cliente ${socket.id} se unió a la sala: ${room}`);
      });

      // Salir de una sala
      socket.on('unsubscribe', (room) => {
        socket.leave(room);
        logger.info(`🚪 Cliente ${socket.id} salió de la sala: ${room}`);
      });

      // Manejar desconexión
      socket.on('disconnect', (reason) => {
        logger.info(`❌ Cliente desconectado: ${socket.id} - Razón: ${reason}`);
      });

      // Manejar errores
      socket.on('error', (error) => {
        logger.error('❌ Error en el socket:', error);
      });
    });
  }

  // Método para emitir eventos a una sala específica
  emitToRoom(room, event, data) {
    try {
      this.io.to(room).emit(event, data);
      logger.info(`📤 Evento '${event}' emitido a la sala '${room}'`);
    } catch (error) {
      logger.error(`❌ Error al emitir evento '${event}' a la sala '${room}':`, error);
    }
  }

  // Método para emitir a todos los clientes
  emitToAll(event, data) {
    try {
      this.io.emit(event, data);
      logger.info(`📢 Evento '${event}' emitido a todos los clientes`);
    } catch (error) {
      logger.error(`❌ Error al emitir evento '${event}' a todos los clientes:`, error);
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
