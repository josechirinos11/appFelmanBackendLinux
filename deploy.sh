#!/bin/bash

echo "🚀 Iniciando despliegue automático..."

cd /appFelmanBackendLinux || {
  echo "❌ Error: no se pudo acceder a /appFelmanBackendLinux"
  exit 1
}

echo "🧹 Descartando cambios en archivos generados..."
git checkout -- package-lock.json node_modules/.package-lock.json 2>/dev/null || true

echo "📥 Haciendo git pull..."
git pull origin main

if [ $? -ne 0 ]; then
  echo "❌ Error al hacer git pull"
  exit 1
fi

echo "♻️ Reiniciando PM2..."
pm2 restart appFelmanBackendLinux

if [ $? -ne 0 ]; then
  echo "❌ Error al reiniciar con pm2"
  exit 1
fi

echo "💾 Guardando estado de PM2..."
pm2 save

echo "✅ Despliegue completado correctamente."
