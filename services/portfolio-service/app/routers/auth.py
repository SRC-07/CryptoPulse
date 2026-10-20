import uuid
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import User, Wallet
from app.schemas import (
    UserRegisterRequest, UserLoginRequest, TokenResponse, UserProfileResponse,
    UpdateProfileRequest, ChangePasswordRequest, ResetFundsResponse
)
from app.services.auth import (
    get_password_hash, verify_password, create_access_token, get_current_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from app.services.market_client import emit_notification_event
from app.config import get_settings

router = APIRouter(prefix="/api/auth", tags=["Autenticación e Identidad"])
settings = get_settings()


def generate_wallet_address() -> str:
    """Genera una dirección única identificadora para la billetera personal en PostgreSQL."""
    return f"CP-WLT-{uuid.uuid4().hex[:10].upper()}"


_generate_wallet_address = generate_wallet_address


@router.post("/register", response_model=TokenResponse)
async def register(request: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    """
    Registra un nuevo usuario en PostgreSQL 16 y aprovisiona de forma atómica
    SU PROPIA billetera aislada con saldo virtual inicial de $10,000 USD.
    Garantía: 1 usuario = 1 wallet exclusiva (no se comparten wallets).
    """
    # 1. Validar que no exista username o email
    q_check = select(User).where((User.email == request.email.lower()) | (User.username == request.username.strip()))
    existing = await db.execute(q_check)
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El nombre de usuario o correo electrónico ya se encuentra registrado.",
        )

    # 2. Hashear contraseña con bcrypt
    hashed_pwd = get_password_hash(request.password)

    # 3. Crear usuario
    new_user = User(
        username=request.username.strip(),
        email=request.email.lower(),
        password_hash=hashed_pwd,
        is_active=1,
    )
    db.add(new_user)
    await db.flush()

    # 4. Aprovisionar billetera personal aislada (1 a 1 estricta)
    wallet_addr = f"CP-{uuid.uuid4().hex[:12].upper()}"
    user_wallet = Wallet(
        user_id=new_user.id,
        wallet_address=wallet_addr,
        fiat_balance=settings.INITIAL_SIMULATED_BALANCE,
        currency="USD",
    )
    db.add(user_wallet)
    await db.flush()

    # 5. Generar token JWT
    access_token = create_access_token(
        data={"sub": str(new_user.id), "username": new_user.username, "email": new_user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    # 6. Notificar al Notification Worker (asíncrono)
    await emit_notification_event("USER_REGISTERED", {
        "user_id": new_user.id,
        "username": new_user.username,
        "wallet_address": wallet_addr,
        "balance": settings.INITIAL_SIMULATED_BALANCE,
    })

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        wallet_address=wallet_addr,
    )


@router.post("/login", response_model=TokenResponse)
async def login(request: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Autentica credenciales y emite un token JWT de acceso.
    """
    query = select(User).where(User.email == request.email.lower(), User.is_active == 1)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas. Verifique su correo y contraseña.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Obtener dirección de su wallet
    q_wallet = select(Wallet).where(Wallet.user_id == user.id)
    res_w = await db.execute(q_wallet)
    wallet = res_w.scalar_one_or_none()
    wallet_addr = wallet.wallet_address if wallet else "N/A"

    access_token = create_access_token(
        data={"sub": str(user.id), "username": user.username, "email": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        email=user.email,
        wallet_address=wallet_addr,
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_me(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Retorna los datos del usuario autenticado con su dirección de billetera asociada.
    """
    q_wallet = select(Wallet).where(Wallet.user_id == current_user.id)
    res_w = await db.execute(q_wallet)
    wallet = res_w.scalar_one_or_none()

    return UserProfileResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        wallet_address=wallet.wallet_address if wallet else None,
        created_at=current_user.created_at,
    )


@router.put("/profile", response_model=UserProfileResponse)
async def update_profile(
    request: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Actualiza la información básica del perfil del usuario (nombre de usuario, correo electrónico).
    """
    if request.username:
        new_username = request.username.strip()
        # Verificar que no esté en uso por otro usuario
        q_user = select(User).where(User.username == new_username, User.id != current_user.id)
        res = await db.execute(q_user)
        if res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="El nombre de usuario ya está en uso.")
        current_user.username = new_username

    if request.email:
        new_email = request.email.lower().strip()
        q_email = select(User).where(User.email == new_email, User.id != current_user.id)
        res = await db.execute(q_email)
        if res.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="El correo electrónico ya está registrado.")
        current_user.email = new_email

    await db.flush()

    q_wallet = select(Wallet).where(Wallet.user_id == current_user.id)
    res_w = await db.execute(q_wallet)
    wallet = res_w.scalar_one_or_none()

    return UserProfileResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        wallet_address=wallet.wallet_address if wallet else None,
        created_at=current_user.created_at,
    )


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Cambia la contraseña del usuario tras verificar la contraseña actual.
    """
    if not verify_password(request.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual es incorrecta.")

    current_user.password_hash = get_password_hash(request.new_password)
    await db.flush()
    return {"status": "success", "message": "Contraseña actualizada exitosamente."}


@router.post("/reset-funds", response_model=ResetFundsResponse)
async def reset_simulated_funds(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Restablece el saldo de la billetera virtual del usuario a $10,000 USD.
    """
    q_wallet = select(Wallet).where(Wallet.user_id == current_user.id).with_for_update()
    res_w = await db.execute(q_wallet)
    wallet = res_w.scalar_one_or_none()

    if not wallet:
        raise HTTPException(status_code=404, detail="Billetera no encontrada.")

    wallet.fiat_balance = settings.INITIAL_SIMULATED_BALANCE
    await db.flush()

    return ResetFundsResponse(
        status="success",
        message="Fondos virtuales restablecidos con éxito a $10,000.00 USD.",
        wallet_address=wallet.wallet_address,
        fiat_balance=wallet.fiat_balance,
    )

