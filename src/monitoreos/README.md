# 🔍 Sistema de Monitoreo DUAL de Base de Datos - Felman

Sistema automatizado para monitorear cambios en presupuestos de la base de datos MySQL con **MONITOREO DUAL DE DOS TABLAS**.

## 📋 Características Principales

- **Monitoreo DUAL en tiempo real** de dos tablas: `presupuestospedidos` y `fpresupuestos`
- **Detección simultánea** de cambios en campos `presupuestospedidos.CodigoNumero` y `fpresupuestos.Numero`
- **Análisis de prioridad** para determinar qué tabla se actualiza primero
- **Estado persistente** que se mantiene durante la ejecución
- **Información detallada** de cada cambio detectado incluyendo múltiples fechas
- **Ejecución automática** junto con el servidor principal
- **Manejo de valores null** mostrados como "null"

## 🎯 Tablas y Campos Monitoreados

El sistema monitorea **DOS TABLAS** simultáneamente:

### 📋 Tabla PRESUPUESTOSPEDIDOS
- **Campo monitoreado**: `CodigoNumero`
- Detecta nuevos códigos únicos que aparecen en esta tabla
- Rastrea cada código nuevo en tiempo real

### 📊 Tabla FPRESUPUESTOS
- **Campo monitoreado**: `Numero`
- Detecta nuevos números únicos que aparecen en esta tabla
- Rastrea cada número nuevo en tiempo real

### 📋 Información Mostrada para Cambios en PRESUPUESTOSPEDIDOS
- **CodigoNumero**: Código único del registro (CAMPO MONITOREADO)
- **Serie**: Serie del presupuesto pedido
- **Numero**: Número del presupuesto pedido
- **ClienteNombre**: Nombre del cliente
- **NombreUsuario**: Usuario que modificó el registro
- **FechaModificacion**: Fecha y hora de la última modificación
- **FechaCreacion**: Fecha de creación del registro
- **FechaMod**: Fecha de modificación alternativa
- **ExpTerminalesFecha**: Fecha de expiración de terminales
- **UpdateType**: PRESUPUESTOS_PEDIDOS

### 📊 Información Mostrada para Cambios en FPRESUPUESTOS
- **Serie**: Serie del presupuesto
- **Numero**: Número único del presupuesto (CAMPO MONITOREADO)
- **PresupsOrigen**: Presupuesto de origen (null si no existe)
- **NumeroManual**: Número manual del presupuesto (null si no existe)
- **ClienteNombre**: Nombre del cliente
- **NombreUsuario**: Usuario que modificó el presupuesto
- **FechaModificacion**: Fecha y hora de la última modificación
- **FechaCreacion**: Fecha de creación del presupuesto
- **FechaMod**: Fecha de modificación alternativa
- **ExpTerminalesFecha**: Fecha de expiración de terminales
- **UpdateType**: FPRESUPUESTOS

## 🏁 Análisis de Prioridad

El sistema determina automáticamente qué tabla se actualiza primero:

- **🥇 Solo PRESUPUESTOSPEDIDOS**: Cuando únicamente se detectan cambios en la tabla `presupuestospedidos`
- **🥇 Solo FPRESUPUESTOS**: Cuando únicamente se detectan cambios en la tabla `fpresupuestos`
- **⚡ AMBAS TABLAS**: Cuando ambas tablas tienen cambios en el mismo ciclo de monitoreo

## 📁 Archivos del Sistema

### `database-monitor.js`
Clase principal que maneja la lógica del monitoreo dual:
- Mantiene estado separado para dos tablas (`presupuestospedidos` y `fpresupuestos`)
- Compara registros actuales vs anteriores en ambas tablas
- Analiza prioridad de actualizaciones entre tablas
- Formatea la salida para mejor legibilidad con múltiples fechas
- Maneja errores de conexión
- Procesa valores null correctamente

### `start-monitor.js`
Script ejecutable que:
- Inicializa el monitor dual
- Verifica la conexión a BD para ambas tablas
- Maneja señales de terminación (Ctrl+C)
- Proporciona interfaz de usuario

## 💻 Uso

### Ejecutar el monitoreo dual
```bash
# Desde la raíz del proyecto
node src/monitoreos/start-monitor.js
```

### Integrar con el servidor principal (Recomendado)
```javascript
// En src/index.js
const DatabaseMonitor = require('./monitoreos/database-monitor');
const monitor = new DatabaseMonitor();

// Iniciar monitoreo dual junto con el servidor
setTimeout(() => {
  monitor.start();
}, 3000); // Esperar 3 segundos después del inicio del servidor
```

### Detener el monitoreo
- Presiona `Ctrl+C` en la terminal
- El sistema hará una parada elegante y limpiará los dos conjuntos de estado (presupuestospedidos y fpresupuestos)

## 📊 Salida del Sistema

### Conexión exitosa
```
🔧 Sistema de Monitoreo DUAL de Base de Datos - Felman
====================================================

🔌 Probando conexión a la base de datos...
✅ Conexión exitosa a AMBAS TABLAS:
   📋 presupuestospedidos: 892 registros
   📊 fpresupuestos: 1248 registros
   📝 Columnas presupuestospedidos: CodigoNumero, Serie, Numero, ClienteNombre, NombreUsuario, FechaModificacion, FechaCreacion, FechaMod, ExpTerminalesFecha
   📝 Columnas fpresupuestos: Serie, Numero, PresupsOrigen, NumeroManual, ClienteNombre, NombreUsuario, FechaModificacion, FechaCreacion, FechaMod, ExpTerminalesFecha

🚀 Iniciando monitoreo DUAL de presupuestos cada 5 segundos...
📊 Tablas monitoreadas: presupuestospedidos + fpresupuestos
🔢 Campos monitoreados: presupuestospedidos.CodigoNumero + fpresupuestos.Numero
🎯 Objetivo: Detectar qué tabla se actualiza primero
```

### Inicialización del estado
```
🔄 Inicializando estado del monitoreo DUAL (2 TABLAS)...
✅ Estado inicial guardado:
   📋 presupuestospedidos.CodigoNumero: 892 valores
   📊 fpresupuestos.Numero: 1248 valores
   🔢 Rango presupuestospedidos: 1 - 892
   🔢 Rango fpresupuestos: 1 - 1248
```

### Detección de cambios en PRESUPUESTOSPEDIDOS
```
🔍 [04/06/2025 14:30:15] Monitoreando cambios en presupuestos (DUAL: 2 TABLAS)...

📋 DETECTADOS 2 NUEVOS CÓDIGOS EN PRESUPUESTOSPEDIDOS:
   📝 Códigos nuevos: 893, 894

🎉 CAMBIOS DETECTADOS (2 actualizaciones):
═══════════════════════════════════════════════════════════════════════════════════════════════

📋 ACTUALIZACIONES EN PRESUPUESTOSPEDIDOS (2):

   📋 1. NUEVO CÓDIGO EN PRESUPUESTOSPEDIDOS:
      🔢 Código Número: 893
      🏷️  Serie: A
      📊 Número: 200
      👤 Cliente: EMPRESA XYZ C.A.
      👨‍💼 Usuario: JOSE.CHIRINOS
      📅 Fecha Modificación: 04/06/2025 14:30:12
      🗓️  Fecha Creación: 04/06/2025 14:30:12
      📆 Fecha Mod: 04/06/2025 14:30:12
      ⏰ Exp Terminales Fecha: null
      🔍 Tipo de Actualización: PRESUPUESTOS_PEDIDOS

🏁 ANÁLISIS DE PRIORIDAD:
   🥇 Solo la tabla PRESUPUESTOSPEDIDOS se actualizó en este ciclo
```

### Detección de cambios en FPRESUPUESTOS
```
🔍 [04/06/2025 14:31:20] Monitoreando cambios en presupuestos (DUAL: 2 TABLAS)...

📊 DETECTADOS 1 NUEVOS NÚMEROS EN FPRESUPUESTOS:
   📝 Números nuevos: 1249

🎉 CAMBIOS DETECTADOS (1 actualizaciones):
═══════════════════════════════════════════════════════════════════════════════════════════════

📊 ACTUALIZACIONES EN FPRESUPUESTOS (1):

   📋 1. NUEVO NÚMERO EN FPRESUPUESTOS:
      🏷️  Serie: B
      🔢 Número: 1249
      📊 Presupuesto Origen: 200
      📝 Número Manual: M-001
      👤 Cliente: CLIENTE ABC S.A.
      👨‍💼 Usuario: MARIA.LOPEZ
      📅 Fecha Modificación: 04/06/2025 14:31:18
      🗓️  Fecha Creación: 04/06/2025 14:31:18
      📆 Fecha Mod: 04/06/2025 14:31:18
      ⏰ Exp Terminales Fecha: 04/06/2025 23:59:59
      🔍 Tipo de Actualización: FPRESUPUESTOS

🏁 ANÁLISIS DE PRIORIDAD:
   🥇 Solo la tabla FPRESUPUESTOS se actualizó en este ciclo
```

### Detección de cambios SIMULTÁNEOS en AMBAS TABLAS
```
🔍 [04/06/2025 14:32:25] Monitoreando cambios en presupuestos (DUAL: 2 TABLAS)...

📋 DETECTADOS 1 NUEVOS CÓDIGOS EN PRESUPUESTOSPEDIDOS:
   📝 Códigos nuevos: 895

📊 DETECTADOS 2 NUEVOS NÚMEROS EN FPRESUPUESTOS:
   📝 Números nuevos: 1250, 1251

🎉 CAMBIOS DETECTADOS (3 actualizaciones):
═══════════════════════════════════════════════════════════════════════════════════════════════

📋 ACTUALIZACIONES EN PRESUPUESTOSPEDIDOS (1):

   📋 1. NUEVO CÓDIGO EN PRESUPUESTOSPEDIDOS:
      🔢 Código Número: 895
      ...

📊 ACTUALIZACIONES EN FPRESUPUESTOS (2):

   📋 1. NUEVO NÚMERO EN FPRESUPUESTOS:
      🏷️  Serie: C
      🔢 Número: 1250
      ...

   📋 2. NUEVO NÚMERO EN FPRESUPUESTOS:
      🏷️  Serie: D
      🔢 Número: 1251
      ...

🏁 ANÁLISIS DE PRIORIDAD:
   ⚡ Se detectaron cambios en AMBAS TABLAS en este ciclo
   📈 PRESUPUESTOSPEDIDOS: 1 cambios
   📈 FPRESUPUESTOS: 2 cambios
```

### Sin cambios detectados
```
🔍 [04/06/2025 14:33:30] Monitoreando cambios en presupuestos (DUAL: 2 TABLAS)...
   ✅ Sin cambios detectados en las dos tablas monitoreadas
```

## ⚙️ Configuración

El sistema usa la misma configuración de base de datos del proyecto principal (archivo `.env`):

```env
DB_HOST=192.168.1.81
DB_PORT=3306
DB_USER=consultas
DB_PASS=consultas
DB_NAME=z_felman2023
```

## 📋 Notas Técnicas

- **Intervalo**: 5 segundos (configurable en el código)
- **Método de detección**: Comparación de conjuntos de valores únicos entre consultas
- **Memoria**: Mantiene Sets de todos los valores de los campos monitoreados para comparación
- **Zona horaria**: Configurada para Venezuela (America/Caracas)
- **Manejo de errores**: Continúa funcionando aunque falle una consulta específica
- **Campos monitoreados**:
  - `presupuestospedidos.CodigoNumero` (números únicos)
  - `fpresupuestos.Numero` (números únicos)

## 🚀 Integración Opcional con el Servidor Principal

Si deseas que el monitoreo dual se inicie automáticamente con el servidor, puedes agregar estas líneas al final de `src/index.js`:

```javascript
// Iniciar monitoreo dual de base de datos (opcional)
if (process.env.ENABLE_DUAL_DB_MONITORING === 'true') {
  const DatabaseMonitor = require('./monitoreos/database-monitor');
  const dbMonitor = new DatabaseMonitor();
  
  setTimeout(() => {
    dbMonitor.start();
  }, 5000); // Esperar 5 segundos después del inicio del servidor
}
```

Y agregar en el `.env`:
```env
ENABLE_DUAL_DB_MONITORING=true
```

## 🔧 Personalización

### Cambiar el intervalo de monitoreo
En `database-monitor.js`, línea donde se define `setInterval`:
```javascript
// Cambiar de 5000ms (5 segundos) a otro valor
this.intervalId = setInterval(() => {
  this.monitorPresupuestos();
}, 10000); // 10 segundos
```

### Agregar más campos a monitorear
Para agregar más campos a las consultas de detalles, modificar los métodos:
- `getPresupuestoPedidoDetails()` para presupuestospedidos
- `getPresupuestoDetails()` para fpresupuestos

### Cambiar el formato de salida
Modificar el método `formatPresupuestoDetails()` para personalizar cómo se muestran los datos.

---

## 📞 Soporte

Para dudas o problemas con el sistema de monitoreo dual, revisar:
1. Conexión a la base de datos
2. Permisos del usuario `consultas` en ambas tablas
3. Existencia de las columnas monitoreadas
4. Logs de error en la consola

**Última actualización**: Junio 2025 - Sistema Dual (2 Tablas)
