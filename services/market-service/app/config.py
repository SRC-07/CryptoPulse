"""
CryptoPulse - Configuración centralizada del Market Service.
Usa Pydantic Settings para cargar variables de entorno de forma segura.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Configuración del Market Service cargada desde variables de entorno."""

    # Base de datos
    DATABASE_URL: str = "postgresql+asyncpg://cryptopulse:cryptopulse_secret_2024@postgres:5432/cryptopulse_db"

    # APIs Externas
    COINGECKO_API_URL: str = "https://api.coingecko.com/api/v3"
    FRANKFURTER_API_URL: str = "https://api.frankfurter.app"
    FALLBACK_FOREX_URL: str = "https://open.er-api.com/v6/latest"

    # Configuracion del servicio
    MARKET_SERVICE_PORT: int = 8000
    HTTP_TIMEOUT: int = 15  # Timeout en segundos para llamadas a APIs externas
    HTTP_USER_AGENT: str = "CryptoPulse-Financial/1.0 (Enterprise Market Intelligence)"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Retorna una instancia singleton de la configuración."""
    return Settings()
