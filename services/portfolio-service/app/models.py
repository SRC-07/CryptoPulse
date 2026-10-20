from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, 
    UniqueConstraint, func, Enum, Text
)
from sqlalchemy.orm import relationship
import enum

from app.database import Base


class OrderType(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"


class OrderStatus(str, enum.Enum):
    EXECUTED = "EXECUTED"
    REJECTED = "REJECTED"


class User(Base):
    """Modelo de Usuario registrado en CryptoPulse."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    is_active = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relación 1 a 1 estricta con Wallet: Cada usuario tiene SU PROPIA wallet y NO se comparten
    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(username={self.username}, email={self.email})>"


class Wallet(Base):
    """
    Billetera personal y aislada del usuario para simulación de inversiones.
    Garantía de arquitectura:
    - 1 Wallet por Usuario (UniqueConstraint en user_id).
    - No se comparten billeteras entre usuarios.
    - Saldo virtual inicial para simulaciones de trading/inversión.
    """
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    wallet_address = Column(String(64), unique=True, nullable=False, index=True)
    fiat_balance = Column(Float, default=10000.0, nullable=False)  # $10,000 USD virtual inicial
    currency = Column(String(10), default="USD", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="wallet")
    assets = relationship("WalletAsset", back_populates="wallet", cascade="all, delete-orphan")
    orders = relationship("SimulationOrder", back_populates="wallet", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Wallet(id={self.id}, user_id={self.user_id}, fiat_balance={self.fiat_balance} {self.currency})>"


class WalletAsset(Base):
    """Posición de activos criptográficos en la billetera del usuario."""
    __tablename__ = "wallet_assets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = Column(String(20), nullable=False)
    coin_name = Column(String(100), nullable=False)
    quantity = Column(Float, default=0.0, nullable=False)
    average_buy_price = Column(Float, default=0.0, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    wallet = relationship("Wallet", back_populates="assets")

    __table_args__ = (
        UniqueConstraint("wallet_id", "symbol", name="uq_wallet_symbol"),
    )

    def __repr__(self):
        return f"<WalletAsset(wallet_id={self.wallet_id}, symbol={self.symbol}, quantity={self.quantity})>"


class SimulationOrder(Base):
    """Registro inmutable de órdenes de simulación de inversión ejecutadas a precio real de mercado."""
    __tablename__ = "simulation_orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False, index=True)
    symbol = Column(String(20), nullable=False)
    order_type = Column(Enum(OrderType), nullable=False)
    quantity = Column(Float, nullable=False)
    execution_price = Column(Float, nullable=False)  # Obtenido en tiempo real vía REST desde Market Service
    total_fiat = Column(Float, nullable=False)
    fee = Column(Float, default=0.0, nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.EXECUTED, nullable=False)
    executed_at = Column(DateTime(timezone=True), server_default=func.now())

    wallet = relationship("Wallet", back_populates="orders")

    def __repr__(self):
        return f"<SimulationOrder({self.order_type} {self.quantity} {self.symbol} @ {self.execution_price})>"


class AuditLog(Base):
    """Pista de auditoría de transacciones y operaciones en la plataforma."""
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=True, index=True)
    action = Column(String(50), nullable=False)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
