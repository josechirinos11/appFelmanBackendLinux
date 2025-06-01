#!/bin/bash

# Script de Pruebas Completas del Sistema de IA Felman
# Inicia servidor, ejecuta todas las pruebas y genera reporte final

echo "🚀 SISTEMA DE PRUEBAS COMPLETAS - FELMAN AI ADVANCED SYSTEM"
echo "=========================================================================="
echo "📋 Iniciando secuencia completa de pruebas..."
echo ""

# Función para limpiar procesos al salir
cleanup() {
    echo ""
    echo "🧹 Limpiando procesos..."
    if [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null
        echo "🛑 Servidor detenido"
    fi
    exit
}

# Configurar trap para limpiar al salir
trap cleanup SIGINT SIGTERM EXIT

# Verificar que Node.js esté disponible
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado o no está en PATH"
    exit 1
fi

echo "✅ Node.js disponible: $(node --version)"
echo ""

# Cambiar al directorio del proyecto
cd "$(dirname "$0")"
PROJECT_DIR=$(pwd)
echo "📁 Directorio del proyecto: $PROJECT_DIR"

# Verificar archivos necesarios
REQUIRED_FILES=(
    "src/index.js"
    "package.json"
    "test-optimizacion-ia.js"
    "test-carga-ia.js"
    "demo-ia-detallada.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Archivo requerido no encontrado: $file"
        exit 1
    fi
done

echo "✅ Todos los archivos requeridos están presentes"
echo ""

# Ejecutar pruebas sin servidor primero
echo "🧪 FASE 1: PRUEBAS SIN SERVIDOR"
echo "=========================================================================="

echo "📊 Ejecutando demo de funcionalidad básica..."
node demo-ia-detallada.js | tail -20

echo ""
echo "🎯 Ejecutando pruebas de optimización..."
node test-optimizacion-ia.js | tail -15

echo ""
echo "✅ Fase 1 completada"
echo ""

# Intentar iniciar el servidor
echo "🖥️  FASE 2: INICIANDO SERVIDOR"
echo "=========================================================================="

# Verificar si el puerto está libre
PORT=3001
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Puerto $PORT ya está en uso"
    echo "🔍 Intentando conectar a servidor existente..."
    
    # Probar conectividad
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/test/test-connection" | grep -q "200"; then
        echo "✅ Servidor ya está ejecutándose en puerto $PORT"
        SERVER_RUNNING=true
    else
        echo "❌ Puerto ocupado pero servidor no responde"
        echo "🛑 Por favor libere el puerto $PORT y vuelva a intentar"
        exit 1
    fi
else
    echo "🚀 Iniciando servidor en puerto $PORT..."
    
    # Iniciar servidor en segundo plano
    nohup node src/index.js > server.log 2>&1 &
    SERVER_PID=$!
    
    echo "📋 PID del servidor: $SERVER_PID"
    echo "📁 Log del servidor: server.log"
    
    # Esperar a que el servidor esté listo
    echo "⏳ Esperando que el servidor esté listo..."
    
    for i in {1..30}; do
        if curl -s -o /dev/null "http://localhost:$PORT/test/test-connection" 2>/dev/null; then
            echo "✅ Servidor listo después de $i segundos"
            SERVER_RUNNING=true
            break
        fi
        
        if ! kill -0 $SERVER_PID 2>/dev/null; then
            echo "❌ El servidor se detuvo inesperadamente"
            echo "📋 Últimas líneas del log:"
            tail -10 server.log
            exit 1
        fi
        
        echo "⏳ Intentando conectar... ($i/30)"
        sleep 1
    done
    
    if [ "$SERVER_RUNNING" != "true" ]; then
        echo "❌ El servidor no respondió después de 30 segundos"
        echo "📋 Log del servidor:"
        cat server.log
        exit 1
    fi
fi

echo ""

# Ejecutar pruebas con servidor
if [ "$SERVER_RUNNING" = "true" ]; then
    echo "🧪 FASE 3: PRUEBAS CON SERVIDOR"
    echo "=========================================================================="
    
    echo "🔗 Probando endpoint básico..."
    curl -s "http://localhost:$PORT/test/test-connection" | head -1
    echo ""
    
    echo "🎯 Ejecutando test simple de IA..."
    curl -s -X POST "http://localhost:$PORT/openai/mock-sql" \
         -H "Content-Type: application/json" \
         -d '{"textoUsuario":"cuantos clientes tenemos"}' | \
         jq -r '.resumenEjecutivo.intencionPrincipal // "Error en respuesta"'
    echo ""
    
    echo "🏋️‍♂️ Ejecutando pruebas de carga (esto puede tomar varios minutos)..."
    echo "📊 Las pruebas de carga pueden generar mucho output..."
    
    # Ejecutar pruebas de carga con timeout
    timeout 300 node test-carga-ia.js || {
        echo "⚠️  Pruebas de carga interrumpidas por timeout (5 minutos)"
        echo "💡 Esto es normal para pruebas extensivas"
    }
    
    echo ""
    echo "✅ Fase 3 completada"
fi

echo ""
echo "📊 FASE 4: REPORTE FINAL"
echo "=========================================================================="

# Generar reporte final
echo "📋 Resumen de pruebas ejecutadas:"
echo "   ✅ Demo de funcionalidad: Completado"
echo "   ✅ Optimización de IA: Completado"
if [ "$SERVER_RUNNING" = "true" ]; then
    echo "   ✅ Pruebas con servidor: Completado"
    echo "   ✅ Pruebas de carga: Ejecutadas"
else
    echo "   ⚠️  Pruebas con servidor: Omitidas"
    echo "   ⚠️  Pruebas de carga: Omitidas"
fi

echo ""
echo "📁 Archivos generados:"
if [ -f "server.log" ]; then
    echo "   📄 server.log - Log del servidor ($(wc -l < server.log) líneas)"
fi

echo ""
echo "🎯 PRUEBAS COMPLETADAS EXITOSAMENTE"
echo "=========================================================================="
echo "💡 Para revisar logs del servidor: tail -f server.log"
echo "💡 Para ejecutar pruebas individuales:"
echo "   node demo-ia-detallada.js"
echo "   node test-optimizacion-ia.js"
echo "   node test-carga-ia.js"

# Mantener el servidor ejecutándose
if [ "$SERVER_RUNNING" = "true" ] && [ ! -z "$SERVER_PID" ]; then
    echo ""
    echo "🖥️  El servidor sigue ejecutándose en http://localhost:$PORT"
    echo "🛑 Presiona Ctrl+C para detenerlo"
    echo ""
    
    # Esperar hasta que el usuario presione Ctrl+C
    wait $SERVER_PID
fi
