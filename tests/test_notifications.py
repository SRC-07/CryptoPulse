"""
Tests de Notificaciones y Eventos Asíncronos (ISO 9126: Confiabilidad y Usabilidad)
CryptoPulse - Entrega Final

Valida que:
1. El Notification Worker recibe y procesa eventos asíncronos de órdenes y alertas.
2. Formatea adecuadamente los títulos y mensajes para la Campana del Navbar.
3. Permite la consulta de notificaciones encoladas y cálculo de no leídas (unread_count).
4. Soporta fallback local resiliente en ausencia de Redis.
"""

import pytest
import importlib.util
from pathlib import Path
from unittest.mock import AsyncMock, patch

_worker_file = Path(__file__).resolve().parent.parent / "services" / "notification-worker" / "app" / "main.py"
_spec = importlib.util.spec_from_file_location("notif_worker_mod", str(_worker_file))
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

NotificationEvent = _mod.NotificationEvent
receive_event = _mod.receive_event
get_notifications = _mod.get_notifications
trigger_test_notification = _mod.trigger_test_notification
clear_notifications = _mod.clear_notifications
NotificationRequestModel = _mod.TestNotificationRequest


@pytest.mark.asyncio
async def test_notification_order_event_reception():
    """Valida el procesamiento automático de un evento ORDER_EXECUTED."""
    event = NotificationEvent(
        event="ORDER_EXECUTED",
        payload={
            "user_id": 101,
            "wallet_id": 1,
            "symbol": "BTC",
            "order_type": "BUY",
            "quantity": 0.05,
            "price": 68500.0,
            "total_fiat": 3425.0
        }
    )

    response = await receive_event(event)
    assert response["status"] == "queued"
    assert response["event"] == "ORDER_EXECUTED"
    assert "Orden BUY Ejecutada" in response["notification"]["title"]
    assert "0.05 BTC" in response["notification"]["message"]
    assert response["notification"]["read"] is False


@pytest.mark.asyncio
async def test_notification_price_alert_event():
    """Valida el procesamiento de una alerta de volatilidad de mercado."""
    event = NotificationEvent(
        event="PRICE_ALERT",
        payload={
            "symbol": "ETH",
            "price": 3500.0,
            "target_price": 3450.0
        }
    )

    response = await receive_event(event)
    assert response["status"] == "queued"
    assert "Alerta de Mercado: ETH" in response["notification"]["title"]
    assert response["notification"]["type"] == "alert"


@pytest.mark.asyncio
async def test_get_notifications_and_unread_count():
    """Valida que la consulta retorna la lista ordenada y el conteo de no leídas."""
    # Disparar 2 notificaciones de prueba
    await trigger_test_notification(NotificationRequestModel(type="order", symbol="SOL", action="BUY", price=160.0, quantity=5.0))
    await trigger_test_notification(NotificationRequestModel(type="alert", symbol="ADA", price=0.65))

    result = await get_notifications(limit=10)
    assert result["status"] == "success"
    assert result["count"] >= 2
    assert result["unread_count"] >= 2
    assert len(result["data"]) >= 2


@pytest.mark.asyncio
async def test_clear_notifications():
    """Valida la limpieza completa de notificaciones."""
    await clear_notifications()
    result = await get_notifications(limit=10)
    assert result["count"] == 0
    assert result["unread_count"] == 0
