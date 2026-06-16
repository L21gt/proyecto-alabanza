# Usa una imagen ligera de Node.js
FROM node:20-alpine

# Establece el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copia los archivos de dependencias y las instala
COPY package*.json ./
RUN npm install

# Copia el resto del código fuente
COPY . .

# Expone el puerto que usa tu API
EXPOSE 3000

# Comando para iniciar el servidor en modo desarrollo
CMD ["npm", "run", "dev"]