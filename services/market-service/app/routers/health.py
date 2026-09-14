"""
CryptoPulse - Router de Monitoreo y Health Checks.
Verifica la disponibilidad y latencia de los componentes del sistema.
"""

import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db
from app.schemas import ServiceHealthResponse, FullHealthResponse
from app.services.coingecko import ping_coingecko
from app.services.frankfurter import ping_frankfurter

router = APIRouter(prefix="/api/health", tags=["Health Checks"])


@router.get("", response_model=ServiceHealthResponse)
async def health_check():
    """
    Health check basico del Market Service.
    Retorna si el servicio esta activo.
    """
    return ServiceHealthResponse(
        service="market-service",
        status="healthy",
        details={"version": "1.0.0", "framework": "FastAPI"},
    )


@router.get("/database", response_model=ServiceHealthResponse)
async def health_check_database(db: AsyncSession = Depends(get_db)):
    """
    Verifica la conexion con PostgreSQL ejecutando un SELECT 1.
    """
    start = time.time()
    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        elapsed_ms = round((time.time() - start) * 1000, 2)

        return ServiceHealthResponse(
            service="postgresql",
            status="healthy",
            response_time_ms=elapsed_ms,
            details={"query": "SELECT 1", "connection": "active"},
        )
    except Exception as e:
        elapsed_ms = round((time.time() - start) * 1000, 2)
        return ServiceHealthResponse(
            service="postgresql",
            status="unhealthy",
            response_time_ms=elapsed_ms,
            error=str(e),
        )


@router.get("/coingecko", response_model=ServiceHealthResponse)
async def health_check_coingecko():
    """
    Verifica la conexion con el proveedor de criptomonedas.
    """
    start = time.time()
    try:
        result = await ping_coingecko()
        elapsed_ms = round((time.time() - start) * 1000, 2)

        return ServiceHealthResponse(
            service="coingecko-api",
            status="healthy",
            response_time_ms=elapsed_ms,
            details=result,
        )
    except Exception as e:
        elapsed_ms = round((time.time() - start) * 1000, 2)
        return ServiceHealthResponse(
            service="coingecko-api",
            status="unhealthy",
            response_time_ms=elapsed_ms,
            error=str(e),
        )


@router.get("/forex", response_model=ServiceHealthResponse)
async def health_check_forex():
    """
    Verifica la conexion con el proveedor de divisas.
    """
    start = time.time()
    try:
        result = await ping_frankfurter()
        elapsed_ms = round((time.time() - start) * 1000, 2)

        return ServiceHealthResponse(
            service="forex-api",
            status="healthy",
            response_time_ms=elapsed_ms,
            details=result,
        )
    except Exception as e:
        elapsed_ms = round((time.time() - start) * 1000, 2)
        return ServiceHealthResponse(
            service="forex-api",
            status="unhealthy",
            response_time_ms=elapsed_ms,
            error=str(e),
        )


@router.get("/full", response_model=FullHealthResponse)
async def health_check_full(db: AsyncSession = Depends(get_db)):
    """
    Ejecuta el diagnostico completo de infraestructura y retorna un reporte consolidado.
    """
    checks = []

    # 1. Market Service
    checks.append(ServiceHealthResponse(
        service="market-service",
        status="healthy",
        details={"version": "1.0.0", "framework": "FastAPI"},
    ))

    # 2. PostgreSQL
    start = time.time()
    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        elapsed_ms = round((time.time() - start) * 1000, 2)
        checks.append(ServiceHealthResponse(
            service="postgresql",
            status="healthy",
            response_time_ms=elapsed_ms,
        ))
    except Exception as e:
        elapsed_ms = round((time.time() - start) * 1000, 2)
        checks.append(ServiceHealthResponse(
            service="postgresql",
            status="unhealthy",
            response_time_ms=elapsed_ms,
            error=str(e),
        ))

    # 3. CoinGecko API
    start = time.time()
    try:
        await ping_coingecko()
        elapsed_ms = round((time.time() - start) * 1000, 2)
        checks.append(ServiceHealthResponse(
            service="coingecko-api",
            status="healthy",
            response_time_ms=elapsed_ms,
        ))
    except Exception as e:
        elapsed_ms = round((time.time() - start) * 1000, 2)
        checks.append(ServiceHealthResponse(
            service="coingecko-api",
            status="unhealthy",
            response_time_ms=elapsed_ms,
            error=str(e),
        ))

    # 4. Forex API
    start = time.time()
    try:
        await ping_frankfurter()
        elapsed_ms = round((time.time() - start) * 1000, 2)
        checks.append(ServiceHealthResponse(
            service="forex-api",
            status="healthy",
            response_time_ms=elapsed_ms,
        ))
    except Exception as e:
        elapsed_ms = round((time.time() - start) * 1000, 2)
        checks.append(ServiceHealthResponse(
            service="forex-api",
            status="unhealthy",
            response_time_ms=elapsed_ms,
            error=str(e),
        ))

    # Calcular estado global
    healthy_count = sum(1 for c in checks if c.status == "healthy")
    total_count = len(checks)

    if healthy_count == total_count:
        overall_status = "healthy"
    elif healthy_count > 0:
        overall_status = "degraded"
    else:
        overall_status = "unhealthy"

    return FullHealthResponse(
        status=overall_status,
        timestamp=datetime.now(timezone.utc),
        checks=checks,
        summary={
            "total": total_count,
            "healthy": healthy_count,
            "unhealthy": total_count - healthy_count,
        },
    )
