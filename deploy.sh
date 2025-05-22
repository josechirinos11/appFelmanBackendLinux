#!/bin/bash

# Construir la imagen Docker
echo "Construyendo imagen Docker..."
docker build -t app-felman-backend .

# Detener y eliminar el contenedor si existe
echo "Deteniendo contenedor existente si existe..."
docker stop app-felman || true
docker rm app-felman || true

# Ejecutar el nuevo contenedor
echo "Iniciando nuevo contenedor..."
docker run -d -p 3000:3000 --name app-felman app-felman-backend

# Verificar que el contenedor está corriendo
echo "Verificando estado del contenedor..."
docker ps | grep app-felman

echo "¡Despliegue completado! La aplicación está corriendo en http://85.59.0.105:3000"