require('dotenv').config();
const pool = require('../config/database');

class DatabaseMonitor {
  constructor() {
    // Monitoreo tabla presupuestospedidos
    this.lastPresupuestosPedidosNumeros = new Set(); // CodigoNumero de presupuestospedidos
    // Monitoreo tabla presupuestos (fpresupuestos)
    this.lastPresupuestosNumeros = new Set(); // Numero de presupuestos
    this.isRunning = false;
    this.intervalId = null;
    this.isInitialized = false;
  }

  // Helper function to escape SQL values
  escapeValue(value) {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'string') {
      return `'${value.replace(/'/g, "''")}'`;
    }
    return `'${value}'`;
  }
  // Métodos para tabla presupuestospedidos
  async getAllPresupuestosPedidosNumeros() {
    try {
      const query = `SELECT CodigoNumero FROM z_felman2023.presupuestospedidos ORDER BY CodigoNumero ASC`;
      const [rows] = await pool.query(query);
      return rows.map(row => row.CodigoNumero);
    } catch (error) {
      console.error(`❌ Error al consultar CodigoNumero de presupuestospedidos:`, error.message);
      return [];
    }
  }

  async getPresupuestoPedidoDetails(codigoNumero) {
    try {
      const query = `
        SELECT 
          CodigoNumero,
          Serie,
          Numero,
          ClienteNombre,
          NombreUsuario,
          FechaModificacion,
          FechaCreacion,
          FechaMod,
          ExpTerminalesFecha
        FROM z_felman2023.presupuestospedidos 
        WHERE CodigoNumero = ${this.escapeValue(codigoNumero)}
      `;
      const [rows] = await pool.query(query);
      return rows[0] || null;
    } catch (error) {
      console.error(`❌ Error al obtener detalles del presupuesto pedido ${codigoNumero}:`, error.message);
      return null;
    }
  }

  // Métodos para tabla fpresupuestos
  async getAllPresupuestosNumeros() {
    try {
      const query = `SELECT Numero FROM z_felman2023.fpresupuestos ORDER BY Numero ASC`;
      const [rows] = await pool.query(query);
      return rows.map(row => row.Numero);
    } catch (error) {
      console.error(`❌ Error al consultar Numero de fpresupuestos:`, error.message);
      return [];
    }
  }

  async getPresupuestoDetails(numero) {
    try {
      const query = `
        SELECT 
          Serie,
          Numero,
          PresupsOrigen,
          NumeroManual,
          ClienteNombre,
          NombreUsuario,
          FechaModificacion,
          FechaCreacion,
          FechaMod,
          ExpTerminalesFecha
        FROM z_felman2023.fpresupuestos 
        WHERE Numero = ${this.escapeValue(numero)}
      `;
      const [rows] = await pool.query(query);
      return rows[0] || null;
    } catch (error) {
      console.error(`❌ Error al obtener detalles del presupuesto ${numero}:`, error.message);
      return null;
    }
  }
  async initializeState() {
    console.log('🔄 Inicializando estado del monitoreo DUAL (2 TABLAS)...');
    
    // Inicializar estado para presupuestospedidos
    const allPresupuestosPedidosNumeros = await this.getAllPresupuestosPedidosNumeros();
    this.lastPresupuestosPedidosNumeros = new Set(allPresupuestosPedidosNumeros);
    
    // Inicializar estado para fpresupuestos  
    const allPresupuestosNumeros = await this.getAllPresupuestosNumeros();
    this.lastPresupuestosNumeros = new Set(allPresupuestosNumeros);
    
    this.isInitialized = true;
    
    console.log(`✅ Estado inicial guardado:`);
    console.log(`   📋 presupuestospedidos.CodigoNumero: ${allPresupuestosPedidosNumeros.length} valores`);
    console.log(`   📊 fpresupuestos.Numero: ${allPresupuestosNumeros.length} valores`);
    
    if (allPresupuestosPedidosNumeros.length > 0) {
      console.log(`   🔢 Rango presupuestospedidos: ${Math.min(...allPresupuestosPedidosNumeros)} - ${Math.max(...allPresupuestosPedidosNumeros)}`);
    }
    if (allPresupuestosNumeros.length > 0) {
      console.log(`   🔢 Rango fpresupuestos: ${Math.min(...allPresupuestosNumeros)} - ${Math.max(...allPresupuestosNumeros)}`);
    }
  }
  async checkForNewPresupuestos() {
    try {
      if (!this.isInitialized) {
        await this.initializeState();
        return { presupuestosPedidosUpdates: [], presupuestosUpdates: [] };
      }

      // Verificar cambios en presupuestospedidos.CodigoNumero
      const currentPresupuestosPedidosNumeros = await this.getAllPresupuestosPedidosNumeros();
      const currentPresupuestosPedidosSet = new Set(currentPresupuestosPedidosNumeros);
      const newPresupuestosPedidosNumeros = currentPresupuestosPedidosNumeros.filter(num => !this.lastPresupuestosPedidosNumeros.has(num));
      
      // Verificar cambios en fpresupuestos.Numero
      const currentPresupuestosNumeros = await this.getAllPresupuestosNumeros();
      const currentPresupuestosSet = new Set(currentPresupuestosNumeros);
      const newPresupuestosNumeros = currentPresupuestosNumeros.filter(num => !this.lastPresupuestosNumeros.has(num));
      
      // Actualizar estados
      this.lastPresupuestosPedidosNumeros = currentPresupuestosPedidosSet;
      this.lastPresupuestosNumeros = currentPresupuestosSet;
      
      const results = { presupuestosPedidosUpdates: [], presupuestosUpdates: [] };
      
      // Procesar nuevos números en presupuestospedidos
      if (newPresupuestosPedidosNumeros.length > 0) {
        console.log(`\n📋 DETECTADOS ${newPresupuestosPedidosNumeros.length} NUEVOS CÓDIGOS EN PRESUPUESTOSPEDIDOS:`);
        console.log(`   📝 Códigos nuevos: ${newPresupuestosPedidosNumeros.join(', ')}`);
        
        for (const codigoNumero of newPresupuestosPedidosNumeros) {
          const details = await this.getPresupuestoPedidoDetails(codigoNumero);
          if (details) {
            results.presupuestosPedidosUpdates.push({ ...details, updateType: 'PRESUPUESTOS_PEDIDOS' });
          }
        }
      }
      
      // Procesar nuevos números en fpresupuestos
      if (newPresupuestosNumeros.length > 0) {
        console.log(`\n📊 DETECTADOS ${newPresupuestosNumeros.length} NUEVOS NÚMEROS EN FPRESUPUESTOS:`);
        console.log(`   📝 Números nuevos: ${newPresupuestosNumeros.join(', ')}`);
        
        for (const numero of newPresupuestosNumeros) {
          const details = await this.getPresupuestoDetails(numero);
          if (details) {
            results.presupuestosUpdates.push({ ...details, updateType: 'FPRESUPUESTOS' });
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error(`❌ Error monitoreando presupuestos:`, error.message);
      return { presupuestosPedidosUpdates: [], presupuestosUpdates: [] };
    }
  }
  formatPresupuestoDetails(presupuesto) {
    const formatDate = (date) => {
      return date ? 
        new Date(date).toLocaleString('es-ES', {
          timeZone: 'America/Caracas',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'null';
    };

    return {
      CodigoNumero: presupuesto.CodigoNumero || 'null',
      Serie: presupuesto.Serie || 'null',
      Numero: presupuesto.Numero || 'null',
      PresupsOrigen: presupuesto.PresupsOrigen || 'null',
      NumeroManual: presupuesto.NumeroManual || 'null',
      ClienteNombre: presupuesto.ClienteNombre || 'null',
      NombreUsuario: presupuesto.NombreUsuario || 'null',
      FechaModificacion: formatDate(presupuesto.FechaModificacion),
      FechaCreacion: formatDate(presupuesto.FechaCreacion),
      FechaMod: formatDate(presupuesto.FechaMod),
      ExpTerminalesFecha: formatDate(presupuesto.ExpTerminalesFecha),
      UpdateType: presupuesto.updateType || 'UNKNOWN'
    };
  }
  async monitorPresupuestos() {
    const timestamp = new Date().toLocaleString('es-ES', { 
      timeZone: 'America/Caracas',
      hour12: false 
    });

    console.log(`\n🔍 [${timestamp}] Monitoreando cambios en presupuestos (DUAL: 2 TABLAS)...`);

    const results = await this.checkForNewPresupuestos();
    const totalUpdates = results.presupuestosPedidosUpdates.length + results.presupuestosUpdates.length;
    
    if (totalUpdates > 0) {
      console.log(`\n🎉 CAMBIOS DETECTADOS (${totalUpdates} actualizaciones):`);
      console.log('═'.repeat(100));
      
      // Mostrar actualizaciones de presupuestospedidos (si las hay)
      if (results.presupuestosPedidosUpdates.length > 0) {
        console.log(`\n📋 ACTUALIZACIONES EN PRESUPUESTOSPEDIDOS (${results.presupuestosPedidosUpdates.length}):`);
        results.presupuestosPedidosUpdates.forEach((presupuesto, index) => {
          const formatted = this.formatPresupuestoDetails(presupuesto);
          console.log(`\n   📋 ${index + 1}. NUEVO CÓDIGO EN PRESUPUESTOSPEDIDOS:`);
          console.log(`      🔢 Código Número: ${formatted.CodigoNumero}`);
          console.log(`      🏷️  Serie: ${formatted.Serie}`);
          console.log(`      📊 Número: ${formatted.Numero}`);
          console.log(`      👤 Cliente: ${formatted.ClienteNombre}`);
          console.log(`      👨‍💼 Usuario: ${formatted.NombreUsuario}`);
          console.log(`      📅 Fecha Modificación: ${formatted.FechaModificacion}`);
          console.log(`      🗓️  Fecha Creación: ${formatted.FechaCreacion}`);
          console.log(`      📆 Fecha Mod: ${formatted.FechaMod}`);
          console.log(`      ⏰ Exp Terminales Fecha: ${formatted.ExpTerminalesFecha}`);
          console.log(`      🔍 Tipo de Actualización: ${formatted.UpdateType}`);
        });
      }
      
      // Mostrar actualizaciones de fpresupuestos (si las hay)
      if (results.presupuestosUpdates.length > 0) {
        console.log(`\n📊 ACTUALIZACIONES EN FPRESUPUESTOS (${results.presupuestosUpdates.length}):`);
        results.presupuestosUpdates.forEach((presupuesto, index) => {
          const formatted = this.formatPresupuestoDetails(presupuesto);
          console.log(`\n   📋 ${index + 1}. NUEVO NÚMERO EN FPRESUPUESTOS:`);
          console.log(`      🏷️  Serie: ${formatted.Serie}`);
          console.log(`      🔢 Número: ${formatted.Numero}`);
          console.log(`      📊 Presupuesto Origen: ${formatted.PresupsOrigen}`);
          console.log(`      📝 Número Manual: ${formatted.NumeroManual}`);
          console.log(`      👤 Cliente: ${formatted.ClienteNombre}`);
          console.log(`      👨‍💼 Usuario: ${formatted.NombreUsuario}`);
          console.log(`      📅 Fecha Modificación: ${formatted.FechaModificacion}`);
          console.log(`      🗓️  Fecha Creación: ${formatted.FechaCreacion}`);
          console.log(`      📆 Fecha Mod: ${formatted.FechaMod}`);
          console.log(`      ⏰ Exp Terminales Fecha: ${formatted.ExpTerminalesFecha}`);
          console.log(`      🔍 Tipo de Actualización: ${formatted.UpdateType}`);
        });
      }
      
      // Análisis de prioridad - determinar qué tabla se actualiza primero
      const updateCounts = [
        { name: 'PRESUPUESTOSPEDIDOS', count: results.presupuestosPedidosUpdates.length },
        { name: 'FPRESUPUESTOS', count: results.presupuestosUpdates.length }
      ].filter(item => item.count > 0);
      
      if (updateCounts.length > 1) {
        console.log(`\n🏁 ANÁLISIS DE PRIORIDAD:`);
        console.log(`   ⚡ Se detectaron cambios en AMBAS TABLAS en este ciclo`);
        updateCounts.forEach(item => {
          console.log(`   📈 ${item.name}: ${item.count} cambios`);
        });
      } else if (updateCounts.length === 1) {
        console.log(`\n🏁 ANÁLISIS DE PRIORIDAD:`);
        console.log(`   🥇 Solo la tabla ${updateCounts[0].name} se actualizó en este ciclo`);
      }
        console.log('\n' + '═'.repeat(100));
    } else {
      console.log(`   ✅ Sin cambios detectados en las dos tablas monitoreadas`);
    }
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️  El monitoreo ya está en ejecución');
      return;
    }

    console.log('🚀 Iniciando monitoreo DUAL de presupuestos cada 5 segundos...');
    console.log('📊 Tablas monitoreadas: presupuestospedidos + fpresupuestos');
    console.log('🔢 Campos monitoreados: presupuestospedidos.CodigoNumero + fpresupuestos.Numero');
    console.log('🎯 Objetivo: Detectar qué tabla se actualiza primero');
    console.log('🔄 Para detener el monitoreo, presiona Ctrl+C\n');

    this.isRunning = true;
    
    // Ejecutar inmediatamente
    this.monitorPresupuestos();
    
    // Programar ejecuciones cada 5 segundos
    this.intervalId = setInterval(() => {
      this.monitorPresupuestos();
    }, 5000);
  }

  stop() {
    if (!this.isRunning) {
      console.log('⚠️  El monitoreo no está en ejecución');
      return;
    }

    console.log('\n🛑 Deteniendo monitoreo dual de presupuestos...');
    clearInterval(this.intervalId);
    this.isRunning = false;
    this.intervalId = null;
    this.isInitialized = false;
    this.lastPresupuestosPedidosNumeros.clear();
    this.lastPresupuestosNumeros.clear();
    console.log('✅ Monitoreo dual detenido');
  }

  async testConnection() {
    try {
      console.log('🔌 Probando conexión a la base de datos...');
      
      // Verificar tabla presupuestospedidos
      const [presupuestosPedidosCount] = await pool.query('SELECT COUNT(*) as count FROM z_felman2023.presupuestospedidos');
      
      // Verificar tabla fpresupuestos
      const [fpresupuestosCount] = await pool.query('SELECT COUNT(*) as count FROM z_felman2023.fpresupuestos');
      
      // Verificar columnas de presupuestospedidos
      const [presupuestosPedidosColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'z_felman2023' 
        AND TABLE_NAME = 'presupuestospedidos'
        AND COLUMN_NAME IN ('CodigoNumero', 'Serie', 'Numero', 'ClienteNombre', 'NombreUsuario', 'FechaModificacion', 'FechaCreacion', 'FechaMod', 'ExpTerminalesFecha')
      `);
      
      // Verificar columnas de fpresupuestos
      const [fpresupuestosColumns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'z_felman2023' 
        AND TABLE_NAME = 'fpresupuestos'
        AND COLUMN_NAME IN ('Serie', 'Numero', 'PresupsOrigen', 'NumeroManual', 'ClienteNombre', 'NombreUsuario', 'FechaModificacion', 'FechaCreacion', 'FechaMod', 'ExpTerminalesFecha')
      `);
      
      console.log('✅ Conexión exitosa a AMBAS TABLAS:');
      console.log(`   📋 presupuestospedidos: ${presupuestosPedidosCount[0].count} registros`);
      console.log(`   📊 fpresupuestos: ${fpresupuestosCount[0].count} registros`);
      console.log(`   📝 Columnas presupuestospedidos: ${presupuestosPedidosColumns.map(c => c.COLUMN_NAME).join(', ')}`);
      console.log(`   📝 Columnas fpresupuestos: ${fpresupuestosColumns.map(c => c.COLUMN_NAME).join(', ')}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error de conexión:', error.message);
      return false;
    }
  }
}

module.exports = DatabaseMonitor;
