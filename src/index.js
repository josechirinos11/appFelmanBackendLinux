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
  const { spawn } = require('child_process');
  const fs = require('fs');
  const path = require('path');

  // === ENTORNO INFORMIX (según ~/.afix_env.sh y lo que vimos) ===
  const envInformix = {
    INFORMIXDIR: '/home/ix730',
    INFORMIXSERVER: 'afix4_tcp', // << corregido
    DBPATH: '/home/af5/dat/afix4/dbs:/home/af5/dat/afix4/dbs.20250618:/home/ix730/etc', // << añadido
    DBTEMP: '/home/tmp',
    CLIENT_LOCALE: 'es_es.8859-1',
    DB_LOCALE: 'es_es.8859-1',
    DBDATE: 'DMY4/',
    INFORMIXCONTIME: '5',
    INFORMIXCONRETRY: '1',
    PATH: `${process.env.PATH || ''}:/home/ix730/bin:/home/ix730/lib`,
  };

  const dbaccessBin = fs.existsSync('/home/ix730/bin/dbaccess')
    ? '/home/ix730/bin/dbaccess'
    : '/usr/bin/dbaccess';

  // Logs de arranque
  console.log('[AFIX] cfg', {
    INFORMIXDIR: envInformix.INFORMIXDIR,
    INFORMIXSERVER: envInformix.INFORMIXSERVER,
    DBPATH: envInformix.DBPATH,
    dbaccessBin,
    dbaccessExists: fs.existsSync(dbaccessBin),
    sqlhosts: '/home/ix730/etc/sqlhosts',
    sqlhostsExists: fs.existsSync('/home/ix730/etc/sqlhosts'),
  });

  const DBNAME = 'apli01'; // SE resuelve vía DBPATH + INFORMIXSERVER

  // === Archivos temporales ===
  const pid = process.pid;
  const rnd = Math.random().toString(36).slice(2);
  const sqlFile = `/tmp/node_afix_${pid}_${rnd}.sql`;
  const outFile = `/tmp/node_afix_${pid}_${rnd}.out`;

  // Script SIN "database ...", como hacía afix_select
  const script = `
unload to '${outFile}' delimiter '|'
${String(sql).trim()}
;`.trim() + '\n';

  fs.writeFileSync(sqlFile, script, { encoding: 'utf8' });
  console.log('[AFIX] sqlFile written', { sqlFile, outFile, bytes: script.length });

  return new Promise((resolve, reject) => {
    const start = Date.now();
    let child;

    const killTimer = setTimeout(() => { try { child && child.kill('SIGKILL'); } catch {} }, 15000);

    // dbaccess -e apli01 /tmp/script.sql  (SE usa DBPATH + INFORMIXSERVER)
    child = spawn(dbaccessBin, ['-e', DBNAME, sqlFile], {
      env: { ...process.env, ...envInformix },
    });

    let out = '';
    let err = '';
    child.stdout.on('data', c => out += c.toString('utf8'));
    child.stderr.on('data', c => err += c.toString('utf8'));

    child.on('close', code => {
      clearTimeout(killTimer);

      let payload = '';
      let outFileSize = 0;
      try {
        if (fs.existsSync(outFile)) {
          const buf = fs.readFileSync(outFile);
          outFileSize = buf.length;
          payload = buf.toString('utf8');
        }
      } catch (_) {}

      // Limpieza
      try { fs.unlinkSync(sqlFile); } catch {}
      try { fs.unlinkSync(outFile); } catch {}

      console.log('[AFIX] dbaccess:close', {
        code, ms: Date.now() - start,
        stdout_len: out.length,
        stderr_len: err.length,
        outFileSize
      });

      if (code !== 0) {
        const detail = (err || out || '').trim();
        return reject(new Error(detail || `dbaccess exited with code ${code}`));
      }

      if (!payload) {
        const detail = (err || out || '').trim() || 'dbaccess ok pero sin datos';
        return reject(new Error(detail));
      }

      resolve(payload);
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


app.use('/control-afix', controlAfixRoutes);
//app.use('/control-afix-legacy', controlAfixLegacyRoutes);
// === RUTA: buscar cliente por DNI/NIF/CIF exacto ===
// ✅ AÑADE ESTA RUTA POST




//app.use('/control-access-windows', controlAccessWindowsRoutes);


// Rutas para AI21 Studio (solo si el módulo cargó correctamente)



// --- HEALTH: no toca Informix, responde inmediato







// Para rutas SPA (React Native Web)
// Servir archivos estáticos desde 'dist'
// ✅ Solo aquí colocas dist y SPA fallback
app.use('/', express.static(path.join(rootPath, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(rootPath, 'dist', 'index.html'));
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