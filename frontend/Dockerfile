# ============================================
# Stage 1: Build React App
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package files e instalar dependencias
COPY package.json ./
RUN npm install

# Copiar código fuente y compilar
COPY . .
RUN npm run build

# ============================================
# Stage 2: Serve con Nginx
# ============================================
FROM nginx:1.27-alpine

# Eliminar configuración por defecto
RUN rm /etc/nginx/conf.d/default.conf

# Copiar configuración personalizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos compilados de React
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
