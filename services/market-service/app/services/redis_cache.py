import json
import logging
from typing import Optional, Any
from app.config import get_settings

logger = logging.getLogger("market.redis_cache")
settings = get_settings()

_redis_client = None


def get_redis_client():
    global _redis_client
    if _redis_client is None:
        try:
            import redis.asyncio as aioredis
            _redis_client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=2.0,
            )
        except Exception as e:
            logger.warning(f"No se pudo inicializar cliente Redis: {e}")
            _redis_client = None
    return _redis_client


async def get_cached(key: str) -> Optional[Any]:
    """Obtiene un valor serializado en JSON desde Redis 7."""
    try:
        client = get_redis_client()
        if client:
            val = await client.get(key)
            if val:
                return json.loads(val)
    except Exception as e:
        logger.debug(f"Fallo de lectura en caché Redis ({key}): {e}")
    return None


async def set_cached(key: str, data: Any, ttl: int = 30) -> None:
    """Almacena un valor en Redis 7 con tiempo de expiración (TTL)."""
    try:
        client = get_redis_client()
        if client:
            await client.setex(key, ttl, json.dumps(data))
    except Exception as e:
        logger.debug(f"Fallo de escritura en caché Redis ({key}): {e}")
