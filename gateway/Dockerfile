FROM nginx:1.27-alpine

# Eliminar configuración por defecto de Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiar nuestra configuración de API Gateway
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
