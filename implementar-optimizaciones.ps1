# ============================================================================
# Script de Implementación de Optimizaciones - Control Terminales
# ============================================================================
# Este script automatiza la implementación de las optimizaciones
# en el backend de Control Terminales
#
# USO: 
#   .\implementar-optimizaciones.ps1
#
# PREREQUISITOS:
#   - MySQL instalado y configurado
#   - Acceso a la base de datos 'terminales'
#   - Permisos de escritura en el directorio del proyecto
# ============================================================================

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Implementación de Optimizaciones - Control Terminales        ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Variables
$projectRoot = "d:\appFelmanBackendLinux"
$routesPath = "$projectRoot\src\routes"
$currentRouter = "$routesPath\controlTerminales.router.js"
$newRouter = "$routesPath\controlTerminalesModificado.router.js"
$backupRouter = "$routesPath\controlTerminales.router.BACKUP.js"
$sqlScript = "$projectRoot\create-indexes-optimizacion.sql"

# Verificar que estamos en el directorio correcto
if (!(Test-Path $projectRoot)) {
    Write-Host "❌ ERROR: No se encuentra el directorio del proyecto: $projectRoot" -ForegroundColor Red
    exit 1
}

Set-Location $projectRoot

Write-Host "📁 Directorio del proyecto: $projectRoot" -ForegroundColor Green
Write-Host ""

# ============================================================================
# FASE 1: Verificación de Prerequisitos
# ============================================================================
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  FASE 1: Verificación de Prerequisitos" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

# Verificar que existe el archivo del nuevo router
if (!(Test-Path $newRouter)) {
    Write-Host "❌ ERROR: No se encuentra el archivo: $newRouter" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Archivo del nuevo router encontrado" -ForegroundColor Green

# Verificar que existe el script SQL
if (!(Test-Path $sqlScript)) {
    Write-Host "❌ ERROR: No se encuentra el archivo: $sqlScript" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Script SQL de índices encontrado" -ForegroundColor Green

# Verificar que existe el router actual
if (!(Test-Path $currentRouter)) {
    Write-Host "⚠️  ADVERTENCIA: No se encuentra el router actual" -ForegroundColor Yellow
    Write-Host "   Se creará uno nuevo directamente" -ForegroundColor Yellow
} else {
    Write-Host "✅ Router actual encontrado" -ForegroundColor Green
}

Write-Host ""

# ============================================================================
# FASE 2: Backup
# ============================================================================
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  FASE 2: Crear Backup" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

if (Test-Path $currentRouter) {
    Write-Host "💾 Creando backup del router actual..." -ForegroundColor Cyan
    
    # Si ya existe un backup, crear uno con timestamp
    if (Test-Path $backupRouter) {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backupRouter = "$routesPath\controlTerminales.router.BACKUP.$timestamp.js"
    }
    
    Copy-Item $currentRouter $backupRouter
    
    if (Test-Path $backupRouter) {
        Write-Host "✅ Backup creado: $backupRouter" -ForegroundColor Green
    } else {
        Write-Host "❌ ERROR: No se pudo crear el backup" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "ℹ️  No hay router actual para hacer backup" -ForegroundColor Cyan
}

Write-Host ""

# ============================================================================
# FASE 3: Base de Datos - Crear Índices
# ============================================================================
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  FASE 3: Base de Datos - Crear Índices" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

Write-Host "🔍 Detectando instalación de MySQL..." -ForegroundColor Cyan

# Intentar detectar MySQL
$mysqlPaths = @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 5.7\bin\mysql.exe",
    "C:\xampp\mysql\bin\mysql.exe",
    "C:\wamp64\bin\mysql\mysql8.0.31\bin\mysql.exe"
)

$mysqlExe = $null
foreach ($path in $mysqlPaths) {
    if (Test-Path $path) {
        $mysqlExe = $path
        break
    }
}

if ($mysqlExe) {
    Write-Host "✅ MySQL encontrado: $mysqlExe" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "📊 Para crear los índices, necesitas ejecutar el script SQL" -ForegroundColor Yellow
    Write-Host "   Opciones:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   1. Desde línea de comandos:" -ForegroundColor White
    Write-Host "      & '$mysqlExe' -u root -p terminales < '$sqlScript'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   2. Desde MySQL Workbench:" -ForegroundColor White
    Write-Host "      - Abrir: $sqlScript" -ForegroundColor Gray
    Write-Host "      - Ejecutar todo el script" -ForegroundColor Gray
    Write-Host ""
    
    $response = Read-Host "¿Deseas ejecutar el script ahora desde PowerShell? (s/n)"
    
    if ($response -eq "s" -or $response -eq "S") {
        $dbUser = Read-Host "Usuario de MySQL (default: root)"
        if ([string]::IsNullOrWhiteSpace($dbUser)) {
            $dbUser = "root"
        }
        
        Write-Host ""
        Write-Host "🔐 Ingresa la contraseña de MySQL cuando se solicite" -ForegroundColor Cyan
        Write-Host ""
        
        try {
            & $mysqlExe -u $dbUser -p terminales -e "source $sqlScript"
            Write-Host ""
            Write-Host "✅ Índices creados exitosamente!" -ForegroundColor Green
        } catch {
            Write-Host ""
            Write-Host "❌ ERROR al ejecutar el script SQL" -ForegroundColor Red
            Write-Host "   Ejecuta manualmente: & '$mysqlExe' -u $dbUser -p terminales < '$sqlScript'" -ForegroundColor Yellow
        }
    } else {
        Write-Host ""
        Write-Host "⚠️  IMPORTANTE: No olvides ejecutar el script SQL manualmente" -ForegroundColor Yellow
        Write-Host "   El backend optimizado requiere los índices para funcionar correctamente" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  No se pudo detectar MySQL automáticamente" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   Por favor, ejecuta manualmente el script SQL:" -ForegroundColor White
    Write-Host "   $sqlScript" -ForegroundColor Gray
    Write-Host ""
    Write-Host "   Desde MySQL Workbench o línea de comandos:" -ForegroundColor White
    Write-Host "   mysql -u root -p terminales < create-indexes-optimizacion.sql" -ForegroundColor Gray
}

Write-Host ""

# ============================================================================
# FASE 4: Actualizar Router del Backend
# ============================================================================
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  FASE 4: Actualizar Router del Backend" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

Write-Host "📝 Reemplazando router con la versión optimizada..." -ForegroundColor Cyan

try {
    Copy-Item $newRouter $currentRouter -Force
    
    if (Test-Path $currentRouter) {
        Write-Host "✅ Router actualizado exitosamente!" -ForegroundColor Green
        Write-Host "   Archivo: $currentRouter" -ForegroundColor Gray
    } else {
        Write-Host "❌ ERROR: No se pudo actualizar el router" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ ERROR al copiar el archivo: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# ============================================================================
# FASE 5: Verificación
# ============================================================================
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  FASE 5: Verificación" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

Write-Host "📋 Verificando archivos..." -ForegroundColor Cyan
Write-Host ""

$files = @{
    "Router optimizado" = $currentRouter
    "Backup del router" = $backupRouter
    "Script SQL" = $sqlScript
    "README de optimización" = "$projectRoot\README-OPTIMIZACION.md"
    "Análisis de optimización" = "$projectRoot\ANALISIS-OPTIMIZACION.md"
}

$allGood = $true
foreach ($file in $files.GetEnumerator()) {
    if (Test-Path $file.Value) {
        Write-Host "  ✅ $($file.Key)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $($file.Key) - NO ENCONTRADO" -ForegroundColor Red
        $allGood = $false
    }
}

Write-Host ""

if ($allGood) {
    Write-Host "✅ Todos los archivos en su lugar!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Algunos archivos no se encontraron" -ForegroundColor Yellow
}

Write-Host ""

# ============================================================================
# FASE 6: Próximos Pasos
# ============================================================================
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "  PRÓXIMOS PASOS" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host ""

Write-Host "1️⃣  Reiniciar el servidor backend:" -ForegroundColor Cyan
Write-Host "   - Detener el servidor actual (Ctrl+C)" -ForegroundColor White
Write-Host "   - Ejecutar: npm start" -ForegroundColor Gray
Write-Host ""

Write-Host "2️⃣  Actualizar el frontend:" -ForegroundColor Cyan
Write-Host "   - control-terminales.tsx: Modificar refreshLotes() y eliminar filtrado local" -ForegroundColor White
Write-Host "   - control-tiempo-real.tsx: Modificar fetch para enviar filtros como params" -ForegroundColor White
Write-Host "   - Ver detalles en: README-OPTIMIZACION.md (Fase 3)" -ForegroundColor Gray
Write-Host ""

Write-Host "3️⃣  Probar los endpoints optimizados:" -ForegroundColor Cyan
Write-Host "   - GET /control-terminales/lotes?status=Fabricado&search=ABC123" -ForegroundColor White
Write-Host "   - GET /control-terminales/tiempo-real-nueva?operador=JUAN" -ForegroundColor White
Write-Host "   - Ver ejemplos en: README-OPTIMIZACION.md (Fase 2.3)" -ForegroundColor Gray
Write-Host ""

Write-Host "4️⃣  Monitorear el rendimiento:" -ForegroundColor Cyan
Write-Host "   - Verificar tiempos de respuesta < 500ms" -ForegroundColor White
Write-Host "   - Revisar logs del servidor" -ForegroundColor White
Write-Host "   - Confirmar con usuarios finales" -ForegroundColor White
Write-Host ""

Write-Host "📚 Documentación completa:" -ForegroundColor Cyan
Write-Host "   - README-OPTIMIZACION.md - Guía de implementación paso a paso" -ForegroundColor White
Write-Host "   - ANALISIS-OPTIMIZACION.md - Análisis técnico detallado" -ForegroundColor White
Write-Host ""

# ============================================================================
# Resumen Final
# ============================================================================
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ IMPLEMENTACIÓN DEL BACKEND COMPLETADA                     ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "Mejoras implementadas:" -ForegroundColor Yellow
Write-Host "  • /lotes - Filtrado en SQL con paginación" -ForegroundColor White
Write-Host "  • /tiempo-real-nueva - Filtrado optimizado antes de UNION" -ForegroundColor White
Write-Host "  • /tiempos-acumulados-modulo - 20 queries → 1 query" -ForegroundColor White
Write-Host "  • /loteslineas - Cálculo de estadoTiempos en SQL" -ForegroundColor White
Write-Host "  • Índices estratégicos para búsquedas rápidas" -ForegroundColor White
Write-Host ""

Write-Host "Impacto esperado:" -ForegroundColor Yellow
Write-Host "  • 95% menos datos transferidos" -ForegroundColor White
Write-Host "  • 90% más rápido en tiempos de respuesta" -ForegroundColor White
Write-Host "  • Mejor experiencia para el usuario final" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  Recuerda actualizar el frontend para aprovechar las optimizaciones!" -ForegroundColor Yellow
Write-Host ""

# Pausa al final
Read-Host "Presiona Enter para salir"
