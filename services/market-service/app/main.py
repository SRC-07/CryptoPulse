"""
CryptoPulse - Market Service
Punto de entrada principal de la aplicación FastAPI.

Este microservicio se encarga de:
- Consumir la API de CoinGecko para precios de criptomonedas
- Consumir la API de Frankfurter para tasas de cambio de divisas
- Persistir los datos en PostgreSQL
- Exponer endpoints de health check para monitoreo de la arquitectura
"""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import health, crypto, forex


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gestiona el ciclo de vida de la aplicacion con reintentos para la conexion a la base de datos.
    """
    print("[STARTUP] Iniciando Market Service...")
    print("[STARTUP] Conectando con PostgreSQL...")
    retries = 10
    while retries > 0:
        try:
            await init_db()
            print("[STARTUP] Base de datos inicializada correctamente.")
            break
        except Exception as e:
            retries -= 1
            print(f"[STARTUP] Esperando a PostgreSQL ({retries} intentos restantes)... {e}")
            if retries == 0:
                print("[STARTUP] Iniciando en modo degradado (las tablas se reintentaran en la primera conexion).")
                break
            await asyncio.sleep(2)

    print("[STARTUP] Market Service listo para recibir peticiones.")
    yield
    print("[SHUTDOWN] Deteniendo Market Service...")


app = FastAPI(
    title="CryptoPulse - Market Service",
    description=(
        "Microservicio de datos de mercado para CryptoPulse. "
        "Consume APIs externas (CoinGecko, Frankfurter) y persiste datos en PostgreSQL."
    ),
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# Configurar CORS (permite peticiones desde el frontend React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers
app.include_router(health.router)
app.include_router(crypto.router)
app.include_router(forex.router)


@app.get("/", tags=["Root"])
async def root():
    """Endpoint raíz con información del servicio."""
    return {
        "service": "CryptoPulse Market Service",
        "version": "1.0.0",
        "framework": "FastAPI",
        "docs": "/api/docs",
        "health": "/api/health",
        "endpoints": {
            "crypto_prices": "/api/crypto/prices",
            "crypto_history": "/api/crypto/history",
            "forex_rates": "/api/forex/rates",
            "forex_history": "/api/forex/history",
            "health_full": "/api/health/full",
        },
    }
