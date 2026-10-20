from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://cryptopulse:cryptopulse_secret_2024@postgres:5432/cryptopulse_portfolio"
    MONGO_URI: str = "mongodb://cryptopulse:cryptopulse_secret_2024@mongodb:27017/cryptopulse_market?authSource=admin"
    MONGO_DB: str = "cryptopulse_market"
    REDIS_URL: str = "redis://redis:6379/0"
    COINGECKO_API_URL: str = "https://api.coingecko.com/api/v3"
    FRANKFURTER_API_URL: str = "https://api.frankfurter.app"
    FALLBACK_FOREX_URL: str = "https://open.er-api.com/v6/latest"
    MARKET_SERVICE_PORT: int = 8000
    HTTP_TIMEOUT: int = 15
    HTTP_USER_AGENT: str = "CryptoPulse-Financial/1.0 (Enterprise Market Intelligence)"

    class Config:
        env_file = ".env"
        extra = "ignore"



@lru_cache()
def get_settings() -> Settings:
    return Settings()
