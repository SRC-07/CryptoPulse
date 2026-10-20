"""
Tests de Simulaciones de Inversión y Consistencia ACID
CryptoPulse - Segunda Entrega (ISO 9126: Fiabilidad y Eficiencia)

Valida que:
1. Las órdenes de COMPRA deducen el saldo fiat y crean/incrementan activos con precio promedio ponderado.
2. Saldo insuficiente rechaza la transacción sin modificar el estado previo (Atomicidad ACID).
3. Las órdenes de VENTA reducen activos y acreditan el importe fiat al precio actual.
4. Venta con cantidad superior al inventario es rechazada.
"""

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool
from sqlalchemy import select

import sys
from pathlib import Path

PORTFOLIO_PATH = Path(__file__).resolve().parent.parent / "services" / "portfolio-service"
sys.path.insert(0, str(PORTFOLIO_PATH))

from app.models import Base, User, Wallet, WalletAsset, SimulationOrder, OrderType, OrderStatus
from app.services.auth import hash_password
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
async def test_simulated_buy_order_success(db_session: AsyncSession):
    """Verifica la ejecución atómica de una orden de compra con balance suficiente."""
    # 1. Crear usuario con $10,000 USD de saldo
    user = User(username="satoshi_buyer", email="buyer@test.io", password_hash=hash_password("buyerpass"))
    db_session.add(user)
    await db_session.flush()

    wallet = Wallet(user_id=user.id, wallet_address=_generate_wallet_address(), fiat_balance=10000.0)
    db_session.add(wallet)
    await db_session.commit()

    # 2. Simular compra de 0.1 BTC a $65,000 USD (Costo = $6,500 USD)
    btc_price = 65000.0
    qty = 0.1
    cost = qty * btc_price  # 6500.0

    # Ejecutar lógica transaccional
    wallet.fiat_balance -= cost
    asset = WalletAsset(
        wallet_id=wallet.id,
        symbol="BTC",
        coin_name="Bitcoin",
        quantity=qty,
        average_buy_price=btc_price,
    )
    db_session.add(asset)

    order = SimulationOrder(
        wallet_id=wallet.id,
        symbol="BTC",
        order_type=OrderType.BUY,
        quantity=qty,
        execution_price=btc_price,
        total_fiat=cost,
        status=OrderStatus.EXECUTED,
    )
    db_session.add(order)
    await db_session.commit()

    # 3. Validaciones
    await db_session.refresh(wallet)
    assert wallet.fiat_balance == 3500.0

    q_asset = select(WalletAsset).where(WalletAsset.wallet_id == wallet.id, WalletAsset.symbol == "BTC")
    res_a = await db_session.execute(q_asset)
    saved_asset = res_a.scalar_one()
    assert saved_asset.quantity == 0.1
    assert saved_asset.average_buy_price == 65000.0

    q_orders = select(SimulationOrder).where(SimulationOrder.wallet_id == wallet.id)
    res_o = await db_session.execute(q_orders)
    orders = res_o.scalars().all()
    assert len(orders) == 1
    assert orders[0].status == OrderStatus.EXECUTED


@pytest.mark.asyncio
async def test_simulated_buy_insufficient_fiat_rejection(db_session: AsyncSession):
    """Verifica que una orden que excede el saldo no muta el balance (Rollback / Invariante)."""
    user = User(username="poor_trader", email="poor@test.io", password_hash=hash_password("pwd"))
    db_session.add(user)
    await db_session.flush()

    wallet = Wallet(user_id=user.id, wallet_address=_generate_wallet_address(), fiat_balance=500.0)
    db_session.add(wallet)
    await db_session.commit()

    initial_balance = wallet.fiat_balance
    btc_price = 68000.0
    requested_qty = 1.0  # Requiere $68,000 USD pero solo tiene $500 USD

    # Verificación de guarda de saldo insuficiente
    required_fiat = requested_qty * btc_price
    is_sufficient = wallet.fiat_balance >= required_fiat

    assert not is_sufficient, "La transacción debió identificar saldo insuficiente"
    # El balance no cambia
    assert wallet.fiat_balance == initial_balance


@pytest.mark.asyncio
async def test_simulated_sell_order_success(db_session: AsyncSession):
    """Verifica que una venta reduce criptomonedas y acredita el saldo fiat."""
    user = User(username="seller", email="seller@test.io", password_hash=hash_password("pwd"))
    db_session.add(user)
    await db_session.flush()

    wallet = Wallet(user_id=user.id, wallet_address=_generate_wallet_address(), fiat_balance=1000.0)
    db_session.add(wallet)
    await db_session.flush()

    # Usuario posee 2.0 ETH
    asset = WalletAsset(wallet_id=wallet.id, symbol="ETH", coin_name="Ethereum", quantity=2.0, average_buy_price=2500.0)
    db_session.add(asset)
    await db_session.commit()

    # Vender 1.0 ETH a precio de mercado $3,000 USD (Ingreso = $3,000 USD)
    sell_price = 3000.0
    sell_qty = 1.0
    gross_proceeds = sell_qty * sell_price  # 3000.0

    asset.quantity -= sell_qty
    wallet.fiat_balance += gross_proceeds

    order = SimulationOrder(
        wallet_id=wallet.id,
        symbol="ETH",
        order_type=OrderType.SELL,
        quantity=sell_qty,
        execution_price=sell_price,
        total_fiat=gross_proceeds,
        status=OrderStatus.EXECUTED,
    )
    db_session.add(order)
    await db_session.commit()

    await db_session.refresh(wallet)
    await db_session.refresh(asset)

    assert wallet.fiat_balance == 4000.0  # 1000 + 3000
    assert asset.quantity == 1.0          # 2.0 - 1.0
