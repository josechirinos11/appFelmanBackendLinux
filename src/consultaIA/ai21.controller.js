const AI21Service = require('./ai21.service');

/**
 * Controlador para manejar las consultas de IA usando AI21
 */
class AI21Controller {
  constructor() {
    this.ai21Service = new AI21Service();
  }

  /**
   * Generar texto libre usando AI21
   */
  async generarTexto(req, res) {
    try {
      const { prompt, opciones } = req.body;

      if (!prompt) {
        return res.status(400).json({
          success: false,
          message: 'El prompt es requerido'
        });
      }      console.log('🎯 Generando texto con AI21...');
      const textoGenerado = await this.ai21Service.generarTexto(prompt, {
        model: opciones?.model || 'jamba-mini',
        max_tokens: opciones?.maxTokens || opciones?.max_tokens || 200,
        temperature: opciones?.temperature || 0.7,
        top_p: opciones?.topP || opciones?.top_p || 1.0
      });

      res.json({
        success: true,
        data: {
          prompt: prompt,
          textoGenerado: textoGenerado,
          configuracion: opciones || 'default',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error en generarTexto:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando texto con AI21',
        error: error.message
      });
    }
  }

  /**
   * Generar análisis de negocio inteligente
   */
  async analizarNegocio(req, res) {
    try {
      const { contexto, pregunta } = req.body;

      if (!contexto || !pregunta) {
        return res.status(400).json({
          success: false,
          message: 'Contexto y pregunta son requeridos'
        });
      }

      console.log('📊 Generando análisis de negocio...');
      const analisis = await this.ai21Service.generarAnalisisNegocio(contexto, pregunta);

      res.json({
        success: true,
        data: {
          contexto: contexto,
          pregunta: pregunta,
          analisis: analisis,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error en analizarNegocio:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando análisis de negocio',
        error: error.message
      });
    }
  }

  /**
   * Explicar resultados SQL de manera inteligente
   */
  async explicarSQL(req, res) {
    try {
      const { consultaUsuario, resultadoSQL } = req.body;

      if (!consultaUsuario || !resultadoSQL) {
        return res.status(400).json({
          success: false,
          message: 'Consulta de usuario y resultado SQL son requeridos'
        });
      }

      console.log('🔍 Explicando resultado SQL...');
      const explicacion = await this.ai21Service.explicarResultadoSQL(consultaUsuario, resultadoSQL);

      res.json({
        success: true,
        data: {
          consultaOriginal: consultaUsuario,
          resultadoSQL: resultadoSQL,
          explicacion: explicacion,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error en explicarSQL:', error);
      res.status(500).json({
        success: false,
        message: 'Error explicando resultado SQL',
        error: error.message
      });
    }
  }

  /**
   * Generar sugerencias de consultas relacionadas
   */
  async generarSugerencias(req, res) {
    try {
      const { consultaOriginal } = req.body;

      if (!consultaOriginal) {
        return res.status(400).json({
          success: false,
          message: 'La consulta original es requerida'
        });
      }

      console.log('💡 Generando sugerencias de consultas...');
      const sugerencias = await this.ai21Service.generarSugerenciasConsultas(consultaOriginal);

      res.json({
        success: true,
        data: {
          consultaOriginal: consultaOriginal,
          sugerencias: sugerencias,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error en generarSugerencias:', error);
      res.status(500).json({
        success: false,
        message: 'Error generando sugerencias',
        error: error.message
      });
    }
  }

  /**
   * Consulta avanzada que combina SQL + AI21 para respuestas inteligentes
   */
  async consultaAvanzada(req, res) {
    try {
      const { textoUsuario } = req.body;

      if (!textoUsuario) {
        return res.status(400).json({
          success: false,
          message: 'El texto del usuario es requerido'
        });
      }

      console.log('🚀 Procesando consulta avanzada con AI21...');

      // Este endpoint podría integrar con el sistema SQL existente
      // y luego usar AI21 para explicar los resultados
      const prompt = `
Eres un asistente de negocios especializado en análisis de datos.

Consulta del usuario: "${textoUsuario}"

Proporciona una respuesta profesional que incluya:
1. Interpretación de la consulta
2. Tipo de análisis que necesita
3. Recomendaciones de seguimiento

Respuesta:`;

      const respuestaIA = await this.ai21Service.generarTexto(prompt, {
        maxTokens: 300,
        temperature: 0.6
      });

      res.json({
        success: true,
        data: {
          consulta: textoUsuario,
          respuestaIA: respuestaIA,
          sugerencias: await this.ai21Service.generarSugerenciasConsultas(textoUsuario),
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error en consultaAvanzada:', error);
      res.status(500).json({
        success: false,
        message: 'Error procesando consulta avanzada',
        error: error.message
      });
    }
  }
  /**
   * Generar consultas SQL inteligentes específicas para Felman
   */
  async generarSQLInteligente(req, res) {
    try {
      const { textoUsuario, instruccionesPersonalizadas } = req.body;

      if (!textoUsuario) {
        return res.status(400).json({
          success: false,
          message: 'El texto de la consulta es requerido'
        });
      }

      console.log('🧠 Generando SQL inteligente específico para Felman...');
      console.log(`📝 Consulta: "${textoUsuario}"`);

      // Instrucciones base específicas para Felman con toda la información del schema
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

USAR SIEMPRE las siguientes tablas y columnas:
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

NO USAR en las consultas:
- Estado (int)
- Aprobado (tinyint), Entregado (tinyint)
- Facturado (tinyint), Instalado (tinyint)
- Rechazado (tinyint)
- EnviadoFab (tinyint)
- FechaAprobado (date), FechaInstalado (date)



RELACIONES:
- Cabecera-Líneas: fpresupuestos.Serie = fpresupuestoslineas.CodigoSerie AND fpresupuestos.Numero = fpresupuestoslineas.CodigoNumero
- Fabricación: fpresupuestoslineas.CodigoFabSerie = fpresupuestos.CodigoFabricacionSerie AND fpresupuestoslineas.CodigoFabNumero = fpresupuestos.CodigoFabricacionNumero

REGLAS DE TRADUCCIÓN:
- "cliente" → ClienteNombre
- "estado" → Estado (1=pendiente, etc.)


DEVOLVER SIEMPRE:
TABLE fpresupuestos:
SELECT Serie, Numero, ClienteNombre, FechaCreacion

TABLE fpresupuestoslineas:
SELECT CodigoSerie, CodigoNumero, Serie1Desc

CONSULTAS EJEMPLOS:
-SELECT pl.CodigoSerie, pl.CodigoNumero, pl.Serie1Desc, SUM(pl.Fabricadas) AS FabricadasEsteMes FROM fpresupuestoslineas pl JOIN fpresupuestos pr ON pr.Serie = pl.CodigoSerie AND pr.Numero = pl.CodigoNumero WHERE pr.FechaCreacion >= DATE_FORMAT(NOW(), '%Y-%m-01') GROUP BY pl.CodigoSerie, pl.CodigoNumero, pl.Serie1Desc;
-SELECT DISTINCT pr.ClienteNombre
FROM fpresupuestoslineas pl
JOIN fpresupuestos pr 
  ON pr.Serie = pl.CodigoSerie 
  AND pr.Numero = pl.CodigoNumero
WHERE pl.CodigoFabSerie IS NOT NULL 
  AND pl.CodigoFabNumero IS NOT NULL 
  AND pr.FechaCreacion >= DATE_FORMAT(NOW(), '%Y-%m-01');
-SELECT pl.CodigoSerie, pl.CodigoNumero, pl.Serie1Desc, SUM(pl.PenFabricar) AS Pendientes FROM fpresupuestoslineas pl JOIN fpresupuestos pr ON pr.Serie = pl.CodigoSerie AND pr.Numero = pl.CodigoNumero WHERE pr.Estado = 1 GROUP BY pl.CodigoSerie, pl.CodigoNumero, pl.Serie1Desc;
-SELECT pl.CodigoSerie, pl.CodigoNumero, pl.Serie1Desc, SUM(pl.Fabricadas) AS TotalFabricadas FROM fpresupuestoslineas pl JOIN fpresupuestos pr ON pr.Serie = pl.CodigoSerie AND pr.Numero = pl.CodigoNumero GROUP BY pl.CodigoSerie, pl.CodigoNumero, pl.Serie1Desc ORDER BY TotalFabricadas DESC;



INSTRUCCIONES ESTRICTAS:
- Devuelve ÚNICAMENTE la consulta SQL solicitada, en una sola línea.
- NO incluyas comentarios, explicaciones, ni texto adicional.
- NO uses encabezados como "SQL:", "Consulta:", ni bloques de código 
- Usa solo los nombres de tablas y columnas proporcionados.
- Si la consulta es inválida, responde igualmente con la mejor consulta posible según el esquema.
- No uses saltos de línea innecesarios, ni caracteres especiales (\n, \r, \t).
-si te dice dime o dame o traeme o busca quiere decir que regresaras la informacion solicitada en una consulta SQL, ejemplo dame los clientes, regresaras ClienteNombre.

Instrucción importante: 
cuando el usuario empiece su petición con “dime”, “dame”, “tráeme” o “busca”, entiende que debes responder con la información solicitada en forma de consulta SQL.

Ejemplos:

Si el usuario dice «Dame los clientes», deberás devolver la columna ClienteNombre.

Si pide «Busca los presupuestos de abril», deberás devolver el campo o campos correspondientes a esa consulta (por ejemplo, Numero, FechaCreacion, etc.).

Si dice «Tráeme los productos pendientes», tendrás que devolver la(s) columna(s) asociada(s) a esa solicitud (por ejemplo, CodigoProducto, CantidadPendiente).

INSTRUCCIÓN CRÍTICA:
- Siempre que la consulta involucre presupuestos o líneas de presupuestos, INCLUYE SIEMPRE los campos CodigoCliente, Serie y Numero de la tabla fpresupuestos en el SELECT, salvo que la petición sea exclusivamente sobre otro campo.
- Si la consulta requiere información de clientes, presupuestos o líneas, asegúrate de que CodigoCliente, Serie y Numero estén presentes en el resultado.

Ejemplo:
Si el usuario pide "Dame las líneas fabricadas de este mes", responde:
SELECT pr.CodigoCliente, pr.Serie, pr.Numero, pr.ClienteNombre, pl.CodigoSerie, pl.CodigoNumero, pl.Serie1Desc, SUM(pl.Fabricadas) AS FabricadasEsteMes FROM fpresupuestoslineas pl JOIN fpresupuestos pr ON pr.Serie = pl.CodigoSerie AND pr.Numero = pl.CodigoNumero WHERE pr.FechaCreacion >= DATE_FORMAT(NOW(), '%Y-%m-01') GROUP BY pr.CodigoCliente, pr.Serie, pr.Numero, pr.ClienteNombre, pl.CodigoSerie, pl.CodigoNumero, pl.Serie1Desc;

RESPONDE ÚNICAMENTE CON SQL. NO agregues texto antes o después.
`;

      // Combinar instrucciones base con personalizadas si existen
      const instruccionesCompletas = instruccionesPersonalizadas 
        ? `${instruccionesBase}\n\nINSTRUCCIONES ADICIONALES:\n${instruccionesPersonalizadas}`
        : instruccionesBase;

      // Generar SQL usando AI21 con configuración muy precisa
      const sqlGenerado = await this.ai21Service.generarTexto(
        `${instruccionesCompletas}\n\nCONSULTA DEL USUARIO: ${textoUsuario}\n\nSQL:`,
        {
          max_tokens: 500,
          temperature: 0.1, // Muy baja para máxima precisión
          top_p: 0.9,
          stop: [';', '\n\n', 'EXPLAIN:', 'Explicación:']
        }
      );

      // Limpiar el SQL generado eliminando caracteres problemáticos
      const sqlLimpio = this.limpiarSQL(sqlGenerado);

      console.log(`✅ SQL generado: "${sqlLimpio}"`);

      res.json({
        success: true,
        data: {
          consultaUsuario: textoUsuario,
          sqlGenerado: sqlLimpio,
          modelo: 'AI21 Jamba + Instrucciones Felman',
          timestamp: new Date().toISOString(),
          instruccionesUsadas: !!instruccionesPersonalizadas,
          esquemaFelman: true
        }
      });

    } catch (error) {
      console.error('❌ Error generando SQL inteligente:', error);
      res.status(500).json({
        success: false,
        message: `Error generando SQL: ${error.message}`
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

  /**
   * Verificar estado del servicio AI21
   */
  async verificarEstado(req, res) {
    try {
      console.log('🔧 Verificando estado de AI21...');
      const estadoConexion = await this.ai21Service.validarConexion();

      res.json({
        success: true,
        data: {
          servicio: 'AI21 Studio',
          estado: estadoConexion ? 'Activo' : 'Inactivo',
          apiConfigured: !!process.env.FELMAN_AI21API_KEY,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error verificando estado:', error);
      res.status(500).json({
        success: false,
        message: 'Error verificando estado del servicio',
        error: error.message
      });
    }
  }
}

module.exports = AI21Controller;
