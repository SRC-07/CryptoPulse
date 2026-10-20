from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.database import get_db
from app.models import CryptoAsset
from app.schemas import CryptoPricesResponse, CryptoAssetResponse
from app.services.coingecko import fetch_crypto_prices
from app.mongodb import save_crypto_ticks, get_crypto_history_from_mongo
from app.services.redis_cache import get_cached, set_cached
from app.services.circuit_breaker import coingecko_breaker

router = APIRouter(prefix="/api/crypto", tags=["Criptomonedas"])


@router.get("/prices", response_model=CryptoPricesResponse)
async def get_crypto_prices(
    vs_currency: str = Query(default="usd", description="Moneda de referencia (usd, eur, cop)"),
    per_page: int = Query(default=10, ge=1, le=50, description="Cantidad de criptos a obtener"),
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"crypto:prices:{vs_currency.lower()}:{per_page}"

    # 1. Capa de Rendimiento: Caché Distribuido en Redis 7 (L1)
    cached_payload = await get_cached(cache_key)
    if cached_payload:
        return CryptoPricesResponse(
            status="success",
            source="redis-cache-l1",
            count=cached_payload["count"],
            data=[CryptoAssetResponse(**item) for item in cached_payload["data"]],
        )

    # 2. Capa de Confiabilidad: Verificación del Cortacircuitos (Circuit Breaker)
    if not coingecko_breaker.can_execute():
        # Circuito ABIERTO: Fallback inmediato a MongoDB 7 para evitar timeouts
        try:
            mongo_fallback = await get_crypto_history_from_mongo(limit=per_page)
            if mongo_fallback:
                return CryptoPricesResponse(
                    status="success",
                    source="mongodb-circuit-fallback",
                    count=len(mongo_fallback),
                    data=[CryptoAssetResponse(**rec) for rec in mongo_fallback],
                )
        except Exception:
            pass

    # 3. Consulta al proveedor externo con captura de fallos
    try:
        result = await fetch_crypto_prices(
            vs_currency=vs_currency,
            per_page=per_page,
        )

        # Registrar éxito en el Circuit Breaker
        coingecko_breaker.record_success()

        # Almacenar en Caché Redis 7 con TTL de 30 segundos
        await set_cached(cache_key, result, ttl=30)

        # Persistencia en MongoDB 7 (Documental - E1 para cambios e histórico)
        try:
            await save_crypto_ticks(result.get("data", []))
        except Exception:
            pass

        # Persistencia relacional secundaria en PostgreSQL
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
        # Registrar fallo en el cortacircuitos
        coingecko_breaker.record_failure()

        # Fallback a MongoDB 7
        try:
            mongo_fallback = await get_crypto_history_from_mongo(limit=per_page)
            if mongo_fallback:
                return CryptoPricesResponse(
                    status="success",
                    source="mongodb-fallback",
                    count=len(mongo_fallback),
                    data=[CryptoAssetResponse(**rec) for rec in mongo_fallback],
                )
        except Exception:
            pass

        raise HTTPException(
            status_code=500,
            detail=f"Error en servicio de criptomonedas (Circuit breaker registrado): {str(e)}",
        )


@router.get("/history", response_model=CryptoPricesResponse)
async def get_crypto_history(
    limit: int = Query(default=20, ge=1, le=100, description="Cantidad de registros"),
    symbol: str = Query(default=None, description="Filtrar por simbolo (ej: BTC)"),
    db: AsyncSession = Depends(get_db),
):
    try:
        # 1. Consulta primaria en MongoDB 7 (Documental)
        try:
            mongo_records = await get_crypto_history_from_mongo(symbol=symbol, limit=limit)
            if mongo_records:
                return CryptoPricesResponse(
                    status="success",
                    source="mongodb-7",
                    count=len(mongo_records),
                    data=[CryptoAssetResponse(**rec) for rec in mongo_records],
                )
        except Exception:
            pass

        # 2. Fallback a PostgreSQL
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


@router.get("/circuit-breaker", tags=["Confiabilidad"])
async def get_circuit_breaker_status():
    """Retorna el estado de operatividad del Circuit Breaker de CoinGecko."""
    return {
        "service": "coingecko-circuit-breaker",
        "metrics": coingecko_breaker.get_metrics(),
    }
