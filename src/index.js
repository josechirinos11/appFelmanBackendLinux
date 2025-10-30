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
const controlAfixLegacyRoutes = require('./routes/control-afix.js');

const path = require('path');
const rootPath = path.join(__dirname, '..');

const { spawn } = require('child_process');


//const controlAccessWindowsRoutes = require('./routes/controlAccessWindows.routes.js');

// AI21 eliminado — ya no se carga el módulo de consultaIA
const DatabaseMonitor = require('./monitoreos/database-monitor');









function runAfixSelect(sql) {
  // Ejecuta bajo bash -lc para poder "source ~/.afix_env.sh"
  const { spawn } = require('child_process');

  // Escapado mínimo para comillas simples en SQL
  const safeSql = String(sql).replace(/'/g, `'\\''`);

  // Comando: cargar entorno y ejecutar
  const bashCmd = `source ~/.afix_env.sh && /usr/local/bin/afix_select '${safeSql}'`;

  const child = spawn('/bin/bash', ['-lc', bashCmd], {
    env: process.env, // por si además defines variables en systemd/pm2
  });

  let out = '';
  let err = '';
  child.stdout.on('data', (c) => (out += c.toString('utf8')));
  child.stderr.on('data', (c) => (err += c.toString('utf8')));

  return new Promise((resolve, reject) => {
    child.on('close', (code) => {
      if (code !== 0) {
        // Muchos errores de Informix SE vienen por stdout; exponemos ambos
        const detail = (err || out || '').trim();
        return reject(new Error(detail || `afix_select exited with code ${code}`));
      }
      resolve(out);
    });
  });
}


















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


//app.use('/control-afix', controlAfixRoutes);
//app.use('/control-afix-legacy', controlAfixLegacyRoutes);
// === RUTA: buscar cliente por DNI/NIF/CIF exacto ===
// Ejemplo: GET /control-afix/cli/by-dni?dni=B46388690
app.get('/control-afix/cli/by-dni', async (req, res) => {
  try {
    const dni = (req.query.dni || '').trim();

    // Validación estricta (evita inyección por shell/SQL)
    if (!/^[A-Za-z0-9]+$/.test(dni)) {
      return res.status(400).json({ ok: false, error: 'dni inválido' });
    }

    // Selecciona columnas útiles y estables
    const sql = `
      select rowid, ras, dni, te1, e_mail
      from cli
      where dni = '${dni}'
    `;

    // 🔧 AHORA usamos el helper que ya definiste arriba
    const raw = await runAfixSelect(sql);

    // Limpieza del ruido típico de afix_select
    const lines = raw
      .split('\n')
      .map(s => s.trim())
      .filter(s =>
        s &&
        !/^Database (selected|closed)\./i.test(s) &&
        !/row\(s\) unloaded/i.test(s)
      );

    const data = lines.map(line => {
      const [rowid, ras, dniVal, te1, email] = line.split('|');
      return { rowid, ras, dni: dniVal, telefono: te1, email };
    });

    return res.json({ ok: true, count: data.length, data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: 'afix_select falló', detail: e.message });
  }
});


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