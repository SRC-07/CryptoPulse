import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import auth, wallet


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialización de tablas PostgreSQL 16 para usuarios y wallets
    retries = 10
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
    title="CryptoPulse - Portfolio & Auth Service (E2)",
    version="2.0.0",
    description="Servicio de autenticación JWT, billeteras personales aisladas y simulaciones de inversión.",
    docs_url="/api/docs",
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

app.include_router(auth.router)
app.include_router(wallet.router)


@app.get("/api/health", tags=["Salud"])
async def health_check():
    return {
        "service": "portfolio-service",
        "version": "2.0.0",
        "status": "healthy",
        "database": "postgresql-16",
        "features": [
            "JWT Authentication (Bcrypt)",
            "Isolated Wallets 1:1",
            "ACID Investment Simulations",
        ],
    }


@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "CryptoPulse Portfolio & Auth Service",
        "version": "2.0.0",
        "role": "Usuarios, Autenticación JWT, Billeteras Individuales y Simulaciones de Inversión",
        "database": "PostgreSQL 16 (Relacional - E2)",
        "endpoints": {
            "register": "/api/auth/register",
            "login": "/api/auth/login",
            "me": "/api/auth/me",
            "my_wallet": "/api/wallet/my-wallet",
            "simulate": "/api/wallet/simulate/order",
            "my_orders": "/api/wallet/my-orders",
            "health": "/api/health",
        },
    }
