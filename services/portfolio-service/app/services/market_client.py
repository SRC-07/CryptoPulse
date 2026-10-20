import httpx
import logging
from typing import Optional, Dict, Any

from app.config import get_settings

logger = logging.getLogger("portfolio.market_client")
settings = get_settings()


async def get_realtime_crypto_price(symbol: str) -> Optional[float]:
    """
    Comunica Portfolio Service (E2) con Market Service (E1) vía REST interna.
    Obtiene la cotización en vivo de una criptomoneda para ejecutar simulaciones de inversión.
    """
    url = f"{settings.INTERNAL_MARKET_SERVICE_URL}/api/crypto/prices?vs_currency=usd&per_page=50"
    symbol_clean = symbol.upper().strip()

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                for coin in data:
                    if coin.get("symbol", "").upper() == symbol_clean:
                        return float(coin.get("current_price", 0.0))
    except Exception as e:
        logger.warning(f"Error consultando Market Service ({url}): {e}")

    # Fallback predeterminado para permitir simulaciones fluidas en modo offline
    fallback_prices = {
        "BTC": 67500.0,
        "ETH": 2650.0,
        "SOL": 165.0,
        "BNB": 590.0,
        "ADA": 0.36,
        "XRP": 0.54,
        "DOT": 4.25,
        "DOGE": 0.14,
    }
    return fallback_prices.get(symbol_clean, 100.0)


async def emit_notification_event(event_type: str, payload: Dict[str, Any]):
    """
    Comunica Portfolio Service (E2) con Notification Worker (E3) vía REST interna.
    Emite eventos para notificaciones o alertas en tiempo real (órdenes ejecutadas, balance bajo, etc.).
    """
    url = f"{settings.INTERNAL_NOTIFICATION_WORKER_URL}/api/notifications/events"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            await client.post(url, json={"event": event_type, "payload": payload})
    except Exception as e:
        logger.debug(f"Notification Worker no disponible (evento omitido sin bloquear): {e}")
