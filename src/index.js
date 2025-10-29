require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const { errors } = require('celebrate');
const authRoutes = require('./routes/auth.routes');
const errorHandler = require('./middleware/errorHandler');
const testRouter = require('./routes/test.router');
const webhookRoutes = require('./routes/webhook.routes');
const SocketIO = require('./sockets/config/socket.config');

const controlPedidoRoutes = require('./routes/controlPedido.routes.js');
const socketRoutes = require('./sockets/routes/socket.routes');
const controlAccessRoutes = require('./routes/controlAccess.routes.js');
const controlTerminalesRoutes = require('./routes/controlTerminalesModificado.router');
const controlAlmacenRoutes= require('./routes/controlAlmacen.router.js');
const controlOptimaRoutes= require('./routes/controlOptima.routes.js');

const controlAfixRoutes = require('./routes/controlAfix.routes.js');

const path = require('path');
const rootPath = path.join(__dirname, '..');


//const controlAccessWindowsRoutes = require('./routes/controlAccessWindows.routes.js');

// AI21 eliminado — ya no se carga el módulo de consultaIA
const DatabaseMonitor = require('./monitoreos/database-monitor');

const app = express();



//INICIACION MODULO WEDSOCKET
 const server = http.createServer(app);
// // Inicializar Socket.IO
// const socketIO = new SocketIO(server);
// // Inicializar manejadores de eventos
// const SocketHandlers = require('./sockets');
// const socketHandlers = new SocketHandlers(socketIO);
// global.socketHandlers = socketHandlers; // Hacer accesible en toda la aplicación
//FIN INICIACION MODULO WEDSOCKET





// Rutas para monitoreo y pruebas de Socket.IO (separadas en src/sockets/routes)
app.use('/sockets', socketRoutes);
// Middleware
// ① Habilita CORS para que tu app nativa pueda llamar al API
app.use(cors({
  origin: '*'            // en producción define aquí el dominio de tu app
}));

app.use(express.json());


// Rutas

app.use('/webhook', webhookRoutes);// Rutas para el webhook
app.use('/test', testRouter);
app.use('/auth', authRoutes);

app.use('/control-pedido', controlPedidoRoutes);
app.use('/control-access', controlAccessRoutes);
app.use('/control-terminales', controlTerminalesRoutes); // Agrega esta línea
app.use('/control-almacen', controlAlmacenRoutes);
app.use('/control-optima', controlOptimaRoutes);


app.use('/control-afix', controlAfixRoutes);
//app.use('/control-access-windows', controlAccessWindowsRoutes);


// Rutas para AI21 Studio (solo si el módulo cargó correctamente)





// Para rutas SPA (React Native Web)
// Servir archivos estáticos desde 'dist'
// ✅ Solo aquí colocas dist y SPA fallback
app.use('/', express.static(path.join(rootPath, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(rootPath, 'dist', 'index.html'));
});


// --- HEALTH: no toca Informix, responde inmediato
app.get('/control-afix/healthz', (req, res) => {
  res.json({
    ok: true,
    service: 'control-afix',
    time: new Date().toISOString(),
    pid: process.pid
  });
});





// Manejo de errores
app.use(errors());
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0'; // Permite conexiones desde cualquier IP

// Inicializar el monitor de base de datos
const dbMonitor = new DatabaseMonitor();

// Usar server.listen en lugar de app.listen para soportar WebSockets
server.listen(PORT, HOST, async () => {
  console.log('🚀 Versión desplegada: 6 de agosto - 15:00');

  console.log(`Servidor corriendo en puerto ${PORT}`);
  
  // Iniciar el monitoreo de base de datos después de 3 segundos
  console.log('\n🔧 Iniciando sistema de monitoreo de base de datos...');
  
  setTimeout(async () => {
    const connectionOk = await dbMonitor.testConnection();
    
    if (connectionOk) {
      console.log('✅ Monitoreo de base de datos iniciado correctamente');
      dbMonitor.start();
    } else {
      console.log('⚠️  No se pudo iniciar el monitoreo de base de datos');
      console.log('🔧 Verifica la configuración de la base de datos');
    }
  }, 3000);
});

// Manejar el cierre del servidor para detener el monitoreo
process.on('SIGINT', () => {
  console.log('\n📝 Cerrando servidor...');
  dbMonitor.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n📝 Cerrando servidor...');
  dbMonitor.stop();
  process.exit(0);
});