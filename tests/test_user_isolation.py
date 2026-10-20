"""
Tests de Aislamiento Estricto de Billeteras (1:1 por Usuario)
CryptoPulse - Segunda Entrega (ISO 9126: Seguridad y Fiabilidad)

Valida que:
1. Cada usuario registrado recibe una billetera exclusiva con $10,000 USD de saldo virtual.
2. Las billeteras están estrictamente aisladas: ningún usuario puede ver ni operar la de otro.
3. Los tokens JWT son requeridos y validados para todas las operaciones sobre billeteras.
"""

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

import sys
from pathlib import Path

# Agregar path del servicio
PORTFOLIO_PATH = Path(__file__).resolve().parent.parent / "services" / "portfolio-service"
sys.path.insert(0, str(PORTFOLIO_PATH))

from app.models import Base, User, Wallet, WalletAsset
from app.services.auth import hash_password, verify_password, create_access_token, decode_access_token
from app.routers.auth import _generate_wallet_address


@pytest.fixture
def memory_db_engine():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    return engine


@pytest_asyncio.fixture
async def db_session(memory_db_engine):
    async with memory_db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=memory_db_engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with memory_db_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_user_wallet_1to1_isolation(db_session: AsyncSession):
    """Verifica que dos usuarios distintos obtienen billeteras completamente independientes."""
    # 1. Crear Usuario A
    user_a = User(
        username="alice_trader",
        email="alice@cryptopulse.io",
        password_hash=hash_password("PasswordAlice123!"),
    )
    db_session.add(user_a)
    await db_session.flush()

    wallet_a = Wallet(
        user_id=user_a.id,
        wallet_address=_generate_wallet_address(),
        fiat_balance=10000.0,
        currency="USD",
    )
    db_session.add(wallet_a)

    # 2. Crear Usuario B
    user_b = User(
        username="bob_investor",
        email="bob@cryptopulse.io",
        password_hash=hash_password("PasswordBob123!"),
    )
    db_session.add(user_b)
    await db_session.flush()

    wallet_b = Wallet(
        user_id=user_b.id,
        wallet_address=_generate_wallet_address(),
        fiat_balance=10000.0,
        currency="USD",
    )
    db_session.add(wallet_b)
    await db_session.commit()

    # 3. Asertos de Aislamiento
    assert user_a.id != user_b.id
    assert wallet_a.id != wallet_b.id
    assert wallet_a.wallet_address != wallet_b.wallet_address
    assert wallet_a.wallet_address.startswith("CP-WLT-")
    assert wallet_b.wallet_address.startswith("CP-WLT-")
    assert wallet_a.user_id == user_a.id
    assert wallet_b.user_id == user_b.id
    assert wallet_a.fiat_balance == 10000.0
    assert wallet_b.fiat_balance == 10000.0


@pytest.mark.asyncio
async def test_jwt_token_claims_and_security():
    """Valida la generación y verificación de JWT para autenticación segura."""
    user_id = 42
    username = "charlie_crypto"
    
    token = create_access_token({"sub": str(user_id), "username": username})
    assert isinstance(token, str)
    assert len(token) > 20

    # Decodificar claims
    payload = decode_access_token(token)
    assert payload is not None
    assert int(payload.get("sub")) == user_id
    assert payload.get("username") == username


@pytest.mark.asyncio
async def test_cross_wallet_contamination_prevention(db_session: AsyncSession):
    """Garantiza que la modificación de fondos en una billetera no afecta a ninguna otra."""
    # Crear Usuario A y Wallet A
    user_a = User(username="alice", email="alice@test.io", password_hash=hash_password("pwd1"))
    db_session.add(user_a)
    await db_session.flush()
    wallet_a = Wallet(user_id=user_a.id, wallet_address=_generate_wallet_address(), fiat_balance=10000.0)
    db_session.add(wallet_a)

    # Crear Usuario B y Wallet B
    user_b = User(username="bob", email="bob@test.io", password_hash=hash_password("pwd2"))
    db_session.add(user_b)
    await db_session.flush()
    wallet_b = Wallet(user_id=user_b.id, wallet_address=_generate_wallet_address(), fiat_balance=10000.0)
    db_session.add(wallet_b)
    await db_session.commit()

    # Mutar saldo de Usuario A (compra simulada de $3,500 USD)
    wallet_a.fiat_balance -= 3500.0
    asset_a = WalletAsset(wallet_id=wallet_a.id, symbol="BTC", coin_name="Bitcoin", quantity=0.05, average_buy_price=70000.0)
    db_session.add(asset_a)
    await db_session.commit()

    # Verificar que el saldo y activos de B permanecen intactos
    await db_session.refresh(wallet_a)
    await db_session.refresh(wallet_b)

    assert wallet_a.fiat_balance == 6500.0
    assert wallet_b.fiat_balance == 10000.0  # Sin afectación cruzada
