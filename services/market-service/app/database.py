"""
CryptoPulse - Conexión asíncrona a PostgreSQL.
Usa SQLAlchemy AsyncIO con el driver asyncpg.
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

# Motor asíncrono de SQLAlchemy
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
)

# Factory de sesiones asíncronas
async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Clase base para todos los modelos SQLAlchemy."""
    pass


async def init_db():
    """Inicializa la base de datos creando todas las tablas."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db() -> AsyncSession:
    """Dependency de FastAPI que provee una sesión de base de datos."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
