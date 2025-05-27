FROM node:18-alpine

# Instalar dependencias ODBC y mdbtools en Alpine


# Directorio de trabajo
WORKDIR /app

# Copiar y instalar dependencias Node.js
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto de la aplicación
EXPOSE 3000

# Comando para ejecutar la app
CMD ["npm", "start"]