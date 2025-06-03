require('dotenv').config();
const pool = require('../config/database');

class DatabaseMonitor {
  constructor() {
    this.lastPresupuestoNumbers = new Set(); // Guardar números de presupuestos conocidos
    this.lastPresupsOrigen = new Set(); // Guardar valores de PresupsOrigen conocidos
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
  }async getAllPresupuestoNumbers() {
    try {
      const query = `SELECT Numero FROM z_felman2023.fpresupuestos ORDER BY Numero ASC`;
      const [rows] = await pool.query(query);
      return rows.map(row => row.Numero);
    } catch (error) {
      console.error(`❌ Error al consultar números de presupuestos:`, error.message);
      return [];
    }
  }  async getAllPresupsOrigen() {
    try {
      const query = `SELECT DISTINCT PresupsOrigen FROM z_felman2023.fpresupuestos WHERE PresupsOrigen IS NOT NULL ORDER BY PresupsOrigen ASC`;
      const [rows] = await pool.query(query);
      return rows.map(row => row.PresupsOrigen);
    } catch (error) {
      console.error(`❌ Error al consultar valores de PresupsOrigen:`, error.message);
      return [];
    }
  }  async getPresupuestoDetails(numero) {
    try {
      const query = `
        SELECT 
          Serie,
          Numero,
          PresupsOrigen,
          ClienteNombre,
          NombreUsuario,
          FechaModificacion
        FROM z_felman2023.fpresupuestos 
        WHERE Numero = ${this.escapeValue(numero)}
      `;
      const [rows] = await pool.query(query);
      return rows[0] || null;
    } catch (error) {
      console.error(`❌ Error al obtener detalles del presupuesto ${numero}:`, error.message);
      return null;
    }
  }  async getPresupuestoDetailsByOrigen(presupsOrigen) {
    try {
      const query = `
        SELECT 
          Serie,
          Numero,
          PresupsOrigen,
          ClienteNombre,
          NombreUsuario,
          FechaModificacion
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
  }async initializeState() {
    console.log('🔄 Inicializando estado del monitoreo dual...');
    
    const allNumbers = await this.getAllPresupuestoNumbers();
    const allPresupsOrigen = await this.getAllPresupsOrigen();
    
    this.lastPresupuestoNumbers = new Set(allNumbers);
    this.lastPresupsOrigen = new Set(allPresupsOrigen);
    this.isInitialized = true;
    
    console.log(`✅ Estado inicial guardado:`);
    console.log(`   📊 Números de presupuestos: ${allNumbers.length} valores`);
    console.log(`   📋 Valores de PresupsOrigen: ${allPresupsOrigen.length} valores únicos`);
    
    if (allNumbers.length > 0) {
      console.log(`   🔢 Rango de números: ${Math.min(...allNumbers)} - ${Math.max(...allNumbers)}`);
    }
  }  async checkForNewPresupuestos() {
    try {
      if (!this.isInitialized) {
        await this.initializeState();
        return { numeroUpdates: [], origenUpdates: [] };
      }

      // Verificar cambios en Numero
      const currentNumbers = await this.getAllPresupuestoNumbers();
      const currentNumbersSet = new Set(currentNumbers);
      const newNumbers = currentNumbers.filter(num => !this.lastPresupuestoNumbers.has(num));
      
      // Verificar cambios en PresupsOrigen
      const currentPresupsOrigen = await this.getAllPresupsOrigen();
      const currentPresupsOrigenSet = new Set(currentPresupsOrigen);
      const newPresupsOrigen = currentPresupsOrigen.filter(origen => !this.lastPresupsOrigen.has(origen));
      
      // Actualizar estados
      this.lastPresupuestoNumbers = currentNumbersSet;
      this.lastPresupsOrigen = currentPresupsOrigenSet;
      
      const results = { numeroUpdates: [], origenUpdates: [] };
      
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
      
      return results;
    } catch (error) {
      console.error(`❌ Error monitoreando presupuestos:`, error.message);
      return { numeroUpdates: [], origenUpdates: [] };
    }
  }  formatPresupuestoDetails(presupuesto) {
    const fecha = presupuesto.FechaModificacion ? 
      new Date(presupuesto.FechaModificacion).toLocaleString('es-ES', {
        timeZone: 'America/Caracas',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }) : 'null';

    return {
      Serie: presupuesto.Serie || 'null',
      Numero: presupuesto.Numero || 'null',
      PresupsOrigen: presupuesto.PresupsOrigen || 'null',
      ClienteNombre: presupuesto.ClienteNombre || 'null',
      NombreUsuario: presupuesto.NombreUsuario || 'null',
      FechaModificacion: fecha,
      UpdateType: presupuesto.updateType || 'UNKNOWN'
    };
  }
  async monitorPresupuestos() {
    const timestamp = new Date().toLocaleString('es-ES', { 
      timeZone: 'America/Caracas',
      hour12: false 
    });    console.log(`\n🔍 [${timestamp}] Monitoreando cambios en presupuestos (DUAL: Numero + PresupsOrigen)...`);

    const results = await this.checkForNewPresupuestos();
    const totalUpdates = results.numeroUpdates.length + results.origenUpdates.length;
    
    if (totalUpdates > 0) {
      console.log(`\n🎉 CAMBIOS DETECTADOS (${totalUpdates} actualizaciones):`);
      console.log('═'.repeat(90));
      
      // Mostrar actualizaciones de Número (si las hay)
      if (results.numeroUpdates.length > 0) {
        console.log(`\n🔢 ACTUALIZACIONES POR NÚMERO (${results.numeroUpdates.length}):`);
        results.numeroUpdates.forEach((presupuesto, index) => {
          const formatted = this.formatPresupuestoDetails(presupuesto);
          console.log(`\n   📋 ${index + 1}. NUEVO NÚMERO DETECTADO:`);
          console.log(`      🏷️  Serie: ${formatted.Serie}`);
          console.log(`      🔢 Número: ${formatted.Numero}`);
          console.log(`      📊 Presupuesto Origen: ${formatted.PresupsOrigen}`);
          console.log(`      👤 Cliente: ${formatted.ClienteNombre}`);
          console.log(`      👨‍💼 Usuario: ${formatted.NombreUsuario}`);
          console.log(`      📅 Fecha Modificación: ${formatted.FechaModificacion}`);
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
          console.log(`      👤 Cliente: ${formatted.ClienteNombre}`);
          console.log(`      👨‍💼 Usuario: ${formatted.NombreUsuario}`);
          console.log(`      📅 Fecha Modificación: ${formatted.FechaModificacion}`);
          console.log(`      🔍 Tipo de Actualización: ${formatted.UpdateType}`);
        });
      }
      
      // Análisis de prioridad - determinar qué columna se actualiza primero
      if (results.numeroUpdates.length > 0 && results.origenUpdates.length > 0) {
        console.log(`\n🏁 ANÁLISIS DE PRIORIDAD:`);
        console.log(`   ⚡ Se detectaron cambios en AMBAS columnas en este ciclo`);
        console.log(`   📈 Número: ${results.numeroUpdates.length} cambios`);
        console.log(`   📈 PresupsOrigen: ${results.origenUpdates.length} cambios`);
      } else if (results.numeroUpdates.length > 0) {
        console.log(`\n🏁 ANÁLISIS DE PRIORIDAD:`);
        console.log(`   🥇 Solo la columna NÚMERO se actualizó en este ciclo`);
      } else if (results.origenUpdates.length > 0) {
        console.log(`\n🏁 ANÁLISIS DE PRIORIDAD:`);
        console.log(`   🥇 Solo la columna PRESUPS ORIGEN se actualizó en este ciclo`);
      }
      
      console.log('\n' + '═'.repeat(90));
    } else {
      console.log(`   ✅ Sin cambios detectados en ambas columnas`);
    }
  }
  start() {
    if (this.isRunning) {
      console.log('⚠️  El monitoreo ya está en ejecución');
      return;
    }    console.log('🚀 Iniciando monitoreo DUAL de presupuestos cada 5 segundos...');
    console.log('📊 Tabla monitoreada: fpresupuestos');
    console.log('🔢 Columnas monitoreadas: Numero + PresupsOrigen');
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
    }    console.log('\n🛑 Deteniendo monitoreo dual de presupuestos...');
    clearInterval(this.intervalId);
    this.isRunning = false;
    this.intervalId = null;
    this.isInitialized = false;
    this.lastPresupuestoNumbers.clear();
    this.lastPresupsOrigen.clear();
    console.log('✅ Monitoreo dual detenido');
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
        AND COLUMN_NAME IN ('Serie', 'Numero', 'PresupsOrigen', 'ClienteNombre', 'NombreUsuario', 'FechaModificacion')
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
