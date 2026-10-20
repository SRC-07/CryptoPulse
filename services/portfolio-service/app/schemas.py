from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


# Schemas de Autenticación y Token
class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    email: str
    wallet_address: str


class UserProfileResponse(BaseModel):
    id: int
    username: str
    email: str
    wallet_address: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Schemas de Billetera Personal
class WalletAssetResponse(BaseModel):
    id: int
    symbol: str
    coin_name: str
    quantity: float
    average_buy_price: float
    current_value_usd: Optional[float] = None
    pnl_usd: Optional[float] = None
    pnl_percentage: Optional[float] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WalletResponse(BaseModel):
    id: int
    user_id: int
    wallet_address: str
    fiat_balance: float
    currency: str
    assets: List[WalletAssetResponse] = []
    total_portfolio_value_usd: Optional[float] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Schemas de Simulación de Inversiones
class SimulateOrderRequest(BaseModel):
    user_id: Optional[int] = None  # Obtenido automáticamente del token JWT si se autentica
    symbol: str = Field(..., min_length=1, max_length=20)
    order_type: str = Field(..., pattern="^(BUY|SELL)$")
    quantity: float = Field(..., gt=0)


class SimulationOrderResponse(BaseModel):
    id: int
    wallet_id: int
    symbol: str
    order_type: str
    quantity: float
    execution_price: float
    total_fiat: float
    status: str
    executed_at: datetime

    class Config:
        from_attributes = True


class SimulateOrderResult(BaseModel):
    status: str
    message: str
    order: SimulationOrderResponse
    updated_wallet: WalletResponse
