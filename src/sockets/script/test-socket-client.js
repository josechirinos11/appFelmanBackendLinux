const { io } = require('socket.io-client');
const socket = io('http://localhost:3000');
const logger = require('../../utils/logger');
socket.on('connect', () => {
  logger.info('connected', socket.id);
  socket.emit('subscribe', 'pedidos');
});
socket.on('pedido:nuevo', (data) => logger.info('pedido:nuevo', data));