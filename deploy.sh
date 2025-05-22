#!/bin/bash

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    echo "Docker no está instalado. Instalando Docker..."
    
    # Actualizar los repositorios
    sudo apt-get update
    
    # Instalar dependencias necesarias
    sudo apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        software-properties-common
    
    # Agregar la clave GPG oficial de Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
    
    # Agregar el repositorio de Docker
    sudo add-apt-repository \
        "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) \
        stable"
    
    # Actualizar los repositorios nuevamente
    sudo apt-get update
    
    # Instalar Docker
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    
    # Agregar el usuario actual al grupo docker para no usar sudo
    sudo usermod -aG docker $USER
    
    echo "Docker instalado correctamente. Por favor, cierra sesión y vuelve a iniciar sesión para que los cambios surtan efecto."
    echo "Después de reiniciar sesión, ejecuta este script nuevamente."
    exit 0
fi

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