from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import ForexRate
from app.schemas import ForexRatesResponse, ForexRateResponse
from app.services.frankfurter import fetch_forex_rates
from app.mongodb import save_forex_ticks
from app.services.redis_cache import get_cached, set_cached

router = APIRouter(prefix="/api/forex", tags=["Tasas de Cambio"])


@router.get("/rates", response_model=ForexRatesResponse)
async def get_forex_rates(
    base: str = Query(default="USD", description="Moneda base (ej: USD, EUR, COP)"),
    targets: str = Query(
        default="COP,EUR,GBP,JPY,BRL,MXN,CAD,AUD",
        description="Monedas objetivo separadas por coma",
    ),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"forex:rates:{base.upper()}:{targets}"

    # 1. Capa de Rendimiento: Caché Distribuido en Redis 7 (L1)
    cached_payload = await get_cached(cache_key)
    if cached_payload:
        return ForexRatesResponse(
            status="success",
            source="redis-cache-l1",
            base=cached_payload["base"],
            rates=cached_payload["rates"],
            data=[ForexRateResponse(**rate) for rate in cached_payload["data"]],
        )

    try:
        result = await fetch_forex_rates(base=base, targets=targets)

        # Almacenar en Caché Redis 7 con TTL de 60 segundos
        await set_cached(cache_key, result, ttl=60)

        # 1. Persistencia primaria en MongoDB 7 (Documental - E1)
        try:
            await save_forex_ticks(base=base, rates_data=result.get("data", []))
        except Exception:
            pass

        # 2. Persistencia secundaria en PostgreSQL
        try:
            for rate_data in result["data"]:
                forex = ForexRate(
                    base_currency=rate_data["base_currency"],
                    target_currency=rate_data["target_currency"],
                    rate=rate_data["rate"],
                    last_updated=datetime.now(timezone.utc),
                )
                db.add(forex)
            await db.flush()
        except Exception:
            pass


        return ForexRatesResponse(
            status="success",
            source=result.get("source", "forex-service"),
            base=result["base"],
            rates=result["rates"],
            data=[ForexRateResponse(**rate) for rate in result["data"]],
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en servicio de divisas: {str(e)}",
        )


@router.get("/history", response_model=ForexRatesResponse)
async def get_forex_history(
    base: str = Query(default="USD", description="Filtrar por moneda base"),
    limit: int = Query(default=20, ge=1, le=100, description="Cantidad de registros"),
    db: AsyncSession = Depends(get_db),
):
    try:
        query = (
            select(ForexRate)
            .where(ForexRate.base_currency == base.upper())
            .order_by(desc(ForexRate.created_at))
            .limit(limit)
        )
        result = await db.execute(query)
        records = result.scalars().all()

        rates_dict = {}
        for record in records:
            rates_dict[record.target_currency] = record.rate

        return ForexRatesResponse(
            status="success",
            source="postgresql",
            base=base.upper(),
            rates=rates_dict,
            data=[ForexRateResponse.model_validate(record) for record in records],
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al consultar historial: {str(e)}",
        )
