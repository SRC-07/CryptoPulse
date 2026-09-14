"""
CryptoPulse - Esquemas Pydantic para validación de request/response.
Define la forma de los datos que entran y salen de la API.
"""

from pydantic import BaseModel
from datetime import datetime
from typing import Optional


# ============================================
# Esquemas de Criptomonedas
# ============================================

class CryptoAssetResponse(BaseModel):
    """Respuesta de un activo cripto."""
    coin_id: str
    symbol: str
    name: str
    current_price: float
    market_cap: Optional[float] = None
    price_change_24h: Optional[float] = None
    price_change_percentage_24h: Optional[float] = None
    high_24h: Optional[float] = None
    low_24h: Optional[float] = None
    total_volume: Optional[float] = None
    image_url: Optional[str] = None
    sparkline_in_7d: Optional[list[float]] = None
    last_updated: Optional[datetime] = None

    class Config:
        from_attributes = True


class CryptoPricesResponse(BaseModel):
    """Respuesta completa con lista de criptomonedas."""
    status: str = "success"
    source: str = "coingecko"
    count: int
    data: list[CryptoAssetResponse]


# ============================================
# Esquemas de Forex (Tasas de Cambio)
# ============================================

class ForexRateResponse(BaseModel):
    """Respuesta de una tasa de cambio."""
    base_currency: str
    target_currency: str
    rate: float
    last_updated: Optional[datetime] = None

    class Config:
        from_attributes = True


class ForexRatesResponse(BaseModel):
    """Respuesta completa con tasas de cambio."""
    status: str = "success"
    source: str = "frankfurter"
    base: str
    rates: dict[str, float]
    data: list[ForexRateResponse]


# ============================================
# Esquemas de Health Check
# ============================================

class ServiceHealthResponse(BaseModel):
    """Estado de salud de un servicio individual."""
    service: str
    status: str  # "healthy" | "unhealthy"
    response_time_ms: Optional[float] = None
    error: Optional[str] = None
    details: Optional[dict] = None


class FullHealthResponse(BaseModel):
    """Reporte completo de salud de todos los servicios."""
    status: str  # "healthy" | "degraded" | "unhealthy"
    service: str = "market-service"
    timestamp: datetime
    checks: list[ServiceHealthResponse]
    summary: dict
