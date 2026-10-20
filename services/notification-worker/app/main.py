import os
import json
import time
import logging
from typing import Dict, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logger = logging.getLogger("notification-worker")
logging.basicConfig(level=logging.INFO)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
_redis_client = None


def get_redis():
    global _redis_client
    if _redis_client is None:
        try:
            import redis.asyncio as aioredis
            _redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
        except Exception as e:
            logger.warning(f"No se pudo conectar a Redis 7: {e}")
            _redis_client = None
    return _redis_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verificar Redis 7 al iniciar
    client = get_redis()
    if client:
        try:
            await client.ping()
            logger.info("Conectado exitosamente a Redis 7 (Db3: In-Memory - E3)")
        except Exception as e:
            logger.warning(f"Aviso de conexión a Redis: {e}")
    yield


app = FastAPI(
    title="CryptoPulse - Notification Worker (E3)",
    version="1.0.0",
    description="Worker asíncrono para colas de alertas de mercado y notificaciones de billetera respaldado por Redis 7.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class NotificationEvent(BaseModel):
    event: str
    payload: Dict[str, Any]


@app.post("/api/notifications/events")
async def receive_event(event_data: NotificationEvent):
    """
    Recibe eventos asíncronos desde Market Service (E1) o Portfolio Service (E2)
    y los encola en Redis 7 para despacho en tiempo real.
    """
    client = get_redis()
    event_dict = {
        "event": event_data.event,
        "payload": event_data.payload,
        "timestamp": time.time(),
    }

    if client:
        try:
            # Encolar en lista de Redis
            await client.lpush("cryptopulse:notifications:queue", json.dumps(event_dict))
            # Publicar en canal de pub/sub
            await client.publish("cryptopulse:notifications:channel", json.dumps(event_dict))
        except Exception as e:
            logger.warning(f"Error publicando en Redis: {e}")

    logger.info(f"[NOTIFICACIÓN ENCOLADA] Evento={event_data.event} para usuario={event_data.payload.get('user_id')}")

    return {
        "status": "queued",
        "event": event_data.event,
        "backend": "redis-7",
    }


@app.get("/api/health")
async def health_check():
    client = get_redis()
    redis_status = "unhealthy"
    latency_ms = None

    if client:
        try:
            start = time.time()
            await client.ping()
            latency_ms = round((time.time() - start) * 1000, 2)
            redis_status = "healthy"
        except Exception:
            redis_status = "unreachable"

    return {
        "service": "notification-worker",
        "status": "healthy",
        "database": {
            "name": "Redis 7",
            "type": "In-Memory - E3",
            "status": redis_status,
            "response_time_ms": latency_ms,
        },
    }
