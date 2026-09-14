FROM python:3.12-slim

# Establecer directorio de trabajo
WORKDIR /app

# Copiar e instalar dependencias primero (aprovechar Docker cache)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código de la aplicación
COPY app/ ./app/

# Puerto interno del servicio
EXPOSE 8000

# Ejecutar con Uvicorn (servidor ASGI para FastAPI)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
