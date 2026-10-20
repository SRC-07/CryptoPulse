import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.mongodb import init_mongo
from app.routers import health, crypto, forex


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialización no bloqueante de MongoDB (Db1 - Market Service)
    try:
        await init_mongo()
    except Exception:
        pass

    # Inicialización de PostgreSQL
    retries = 5
    while retries > 0:
        try:
            await init_db()
            break
        except Exception:
            retries -= 1
            if retries == 0:
                break
            await asyncio.sleep(2)

    yield



app = FastAPI(
    title="CryptoPulse - Market Service",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(crypto.router)
app.include_router(forex.router)


@app.get("/", tags=["Root"])
async def root():
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
