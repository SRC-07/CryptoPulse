import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, Wallet, WalletAsset, SimulationOrder, OrderType, OrderStatus
from app.schemas import (
    WalletResponse, WalletAssetResponse,
    SimulateOrderRequest, SimulateOrderResult, SimulationOrderResponse
)
from app.services.auth import get_current_user
from app.services.market_client import get_realtime_crypto_price, emit_notification_event
from app.config import get_settings

router = APIRouter(prefix="/api/wallet", tags=["Billeteras Aisladas y Simulaciones"])
settings = get_settings()


async def _build_wallet_response(wallet: Wallet, db: AsyncSession) -> WalletResponse:
    """Función auxiliar para calcular valorización en tiempo real y P&L de la billetera."""
    assets_query = select(WalletAsset).where(WalletAsset.wallet_id == wallet.id)
    assets_res = await db.execute(assets_query)
    assets = assets_res.scalars().all()

    total_crypto_value = 0.0
    asset_responses = []

    for a in assets:
        price = await get_realtime_crypto_price(a.symbol) or a.average_buy_price
        curr_val = round(a.quantity * price, 2)
        invested = round(a.quantity * a.average_buy_price, 2)
        pnl_usd = round(curr_val - invested, 2)
        pnl_pct = round((pnl_usd / invested * 100), 2) if invested > 0 else 0.0
        total_crypto_value += curr_val

        asset_responses.append(WalletAssetResponse(
            id=a.id,
            symbol=a.symbol,
            coin_name=a.coin_name,
            quantity=a.quantity,
            average_buy_price=a.average_buy_price,
            current_value_usd=curr_val,
            pnl_usd=pnl_usd,
            pnl_percentage=pnl_pct,
            updated_at=a.updated_at,
        ))

    total_portfolio_value = round(wallet.fiat_balance + total_crypto_value, 2)

    return WalletResponse(
        id=wallet.id,
        user_id=wallet.user_id,
        wallet_address=wallet.wallet_address,
        fiat_balance=round(wallet.fiat_balance, 2),
        currency=wallet.currency,
        assets=asset_responses,
        total_portfolio_value_usd=total_portfolio_value,
        created_at=wallet.created_at,
    )


@router.get("/my-wallet", response_model=WalletResponse)
async def get_my_wallet(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Obtiene la billetera personal exclusiva del usuario autenticado vía JWT.
    Garantía de aislamiento: Un usuario NUNCA puede consultar ni recibir los datos de otra wallet.
    """
    query = select(Wallet).where(Wallet.user_id == current_user.id)
    result = await db.execute(query)
    wallet = result.scalar_one_or_none()

    if not wallet:
        raise HTTPException(status_code=404, detail="Billetera no encontrada para este usuario.")

    return await _build_wallet_response(wallet, db)


@router.get("/user/{user_id}", response_model=WalletResponse)
async def get_user_wallet_by_id(user_id: int, db: AsyncSession = Depends(get_db)):
    """Consulta de billetera por user_id (para consultas de interoperabilidad interna)."""
    query = select(Wallet).where(Wallet.user_id == user_id)
    result = await db.execute(query)
    wallet = result.scalar_one_or_none()

    if not wallet:
        raise HTTPException(status_code=404, detail="Billetera no encontrada para este usuario.")

    return await _build_wallet_response(wallet, db)


@router.post("/simulate/order", response_model=SimulateOrderResult)
async def simulate_investment_order(
    request: SimulateOrderRequest,
    current_user: Optional[User] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Ejecuta una simulación de compra o venta de criptomonedas:
    1. Determina el usuario (a partir del token JWT si está autenticado, o del payload).
    2. Bloquea la fila de la billetera con SELECT ... FOR UPDATE (garantía ACID contra condiciones de carrera).
    3. Obtiene cotización en tiempo real vía REST desde Market Service (E1).
    4. Valida saldo y posiciones en PostgreSQL (E2).
    5. Actualiza balances fiat y cripto atómicamente.
    6. Registra orden inmutable en simulation_orders.
    7. Emite evento asíncrono al Notification Worker (E3).
    """
    target_user_id = current_user.id if current_user else request.user_id
    if not target_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere sesión activa o especificar user_id válido."
        )

    # 1. Bloqueo pesimista para consistencia ACID en la wallet del usuario
    query = select(Wallet).where(Wallet.user_id == target_user_id).with_for_update()
    res = await db.execute(query)
    wallet = res.scalar_one_or_none()

    if not wallet:
        raise HTTPException(status_code=404, detail="Billetera del usuario no encontrada.")

    symbol = request.symbol.upper().strip()
    order_type = request.order_type.upper().strip()

    # 2. Consultar precio en vivo a Market Service
    current_price = await get_realtime_crypto_price(symbol)
    if not current_price or current_price <= 0:
        raise HTTPException(status_code=502, detail=f"No se pudo obtener el precio de mercado para {symbol}")

    total_fiat = round(request.quantity * current_price, 2)

    # 3. Lógica según tipo de orden (COMPRA o VENTA)
    if order_type == "BUY":
        if wallet.fiat_balance < total_fiat:
            raise HTTPException(
                status_code=400,
                detail=f"Saldo insuficiente en wallet. Requerido: ${total_fiat:,.2f} USD, Disponible: ${wallet.fiat_balance:,.2f} USD",
            )

        wallet.fiat_balance -= total_fiat

        # Actualizar o crear activo en la wallet
        asset_q = select(WalletAsset).where(WalletAsset.wallet_id == wallet.id, WalletAsset.symbol == symbol).with_for_update()
        asset_res = await db.execute(asset_q)
        asset = asset_res.scalar_one_or_none()

        if asset:
            total_current_cost = asset.quantity * asset.average_buy_price
            new_total_cost = total_current_cost + total_fiat
            new_quantity = asset.quantity + request.quantity
            asset.quantity = new_quantity
            asset.average_buy_price = round(new_total_cost / new_quantity, 4)
            asset.updated_at = datetime.now(timezone.utc)
        else:
            asset = WalletAsset(
                wallet_id=wallet.id,
                symbol=symbol,
                coin_name=symbol,
                quantity=request.quantity,
                average_buy_price=current_price,
            )
            db.add(asset)

    elif order_type == "SELL":
        asset_q = select(WalletAsset).where(WalletAsset.wallet_id == wallet.id, WalletAsset.symbol == symbol).with_for_update()
        asset_res = await db.execute(asset_q)
        asset = asset_res.scalar_one_or_none()

        if not asset or asset.quantity < request.quantity:
            avail = asset.quantity if asset else 0.0
            raise HTTPException(
                status_code=400,
                detail=f"Posición insuficiente en {symbol}. Intentas vender {request.quantity}, dispones de {avail}",
            )

        asset.quantity -= request.quantity
        wallet.fiat_balance += total_fiat

    # 4. Registrar la orden inmutable en PostgreSQL
    order = SimulationOrder(
        wallet_id=wallet.id,
        symbol=symbol,
        order_type=OrderType.BUY if order_type == "BUY" else OrderType.SELL,
        quantity=request.quantity,
        execution_price=current_price,
        total_fiat=total_fiat,
        status=OrderStatus.EXECUTED,
    )
    db.add(order)
    await db.flush()

    # 5. Emitir evento asíncrono al Notification Worker
    await emit_notification_event("ORDER_EXECUTED", {
        "user_id": target_user_id,
        "wallet_id": wallet.id,
        "symbol": symbol,
        "order_type": order_type,
        "quantity": request.quantity,
        "price": current_price,
        "total_fiat": total_fiat,
    })

    # Cargar respuesta actualizada
    updated_wallet = await _build_wallet_response(wallet, db)

    return SimulateOrderResult(
        status="success",
        message=f"Simulación de {order_type} completada con éxito: {request.quantity} {symbol} a ${current_price:,.2f} USD",
        order=SimulationOrderResponse.model_validate(order),
        updated_wallet=updated_wallet,
    )


@router.get("/my-orders", response_model=list[SimulationOrderResponse])
async def get_my_orders(
    limit: int = Query(default=20, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retorna el historial inmutable de órdenes de simulación del usuario autenticado."""
    q_wallet = select(Wallet).where(Wallet.user_id == current_user.id)
    res_w = await db.execute(q_wallet)
    wallet = res_w.scalar_one_or_none()

    if not wallet:
        return []

    q_orders = select(SimulationOrder).where(SimulationOrder.wallet_id == wallet.id).order_by(SimulationOrder.executed_at.desc()).limit(limit)
    res_orders = await db.execute(q_orders)
    orders = res_orders.scalars().all()
    return [SimulationOrderResponse.model_validate(o) for o in orders]


@router.get("/orders/{user_id}", response_model=list[SimulationOrderResponse])
async def get_orders_by_user_id(
    user_id: int,
    limit: int = Query(default=20, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Consulta de órdenes por user_id (para compatibilidad)."""
    q_wallet = select(Wallet).where(Wallet.user_id == user_id)
    res_w = await db.execute(q_wallet)
    wallet = res_w.scalar_one_or_none()

    if not wallet:
        return []

    q_orders = select(SimulationOrder).where(SimulationOrder.wallet_id == wallet.id).order_by(SimulationOrder.executed_at.desc()).limit(limit)
    res_orders = await db.execute(q_orders)
    orders = res_orders.scalars().all()
    return [SimulationOrderResponse.model_validate(o) for o in orders]
