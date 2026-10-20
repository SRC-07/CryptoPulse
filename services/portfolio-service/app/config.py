from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    PORTFOLIO_DATABASE_URL: str = "postgresql+asyncpg://cryptopulse:cryptopulse_secret_2024@postgres:5432/cryptopulse_portfolio"
    DATABASE_URL: str = "postgresql+asyncpg://cryptopulse:cryptopulse_secret_2024@postgres:5432/cryptopulse_portfolio"
    INTERNAL_MARKET_SERVICE_URL: str = "http://market-service:8000"
    INTERNAL_NOTIFICATION_WORKER_URL: str = "http://notification-worker:8002"
    REDIS_URL: str = "redis://redis:6379/0"
    PORTFOLIO_SERVICE_PORT: int = 8001
    INITIAL_SIMULATED_BALANCE: float = 10000.0  # $10,000 USD virtual inicial para simulación

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
