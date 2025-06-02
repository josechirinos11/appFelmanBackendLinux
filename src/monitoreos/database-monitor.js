require('dotenv').config();
const pool = require('../config/database');

class DatabaseMonitor {
  constructor() {
    this.lastChecks = {
      fpresupuestoslineas: null,
      fpresupuestos: null
    };
    this.isRunning = false;
    this.intervalId = null;
  }

  async getLastRecords(tableName, limit = 10) {
    try {
      const query = `
        SELECT * FROM z_felman2023.${tableName} 
        ORDER BY ${tableName === 'fpresupuestoslineas' ? 'CodigoPresupNumero' : 'Numero'} DESC 
        LIMIT ?
      `;
      const [rows] = await pool.execute(query, [limit]);
      return rows;
    } catch (error) {
      console.error(`❌ Error al consultar tabla ${tableName}:`, error.message);
      return [];
    }
  }

  async checkForNewRecords(tableName) {
    try {
      const currentRecords = await this.getLastRecords(tableName, 5);
      
      if (!this.lastChecks[tableName]) {
        // Primera ejecución, guardar estado inicial
        this.lastChecks[tableName] = currentRecords;
        console.log(`🔄 Monitoreo iniciado para tabla ${tableName} - ${currentRecords.length} registros encontrados`);
        return [];
      }

      // Obtener IDs de los registros anteriores
      const lastIds = this.lastChecks[tableName].map(record => 
        tableName === 'fpresupuestoslineas' ? record.CodigoPresupNumero : record.Numero
      );

      // Filtrar registros nuevos
      const newRecords = currentRecords.filter(record => {
        const currentId = tableName === 'fpresupuestoslineas' ? record.CodigoPresupNumero : record.Numero;
        return !lastIds.includes(currentId);
      });

      // Actualizar estado
      this.lastChecks[tableName] = currentRecords;

      return newRecords;
    } catch (error) {
      console.error(`❌ Error monitoreando tabla ${tableName}:`, error.message);
      return [];
    }
  }

  formatRecord(record, tableName) {
    if (tableName === 'fpresupuestoslineas') {
      return {
        Presupuesto: `${record.CodigoPresupSerie}/${record.CodigoPresupNumero}`,
        Linea: record.Linea || 'N/A',
        Articulo: record.CodigoArticulo || 'N/A',
        Cantidad: record.Cantidad || 0,
        Precio: record.Precio || 0
      };
    } else { // fpresupuestos
      return {
        Numero: record.Numero,
        Serie: record.Serie || 'N/A',
        Cliente: record.CodigoCliente || 'N/A',
        Fecha: record.Fecha || 'N/A',
        Total: record.Total || 0
      };
    }
  }

  async monitorTables() {
    const timestamp = new Date().toLocaleString('es-ES', { 
      timeZone: 'America/Caracas',
      hour12: false 
    });

    console.log(`\n🔍 [${timestamp}] Monitoreando base de datos...`);

    // Monitorear fpresupuestoslineas
    const newLineas = await this.checkForNewRecords('fpresupuestoslineas');
    if (newLineas.length > 0) {
      console.log(`\n🆕 NUEVOS REGISTROS en fpresupuestoslineas (${newLineas.length}):`);
      newLineas.forEach((record, index) => {
        const formatted = this.formatRecord(record, 'fpresupuestoslineas');
        console.log(`   ${index + 1}. Presupuesto: ${formatted.Presupuesto} | Artículo: ${formatted.Articulo} | Cantidad: ${formatted.Cantidad} | Precio: ${formatted.Precio}`);
      });
    }

    // Monitorear fpresupuestos
    const newPresupuestos = await this.checkForNewRecords('fpresupuestos');
    if (newPresupuestos.length > 0) {
      console.log(`\n🆕 NUEVOS REGISTROS en fpresupuestos (${newPresupuestos.length}):`);
      newPresupuestos.forEach((record, index) => {
        const formatted = this.formatRecord(record, 'fpresupuestos');
        console.log(`   ${index + 1}. Presupuesto: ${formatted.Serie}/${formatted.Numero} | Cliente: ${formatted.Cliente} | Fecha: ${formatted.Fecha} | Total: ${formatted.Total}`);
      });
    }

    if (newLineas.length === 0 && newPresupuestos.length === 0) {
      console.log(`   ✅ Sin cambios detectados`);
    }
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️  El monitoreo ya está en ejecución');
      return;
    }

    console.log('🚀 Iniciando monitoreo de base de datos cada 5 segundos...');
    console.log('📊 Tablas monitoreadas: fpresupuestoslineas, fpresupuestos');
    console.log('🔄 Para detener el monitoreo, presiona Ctrl+C\n');

    this.isRunning = true;
    
    // Ejecutar inmediatamente
    this.monitorTables();
    
    // Programar ejecuciones cada 5 segundos
    this.intervalId = setInterval(() => {
      this.monitorTables();
    }, 5000);
  }

  stop() {
    if (!this.isRunning) {
      console.log('⚠️  El monitoreo no está en ejecución');
      return;
    }

    console.log('\n🛑 Deteniendo monitoreo de base de datos...');
    clearInterval(this.intervalId);
    this.isRunning = false;
    this.intervalId = null;
    console.log('✅ Monitoreo detenido');
  }

  async testConnection() {
    try {
      console.log('🔌 Probando conexión a la base de datos...');
      
      const [lineasCount] = await pool.execute('SELECT COUNT(*) as count FROM z_felman2023.fpresupuestoslineas');
      const [presupuestosCount] = await pool.execute('SELECT COUNT(*) as count FROM z_felman2023.fpresupuestos');
      
      console.log('✅ Conexión exitosa:');
      console.log(`   📋 fpresupuestoslineas: ${lineasCount[0].count} registros`);
      console.log(`   📋 fpresupuestos: ${presupuestosCount[0].count} registros`);
      
      return true;
    } catch (error) {
      console.error('❌ Error de conexión:', error.message);
      return false;
    }
  }
}

module.exports = DatabaseMonitor;
