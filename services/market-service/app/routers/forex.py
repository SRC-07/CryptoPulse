from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import ForexRate
from app.schemas import ForexRatesResponse, ForexRateResponse
from app.services.frankfurter import fetch_forex_rates

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
    try:
        result = await fetch_forex_rates(base=base, targets=targets)

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
