# 🔍 Sistema de Monitoreo DUAL de Base de Datos - Felman

Sistema automatizado para monitorear cambios en presupuestos de la base de datos MySQL con **DOBLE DETECCIÓN**.

## 📋 Características Principales

- **Monitoreo DUAL en tiempo real** de la tabla `fpresupuestos`
- **Detección simultánea** de cambios en columnas `Numero` y `PresupsOrigen`
- **Análisis de prioridad** para determinar qué columna se actualiza primero
- **Estado persistente** que se mantiene durante la ejecución
- **Información detallada** de cada cambio detectado
- **Ejecución automática** junto con el servidor principal
- **Manejo de valores null** mostrados como "null"

## 🎯 Campos Monitoreados

El sistema monitorea **DOS COLUMNAS** simultáneamente:

### 🔢 Monitoreo por NÚMERO
- Detecta nuevos valores únicos en la columna `Numero`
- Rastrea cada número nuevo que aparece en la tabla

### 📊 Monitoreo por PRESUP ORIGEN  
- Detecta nuevos valores únicos en la columna `PresupsOrigen`
- Rastrea cada valor de origen nuevo que aparece en la tabla

### 📋 Información Mostrada para Cada Cambio
- **Serie**: Serie del presupuesto
- **Numero**: Número único del presupuesto  
- **PresupsOrigen**: Presupuesto de origen (null si no existe)
- **ClienteNombre**: Nombre del cliente
- **NombreUsuario**: Usuario que modificó el presupuesto
- **FechaModificacion**: Fecha y hora de la última modificación
- **UpdateType**: Tipo de actualización (NUMERO o PRESUP_ORIGEN)

## 🏁 Análisis de Prioridad

El sistema determina automáticamente qué columna se actualiza primero:

- **🥇 Solo NÚMERO**: Cuando únicamente cambia la columna `Numero`
- **🥇 Solo PRESUPS ORIGEN**: Cuando únicamente cambia la columna `PresupsOrigen`  
- **⚡ AMBAS COLUMNAS**: Cuando ambas columnas cambian en el mismo ciclo de monitoreo

## Archivos

### `database-monitor.js`
Clase principal que maneja la lógica del monitoreo dual:
- Mantiene estado separado para ambas columnas (`Numero` y `PresupsOrigen`)
- Compara registros actuales vs anteriores en ambas columnas
- Analiza prioridad de actualizaciones
- Formatea la salida para mejor legibilidad
- Maneja errores de conexión
- Procesa valores null correctamente

### `start-monitor.js`
Script ejecutable que:
- Inicializa el monitor dual
- Verifica la conexión a BD
- Maneja señales de terminación (Ctrl+C)
- Proporciona interfaz de usuario

## Uso

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
- El sistema hará una parada elegante y limpiará ambos conjuntos de estado

## 📊 Salida del Sistema

### Conexión exitosa
```
🔧 Sistema de Monitoreo DUAL de Base de Datos - Felman
====================================================

🔌 Probando conexión a la base de datos...
✅ Conexión exitosa:
   📋 fpresupuestos: 1248 registros
   📝 Columnas disponibles: Serie, Numero, PresupsOrigen, ClienteNombre, NombreUsuario, FechaModificacion

🚀 Iniciando monitoreo DUAL de presupuestos cada 5 segundos...
📊 Tabla monitoreada: fpresupuestos
🔢 Columnas monitoreadas: Numero + PresupsOrigen
🎯 Objetivo: Detectar cuál columna se actualiza primero
```

### Inicialización del estado
```
🔄 Inicializando estado del monitoreo dual...
✅ Estado inicial guardado:
   📊 Números de presupuestos: 1248 valores
   📋 Valores de PresupsOrigen: 156 valores únicos
   🔢 Rango de números: 1 - 1248
```

### Detección de cambios en NÚMERO
```
🔍 [03/06/2025 14:30:15] Monitoreando cambios en presupuestos (DUAL: Numero + PresupsOrigen)...

🔢 DETECTADOS 2 NUEVOS NÚMEROS:
   📝 Números nuevos: 1249, 1250

🎉 CAMBIOS DETECTADOS (2 actualizaciones):
══════════════════════════════════════════════════════════════════════════════════════

🔢 ACTUALIZACIONES POR NÚMERO (2):

   📋 1. NUEVO NÚMERO DETECTADO:
      🏷️  Serie: A
      🔢 Número: 1249
      📊 Presupuesto Origen: null
      👤 Cliente: EMPRESA XYZ C.A.
      👨‍💼 Usuario: JOSE.CHIRINOS
      📅 Fecha Modificación: 03/06/2025 14:30:12
      🔍 Tipo de Actualización: NUMERO

🏁 ANÁLISIS DE PRIORIDAD:
   🥇 Solo la columna NÚMERO se actualizó en este ciclo
```

### Detección de cambios en PRESUP ORIGEN
```
🔍 [03/06/2025 14:31:20] Monitoreando cambios en presupuestos (DUAL: Numero + PresupsOrigen)...

📊 DETECTADOS 1 NUEVOS VALORES DE PRESUP ORIGEN:
   📝 Valores nuevos: 1200

🎉 CAMBIOS DETECTADOS (1 actualizaciones):
══════════════════════════════════════════════════════════════════════════════════════

📊 ACTUALIZACIONES POR PRESUP ORIGEN (1):

   📋 1. NUEVO PRESUP ORIGEN DETECTADO:
      🏷️  Serie: B
      🔢 Número: 1251
      📊 Presupuesto Origen: 1200
      👤 Cliente: CLIENTE ABC S.A.
      👨‍💼 Usuario: MARIA.LOPEZ
      📅 Fecha Modificación: 03/06/2025 14:31:18
      🔍 Tipo de Actualización: PRESUP_ORIGEN

🏁 ANÁLISIS DE PRIORIDAD:
   🥇 Solo la columna PRESUP ORIGEN se actualizó en este ciclo
```

### Detección de cambios SIMULTÁNEOS
```
🎉 CAMBIOS DETECTADOS (3 actualizaciones):
══════════════════════════════════════════════════════════════════════════════════════

🔢 ACTUALIZACIONES POR NÚMERO (2):
📊 ACTUALIZACIONES POR PRESUP ORIGEN (1):

🏁 ANÁLISIS DE PRIORIDAD:
   ⚡ Se detectaron cambios en AMBAS columnas en este ciclo
   📈 Número: 2 cambios
   📈 PresupsOrigen: 1 cambios
```
✅ Conexión exitosa:
   📋 fpresupuestoslineas: 1250 registros
   📋 fpresupuestos: 320 registros

🚀 Iniciando monitoreo de base de datos cada 5 segundos...
📊 Tablas monitoreadas: fpresupuestoslineas, fpresupuestos
```

### Durante el monitoreo
```
🔍 [02/06/2025 14:30:15] Monitoreando base de datos...
   ✅ Sin cambios detectados

🔍 [02/06/2025 14:30:20] Monitoreando base de datos...

🆕 NUEVOS REGISTROS en fpresupuestoslineas (2):
   1. Presupuesto: A/1001 | Artículo: ART001 | Cantidad: 5 | Precio: 25.50
   2. Presupuesto: A/1001 | Artículo: ART002 | Cantidad: 2 | Precio: 15.75

🆕 NUEVOS REGISTROS en fpresupuestos (1):
   1. Presupuesto: A/1001 | Cliente: CLI001 | Fecha: 2025-06-02 | Total: 82.75
```

## Configuración

El sistema usa la misma configuración de base de datos del proyecto principal (archivo `.env`):

```env
DB_HOST=192.168.1.81
DB_PORT=3306
DB_USER=consultas
DB_PASS=consultas
DB_NAME=z_felman2023
```

## Notas técnicas

- **Intervalo**: 5 segundos (configurable en el código)
- **Método de detección**: Comparación de IDs únicos entre consultas
- **Memoria**: Mantiene los últimos 5 registros de cada tabla para comparación
- **Zona horaria**: Configurada para Venezuela (America/Caracas)
- **Manejo de errores**: Continúa funcionando aunque falle una consulta específica

## Integración opcional con el servidor principal

Si deseas que el monitoreo se inicie automáticamente con el servidor, puedes agregar estas líneas al final de `src/index.js`:

```javascript
// Iniciar monitoreo de base de datos (opcional)
if (process.env.ENABLE_DB_MONITORING === 'true') {
  const DatabaseMonitor = require('./monitoreos/database-monitor');
  const dbMonitor = new DatabaseMonitor();
  
  setTimeout(() => {
    dbMonitor.start();
  }, 5000); // Esperar 5 segundos después del inicio del servidor
}
```

Y agregar en el `.env`:
```env
ENABLE_DB_MONITORING=true
```
