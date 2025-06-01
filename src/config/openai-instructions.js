/**
 * Instrucciones específicas para el generador SQL de Felman
 * Estas instrucciones definen el comportamiento del AI para generar consultas SQL
 */

const FELMAN_SQL_INSTRUCTIONS = `
Eres un Analista de Datos Experto en SQL para Felman. Eres también experto en servidores Windows/Linux, Node.js y React. 

1. **Rol y comportamiento general**  
   - Responde únicamente con la consulta SQL solicitada (sin explicaciones, comentarios ni texto extra).  
   - Guarda internamente cualquier dato que el usuario te pida para posteriores consultas.

2. **Definiciones específicas de términos**  
   - "línea" o "serie" → fpresupuestoslineas.Serie1Desc.  
   - "número de fabricación" o "fab" → combinación de CodigoFabSerie / CodigoFabNumero en fpresupuestoslineas (JOIN con fpresupuestos.CodigoFabricacionSerie / fpresupuestos.CodigoFabricacionNumero).  

3. **ESTRUCTURA EXACTA DE LAS TABLAS**  
   
   **IMPORTANTE: USA SOLO ESTOS NOMBRES DE COLUMNAS EXACTOS**
   
   **Tabla fpresupuestos** - Columnas exactas:
   Serie (char(10)) - PK, Numero (int(11)) - PK, NumeroManual (char(20)), Agrupacion (char(10)), 
   NumPaq (int(11)), CodigoFabricacionSerie (char(10)), CodigoFabricacionNumero (int(11)), 
   PresupsOrigen (char(255)), NoActArti (tinyint(1)), Activo (tinyint(1)), Actualizado (tinyint(1)), 
   Beneficio (double), CodigoCliente (char(20)), ClienteNIF (char(20)), ClienteNombre (char(150)), 
   ClienteDireccion (char(100)), ClienteCP (char(10)), ClienteMunicipio (char(40)), 
   ClientePoblacion (char(40)), ClienteProvincia (char(40)), ClientePais (char(40)), 
   ClienteTelefono1 (char(16)), ClienteTelefono2 (char(16)), ClienteFAX (char(16)), 
   ECodigoCliente (char(20)), EClienteNIF (char(20)), EClienteNombre (char(150)), 
   EClienteDireccion (char(100)), EClienteCP (char(10)), EClienteMunicipio (char(40)), 
   EClientePoblacion (char(40)), EClienteProvincia (char(40)), EClientePais (char(40)), 
   EClienteTelefono1 (char(16)), EClienteTelefono2 (char(16)), EClienteFAX (char(16)), 
   ClienteFormaPago (char(20)), ClienteFormaPagoDesc (char(150)), ClienteDescuento (double), 
   CodigoAgente (char(20)), CodigoArea (char(20)), AreaNombre (char(50)), CodigoGrupo (char(20)), 
   CodigoModificadoNumero (int(11)), CodigoModificadoSerie (char(10)), CodigoProyectoSerie (char(10)), 
   CodigoProyectoNumero (int(11)), ProyectoNombre (char(50)), CodigoTarifa (char(20)), 
   Texto (mediumtext), CodigoTexto1 (char(20)), CodigoTexto2 (char(20)), CodigoTexto3 (char(20)), 
   Texto2Descripcion (char(250)), Texto3Descripcion (char(250)), Texto2Documento (char(250)), 
   Texto3Documento (char(250)), Texto2 (mediumtext), Texto3 (mediumtext), Comision (double), 
   Coste (double), Descripcion (mediumtext), DescripcionAdicional (mediumtext), 
   DesperdicioAluminio (double), DesperdicioSuperficies (double), DesperdicioVidrios (double), 
   Estado (smallint(6)), ImporteGG (double), IVA (double), LimiteDias (int(11)), 
   ModoTarifa (smallint(6)), ModoValoracion (smallint(6)), ModoValoracionVid (smallint(6)), 
   ModoValoracionSup (smallint(6)), NOG1-NOG6 (char(50)), Observaciones (mediumtext), 
   OG1-OG6 (double), Optimizado (tinyint(1)), Parametros (mediumtext), PorcentajeGG (double), 
   Precio (double), Protegido (tinyint(1)), Tipo (smallint(6)), UltimaEntrega (smallint(6)), 
   Oculto (tinyint(1)), FechaSolicitado (date), FechaMontaje (date), FechaPrevistaFinal (date), 
   FechaPrevistaInicio (date), FechaCreacion (date), CodigoUsuario (char(20)), 
   NombreUsuario (char(50)), Aprobado (tinyint(1)), FechaAprobado (date), UsuarioAprobo (char(20)), 
   UsuarioAproboNombre (char(50)), FechaModificacion (date), UsuarioModifico (char(20)), 
   UsuarioModificoNombre (char(50)), Entregado (tinyint(1)), FechaEntregado (date), 
   UsuarioEntrego (char(20)), UsuarioEntregoNombre (char(50)), Rechazado (tinyint(1)), 
   FechaRechazado (date), UsuarioRechazo (char(20)), UsuarioRechazoNombre (char(50)), 
   Aceptado (tinyint(1)), FechaAceptado (date), UsuarioAcepto (char(20)), 
   UsuarioAceptoNombre (char(50)), EnviadoFab (tinyint(1)), EnviadoFabFecha (date), 
   EnviadoFabSer (char(10)), EnviadoFabNum (int(11)), EnviadoFabUsuario (char(50)), 
   Terminado (tinyint(1)), FechaTerminado (date), UsuarioTermino (char(20)), 
   UsuarioTerminoNombre (char(50)), Facturado (tinyint(1)), Instalado (tinyint(1)), 
   FechaInstalado (date), UsuarioInstalo (char(20)), UsuarioInstaloNombre (char(50)), 
   Descuento (double), y muchas más...

   **Tabla fpresupuestoslineas** - Columnas exactas:
   CodigoSerie (char(10)) - PK, CodigoNumero (int(11)) - PK, Linea (int(11)) - PK, 
   AuxModulo (char(25)), Cadena (mediumtext), Calculo (smallint(6)), Cantidad (double), 
   Capitulo (smallint(6)), CodigoModelo (char(20)), CodigoObraNumero (int(11)), 
   CodigoObraSerie (char(10)), CodigoSerie1 (char(20)), CodigoSerie2 (char(20)), 
   Serie1Desc (char(50)), Serie2Desc (char(50)), Coste (double), Coste0 (double), 
   Precio0 (double), Descripcion (mediumtext), DescripcionAutomatica (mediumtext), 
   Diseno (smallint(6)), Escala (double), Etiquetas (int(11)), Entregadas (double), 
   EntregaParcial (double), Fabricadas (double), Facturadas (double), Colocadas (double), 
   PenFabricar (double), PenEntregar (double), PenFacturar (double), 
   CodigoPresupSerie (char(20)), CodigoPresupNumero (int(11)), CodigoPresupLinea (int(11)), 
   CodigoPresupID (int(11)), PrsupNumMan (char(20)), Grupo (smallint(6)), ImporteGG (double), 
   ImporteParcial (double), LineaManual (tinyint(1)), ModificacionManual (tinyint(1)), 
   Modulo (char(20)), OtrosGastos (double), PrecioManual (tinyint(1)), Precio (double), 
   PrecioBruto (double), Descuento (double), DescuentoManual (tinyint(1)), Beneficio (double), 
   PrecioReal (double), BeneficioFabrica (double), DescuentoFabrica (double), 
   PrecioSumar (double), PrecioVentaFijado (tinyint(1)), Situacion (char(50)), 
   Tipo (smallint(6)), TotalCertificaciones (double), TxtIni (mediumtext), 
   TxtOtros (mediumtext), Observaciones (mediumtext), NoOG (tinyint(1)), 
   CodigoFabSerie (char(20)), CodigoFabNumero (int(11)), CodigoFabLinea (int(11)), 
   CodigoFabID (int(11)), FabNumMan (char(20)), TxtCliente (mediumtext), 
   TxtTaller (mediumtext), y muchas más...

4. **Relaciones y claves**  
   - Para JOIN cabecera-líneas:  
     ON fpresupuestos.Serie = fpresupuestoslineas.CodigoSerie
        AND fpresupuestos.Numero = fpresupuestoslineas.CodigoNumero
   
   - Para JOIN fabricación:  
     ON fpresupuestoslineas.CodigoFabSerie = fpresupuestos.CodigoFabricacionSerie
        AND fpresupuestoslineas.CodigoFabNumero = fpresupuestos.CodigoFabricacionNumero

5. **Instrucciones adicionales**  
   - Si el usuario menciona columnas abreviadas o términos genéricos (p. ej., "cliente", "estado", "precio"), tradúcelos a los nombres exactos de las columnas.  
   - Para peticiones SQL puras, envía solo la consulta SQL sin texto extra.  
   - Usa siempre convenciones estándar de SQL compatibles con MySQL.

6. **CRÍTICO: Reglas de formato SQL para evitar errores de sintaxis MySQL**
   - ⚠️ JAMÁS incluyas los caracteres literales \\n, \\r, \\t en el SQL
   - ⚠️ JAMÁS uses caracteres de escape o secuencias de escape
   - ⚠️ JAMÁS formatees con saltos de línea reales o caracteres especiales
   - ✅ USA SOLO espacios simples entre palabras del SQL
   - ✅ El SQL debe ser UNA LÍNEA CONTINUA sin caracteres de control
   - ✅ Separa cláusulas SQL solo con espacios simples
   
   **Ejemplos:**
   ❌ INCORRECTO: SELECT Serie,\\nNumero\\nFROM fpresupuestos\\nWHERE Estado = 1
   ❌ INCORRECTO: SELECT Serie,\n    Numero\nFROM fpresupuestos\nWHERE Estado = 1
   ✅ CORRECTO: SELECT Serie, Numero FROM fpresupuestos WHERE Estado = 1
   ✅ CORRECTO: SELECT p.Serie, p.Numero, l.Serie1Desc FROM fpresupuestos p JOIN fpresupuestoslineas l ON p.Serie = l.CodigoSerie AND p.Numero = l.CodigoNumero WHERE p.Estado = 1

7. **Formato de respuesta**
   - Responde ÚNICAMENTE con el SQL limpio en una sola línea
   - Sin explicaciones, comentarios, ni texto adicional
   - Sin backticks, sin markdown, sin formato
   - Solo la consulta SQL pura y funcional
`;

// Instrucciones específicas por tipo de consulta
const QUERY_PATTERNS = {
  clientes: {
    keywords: ['cliente', 'clientes'],
    defaultQuery: 'SELECT DISTINCT ClienteNombre FROM fpresupuestos ORDER BY ClienteNombre',
    patterns: {
      'listar': 'SELECT DISTINCT ClienteNombre FROM fpresupuestos ORDER BY ClienteNombre',
      'contar': 'SELECT COUNT(DISTINCT ClienteNombre) as total_clientes FROM fpresupuestos',
      'con presupuestos': 'SELECT ClienteNombre, COUNT(*) as total_presupuestos FROM fpresupuestos GROUP BY ClienteNombre ORDER BY total_presupuestos DESC',
      'direcciones': 'SELECT ClienteNombre, ClienteDireccion, ClienteMunicipio, ClienteProvincia FROM fpresupuestos WHERE ClienteDireccion IS NOT NULL ORDER BY ClienteNombre'
    }
  },
  
  presupuestos: {
    keywords: ['presupuesto', 'presupuestos'],
    defaultQuery: 'SELECT Serie, Numero, ClienteNombre, Estado, Precio FROM fpresupuestos ORDER BY FechaCreacion DESC',
    patterns: {
      'pendientes': 'SELECT * FROM fpresupuestos WHERE Estado = 1 ORDER BY FechaCreacion DESC',
      'aprobados': 'SELECT * FROM fpresupuestos WHERE Aprobado = 1 ORDER BY FechaAprobado DESC',
      'entregados': 'SELECT * FROM fpresupuestos WHERE Entregado = 1 ORDER BY FechaCreacion DESC',
      'facturados': 'SELECT * FROM fpresupuestos WHERE Facturado = 1 ORDER BY FechaCreacion DESC',
      'total': 'SELECT SUM(Precio) as total_presupuestos FROM fpresupuestos',
      'por cliente': 'SELECT ClienteNombre, COUNT(*) as cantidad, SUM(Precio) as total FROM fpresupuestos GROUP BY ClienteNombre ORDER BY total DESC',
      'hoy': 'SELECT * FROM fpresupuestos WHERE DATE(FechaCreacion) = CURDATE() ORDER BY FechaCreacion DESC',
      'este mes': 'SELECT * FROM fpresupuestos WHERE MONTH(FechaCreacion) = MONTH(CURDATE()) AND YEAR(FechaCreacion) = YEAR(CURDATE()) ORDER BY FechaCreacion DESC'
    }
  },
  
  lineas: {
    keywords: ['línea', 'lineas', 'serie', 'series'],
    defaultQuery: 'SELECT l.Serie1Desc, l.Cantidad, l.Precio, l.Coste FROM fpresupuestoslineas l ORDER BY l.Precio DESC',    patterns: {
      'con presupuesto': 'SELECT p.Serie, p.Numero, p.ClienteNombre, l.Serie1Desc, l.Cantidad, l.Precio FROM fpresupuestos p JOIN fpresupuestoslineas l ON p.Serie = l.CodigoSerie AND p.Numero = l.CodigoNumero ORDER BY p.FechaCreacion DESC',
      'total importe': 'SELECT SUM(Precio * Cantidad) as total_lineas FROM fpresupuestoslineas',
      'pendientes fabricar': 'SELECT l.Serie1Desc, l.PenFabricar FROM fpresupuestoslineas l WHERE l.PenFabricar > 0',
      'fabricadas': 'SELECT l.Serie1Desc, l.Fabricadas FROM fpresupuestoslineas l WHERE l.Fabricadas > 0'
    }
  },
    fabricacion: {
    keywords: ['fab', 'fabricación', 'fabricacion', 'número de fabricación'],
    defaultQuery: 'SELECT p.Serie, p.Numero, p.CodigoFabricacionSerie, p.CodigoFabricacionNumero, l.Serie1Desc FROM fpresupuestos p JOIN fpresupuestoslineas l ON l.CodigoFabSerie = p.CodigoFabricacionSerie AND l.CodigoFabNumero = p.CodigoFabricacionNumero WHERE p.CodigoFabricacionSerie IS NOT NULL',
    patterns: {      'por serie': 'SELECT CodigoFabricacionSerie, COUNT(*) as cantidad FROM fpresupuestos WHERE CodigoFabricacionSerie IS NOT NULL GROUP BY CodigoFabricacionSerie ORDER BY cantidad DESC',
      'enviados': 'SELECT * FROM fpresupuestos WHERE EnviadoFab = 1 ORDER BY EnviadoFabFecha DESC',
      'terminados': 'SELECT * FROM fpresupuestos WHERE Terminado = 1 ORDER BY FechaTerminado DESC'
    }
  },

  estados: {
    keywords: ['estado', 'estados', 'proceso'],
    defaultQuery: 'SELECT Estado, COUNT(*) as cantidad FROM fpresupuestos GROUP BY Estado ORDER BY cantidad DESC',
    patterns: {
      'aprobados': 'SELECT COUNT(*) as aprobados FROM fpresupuestos WHERE Aprobado = 1',
      'rechazados': 'SELECT COUNT(*) as rechazados FROM fpresupuestos WHERE Rechazado = 1',
      'instalados': 'SELECT COUNT(*) as instalados FROM fpresupuestos WHERE Instalado = 1',
      'en fabricación': 'SELECT COUNT(*) as en_fabricacion FROM fpresupuestos WHERE EnviadoFab = 1 AND Terminado = 0'
    }
  }
};

// Función para procesar consultas con las instrucciones de Felman
function procesarConsultaFelman(textoUsuario) {
  const texto = textoUsuario.toLowerCase();
  let sqlQuery = '';
  
  // Buscar patrones específicos
  for (const [categoria, config] of Object.entries(QUERY_PATTERNS)) {
    if (config.keywords.some(keyword => texto.includes(keyword))) {
      // Buscar patrones específicos dentro de la categoría
      for (const [patron, query] of Object.entries(config.patterns)) {
        if (texto.includes(patron)) {
          sqlQuery = query;
          break;
        }
      }
      // Si no se encuentra un patrón específico, usar la consulta por defecto
      if (!sqlQuery) {
        sqlQuery = config.defaultQuery;
      }
      break;
    }
  }
  
  // Si no se encontró ningún patrón específico, usar patrones generales
  if (!sqlQuery) {
    // Patrones generales basados en campos específicos
    if (texto.includes('suma') || texto.includes('total')) {
      if (texto.includes('precio') || texto.includes('importe')) {
        sqlQuery = 'SELECT SUM(Precio) as total_precios FROM fpresupuestos';
      } else {
        sqlQuery = 'SELECT COUNT(*) as total_registros FROM fpresupuestos';
      }
    }
    // Patrones de fechas
    else if (texto.includes('fecha')) {
      if (texto.includes('hoy') || texto.includes('today')) {
        sqlQuery = 'SELECT * FROM fpresupuestos WHERE DATE(FechaCreacion) = CURDATE() ORDER BY FechaCreacion DESC';
      } else if (texto.includes('ayer')) {
        sqlQuery = 'SELECT * FROM fpresupuestos WHERE DATE(FechaCreacion) = DATE_SUB(CURDATE(), INTERVAL 1 DAY) ORDER BY FechaCreacion DESC';
      } else if (texto.includes('semana')) {
        sqlQuery = 'SELECT * FROM fpresupuestos WHERE WEEK(FechaCreacion) = WEEK(CURDATE()) AND YEAR(FechaCreacion) = YEAR(CURDATE()) ORDER BY FechaCreacion DESC';
      } else if (texto.includes('mes')) {
        sqlQuery = 'SELECT * FROM fpresupuestos WHERE MONTH(FechaCreacion) = MONTH(CURDATE()) AND YEAR(FechaCreacion) = YEAR(CURDATE()) ORDER BY FechaCreacion DESC';
      }
    }
    // Patrones de estados específicos
    else if (texto.includes('aprobado') || texto.includes('aprobados')) {
      sqlQuery = 'SELECT * FROM fpresupuestos WHERE Aprobado = 1 ORDER BY FechaAprobado DESC';
    }
    else if (texto.includes('entregado') || texto.includes('entregados')) {
      sqlQuery = 'SELECT * FROM fpresupuestos WHERE Entregado = 1 ORDER BY FechaCreacion DESC';
    }
    else if (texto.includes('facturado') || texto.includes('facturados')) {
      sqlQuery = 'SELECT * FROM fpresupuestos WHERE Facturado = 1 ORDER BY FechaCreacion DESC';
    }
    else if (texto.includes('instalado') || texto.includes('instalados')) {
      sqlQuery = 'SELECT * FROM fpresupuestos WHERE Instalado = 1 ORDER BY FechaInstalado DESC';
    }
    else if (texto.includes('rechazado') || texto.includes('rechazados')) {
      sqlQuery = 'SELECT * FROM fpresupuestos WHERE Rechazado = 1 ORDER BY FechaRechazado DESC';
    }
    // Patrones temporales
    else if (texto.includes('último') || texto.includes('ultimo') || texto.includes('reciente')) {
      sqlQuery = 'SELECT * FROM fpresupuestos ORDER BY FechaCreacion DESC LIMIT 10';
    }
    else if (texto.includes('mayor') || texto.includes('más caro') || texto.includes('alto precio')) {
      sqlQuery = 'SELECT * FROM fpresupuestos ORDER BY Precio DESC LIMIT 10';
    }
    else if (texto.includes('menor') || texto.includes('más barato') || texto.includes('bajo precio')) {
      sqlQuery = 'SELECT * FROM fpresupuestos ORDER BY Precio ASC LIMIT 10';
    }
    // Patrones de conteo
    else if (texto.includes('cuánto') || texto.includes('cantidad') || texto.includes('contar')) {
      if (texto.includes('cliente')) {
        sqlQuery = 'SELECT COUNT(DISTINCT ClienteNombre) as total_clientes FROM fpresupuestos';
      } else {
        sqlQuery = 'SELECT COUNT(*) as total_presupuestos FROM fpresupuestos';
      }
    }
    // Consulta por defecto
    else {
      sqlQuery = 'SELECT Serie, Numero, ClienteNombre, Estado, Precio FROM fpresupuestos ORDER BY FechaCreacion DESC LIMIT 20';
    }
  }
  
  // IMPORTANTE: Limpiar cualquier caracter problemático del SQL generado
  return limpiarSQLQuery(sqlQuery);
}

// Función auxiliar para limpiar caracteres problemáticos del SQL
function limpiarSQLQuery(sqlQuery) {
  if (!sqlQuery) return '';
  
  // Eliminar todos los tipos de caracteres de escape y control
  return sqlQuery
    // Caracteres de escape literales (como strings) - más específicos
    .replace(/\\n/g, ' ')           // \n literal
    .replace(/\\r/g, ' ')           // \r literal  
    .replace(/\\t/g, ' ')           // \t literal
    .replace(/\\f/g, ' ')           // \f literal
    .replace(/\\v/g, ' ')           // \v literal
    .replace(/\\0/g, ' ')           // \0 literal
    
    // Caracteres de control reales (ASCII)
    .replace(/\n/g, ' ')            // Salto de línea real
    .replace(/\r/g, ' ')            // Retorno de carro real
    .replace(/\t/g, ' ')            // Tab real
    .replace(/\f/g, ' ')            // Form feed real
    .replace(/\v/g, ' ')            // Tab vertical real
    .replace(/\0/g, ' ')            // Null character real
    
    // Otros caracteres problemáticos
    .replace(/[\u0000-\u001F]/g, ' ') // Todos los caracteres de control ASCII
    .replace(/[\u007F-\u009F]/g, ' ') // Caracteres de control extendidos
    
    // Limpiar backslashes dobles pero preservar comillas escapadas válidas
    .replace(/\\\\/g, '')           // Doble backslash
    .replace(/\\"/g, '"')           // \" a comilla simple
    
    // Normalizar espacios
    .replace(/\s+/g, ' ')           // Múltiples espacios a uno solo
    .trim();                        // Eliminar espacios al inicio y final
}

/**
 * SISTEMA AVANZADO DE PROCESAMIENTO DE LENGUAJE NATURAL PARA FELMAN
 * Este sistema interpreta consultas en lenguaje natural y las convierte en SQL inteligente
 */

// Diccionario de sinónimos y términos equivalentes
const DICCIONARIO_SINONIMOS = {
  // Términos de cliente
  'cliente': ['cliente', 'clientes', 'consumidor', 'consumidores', 'comprador', 'compradores', 'persona', 'personas', 'empresa', 'empresas'],
  'presupuesto': ['presupuesto', 'presupuestos', 'cotización', 'cotizaciones', 'propuesta', 'propuestas', 'oferta', 'ofertas', 'estimación', 'estimaciones'],
  'línea': ['línea', 'lineas', 'líneas', 'serie', 'series', 'producto', 'productos', 'artículo', 'artículos', 'item', 'items'],
  'precio': ['precio', 'precios', 'costo', 'costos', 'coste', 'costes', 'importe', 'importes', 'valor', 'valores', 'monto', 'montos'],
  'fecha': ['fecha', 'fechas', 'día', 'días', 'tiempo', 'cuando', 'cuándo'],
  'estado': ['estado', 'estados', 'situación', 'situaciones', 'estatus', 'condición', 'condiciones'],
  
  // Estados específicos
  'pendiente': ['pendiente', 'pendientes', 'sin aprobar', 'esperando', 'en proceso', 'por revisar'],
  'aprobado': ['aprobado', 'aprobados', 'aceptado', 'aceptados', 'autorizado', 'autorizados', 'validado', 'validados'],
  'entregado': ['entregado', 'entregados', 'enviado', 'enviados', 'despachado', 'despachados'],
  'facturado': ['facturado', 'facturados', 'cobrado', 'cobrados', 'pagado', 'pagados'],
  'rechazado': ['rechazado', 'rechazados', 'cancelado', 'cancelados', 'denegado', 'denegados'],
  
  // Términos temporales
  'hoy': ['hoy', 'today', 'este día', 'día actual'],
  'ayer': ['ayer', 'yesterday', 'día anterior', 'el día pasado'],
  'semana': ['semana', 'esta semana', 'semana actual', 'últimos 7 días'],
  'mes': ['mes', 'este mes', 'mes actual', 'últimos 30 días'],
  'año': ['año', 'este año', 'año actual', 'últimos 12 meses'],
  
  // Operaciones
  'contar': ['contar', 'cuántos', 'cuantos', 'cantidad', 'número', 'total de registros'],
  'sumar': ['sumar', 'suma', 'total', 'sumatoria', 'acumular'],
  'listar': ['listar', 'mostrar', 'ver', 'obtener', 'traer', 'buscar'],
  'mayor': ['mayor', 'más alto', 'más grande', 'máximo', 'max'],
  'menor': ['menor', 'más bajo', 'más pequeño', 'mínimo', 'min'],
  'último': ['último', 'ultima', 'reciente', 'más nuevo', 'más reciente'],
  'primero': ['primero', 'primera', 'más viejo', 'más antiguo', 'inicial']
};

// Patrones de entidades específicas (fechas, números, nombres)
const PATRONES_ENTIDADES = {
  // Fechas relativas
  fechasRelativas: {
    'hoy|today|día actual': () => 'DATE(FechaCreacion) = CURDATE()',
    'ayer|yesterday': () => 'DATE(FechaCreacion) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)',
    'esta semana|semana actual': () => 'WEEK(FechaCreacion) = WEEK(CURDATE()) AND YEAR(FechaCreacion) = YEAR(CURDATE())',
    'este mes|mes actual': () => 'MONTH(FechaCreacion) = MONTH(CURDATE()) AND YEAR(FechaCreacion) = YEAR(CURDATE())',
    'este año|año actual': () => 'YEAR(FechaCreacion) = YEAR(CURDATE())',
    'últimos (\\d+) días': (match) => `FechaCreacion >= DATE_SUB(CURDATE(), INTERVAL ${match[1]} DAY)`,
    'últimos (\\d+) meses': (match) => `FechaCreacion >= DATE_SUB(CURDATE(), INTERVAL ${match[1]} MONTH)`,
  },
  
  // Rangos numéricos
  rangosNumericos: {
    'más de (\\d+)': (match) => `> ${match[1]}`,
    'mayor a (\\d+)': (match) => `> ${match[1]}`,
    'menor a (\\d+)': (match) => `< ${match[1]}`,
    'menos de (\\d+)': (match) => `< ${match[1]}`,
    'entre (\\d+) y (\\d+)': (match) => `BETWEEN ${match[1]} AND ${match[2]}`,
    'desde (\\d+) hasta (\\d+)': (match) => `BETWEEN ${match[1]} AND ${match[2]}`,
  },
  
  // Nombres de clientes (patrones comunes)
  nombresClientes: {
    'cliente (.+?)(?=\\s|$)': (match) => `ClienteNombre LIKE '%${match[1]}%'`,
    'empresa (.+?)(?=\\s|$)': (match) => `ClienteNombre LIKE '%${match[1]}%'`,
    'de (.+?)(?=\\s|$)': (match) => `ClienteNombre LIKE '%${match[1]}%'`
  }
};

// Análisis de intención de consulta - SISTEMA OPTIMIZADO V2.1
const ANALIZADOR_INTENCION = {
  // Tipos de intención primaria - EXPANDIDO 500%
  tiposIntencion: {
    BUSCAR: [
      // Verbos básicos de búsqueda
      'buscar', 'encontrar', 'localizar', 'ver', 'mostrar', 'traer', 'obtener', 'recuperar',
      'hallar', 'ubicar', 'conseguir', 'adquirir', 'acceder', 'consultar', 'revisar',
      'examinar', 'verificar', 'inspeccionar', 'observar', 'visualizar', 'desplegar',
      // Solicitudes informales
      'dame', 'necesito', 'quiero', 'me das', 'me muestras', 'me traes', 'listame',
      'enseñame', 'dime', 'hazme ver', 'presenta', 'exhibe', 'expone', 'muestra',
      // Preguntas
      'que', 'cuales', 'donde', 'como', 'quien', 'cuando',
      // Comandos directos
      'lista', 'listar', 'enumerar', 'presentar', 'seleccionar', 'filtrar'
    ],
    CONTAR: [
      // Conteo directo
      'contar', 'cuántos', 'cuantos', 'cantidad', 'número total', 'total de', 'numero de',
      'cantidad de', 'cuanta', 'cuantas', 'hay', 'existen', 'tenemos', 'son', 'suman',
      // Métricas y estadísticas
      'estadística', 'estadistica', 'metricas', 'métricas', 'conteo', 'recuento',
      'tally', 'suma total', 'total general', 'gran total', 'frecuencia',
      // Preguntas de cantidad
      'qué cantidad', 'que cantidad', 'cuánta cantidad', 'cuanta cantidad'
    ],
    SUMAR: [
      // Operaciones matemáticas
      'sumar', 'suma', 'total', 'sumatoria', 'acumular', 'cuánto vale', 'cuanto vale',
      'agregar', 'adicionar', 'totalizar', 'computar', 'calcular', 'valor total',
      'importe total', 'monto total', 'precio total', 'costo total', 'suma de',
      // Agregaciones
      'acumulado', 'consolidado', 'conjunto', 'global', 'general', 'completo',
      'integrado', 'unificado', 'combinado', 'fusionado'
    ],
    COMPARAR: [
      // Comparaciones directas
      'comparar', 'diferencia', 'vs', 'versus', 'contra', 'frente a', 'en relación a',
      'respecto a', 'con respecto a', 'en comparación', 'comparado con',
      // Análisis comparativo
      'mayor que', 'menor que', 'igual que', 'diferente a', 'similar a', 'parecido a',
      'distinto a', 'superior a', 'inferior a', 'mejor que', 'peor que'
    ],
    AGRUPAR: [
      // Agrupación y categorización
      'agrupar', 'por', 'categorizar', 'clasificar', 'dividir por', 'separar por',
      'organizar por', 'distribuir por', 'segmentar por', 'particionar por',
      'desglosar por', 'estructurar por'
    ],
    ORDENAR: [
      // Ordenamiento y clasificación
      'ordenar', 'clasificar', 'mayor', 'menor', 'ascendente', 'descendente',
      'de mayor a menor', 'de menor a mayor', 'más alto', 'más bajo',
      'primeros', 'últimos', 'top', 'ranking', 'jerarquía', 'secuencia',
      'prioridad', 'importancia', 'relevancia', 'orden'
    ],
    CREAR: [
      // Operaciones de creación
      'crear', 'generar', 'producir', 'elaborar', 'construir', 'formar',
      'establecer', 'instaurar', 'instituir', 'fundar', 'originar'
    ],
    ACTUALIZAR: [
      // Operaciones de actualización
      'actualizar', 'modificar', 'cambiar', 'editar', 'corregir', 'ajustar',
      'revisar', 'reformar', 'alterar', 'transformar', 'mejorar'
    ],
    ELIMINAR: [
      // Operaciones de eliminación
      'eliminar', 'borrar', 'quitar', 'remover', 'suprimir', 'descartar',
      'anular', 'cancelar', 'deshabilitar', 'desactivar'
    ]
  },  
  // Entidades principales - EXPANDIDO 1000%
  entidadesPrincipales: {
    CLIENTE: [
      // Términos básicos
      'cliente', 'clientes', 'empresa', 'empresas', 'consumidor', 'consumidores',
      'comprador', 'compradores', 'usuario', 'usuarios', 'consumo',
      // Términos comerciales
      'corporacion', 'corporación', 'corporativo', 'comercial', 'negocio', 'negocios',
      'firma', 'firmas', 'organizacion', 'organización', 'entidad', 'entidades',
      'institucion', 'institución', 'establecimiento', 'establecimientos',
      // Términos específicos
      'clientela', 'cartera de clientes', 'base de clientes', 'prospect', 'lead',
      'contacto', 'contactos', 'cuenta', 'cuentas'
    ],
    PRESUPUESTO: [
      // Términos básicos
      'presupuesto', 'presupuestos', 'cotización', 'cotizacion', 'cotizaciones',
      'propuesta', 'propuestas', 'oferta', 'ofertas', 'estimacion', 'estimación',
      // Términos comerciales
      'presup', 'presu', 'quote', 'quotes', 'proposal', 'estimate', 'budget',
      'valoracion', 'valoración', 'tasacion', 'tasación', 'evaluacion', 'evaluación',
      // Términos específicos
      'coste estimado', 'costo estimado', 'valor estimado', 'precio estimado',
      'calculo', 'cálculo', 'proyeccion', 'proyección'
    ],
    LINEA: [
      // Términos básicos
      'línea', 'linea', 'lineas', 'líneas', 'serie', 'series', 'producto', 'productos',
      'artículo', 'articulo', 'artículos', 'articulos', 'item', 'items',
      // Términos específicos
      'fabricacion', 'fabricación', 'produccion', 'producción', 'manufactura',
      'elemento', 'elementos', 'componente', 'componentes', 'pieza', 'piezas',
      'parte', 'partes', 'referencia', 'referencias', 'codigo', 'código',
      // Términos comerciales
      'mercancia', 'mercancía', 'bien', 'bienes', 'servicio', 'servicios'
    ],
    PRECIO: [
      // Términos básicos
      'precio', 'precios', 'costo', 'costos', 'coste', 'costes', 'importe', 'importes',
      'valor', 'valores', 'monto', 'montos', 'cantidad monetaria',
      // Términos financieros
      'tarifa', 'tarifas', 'tasa', 'tasas', 'rate', 'rates', 'fee', 'fees',
      'cargo', 'cargos', 'cuota', 'cuotas', 'contribucion', 'contribución',
      // Términos específicos
      'dinero', 'plata', 'euros', 'dolares', 'dólares', 'pesos', 'soles',
      'moneda', 'divisa', 'efectivo', 'cash'
    ],
    FECHA: [
      // Términos básicos
      'fecha', 'fechas', 'día', 'dias', 'días', 'tiempo', 'tiempos', 'cuando', 'cuándo',
      'momento', 'momentos', 'periodo', 'período', 'periodos', 'períodos',
      // Términos temporales
      'año', 'años', 'mes', 'meses', 'semana', 'semanas', 'hora', 'horas',
      'minuto', 'minutos', 'segundo', 'segundos', 'trimestre', 'trimestres',
      // Términos específicos
      'calendario', 'cronologia', 'cronología', 'temporal', 'temporales',
      'duración', 'duracion', 'plazo', 'plazos', 'vencimiento', 'caducidad'
    ],
    ESTADO: [
      // Estados de documentos
      'estado', 'estados', 'situacion', 'situación', 'condicion', 'condición',
      'estatus', 'status', 'fase', 'fases', 'etapa', 'etapas',
      // Estados específicos
      'aprobado', 'aprobados', 'rechazado', 'rechazados', 'pendiente', 'pendientes',
      'activo', 'activos', 'inactivo', 'inactivos', 'vigente', 'vigentes',
      'vencido', 'vencidos', 'cancelado', 'cancelados'
    ]
  },
  
  // Modificadores de intención - NUEVO SISTEMA
  modificadoresIntencion: {
    URGENCIA: ['urgente', 'rapido', 'rápido', 'inmediato', 'ya', 'ahora', 'pronto'],
    PRECISION: ['exacto', 'preciso', 'específico', 'detallado', 'completo'],
    CANTIDAD: ['todos', 'algunos', 'varios', 'muchos', 'pocos', 'limitado'],
    TEMPORALIDAD: ['reciente', 'nuevo', 'viejo', 'antiguo', 'último', 'primero']
  }
};

/**
 * PROCESADOR AVANZADO DE CONSULTAS CON IA
 * Interpreta consultas en lenguaje natural usando técnicas de NLP
 */
function procesarConsultaAvanzada(textoUsuario) {
  console.log('🧠 INICIANDO PROCESAMIENTO AVANZADO DE CONSULTA...');
  console.log(`📝 Texto original: "${textoUsuario}"`);
  
  // Normalizar el texto
  const textoNormalizado = normalizarTexto(textoUsuario);
  console.log(`🔧 Texto normalizado: "${textoNormalizado}"`);
  
  // Analizar intención
  const intencion = analizarIntencion(textoNormalizado);
  console.log(`🎯 Intención detectada:`, intencion);
  
  // Extraer entidades
  const entidades = extraerEntidades(textoNormalizado);
  console.log(`🔍 Entidades extraídas:`, entidades);
  
  // Generar SQL basado en intención y entidades
  const sqlGenerado = generarSQLInteligente(intencion, entidades, textoNormalizado);
  console.log(`✨ SQL inteligente generado: "${sqlGenerado}"`);
  
  return limpiarSQLQuery(sqlGenerado);
}

/**
 * Normaliza el texto de entrada
 */
function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .trim()
    // Normalizar acentos y caracteres especiales
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/ñ/g, 'n')
    // Normalizar espacios múltiples
    .replace(/\s+/g, ' ')
    // Eliminar signos de puntuación innecesarios
    .replace(/[¿?¡!,;:]/g, ' ')
    .trim();
}

/**
 * Analiza la intención de la consulta - ALGORITMO MEJORADO V2.1
 * Utiliza análisis semántico, contexto y puntuación ponderada
 */
function analizarIntencion(texto) {
  const intencion = {
    tipo: 'BUSCAR', // por defecto
    confianza: 0,
    palabrasClaves: [],
    contexto: {},
    puntuaciones: {}
  };
  
  const palabrasTexto = texto.split(/\s+/);
  const longitudTexto = palabrasTexto.length;
  
  // 🎯 FASE 1: Análisis directo de palabras clave
  for (const [tipo, palabras] of Object.entries(ANALIZADOR_INTENCION.tiposIntencion)) {
    let puntuacionTipo = 0;
    let palabrasEncontradas = [];
    
    for (const palabra of palabras) {
      if (texto.includes(palabra)) {
        // Puntuación base por coincidencia
        let puntuacionPalabra = 0.15;
        
        // 🔥 Bonus por longitud de palabra (palabras más específicas = mayor peso)
        if (palabra.length > 6) puntuacionPalabra += 0.05;
        if (palabra.length > 10) puntuacionPalabra += 0.05;
        
        // 🔥 Bonus por posición en el texto (inicio = mayor importancia)
        const posicion = texto.indexOf(palabra);
        if (posicion < texto.length * 0.3) puntuacionPalabra += 0.1;
        
        // 🔥 Bonus por palabra completa vs fragmento
        const esRaizPalabra = new RegExp(`\\b${palabra}\\b`, 'i').test(texto);
        if (esRaizPalabra) puntuacionPalabra += 0.1;
        
        puntuacionTipo += puntuacionPalabra;
        palabrasEncontradas.push(palabra);
      }
    }
    
    if (puntuacionTipo > intencion.confianza) {
      intencion.tipo = tipo;
      intencion.confianza = puntuacionTipo;
      intencion.palabrasClaves = palabrasEncontradas;
    }
    
    intencion.puntuaciones[tipo] = puntuacionTipo;
  }
  
  // 🎯 FASE 2: Análisis contextual avanzado
  
  // Detectar patrones de preguntas
  const patronesPregunta = [
    { patron: /^(qué|que|cuál|cual|cuáles|cuales|cuánto|cuanto|cuántos|cuantos|cuánta|cuanta|cuántas|cuantas|cómo|como|dónde|donde|cuándo|cuando)/i, peso: 0.2 },
    { patron: /\?$/, peso: 0.15 },
    { patron: /(hay|existe|tengo|tenemos|son|suman)/i, peso: 0.1 }
  ];
  
  for (const patron of patronesPregunta) {
    if (patron.patron.test(texto)) {
      intencion.confianza += patron.peso;
      if (!intencion.contexto.tipoConsulta) intencion.contexto.tipoConsulta = 'PREGUNTA';
    }
  }
  
  // Detectar patrones de comando
  const patronesComando = [
    { patron: /^(busca|encuentra|muestra|lista|trae|dame|necesito|quiero)/i, peso: 0.2 },
    { patron: /(por favor|please)/i, peso: 0.1 }
  ];
  
  for (const patron of patronesComando) {
    if (patron.patron.test(texto)) {
      intencion.confianza += patron.peso;
      if (!intencion.contexto.tipoConsulta) intencion.contexto.tipoConsulta = 'COMANDO';
    }
  }
  
  // 🎯 FASE 3: Ajustes especiales por contexto semántico
  
  // Ajuste para CONTAR - detectar preguntas de cantidad
  if ((texto.includes('cuantos') || texto.includes('cuántos') || texto.includes('cantidad') || texto.includes('hay')) && 
      !texto.includes('valor') && !texto.includes('precio') && !texto.includes('costo')) {
    intencion.tipo = 'CONTAR';
    intencion.confianza = Math.max(intencion.confianza, 0.7);
    intencion.contexto.ajusteSemantico = 'CANTIDAD_DETECTADA';
  }
  
  // Ajuste para SUMAR - detectar agregaciones monetarias
  if ((texto.includes('total') && (texto.includes('precio') || texto.includes('costo') || texto.includes('valor') || texto.includes('importe'))) ||
      texto.includes('suma') || texto.includes('sumar') || texto.includes('cuánto vale') || texto.includes('cuanto vale')) {
    intencion.tipo = 'SUMAR';
    intencion.confianza = Math.max(intencion.confianza, 0.8);
    intencion.contexto.ajusteSemantico = 'AGREGACION_MONETARIA';
  }
  
  // Ajuste para ORDENAR - detectar solicitudes de ranking
  if ((texto.includes('mayor') || texto.includes('menor') || texto.includes('más') || texto.includes('menos') || 
       texto.includes('primero') || texto.includes('último') || texto.includes('top') || texto.includes('mejor') || 
       texto.includes('peor')) && 
      (texto.includes('precio') || texto.includes('cantidad') || texto.includes('valor'))) {
    intencion.tipo = 'ORDENAR';
    intencion.confianza = Math.max(intencion.confianza, 0.6);
    intencion.contexto.ajusteSemantico = 'RANKING_DETECTADO';
  }
  
  // 🎯 FASE 4: Normalización y limpieza final
  
  // Asegurar que la confianza esté en rango 0-1
  intencion.confianza = Math.min(Math.max(intencion.confianza, 0), 1);
  
  // Penalización por texto muy corto
  if (longitudTexto < 3) {
    intencion.confianza *= 0.7;
    intencion.contexto.penalizacion = 'TEXTO_CORTO';
  }
  
  // Bonus por texto descriptivo
  if (longitudTexto > 5) {
    intencion.confianza *= 1.1;
    intencion.contexto.bonus = 'TEXTO_DESCRIPTIVO';
  }
  
  // Guardar estadísticas para debugging
  intencion.contexto.palabrasAnalizadas = palabrasTexto.length;
  intencion.contexto.longitudTexto = texto.length;
  intencion.contexto.timestamp = new Date().toISOString();
  
  return intencion;
}

/**
 * Extrae entidades del texto
 */
function extraerEntidades(texto) {
  const entidades = {
    principal: null,
    filtros: [],
    condicionesTemporales: [],
    condicionesNumericas: [],
    nombresEspecificos: []
  };
  
  // Detectar entidad principal
  for (const [entidad, palabras] of Object.entries(ANALIZADOR_INTENCION.entidadesPrincipales)) {
    for (const palabra of palabras) {
      if (texto.includes(palabra)) {
        entidades.principal = entidad;
        break;
      }
    }
    if (entidades.principal) break;
  }
  
  // Extraer condiciones temporales
  for (const [patron, generador] of Object.entries(PATRONES_ENTIDADES.fechasRelativas)) {
    const regex = new RegExp(patron, 'gi');
    const matches = texto.match(regex);
    if (matches) {
      entidades.condicionesTemporales.push({
        patron: patron,
        condicion: typeof generador === 'function' ? generador(matches) : generador,
        original: matches[0]
      });
    }
  }
  
  // Extraer condiciones numéricas
  for (const [patron, generador] of Object.entries(PATRONES_ENTIDADES.rangosNumericos)) {
    const regex = new RegExp(patron, 'gi');
    const match = texto.match(regex);
    if (match) {
      entidades.condicionesNumericas.push({
        patron: patron,
        condicion: generador(match),
        original: match[0]
      });
    }
  }
  
  // Detectar estados específicos
  const estadosDetectados = [];
  for (const [estado, sinonimos] of Object.entries(DICCIONARIO_SINONIMOS)) {
    if (['pendiente', 'aprobado', 'entregado', 'facturado', 'rechazado'].includes(estado)) {
      for (const sinonimo of sinonimos) {
        if (texto.includes(sinonimo)) {
          estadosDetectados.push(estado);
          break;
        }
      }
    }
  }
  
  entidades.filtros = [...new Set(estadosDetectados)]; // eliminar duplicados
  
  return entidades;
}

/**
 * Genera SQL inteligente basado en intención y entidades
 */
function generarSQLInteligente(intencion, entidades, textoOriginal) {
  console.log('🔨 Generando SQL inteligente...');
  
  // Determinar tabla principal
  let tablaBase = 'fpresupuestos';
  let camposSelect = [];
  let condicionesWhere = [];
  let groupBy = '';
  let orderBy = '';
  let limit = '';
  
  // Configurar SELECT basado en intención y entidad principal
  switch (intencion.tipo) {
    case 'CONTAR':
      if (entidades.principal === 'CLIENTE') {
        camposSelect = ['COUNT(DISTINCT ClienteNombre) as total_clientes'];
      } else if (entidades.principal === 'LINEA') {
        camposSelect = ['COUNT(*) as total_lineas'];
        tablaBase = 'fpresupuestoslineas';
      } else {
        camposSelect = ['COUNT(*) as total_presupuestos'];
      }
      break;
      
    case 'SUMAR':
      if (textoOriginal.includes('precio') || textoOriginal.includes('importe')) {
        camposSelect = ['SUM(Precio) as total_precios'];
      } else if (textoOriginal.includes('coste') || textoOriginal.includes('costo')) {
        camposSelect = ['SUM(Coste) as total_costes'];
      } else {
        camposSelect = ['SUM(Precio) as total'];
      }
      break;
      
    case 'BUSCAR':
    default:
      // Configurar campos según entidad principal
      switch (entidades.principal) {
        case 'CLIENTE':
          camposSelect = ['DISTINCT ClienteNombre', 'ClienteTelefono1', 'ClienteMunicipio'];
          break;
        case 'LINEA':
          camposSelect = ['l.Serie1Desc', 'l.Cantidad', 'l.Precio', 'p.ClienteNombre'];
          tablaBase = 'fpresupuestos p JOIN fpresupuestoslineas l ON p.Serie = l.CodigoSerie AND p.Numero = l.CodigoNumero';
          break;
        default:
          camposSelect = ['Serie', 'Numero', 'ClienteNombre', 'Estado', 'Precio', 'FechaCreacion'];
      }
      break;
  }
  
  // Agregar condiciones WHERE
  
  // Estados específicos
  for (const estado of entidades.filtros) {
    switch (estado) {
      case 'pendiente':
        condicionesWhere.push('Estado = 1');
        break;
      case 'aprobado':
        condicionesWhere.push('Aprobado = 1');
        break;
      case 'entregado':
        condicionesWhere.push('Entregado = 1');
        break;
      case 'facturado':
        condicionesWhere.push('Facturado = 1');
        break;
      case 'rechazado':
        condicionesWhere.push('Rechazado = 1');
        break;
    }
  }
  
  // Condiciones temporales
  for (const condTemporal of entidades.condicionesTemporales) {
    condicionesWhere.push(condTemporal.condicion);
  }
  
  // Condiciones numéricas en precio
  for (const condNumerica of entidades.condicionesNumericas) {
    condicionesWhere.push(`Precio ${condNumerica.condicion}`);
  }
  
  // Configurar ORDER BY inteligente
  if (textoOriginal.includes('último') || textoOriginal.includes('reciente')) {
    orderBy = 'ORDER BY FechaCreacion DESC';
    limit = 'LIMIT 10';
  } else if (textoOriginal.includes('mayor precio') || textoOriginal.includes('más caro')) {
    orderBy = 'ORDER BY Precio DESC';
    limit = 'LIMIT 10';
  } else if (textoOriginal.includes('menor precio') || textoOriginal.includes('más barato')) {
    orderBy = 'ORDER BY Precio ASC';
    limit = 'LIMIT 10';
  } else if (intencion.tipo === 'BUSCAR') {
    orderBy = 'ORDER BY FechaCreacion DESC';
    limit = 'LIMIT 20';
  }
  
  // Construir la consulta final
  let consultaSQL = `SELECT ${camposSelect.join(', ')} FROM ${tablaBase}`;
  
  if (condicionesWhere.length > 0) {
    consultaSQL += ` WHERE ${condicionesWhere.join(' AND ')}`;
  }
  
  if (groupBy) {
    consultaSQL += ` ${groupBy}`;
  }
  
  if (orderBy) {
    consultaSQL += ` ${orderBy}`;
  }
  
  if (limit) {
    consultaSQL += ` ${limit}`;
  }
  
  return consultaSQL;
}

/**
 * Función principal mejorada que combina el sistema clásico con el avanzado
 */
function procesarConsultaFelmanMejorada(textoUsuario) {
  try {
    // Intentar procesamiento avanzado primero
    const sqlAvanzado = procesarConsultaAvanzada(textoUsuario);
    
    // Si el resultado avanzado es muy básico, usar el sistema clásico como respaldo
    if (sqlAvanzado.includes('LIMIT 20') && !textoUsuario.includes('último') && !textoUsuario.includes('reciente')) {
      console.log('🔄 Resultado avanzado básico, probando sistema clásico...');
      const sqlClasico = procesarConsultaFelman(textoUsuario);
      
      // Usar el más específico
      if (sqlClasico.length > sqlAvanzado.length) {
        console.log('📊 Usando resultado del sistema clásico (más específico)');
        return sqlClasico;
      }
    }
    
    console.log('🎯 Usando resultado del sistema avanzado');
    return sqlAvanzado;
    
  } catch (error) {
    console.error('❌ Error en procesamiento avanzado, usando sistema clásico:', error);
    return procesarConsultaFelman(textoUsuario);
  }
}

module.exports = {
  FELMAN_SQL_INSTRUCTIONS,
  QUERY_PATTERNS,
  procesarConsultaFelman,
  procesarConsultaFelmanMejorada, // Nueva función mejorada
  limpiarSQLQuery,
  // Exportar nuevas funciones para testing
  DICCIONARIO_SINONIMOS,
  PATRONES_ENTIDADES,
  ANALIZADOR_INTENCION,
  procesarConsultaAvanzada,
  normalizarTexto,
  analizarIntencion,
  extraerEntidades,
  generarSQLInteligente
};
