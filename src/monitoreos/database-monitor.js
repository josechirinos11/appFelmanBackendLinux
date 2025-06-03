require('dotenv').config();
const pool = require('../config/database');

class DatabaseMonitor {
  constructor() {
    this.lastPresupuestoNumbers = new Set(); // Guardar números de presupuestos conocidos
    this.lastPresupsOrigen = new Set(); // Guardar valores de PresupsOrigen conocidos
    this.lastNumeroManual = new Set(); // Guardar valores de NumeroManual conocidos
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

  async getAllPresupuestoNumbers() {
    try {
      const query = `SELECT Numero FROM z_felman2023.fpresupuestos ORDER BY Numero ASC`;
      const [rows] = await pool.query(query);
      return rows.map(row => row.Numero);
    } catch (error) {
      console.error(`❌ Error al consultar números de presupuestos:`, error.message);      return [];
    }
  }

  async getAllPresupsOrigen() {
    try {
      const query = `SELECT DISTINCT PresupsOrigen FROM z_felman2023.fpresupuestos WHERE PresupsOrigen IS NOT NULL ORDER BY PresupsOrigen ASC`;
      const [rows] = await pool.query(query);
      return rows.map(row => row.PresupsOrigen);
    } catch (error) {
      console.error(`❌ Error al consultar valores de PresupsOrigen:`, error.message);
      return [];
    }
  }

  async getAllNumeroManual() {
    try {
      const query = `SELECT DISTINCT NumeroManual FROM z_felman2023.fpresupuestos WHERE NumeroManual IS NOT NULL ORDER BY NumeroManual ASC`;
      const [rows] = await pool.query(query);
      return rows.map(row => row.NumeroManual);
    } catch (error) {
      console.error(`❌ Error al consultar valores de NumeroManual:`, error.message);
      return [];    }
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
      return null;    }
  }

  async getPresupuestoDetailsByOrigen(presupsOrigen) {
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
        WHERE PresupsOrigen = ${this.escapeValue(presupsOrigen)}
        ORDER BY FechaModificacion DESC
        LIMIT 1
      `;
      const [rows] = await pool.query(query);
      return rows[0] || null;
    } catch (error) {
      console.error(`❌ Error al obtener detalles del presupuesto con origen ${presupsOrigen}:`, error.message);
      return null;
    }
  }

  async getPresupuestoDetailsByNumeroManual(numeroManual) {
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
        WHERE NumeroManual = ${this.escapeValue(numeroManual)}
        ORDER BY FechaModificacion DESC
        LIMIT 1
      `;
      const [rows] = await pool.query(query);
      return rows[0] || null;
    } catch (error) {
      console.error(`❌ Error al obtener detalles del presupuesto con NumeroManual ${numeroManual}:`, error.message);
      return null;
    }
  }

  async initializeState() {
    console.log('🔄 Inicializando estado del monitoreo TRIPLE...');
    
    const allNumbers = await this.getAllPresupuestoNumbers();
    const allPresupsOrigen = await this.getAllPresupsOrigen();
    const allNumeroManual = await this.getAllNumeroManual();
    
    this.lastPresupuestoNumbers = new Set(allNumbers);
    this.lastPresupsOrigen = new Set(allPresupsOrigen);
    this.lastNumeroManual = new Set(allNumeroManual);
    this.isInitialized = true;
    
    console.log(`✅ Estado inicial guardado:`);
    console.log(`   📊 Números de presupuestos: ${allNumbers.length} valores`);
    console.log(`   📋 Valores de PresupsOrigen: ${allPresupsOrigen.length} valores únicos`);
    console.log(`   📝 Valores de NumeroManual: ${allNumeroManual.length} valores únicos`);
    
    if (allNumbers.length > 0) {
      console.log(`   🔢 Rango de números: ${Math.min(...allNumbers)} - ${Math.max(...allNumbers)}`);
    }
  }

  async checkForNewPresupuestos() {
    try {
      if (!this.isInitialized) {
        await this.initializeState();
        return { numeroUpdates: [], origenUpdates: [], manualUpdates: [] };
      }

      // Verificar cambios en Numero
      const currentNumbers = await this.getAllPresupuestoNumbers();
      const currentNumbersSet = new Set(currentNumbers);
      const newNumbers = currentNumbers.filter(num => !this.lastPresupuestoNumbers.has(num));
      
      // Verificar cambios en PresupsOrigen
      const currentPresupsOrigen = await this.getAllPresupsOrigen();
      const currentPresupsOrigenSet = new Set(currentPresupsOrigen);
      const newPresupsOrigen = currentPresupsOrigen.filter(origen => !this.lastPresupsOrigen.has(origen));
      
      // Verificar cambios en NumeroManual
      const currentNumeroManual = await this.getAllNumeroManual();
      const currentNumeroManualSet = new Set(currentNumeroManual);
      const newNumeroManual = currentNumeroManual.filter(manual => !this.lastNumeroManual.has(manual));
      
      // Actualizar estados
      this.lastPresupuestoNumbers = currentNumbersSet;
      this.lastPresupsOrigen = currentPresupsOrigenSet;
      this.lastNumeroManual = currentNumeroManualSet;
      
      const results = { numeroUpdates: [], origenUpdates: [], manualUpdates: [] };
      
      // Procesar nuevos números
      if (newNumbers.length > 0) {
        console.log(`\n🔢 DETECTADOS ${newNumbers.length} NUEVOS NÚMEROS:`);
        console.log(`   📝 Números nuevos: ${newNumbers.join(', ')}`);
        
        for (const numero of newNumbers) {
          const details = await this.getPresupuestoDetails(numero);
          if (details) {
            results.numeroUpdates.push({ ...details, updateType: 'NUMERO' });
          }
        }
      }
      
      // Procesar nuevos valores de PresupsOrigen
      if (newPresupsOrigen.length > 0) {
        console.log(`\n📊 DETECTADOS ${newPresupsOrigen.length} NUEVOS VALORES DE PRESUPS ORIGEN:`);
        console.log(`   📝 Valores nuevos: ${newPresupsOrigen.join(', ')}`);
        
        for (const origen of newPresupsOrigen) {
          const details = await this.getPresupuestoDetailsByOrigen(origen);
          if (details) {
            results.origenUpdates.push({ ...details, updateType: 'PRESUPS_ORIGEN' });
          }
        }
      }
      
      // Procesar nuevos valores de NumeroManual
      if (newNumeroManual.length > 0) {
        console.log(`\n📝 DETECTADOS ${newNumeroManual.length} NUEVOS VALORES DE NUMERO MANUAL:`);
        console.log(`   📝 Valores nuevos: ${newNumeroManual.join(', ')}`);
        
        for (const manual of newNumeroManual) {
          const details = await this.getPresupuestoDetailsByNumeroManual(manual);
          if (details) {
            results.manualUpdates.push({ ...details, updateType: 'NUMERO_MANUAL' });
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error(`❌ Error monitoreando presupuestos:`, error.message);
      return { numeroUpdates: [], origenUpdates: [], manualUpdates: [] };
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

    console.log(`\n🔍 [${timestamp}] Monitoreando cambios en presupuestos (TRIPLE: Numero + PresupsOrigen + NumeroManual)...`);

    const results = await this.checkForNewPresupuestos();
    const totalUpdates = results.numeroUpdates.length + results.origenUpdates.length + results.manualUpdates.length;
    
    if (totalUpdates > 0) {
      console.log(`\n🎉 CAMBIOS DETECTADOS (${totalUpdates} actualizaciones):`);
      console.log('═'.repeat(100));
      
      // Mostrar actualizaciones de Número (si las hay)
      if (results.numeroUpdates.length > 0) {
        console.log(`\n🔢 ACTUALIZACIONES POR NÚMERO (${results.numeroUpdates.length}):`);
        results.numeroUpdates.forEach((presupuesto, index) => {
          const formatted = this.formatPresupuestoDetails(presupuesto);
          console.log(`\n   📋 ${index + 1}. NUEVO NÚMERO DETECTADO:`);
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
      
      // Mostrar actualizaciones de PresupsOrigen (si las hay)
      if (results.origenUpdates.length > 0) {
        console.log(`\n📊 ACTUALIZACIONES POR PRESUPS ORIGEN (${results.origenUpdates.length}):`);
        results.origenUpdates.forEach((presupuesto, index) => {
          const formatted = this.formatPresupuestoDetails(presupuesto);
          console.log(`\n   📋 ${index + 1}. NUEVO PRESUPS ORIGEN DETECTADO:`);
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
      
      // Mostrar actualizaciones de NumeroManual (si las hay)
      if (results.manualUpdates.length > 0) {
        console.log(`\n📝 ACTUALIZACIONES POR NUMERO MANUAL (${results.manualUpdates.length}):`);
        results.manualUpdates.forEach((presupuesto, index) => {
          const formatted = this.formatPresupuestoDetails(presupuesto);
          console.log(`\n   📋 ${index + 1}. NUEVO NUMERO MANUAL DETECTADO:`);
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
      
      // Análisis de prioridad - determinar qué columna se actualiza primero
      const updateCounts = [
        { name: 'NÚMERO', count: results.numeroUpdates.length },
        { name: 'PRESUPS ORIGEN', count: results.origenUpdates.length },
        { name: 'NUMERO MANUAL', count: results.manualUpdates.length }
      ].filter(item => item.count > 0);
      
      if (updateCounts.length > 1) {
        console.log(`\n🏁 ANÁLISIS DE PRIORIDAD:`);
        console.log(`   ⚡ Se detectaron cambios en MÚLTIPLES columnas en este ciclo`);
        updateCounts.forEach(item => {
          console.log(`   📈 ${item.name}: ${item.count} cambios`);
        });
      } else if (updateCounts.length === 1) {
        console.log(`\n🏁 ANÁLISIS DE PRIORIDAD:`);
        console.log(`   🥇 Solo la columna ${updateCounts[0].name} se actualizó en este ciclo`);
      }
      
      console.log('\n' + '═'.repeat(100));
    } else {
      console.log(`   ✅ Sin cambios detectados en las tres columnas monitoreadas`);
    }  }

  start() {
    if (this.isRunning) {
      console.log('⚠️  El monitoreo ya está en ejecución');
      return;
    }

    console.log('🚀 Iniciando monitoreo TRIPLE de presupuestos cada 5 segundos...');
    console.log('📊 Tabla monitoreada: fpresupuestos');
    console.log('🔢 Columnas monitoreadas: Numero + PresupsOrigen + NumeroManual');
    console.log('🎯 Objetivo: Detectar cuál columna se actualiza primero');
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

    console.log('\n🛑 Deteniendo monitoreo triple de presupuestos...');
    clearInterval(this.intervalId);
    this.isRunning = false;
    this.intervalId = null;
    this.isInitialized = false;
    this.lastPresupuestoNumbers.clear();
    this.lastPresupsOrigen.clear();
    this.lastNumeroManual.clear();
    console.log('✅ Monitoreo triple detenido');
  }
  async testConnection() {
    try {
      console.log('🔌 Probando conexión a la base de datos...');
      const [presupuestosCount] = await pool.query('SELECT COUNT(*) as count FROM z_felman2023.fpresupuestos');
      
      // Verificar que existan las columnas necesarias
      const [columns] = await pool.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'z_felman2023' 
        AND TABLE_NAME = 'fpresupuestos'
        AND COLUMN_NAME IN ('Serie', 'Numero', 'PresupsOrigen', 'NumeroManual', 'ClienteNombre', 'NombreUsuario', 'FechaModificacion', 'FechaCreacion', 'FechaMod', 'ExpTerminalesFecha')
      `);
      
      console.log('✅ Conexión exitosa:');
      console.log(`   📋 fpresupuestos: ${presupuestosCount[0].count} registros`);
      console.log(`   📝 Columnas disponibles: ${columns.map(c => c.COLUMN_NAME).join(', ')}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error de conexión:', error.message);
      return false;
    }
  }
}

module.exports = DatabaseMonitor;
