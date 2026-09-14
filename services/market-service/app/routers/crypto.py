from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import CryptoAsset
from app.schemas import CryptoPricesResponse, CryptoAssetResponse
from app.services.coingecko import fetch_crypto_prices

router = APIRouter(prefix="/api/crypto", tags=["Criptomonedas"])


@router.get("/prices", response_model=CryptoPricesResponse)
async def get_crypto_prices(
    vs_currency: str = Query(default="usd", description="Moneda de referencia (usd, eur, cop)"),
    per_page: int = Query(default=10, ge=1, le=50, description="Cantidad de criptos a obtener"),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await fetch_crypto_prices(
            vs_currency=vs_currency,
            per_page=per_page,
        )

        try:
            for coin_data in result["data"]:
                crypto = CryptoAsset(
                    coin_id=coin_data["coin_id"],
                    symbol=coin_data["symbol"],
                    name=coin_data["name"],
                    current_price=coin_data["current_price"],
                    market_cap=coin_data.get("market_cap"),
                    price_change_24h=coin_data.get("price_change_24h"),
                    price_change_percentage_24h=coin_data.get("price_change_percentage_24h"),
                    total_volume=coin_data.get("total_volume"),
                    image_url=coin_data.get("image_url"),
                    last_updated=datetime.now(timezone.utc),
                )
                db.add(crypto)
            await db.flush()
        except Exception:
            pass

        return CryptoPricesResponse(
            status="success",
            source=result.get("source", "coingecko"),
            count=result["count"],
            data=[CryptoAssetResponse(**coin) for coin in result["data"]],
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en servicio de criptomonedas: {str(e)}",
        )


@router.get("/history", response_model=CryptoPricesResponse)
async def get_crypto_history(
    limit: int = Query(default=20, ge=1, le=100, description="Cantidad de registros"),
    symbol: str = Query(default=None, description="Filtrar por simbolo (ej: BTC)"),
    db: AsyncSession = Depends(get_db),
):
    try:
        query = select(CryptoAsset).order_by(desc(CryptoAsset.created_at))

        if symbol:
            query = query.where(CryptoAsset.symbol == symbol.upper())

        query = query.limit(limit)
        result = await db.execute(query)
        records = result.scalars().all()

        return CryptoPricesResponse(
            status="success",
            source="postgresql",
            count=len(records),
            data=[CryptoAssetResponse.model_validate(record) for record in records],
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al consultar historial: {str(e)}",
        )
