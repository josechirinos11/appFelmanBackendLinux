const { io } = require('socket.io-client');
const socket = io('http://localhost:3000');
socket.on('connect', () => {
  console.log('connected', socket.id);
  socket.emit('subscribe', 'pedidos');
});
socket.on('pedido:nuevo', (data) => console.log('pedido:nuevo', data));