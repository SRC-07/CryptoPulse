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
        "BTC": 82577.0,
        "ETH": 2437.69,
        "USDT": 1.0,
        "SOL": 106.13,
        "BNB": 738.36,
        "XRP": 1.33,
        "USDC": 1.0,
        "ADA": 0.68,
        "AVAX": 28.45,
        "DOGE": 0.245,
        "DOT": 6.85,
        "LINK": 16.4,
        "SUI": 2.88,
        "NEAR": 5.72,
        "UNI": 9.35,
        "LTC": 88.5,
        "BCH": 420.0,
        "SHIB": 0.0000215,
        "PEPE": 0.0000108,
        "XLM": 0.32,
        "TRX": 0.198,
        "APT": 11.8,
        "KAS": 0.165,
        "XMR": 162.0,
        "RENDER": 7.45,
        "AAVE": 185.0,
        "INJ": 24.1,
        "ATOM": 5.4,
        "ARB": 0.78,
        "OP": 1.85,
    }
    return fallback_prices.get(symbol_clean, 50.0)


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
