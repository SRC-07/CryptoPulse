"""
Tests de Circuit Breaker y Alta Disponibilidad (ISO 9126: Fiabilidad)
CryptoPulse - Segunda Entrega

Valida que:
1. El Circuit Breaker inicia en estado CLOSED y permite llamadas externas.
2. Al registrar fallos consecutivos superiores al umbral (failure_threshold=3), commuta a OPEN.
3. En estado OPEN, can_execute() retorna False inmediatamente protegiendo al sistema.
4. Tras el período de recuperación, commuta a HALF_OPEN para una petición de prueba.
5. Si la prueba es exitosa, se restaura a CLOSED con contador de fallos reiniciado a 0.
"""

import time
import pytest
import importlib.util
from pathlib import Path

_cb_file = Path(__file__).resolve().parent.parent / "services" / "market-service" / "app" / "services" / "circuit_breaker.py"
_spec = importlib.util.spec_from_file_location("circuit_breaker_mod", str(_cb_file))
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

CircuitBreaker = _mod.CircuitBreaker
CircuitState = _mod.CircuitState


def test_circuit_breaker_initial_closed_state():
    """Verifica que el estado inicial permite ejecuciones normales."""
    cb = CircuitBreaker(failure_threshold=3, recovery_time=1.0)
    assert cb.state == CircuitState.CLOSED
    assert cb.can_execute() is True
    assert cb.consecutive_failures == 0


def test_circuit_breaker_trips_to_open_on_threshold():
    """Verifica que superar el umbral de fallos abre el circuito inmediatamente."""
    cb = CircuitBreaker(failure_threshold=3, recovery_time=2.0)

    # 1er fallo
    cb.record_failure()
    assert cb.state == CircuitState.CLOSED
    assert cb.can_execute() is True
    assert cb.consecutive_failures == 1

    # 2do fallo
    cb.record_failure()
    assert cb.state == CircuitState.CLOSED
    assert cb.can_execute() is True
    assert cb.consecutive_failures == 2

    # 3er fallo -> TRIP a OPEN
    cb.record_failure()
    assert cb.state == CircuitState.OPEN
    assert cb.consecutive_failures == 3
    assert cb.can_execute() is False, "En estado OPEN no debe permitir peticiones externas"


def test_circuit_breaker_recovers_to_half_open_then_closed():
    """Verifica la transición automática OPEN -> HALF_OPEN -> CLOSED."""
    # Recovery time corto de 0.2 segundos para la prueba
    cb = CircuitBreaker(failure_threshold=2, recovery_time=0.2)

    cb.record_failure()
    cb.record_failure()
    assert cb.state == CircuitState.OPEN
    assert cb.can_execute() is False

    # Esperar que expire el período de recuperación
    time.sleep(0.25)

    # La siguiente verificación debe conmutar a HALF_OPEN
    assert cb.can_execute() is True
    assert cb.state == CircuitState.HALF_OPEN

    # Al registrar éxito de la petición de prueba, commuta a CLOSED
    cb.record_success()
    assert cb.state == CircuitState.CLOSED
    assert cb.consecutive_failures == 0
    assert cb.can_execute() is True


def test_circuit_breaker_metrics_reporting():
    """Verifica que el diccionario de métricas refleja con precisión el estado del sistema."""
    cb = CircuitBreaker(failure_threshold=5, recovery_time=15.0)
    cb.record_failure()
    cb.record_failure()

    metrics = cb.get_metrics()
    assert metrics["state"] == "CLOSED"
    assert metrics["consecutive_failures"] == 2
    assert metrics["threshold"] == 5
    assert metrics["total_fallback_triggers"] == 2
    assert metrics["recovery_time_seconds"] == 15.0
