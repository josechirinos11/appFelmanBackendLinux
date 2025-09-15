const pool = require('../../config/databaseTerminales');

class TerminalesMonitor {
  constructor(socketHandlers, intervalMs = 3000) {
    this.handlers = socketHandlers;
    this.io = socketHandlers && socketHandlers.getIO ? socketHandlers.getIO() : null;
    this.intervalMs = intervalMs;
    this.intervalId = null;
    this.state = new Map(); // key: room (terminales:<num_manual> or 'terminales'), value: JSON string of last payload
  this.stoppedDueToAuth = false;
  }

  async fetchLotes() {
    const sql = `SELECT NumeroManual, Fabricado, FabricadoFecha, FechaRealInicio, Descripcion, TotalUnidades FROM terminales.lotes`;
    const [rows] = await pool.execute(sql);
    return rows;
  }

  async fetchLotesLineas(num_manual) {
    const sql = `SELECT Modulo, Fabricada, CodigoTarea01, TareaInicio01, TareaFinal01 FROM terminales.loteslineas WHERE FabricacionNumeroManual = ?`;
    const [rows] = await pool.execute(sql, [num_manual]);
    return rows;
  }

  async fetchTiemposOperarioLote(num_manual) {
    const sql = `
    SELECT OperarioNombre, CodigoOperario, COALESCE(CodigoTarea,'(SIN TAREA)') AS Tarea,
      SUM(COALESCE(TiempoDedicado,0)) AS SegundosDedicados,
      SEC_TO_TIME(SUM(COALESCE(TiempoDedicado,0))) AS HH_MM_SS
    FROM vpartestodo
    WHERE CodigoLote = (SELECT Codigo FROM lotes WHERE NumeroManual = ?)
    GROUP BY OperarioNombre, CodigoOperario, CodigoTarea
    ORDER BY OperarioNombre, Tarea
    `;
    const [rows] = await pool.execute(sql, [num_manual]);
    return rows;
  }

  async fetchTiemposAcumuladosModulo(num_manual, modulo) {
    // Reusar la lógica del route: construir la consulta con 20 uniones
    const unionParts = [];
    for (let i = 1; i <= 20; i++) {
      unionParts.push(`SELECT Modulo, ${i} AS NumeroTarea, TiempoAcumulado${String(i).padStart(2,'0')} AS TiempoAcumulado FROM terminales.loteslineas WHERE FabricacionNumeroManual = ? AND Modulo = ? AND TiempoAcumulado${String(i).padStart(2,'0')} IS NOT NULL`);
    }
    const sql = unionParts.join('\nUNION ALL\n') + '\nORDER BY NumeroTarea';
    const params = [];
    for (let i = 1; i <= 20; i++) params.push(num_manual, modulo);
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  async pollOnce() {
    try {
      // Emitir lista de lotes a la sala 'terminales'
      const lotes = await this.fetchLotes();
      const keyLotes = 'terminales:lotes';
      const payloadLotes = JSON.stringify(lotes);
      if (this.state.get(keyLotes) !== payloadLotes) {
        this.state.set(keyLotes, payloadLotes);
        if (this.io) this.io.to('terminales').emit('lotes:update', lotes);
      }

      // Para cada NumeroManual emitir detalles a room terminales:<num_manual>
      for (const lote of lotes) {
        const num = lote.NumeroManual;
        const room = `terminales:${num}`;

        // loteslineas
        const ll = await this.fetchLotesLineas(num);
        const keyLL = `${room}:loteslineas`;
        const payloadLL = JSON.stringify(ll);
        if (this.state.get(keyLL) !== payloadLL) {
          this.state.set(keyLL, payloadLL);
          if (this.io) this.io.to(room).emit('loteslineas:update', ll);
        }

        // tiempos operario
        const tOp = await this.fetchTiemposOperarioLote(num);
        const keyTOp = `${room}:tiempos-operario`;
        const payloadTOp = JSON.stringify(tOp);
        if (this.state.get(keyTOp) !== payloadTOp) {
          this.state.set(keyTOp, payloadTOp);
          if (this.io) this.io.to(room).emit('tiempos-operario:update', tOp);
        }

        // tiempos acumulados por modulo: detectar módulos y emitir por cada uno
        const modules = Array.from(new Set(ll.map(r => r.Modulo).filter(Boolean)));
        for (const mod of modules) {
          try {
            const tac = await this.fetchTiemposAcumuladosModulo(num, mod);
            const keyTac = `${room}:tiempos-acumulados:${mod}`;
            const payloadTac = JSON.stringify(tac);
            if (this.state.get(keyTac) !== payloadTac) {
              this.state.set(keyTac, payloadTac);
              if (this.io) this.io.to(room).emit('tiempos-acumulados-modulo:update', { modulo: mod, data: tac });
            }
          } catch (e) {
            // ignore per-module errors
          }
        }
      }
    } catch (error) {
      const msg = error && (error.message || error);
      console.error('❌ Error en TerminalesMonitor.pollOnce:', msg);
      // Si es un error de autenticación de MySQL, detener el monitor para evitar spam
      if (error && (error.code === 'ER_ACCESS_DENIED_ERROR' || /Access denied for user/i.test(msg))) {
        this.stoppedDueToAuth = true;
        console.error('🛑 TerminalesMonitor detenido: credenciales de DB no autorizadas (Access denied). Verificar usuario/host/password en `src/config/databaseTerminales.js` y permisos en MySQL.');
        // emitir un evento de error a la sala administrativa si existe
        try {
          if (this.io) this.io.to('terminales').emit('monitor:error', { message: 'Access denied for DB user', detail: msg });
        } catch (e) {
          // noop
        }
        this.stop();
      }
    }
  }

  start() {
    if (this.intervalId || this.stoppedDueToAuth) return;
    // Ejecutar inmediatamente y sólo programar el intervalo si succeed
    this.pollOnce().then(() => {
      if (this.stoppedDueToAuth) return;
      if (this.intervalId) return;
      this.intervalId = setInterval(() => this.pollOnce(), this.intervalMs);
      console.log(`🔍 TerminalesMonitor iniciado (interval ${this.intervalMs} ms)`);
    }).catch((e) => {
      // pollOnce maneja internamente los errores; si llegamos aquí, registrar
      console.error('❌ Error inicial al arrancar TerminalesMonitor:', e && e.message ? e.message : e);
    });
  }

  stop() {
    if (!this.intervalId) return;
    clearInterval(this.intervalId);
    this.intervalId = null;
    console.log('🛑 TerminalesMonitor detenido');
  }
}

module.exports = TerminalesMonitor;
