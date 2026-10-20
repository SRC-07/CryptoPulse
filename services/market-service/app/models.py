from sqlalchemy import Column, Integer, String, Float, DateTime, func
from app.database import Base


class CryptoAsset(Base):
    __tablename__ = "crypto_assets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    coin_id = Column(String(100), nullable=False, index=True)
    symbol = Column(String(20), nullable=False)
    name = Column(String(200), nullable=False)
    current_price = Column(Float, nullable=False)
    market_cap = Column(Float, nullable=True)
    price_change_24h = Column(Float, nullable=True)
    price_change_percentage_24h = Column(Float, nullable=True)
    total_volume = Column(Float, nullable=True)
    image_url = Column(String(500), nullable=True)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<CryptoAsset(symbol={self.symbol}, price={self.current_price})>"


class ForexRate(Base):
    __tablename__ = "forex_rates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    base_currency = Column(String(10), nullable=False, index=True)
    target_currency = Column(String(10), nullable=False, index=True)
    rate = Column(Float, nullable=False)
    last_updated = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<ForexRate({self.base_currency}/{self.target_currency}={self.rate})>"


class HealthLog(Base):
    __tablename__ = "health_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    service_name = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False)
    response_time_ms = Column(Float, nullable=True)
    error_message = Column(String(500), nullable=True)
    checked_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<HealthLog(service={self.service_name}, status={self.status})>"
