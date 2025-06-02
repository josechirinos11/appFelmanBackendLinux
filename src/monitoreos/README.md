# Sistema de Monitoreo de Base de Datos - Felman

Este sistema monitorea en tiempo real las tablas `fpresupuestoslineas` y `fpresupuestos` de la base de datos MySQL `z_felman2023`, detectando e informando sobre nuevos registros cada 5 segundos.

## Características

- ✅ Monitoreo en tiempo real cada 5 segundos
- 📊 Detecta nuevos registros en ambas tablas
- 🔍 Muestra información relevante de los registros nuevos
- 🕒 Timestamps con zona horaria de Venezuela
- 🛡️ Manejo robusto de errores
- 🔌 Verificación de conexión antes de iniciar

## Archivos

### `database-monitor.js`
Clase principal que maneja la lógica del monitoreo:
- Mantiene estado de los últimos registros consultados
- Compara registros actuales vs anteriores
- Formatea la salida para mejor legibilidad
- Maneja errores de conexión

### `start-monitor.js`
Script ejecutable que:
- Inicializa el monitor
- Verifica la conexión a BD
- Maneja señales de terminación (Ctrl+C)
- Proporciona interfaz de usuario

## Uso

### Ejecutar el monitoreo
```bash
# Desde la raíz del proyecto
node src/monitoreos/start-monitor.js
```

### Integrar con el servidor principal
```javascript
// En src/index.js (opcional)
const DatabaseMonitor = require('./monitoreos/database-monitor');
const monitor = new DatabaseMonitor();

// Iniciar monitoreo junto con el servidor
monitor.start();
```

### Detener el monitoreo
- Presiona `Ctrl+C` en la terminal
- El sistema hará una parada elegante

## Salida del sistema

### Conexión exitosa
```
🔧 Sistema de Monitoreo de Base de Datos - Felman
================================================

🔌 Probando conexión a la base de datos...
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
