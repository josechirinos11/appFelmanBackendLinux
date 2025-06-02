const DatabaseMonitor = require('./database-monitor');

// Crear instancia del monitor
const monitor = new DatabaseMonitor();

// Función para manejar la salida del programa
function gracefulShutdown() {
  console.log('\n📝 Recibida señal de terminación...');
  monitor.stop();
  process.exit(0);
}

// Manejar señales de terminación
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Función principal
async function startMonitoring() {
  console.log('🔧 Sistema de Monitoreo de Base de Datos - Felman');
  console.log('================================================\n');

  // Probar conexión antes de iniciar
  const connectionOk = await monitor.testConnection();
  
  if (!connectionOk) {
    console.log('❌ No se pudo establecer conexión con la base de datos');
    console.log('🔧 Verifica la configuración en el archivo .env');
    process.exit(1);
  }

  console.log('\n⏱️  Iniciando en 3 segundos...');
  
  setTimeout(() => {
    monitor.start();
  }, 3000);
}

// Iniciar el monitoreo
startMonitoring().catch(error => {
  console.error('❌ Error fatal:', error.message);
  process.exit(1);
});
