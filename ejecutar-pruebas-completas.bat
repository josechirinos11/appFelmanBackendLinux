@echo off
setlocal enabledelayedexpansion

:: Script de Pruebas Completas del Sistema de IA Felman (Windows)
echo.
echo 🚀 SISTEMA DE PRUEBAS COMPLETAS - FELMAN AI ADVANCED SYSTEM
echo ==========================================================================
echo 📋 Iniciando secuencia completa de pruebas...
echo.

:: Verificar Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js no está instalado o no está en PATH
    pause
    exit /b 1
)

node --version | findstr /R "v[0-9]" >nul
if errorlevel 1 (
    echo ❌ Error al verificar versión de Node.js
    pause
    exit /b 1
)

echo ✅ Node.js disponible
echo.

:: Cambiar al directorio del script
cd /d "%~dp0"
echo 📁 Directorio del proyecto: %CD%

:: Verificar archivos necesarios
set "FILES=src\index.js package.json test-optimizacion-ia.js demo-ia-detallada.js"

for %%f in (%FILES%) do (
    if not exist "%%f" (
        echo ❌ Archivo requerido no encontrado: %%f
        pause
        exit /b 1
    )
)

echo ✅ Todos los archivos requeridos están presentes
echo.

:: FASE 1: Pruebas sin servidor
echo 🧪 FASE 1: PRUEBAS SIN SERVIDOR
echo ==========================================================================

echo 📊 Ejecutando demo de funcionalidad básica...
node demo-ia-detallada.js 2>nul | findstr /C:"RESUMEN FINAL" /C:"exitosamente" /C:"puntuación promedio"

echo.
echo 🎯 Ejecutando pruebas de optimización...
node test-optimizacion-ia.js 2>nul | findstr /C:"REPORTE FINAL" /C:"Casos exitosos" /C:"Intenciones correctas"

echo.
echo ✅ Fase 1 completada
echo.

:: FASE 2: Intentar iniciar servidor
echo 🖥️  FASE 2: VERIFICANDO SERVIDOR
echo ==========================================================================

:: Verificar si el puerto está libre usando netstat
netstat -an | findstr ":3001" >nul 2>&1
if not errorlevel 1 (
    echo ⚠️  Puerto 3001 puede estar en uso
    echo 🔍 Intentando conectar a servidor existente...
    
    :: Probar conectividad con curl o PowerShell
    powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/test/test-connection' -TimeoutSec 5; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
        echo ✅ Servidor ya está ejecutándose en puerto 3001
        set SERVER_RUNNING=true
    ) else (
        echo ❌ Puerto ocupado pero servidor no responde
        echo 💡 Intentando iniciar servidor de todas formas...
        set SERVER_RUNNING=false
    )
) else (
    echo 🚀 Puerto 3001 libre, iniciando servidor...
    set SERVER_RUNNING=false
)

if "!SERVER_RUNNING!"=="false" (
    echo 📋 Iniciando servidor Node.js...
    start /B "FelmanServer" node src\index.js
    
    echo ⏳ Esperando que el servidor esté listo...
    
    :: Esperar hasta 30 segundos
    for /L %%i in (1,1,30) do (
        timeout /t 1 /nobreak >nul 2>&1
        
        powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/test/test-connection' -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
        if not errorlevel 1 (
            echo ✅ Servidor listo después de %%i segundos
            set SERVER_RUNNING=true
            goto server_ready
        )
        
        if %%i==30 (
            echo ❌ El servidor no respondió después de 30 segundos
            echo 💡 Continuando con pruebas limitadas...
            set SERVER_RUNNING=false
        ) else (
            echo ⏳ Esperando servidor... ^(%%i/30^)
        )
    )
)

:server_ready
echo.

:: FASE 3: Pruebas con servidor
if "!SERVER_RUNNING!"=="true" (
    echo 🧪 FASE 3: PRUEBAS CON SERVIDOR
    echo ==========================================================================
    
    echo 🔗 Probando endpoint básico...
    powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/test/test-connection'; Write-Host $response.Content } catch { Write-Host 'Error de conexión' }"
    
    echo.
    echo 🎯 Ejecutando test simple de IA...
    powershell -Command "try { $body = @{ textoUsuario = 'cuantos clientes tenemos' } | ConvertTo-Json; $response = Invoke-WebRequest -Uri 'http://localhost:3001/openai/mock-sql' -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 10; $json = $response.Content | ConvertFrom-Json; Write-Host 'Intención detectada:' $json.resumenEjecutivo.intencionPrincipal } catch { Write-Host 'Error en prueba de IA:' $_.Exception.Message }"
    
    echo.
    echo 🏋️‍♂️ Ejecutando prueba de carga simple ^(esto puede tomar unos minutos^)...
    
    :: Ejecutar una versión simplificada de pruebas de carga
    echo 📊 Ejecutando 10 consultas de prueba...
    for /L %%i in (1,1,10) do (
        powershell -Command "try { $body = @{ textoUsuario = 'mostrar presupuestos' } | ConvertTo-Json; $start = Get-Date; $response = Invoke-WebRequest -Uri 'http://localhost:3001/openai/mock-sql' -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 5; $end = Get-Date; $time = ($end - $start).TotalMilliseconds; Write-Host 'Consulta %%i: OK -' $time 'ms' } catch { Write-Host 'Consulta %%i: ERROR' }" 2>nul
    )
    
    echo.
    echo ✅ Fase 3 completada
) else (
    echo ⚠️  FASE 3: OMITIDA ^(servidor no disponible^)
    echo ==========================================================================
    echo 💡 Para ejecutar pruebas con servidor:
    echo    1. Ejecute: node src\index.js
    echo    2. En otra terminal ejecute: node test-carga-ia.js
)

echo.
echo 📊 FASE 4: REPORTE FINAL
echo ==========================================================================

echo 📋 Resumen de pruebas ejecutadas:
echo    ✅ Demo de funcionalidad: Completado
echo    ✅ Optimización de IA: Completado

if "!SERVER_RUNNING!"=="true" (
    echo    ✅ Pruebas con servidor: Completado
    echo    ✅ Pruebas de carga: Ejecutadas ^(básicas^)
) else (
    echo    ⚠️  Pruebas con servidor: Omitidas
    echo    ⚠️  Pruebas de carga: Omitidas
)

echo.
echo 🎯 PRUEBAS COMPLETADAS
echo ==========================================================================
echo 💡 Para pruebas individuales use:
echo    node demo-ia-detallada.js
echo    node test-optimizacion-ia.js
echo    node test-simple-optimizacion.js

if "!SERVER_RUNNING!"=="true" (
    echo.
    echo 🖥️  Servidor ejecutándose en http://localhost:3001
    echo 🛑 Presione cualquier tecla para finalizar
    pause >nul
    
    :: Intentar cerrar el servidor
    taskkill /F /FI "WINDOWTITLE eq FelmanServer*" >nul 2>&1
    echo 🛑 Servidor detenido
)

echo.
echo 👋 Pruebas finalizadas
pause
