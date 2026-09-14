from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CryptoAssetResponse(BaseModel):
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
    status: str = "success"
    source: str = "coingecko"
    count: int
    data: list[CryptoAssetResponse]


class ForexRateResponse(BaseModel):
    base_currency: str
    target_currency: str
    rate: float
    last_updated: Optional[datetime] = None

    class Config:
        from_attributes = True


class ForexRatesResponse(BaseModel):
    status: str = "success"
    source: str = "frankfurter"
    base: str
    rates: dict[str, float]
    data: list[ForexRateResponse]


class ServiceHealthResponse(BaseModel):
    service: str
    status: str
    response_time_ms: Optional[float] = None
    error: Optional[str] = None
    details: Optional[dict] = None


class FullHealthResponse(BaseModel):
    status: str
    service: str = "market-service"
    timestamp: datetime
    checks: list[ServiceHealthResponse]
    summary: dict
