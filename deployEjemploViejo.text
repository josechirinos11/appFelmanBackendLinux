#!/bin/bash

# Verificar si el usuario tiene permisos de sudo
if ! sudo -v &> /dev/null; then
    echo "Error: No tienes permisos de sudo. Por favor, contacta al administrador del sistema."
    exit 1
fi

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
        gnupg \
        lsb-release

    # Agregar la clave GPG oficial de Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

    # Agregar el repositorio de Docker
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Actualizar los repositorios nuevamente
    sudo apt-get update

    # Instalar Docker
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io

    # Crear el grupo docker si no existe
    sudo groupadd docker || true

    # Agregar el usuario actual al grupo docker
    sudo usermod -aG docker $USER

    # Iniciar el servicio de Docker
    sudo systemctl start docker
    sudo systemctl enable docker

    echo "Docker instalado correctamente."
    echo "Por favor, ejecuta los siguientes comandos manualmente:"
    echo "1. newgrp docker"
    echo "2. ./deploy.sh"
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