import os
import json
import time
import logging
from typing import Dict, Any, List, Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logger = logging.getLogger("notification-worker")
logging.basicConfig(level=logging.INFO)

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379/0")
_redis_client = None

# Almacén en memoria de respaldo para notificaciones (tolerancia a fallos si Redis no está activo)
_in_memory_notifications: List[Dict[str, Any]] = [
    {
        "id": "notif-welcome-001",
        "event": "SYSTEM_WELCOME",
        "title": "Bienvenido a CryptoPulse",
        "message": "Tu billetera virtual institucional ha sido inicializada con $10,000 USD de saldo disponible.",
        "type": "system",
        "timestamp": time.time() - 300,
        "read": False,
        "payload": {"balance": 10000.0, "currency": "USD"}
    },
    {
        "id": "notif-market-002",
        "event": "MARKET_UPDATE",
        "title": "Ingesta de Cotizaciones Activa",
        "message": "Clúster Market Service sincronizado con CoinGecko y Frankfurter vía Nginx (least_conn).",
        "type": "market",
        "timestamp": time.time() - 120,
        "read": False,
        "payload": {"source": "coingecko-l1"}
    }
]


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
            logger.info("Conectado exitosamente a Redis 7 (Db3: In-Memory)")
        except Exception as e:
            logger.warning(f"Aviso de conexión a Redis: {e}")
    yield


app = FastAPI(
    title="CryptoPulse - Notification Worker",
    version="1.1.0",
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
    title: Optional[str] = None
    message: Optional[str] = None
    type: Optional[str] = "order"


class TestNotificationRequest(BaseModel):
    type: str = "order"  # order, market, alert, system
    symbol: Optional[str] = "BTC"
    action: Optional[str] = "BUY"
    price: Optional[float] = 68450.0
    quantity: Optional[float] = 0.05


@app.post("/api/notifications/events")
async def receive_event(event_data: NotificationEvent):
    """
    Recibe eventos asíncronos desde Market Service o Portfolio Service
    y los encola en Redis 7 para despacho en tiempo real.
    """
    client = get_redis()
    
    # Generar título y mensaje human-readable si no vienen dados
    title = event_data.title
    message = event_data.message
    notif_type = event_data.type or "order"
    
    payload = event_data.payload
    if not title:
        if event_data.event == "ORDER_EXECUTED":
            action = payload.get("order_type", "ORDEN")
            sym = payload.get("symbol", "ACTIVO")
            qty = payload.get("quantity", 0)
            price = payload.get("price", 0)
            title = f"Orden {action} Ejecutada"
            message = f"{action} de {qty} {sym} a ${price:,.2f} USD completada con éxito."
            notif_type = "order"
        elif event_data.event == "PRICE_ALERT":
            sym = payload.get("symbol", "ACTIVO")
            price = payload.get("price", 0)
            target = payload.get("target_price", 0)
            title = f"Alerta de Mercado: {sym}"
            message = f"{sym} ha alcanzado su objetivo de precio en ${price:,.2f} USD (Umbral: ${target:,.2f} USD)."
            notif_type = "alert"
        else:
            title = f"Evento: {event_data.event}"
            message = f"Notificación del sistema recibida."
            notif_type = "system"

    event_dict = {
        "id": f"notif-{int(time.time()*1000)}",
        "event": event_data.event,
        "title": title,
        "message": message,
        "type": notif_type,
        "payload": payload,
        "timestamp": time.time(),
        "read": False,
    }

    # Guardar en buffer local en memoria (máximo 50 elementos)
    _in_memory_notifications.insert(0, event_dict)
    if len(_in_memory_notifications) > 50:
        _in_memory_notifications.pop()

    # Encolar y publicar en Redis 7 si está disponible
    if client:
        try:
            await client.lpush("cryptopulse:notifications:queue", json.dumps(event_dict))
            await client.ltrim("cryptopulse:notifications:queue", 0, 49)
            await client.publish("cryptopulse:notifications:channel", json.dumps(event_dict))
        except Exception as e:
            logger.warning(f"Error publicando en Redis: {e}")

    logger.info(f"[NOTIFICACIÓN ENCOLADA] Evento={event_data.event} Título='{title}'")

    return {
        "status": "queued",
        "event": event_data.event,
        "notification": event_dict,
        "backend": "redis-7" if client else "memory-fallback",
    }


@app.get("/api/notifications")
async def get_notifications(
    limit: int = Query(default=20, le=50),
    user_id: Optional[int] = None
):
    """
    Retorna el listado de notificaciones para el Centro de Notificaciones (Campana del Navbar).
    Intenta leer desde la cola de Redis 7; si falla, responde desde el buffer en memoria.
    """
    client = get_redis()
    results = []

    if client:
        try:
            raw_items = await client.lrange("cryptopulse:notifications:queue", 0, limit - 1)
            for raw in raw_items:
                results.append(json.loads(raw))
        except Exception as e:
            logger.warning(f"Fallo al leer de Redis, usando memoria: {e}")

    # Si Redis no devolvió datos o no está disponible, usar buffer en memoria
    if not results:
        results = _in_memory_notifications[:limit]

    # Filtrar por usuario si se solicita
    if user_id is not None:
        filtered = [n for n in results if n.get("payload", {}).get("user_id") in (user_id, None)]
        results = filtered if filtered else results

    unread_count = sum(1 for n in results if not n.get("read", False))

    return {
        "status": "success",
        "count": len(results),
        "unread_count": unread_count,
        "data": results,
    }


@app.post("/api/notifications/test")
async def trigger_test_notification(req: TestNotificationRequest):
    """
    Disparador para pruebas y demostraciones en vivo.
    Genera una notificación instantánea que se refleja en la campana del frontend.
    """
    if req.type == "order":
        ev = NotificationEvent(
            event="ORDER_EXECUTED",
            title=f"Orden {req.action} Ejecutada",
            message=f"Ejecutada compra/venta de {req.quantity} {req.symbol} a ${req.price:,.2f} USD.",
            type="order",
            payload={
                "symbol": req.symbol,
                "order_type": req.action,
                "quantity": req.quantity,
                "price": req.price,
                "total_fiat": round(req.quantity * req.price, 2),
            }
        )
    elif req.type == "alert":
        ev = NotificationEvent(
            event="PRICE_ALERT",
            title=f"Alerta de Volatilidad: {req.symbol}",
            message=f"¡Atención! {req.symbol} ha superado el umbral fijado en ${req.price:,.2f} USD.",
            type="alert",
            payload={"symbol": req.symbol, "price": req.price, "target_price": req.price}
        )
    else:
        ev = NotificationEvent(
            event="SYSTEM_ALERT",
            title="Diagnóstico de Resiliencia",
            message="El clúster ha verificado la salud de todos los microservicios sin incidencias.",
            type="system",
            payload={"cluster": "healthy"}
        )

    return await receive_event(ev)


@app.delete("/api/notifications")
async def clear_notifications():
    """Limpia el buffer de notificaciones."""
    global _in_memory_notifications
    _in_memory_notifications = []

    client = get_redis()
    if client:
        try:
            await client.delete("cryptopulse:notifications:queue")
        except Exception:
            pass

    return {"status": "success", "message": "Historial de notificaciones limpiado con éxito."}


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
            "type": "In-Memory",
            "status": redis_status,
            "response_time_ms": latency_ms,
        },
        "notifications_buffered": len(_in_memory_notifications),
    }
