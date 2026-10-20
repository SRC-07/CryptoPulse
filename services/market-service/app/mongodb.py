import time
import logging
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from app.config import get_settings

logger = logging.getLogger("market-service.mongodb")
settings = get_settings()

_mongo_client = None
_mongo_db = None


def get_mongo_client():
    global _mongo_client
    if _mongo_client is None:
        try:
            from motor.motor_asyncio import AsyncIOMotorClient
            _mongo_client = AsyncIOMotorClient(
                settings.MONGO_URI,
                serverSelectionTimeoutMS=3000,
            )
        except Exception as e:
            logger.warning(f"No se pudo inicializar Motor AsyncIOMotorClient: {e}")
            _mongo_client = None
    return _mongo_client


def get_mongo_db():
    global _mongo_db
    if _mongo_db is None:
        client = get_mongo_client()
        if client is not None:
            _mongo_db = client[settings.MONGO_DB]
    return _mongo_db


async def init_mongo():
    """Inicializa la conexión con MongoDB 7 y crea índices optimizados para registros de cambios."""
    try:
        db = get_mongo_db()
        if db is not None:
            # Colección de cotizaciones e histórico de cambios de criptomonedas
            await db.crypto_price_ticks.create_index([("symbol", 1), ("created_at", -1)])
            await db.crypto_price_ticks.create_index([("coin_id", 1), ("created_at", -1)])
            await db.crypto_price_ticks.create_index([("created_at", -1)])

            # Colección de tasas de cambio Forex
            await db.forex_rate_ticks.create_index([("base_currency", 1), ("created_at", -1)])
            logger.info("Conexión con MongoDB 7 establecida e índices verificados.")
    except Exception as e:
        logger.warning(f"Advertencia al inicializar MongoDB 7: {e}")


async def save_crypto_ticks(coins: List[Dict[str, Any]]):
    """Guarda registros de cambios y cotizaciones de criptomonedas en MongoDB (Documental - E1)."""
    try:
        db = get_mongo_db()
        if db is None or not coins:
            return

        now = datetime.now(timezone.utc)
        documents = []
        for coin in coins:
            documents.append({
                "coin_id": coin.get("coin_id"),
                "symbol": str(coin.get("symbol", "")).upper(),
                "name": coin.get("name"),
                "current_price": float(coin.get("current_price", 0.0)),
                "market_cap": coin.get("market_cap"),
                "price_change_24h": coin.get("price_change_24h"),
                "price_change_percentage_24h": coin.get("price_change_percentage_24h"),
                "total_volume": coin.get("total_volume"),
                "image_url": coin.get("image_url"),
                "created_at": now,
            })

        if documents:
            await db.crypto_price_ticks.insert_many(documents, ordered=False)
    except Exception as e:
        logger.debug(f"Fallo no crítico al persistir en MongoDB: {e}")


async def get_crypto_history_from_mongo(symbol: Optional[str] = None, limit: int = 20) -> List[Dict[str, Any]]:
    """Consulta el historial de cambios de criptomonedas desde MongoDB 7."""
    try:
        db = get_mongo_db()
        if db is None:
            return []

        filter_query = {}
        if symbol:
            filter_query["symbol"] = symbol.upper()

        cursor = db.crypto_price_ticks.find(filter_query).sort("created_at", -1).limit(limit)
        results = await cursor.to_list(length=limit)

        formatted = []
        for doc in results:
            doc_id = str(doc.get("_id", ""))
            formatted.append({
                "id": doc.get("id", doc_id),
                "coin_id": doc.get("coin_id"),
                "symbol": doc.get("symbol"),
                "name": doc.get("name"),
                "current_price": doc.get("current_price"),
                "market_cap": doc.get("market_cap"),
                "price_change_24h": doc.get("price_change_24h"),
                "price_change_percentage_24h": doc.get("price_change_percentage_24h"),
                "total_volume": doc.get("total_volume"),
                "image_url": doc.get("image_url"),
                "last_updated": doc.get("created_at"),
                "created_at": doc.get("created_at"),
            })
        return formatted
    except Exception as e:
        logger.warning(f"Error consultando historial en MongoDB: {e}")
        return []


async def save_forex_ticks(base: str, rates_data: List[Dict[str, Any]]):
    """Guarda registros de tasas Forex en MongoDB 7."""
    try:
        db = get_mongo_db()
        if db is None or not rates_data:
            return

        now = datetime.now(timezone.utc)
        documents = []
        for r in rates_data:
            documents.append({
                "base_currency": base.upper(),
                "target_currency": str(r.get("target_currency", "")).upper(),
                "rate": float(r.get("rate", 0.0)),
                "created_at": now,
            })

        if documents:
            await db.forex_rate_ticks.insert_many(documents, ordered=False)
    except Exception as e:
        logger.debug(f"Fallo no crítico persistiendo tasas Forex en MongoDB: {e}")


async def ping_mongo() -> Dict[str, Any]:
    """Comprueba la conectividad y latencia hacia MongoDB 7."""
    client = get_mongo_client()
    if client is None:
        raise ConnectionError("Cliente MongoDB no inicializado")

    start = time.time()
    await client.admin.command("ping")
    elapsed_ms = round((time.time() - start) * 1000, 2)
    return {
        "status": "healthy",
        "service": "mongodb-7",
        "response_time_ms": elapsed_ms,
        "database": settings.MONGO_DB,
    }
