const AI21Service = require('./ai21.service');
const pool = require('../config/database');

/**
 * Controlador para manejar las consultas de IA usando AI21
 */
class AI21Controller {
  constructor() {
    this.ai21Service = new AI21Service();
  }

  /**
   * Ejecutar consulta SQL generada por la IA y devolver resultados
   */
  async ejecutarSQLGenerado(req, res) {
    try {
      const { sqlGenerado } = req.body;

      if (!sqlGenerado) {
        return res.status(400).json({
          success: false,
          message: 'La consulta SQL es requerida'
        });
      }

      console.log('🔍 Ejecutando SQL generado por IA...');
      console.log('📝 SQL:', sqlGenerado);

      // Validar que sea una consulta SELECT (seguridad básica)
      const sqlLimpio = sqlGenerado.trim().toUpperCase();
      if (!sqlLimpio.startsWith('SELECT')) {
        return res.status(400).json({
          success: false,
          message: 'Solo se permiten consultas SELECT por seguridad'
        });
      }

      // Ejecutar la consulta en la base de datos
      const [result] = await pool.execute(sqlGenerado);

      console.log('✅ Consulta ejecutada exitosamente. Filas:', result.length);

      res.json({
        success: true,
        data: {
          sqlEjecutado: sqlGenerado,
          resultados: result,
          totalFilas: result.length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error ejecutando SQL generado:', error);
      
      // Manejar errores específicos de MySQL
      if (error.code) {
        return res.status(400).json({
          success: false,
          message: 'Error en la consulta SQL: ' + error.message,
          errorCode: error.code,
          sqlState: error.sqlState
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno ejecutando la consulta',
        error: error.message
      });
    }
  }

  /**
   * Generar consulta SQL y ejecutarla directamente (proceso completo)
   */
  async generarYEjecutarSQL(req, res) {
    try {
      const { textoUsuario, instruccionesPersonalizadas } = req.body;

      if (!textoUsuario) {
        return res.status(400).json({
          success: false,
          message: 'El texto de la consulta es requerido'
        });
      }

      console.log('🚀 Proceso completo: Generar + Ejecutar SQL...');
      console.log('📝 Consulta:', textoUsuario);

      // Paso 1: Generar SQL usando IA (reutilizar lógica existente)
      const instruccionesBase = `
ERES UN ANALISTA DE DATOS EXPERTO EN SQL PARA FELMAN.

INSTRUCCIONES CRÍTICAS:
1. RESPONDE ÚNICAMENTE CON CÓDIGO SQL VÁLIDO
2. NO agregues explicaciones, comentarios o texto adicional
3. USA ÚNICAMENTE las tablas y campos que te proporciono
4. SIEMPRE usa sintaxis MySQL/MariaDB
5. NO uses caracteres especiales como \\n, \\r, \\t literales

DEFINICIONES ESPECÍFICAS:
- "línea" o "serie" → fpresupuestoslineas.Serie1Desc
- "número de fabricación" o "fab" → CodigoFabSerie/CodigoFabNumero

ESTRUCTURA EXACTA DE FELMAN:

TABLA fpresupuestos (PK: Serie, Numero):
- Serie (char(10)), Numero (int(11)), NumeroManual (char(20))
- CodigoFabricacionSerie (char(10)), CodigoFabricacionNumero (int(11))
- PresupsOrigen (char(255)), CodigoCliente (char(20))
- ClienteNIF (char(20)), ClienteNombre (char(150))
- ClienteDireccion (char(100)), ClienteCP (char(10))
- ClienteMunicipio (char(40)), ClienteProvincia (char(40))
- FechaCreacion (datetime), FechaModificacion (datetime)
- Estado (int), Aprobado (tinyint), Entregado (tinyint)
- Facturado (tinyint), Instalado (tinyint), Rechazado (tinyint)
- Precio (double), Coste (double), Beneficio (double)
- EnviadoFab (tinyint), FechaAprobado (date), FechaInstalado (date)

TABLA fpresupuestoslineas (PK: CodigoSerie, CodigoNumero, Linea):
- CodigoSerie (char(10)), CodigoNumero (int(11)), Linea (int(11))
- CodigoFabSerie (char(10)), CodigoFabNumero (int(11))
- Serie1Desc (char(150)) - DESCRIPCIÓN DE LA LÍNEA/SERIE
- Cantidad (double), Precio (double), Coste (double)
- Fabricadas (double), PenFabricar (double)
- AuxModulo (char(25)), CodigoModelo (char(20))

RELACIONES:
- Cabecera-Líneas: fpresupuestos.Serie = fpresupuestoslineas.CodigoSerie AND fpresupuestos.Numero = fpresupuestoslineas.CodigoNumero

INSTRUCCIÓN CRÍTICA:
- Siempre que la consulta involucre presupuestos o líneas de presupuestos, INCLUYE SIEMPRE los campos CodigoCliente, Serie y Numero de la tabla fpresupuestos en el SELECT.

RESPONDE ÚNICAMENTE CON SQL. NO agregues texto antes o después.
`;

      const instruccionesCompletas = instruccionesPersonalizadas 
        ? instruccionesBase + '\n\nINSTRUCCIONES ADICIONALES:\n' + instruccionesPersonalizadas
        : instruccionesBase;

      // Generar SQL
      const sqlGenerado = await this.ai21Service.generarTexto(
        instruccionesCompletas + '\n\nCONSULTA DEL USUARIO: ' + textoUsuario + '\n\nSQL:',
        {
          max_tokens: 500,
          temperature: 0.1,
          top_p: 0.9,
          stop: [';', '\n\n', 'EXPLAIN:', 'Explicación:']
        }
      );

      const sqlLimpio = this.limpiarSQL(sqlGenerado);

      console.log('🧠 SQL generado:', sqlLimpio);

      // Paso 2: Validar que sea SELECT
      const sqlValidacion = sqlLimpio.trim().toUpperCase();
      if (!sqlValidacion.startsWith('SELECT')) {
        return res.status(400).json({
          success: false,
          message: 'Solo se permiten consultas SELECT por seguridad',
          sqlGenerado: sqlLimpio
        });
      }

      // Paso 3: Ejecutar consulta
      const [result] = await pool.execute(sqlLimpio);

      console.log('✅ Proceso completo exitoso. Filas obtenidas:', result.length);

      res.json({
        success: true,
        data: {
          consultaUsuario: textoUsuario,
          sqlGenerado: sqlLimpio,
          resultados: result,
          totalFilas: result.length,
          modelo: 'AI21 Jamba + Instrucciones Felman',
          timestamp: new Date().toISOString(),
          instruccionesUsadas: !!instruccionesPersonalizadas,
          esquemaFelman: true
        }
      });

    } catch (error) {
      console.error('❌ Error en proceso completo:', error);
      
      if (error.code) {
        return res.status(400).json({
          success: false,
          message: 'Error en la consulta SQL: ' + error.message,
          errorCode: error.code,
          sqlState: error.sqlState
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error en el proceso completo',
        error: error.message
      });
    }
  }

  /**
   * Limpiar SQL generado eliminando caracteres problemáticos
   */
  limpiarSQL(sql) {
    return sql
      .replace(/```sql/gi, '')
      .replace(/```/g, '')
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/[\u0000-\u001F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/;$/, '') + ';';
  }
}

module.exports = AI21Controller;
