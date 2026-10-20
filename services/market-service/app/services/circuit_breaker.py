import time
import logging
from enum import Enum
from typing import Dict, Any

logger = logging.getLogger("market.circuit_breaker")


class CircuitState(str, Enum):
    CLOSED = "CLOSED"      # Operación normal: peticiones fluyen al proveedor externo
    OPEN = "OPEN"          # Circuito abierto: se bloquean llamadas externas y se sirve fallback local
    HALF_OPEN = "HALF_OPEN"# Período de prueba: se envía una petición de prueba para verificar recuperación


class CircuitBreaker:
    """
    Patrón Circuit Breaker para mitigar fallos de proveedores financieros externos (CoinGecko / Forex).
    Protege el sistema de timeouts acumulados y rate-limiting (HTTP 429).
    """
    def __init__(self, failure_threshold: int = 3, recovery_time: float = 30.0):
        self.failure_threshold = failure_threshold
        self.recovery_time = recovery_time
        self.state = CircuitState.CLOSED
        self.consecutive_failures = 0
        self.last_failure_time = 0.0
        self.total_fallback_triggers = 0

    def can_execute(self) -> bool:
        """Determina si la llamada a la API externa debe ser intentada."""
        now = time.time()
        if self.state == CircuitState.CLOSED:
            return True

        if self.state == CircuitState.OPEN:
            if (now - self.last_failure_time) > self.recovery_time:
                logger.info("CircuitBreaker conmutando a HALF_OPEN para prueba de recuperación.")
                self.state = CircuitState.HALF_OPEN
                return True
            return False

        if self.state == CircuitState.HALF_OPEN:
            return True

        return False

    def record_success(self):
        """Registra una respuesta exitosa y restaura el circuito a estado CLOSED."""
        if self.state != CircuitState.CLOSED:
            logger.info("CircuitBreaker recuperado exitosamente: conmutando a CLOSED.")
        self.state = CircuitState.CLOSED
        self.consecutive_failures = 0

    def record_failure(self):
        """Registra un fallo de conexión o HTTP 429 y abre el circuito si supera el umbral."""
        self.consecutive_failures += 1
        self.last_failure_time = time.time()
        self.total_fallback_triggers += 1

        if self.consecutive_failures >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.warning(
                f"CircuitBreaker ABIERTO (consecutive_failures={self.consecutive_failures}). "
                f"Bloqueando llamadas externas por {self.recovery_time}s."
            )

    def get_metrics(self) -> Dict[str, Any]:
        """Retorna el estado actual del cortacircuitos para el dashboard de salud."""
        return {
            "state": self.state.value,
            "consecutive_failures": self.consecutive_failures,
            "threshold": self.failure_threshold,
            "total_fallback_triggers": self.total_fallback_triggers,
            "recovery_time_seconds": self.recovery_time,
        }


# Instancias globales para proveedores externos
coingecko_breaker = CircuitBreaker(failure_threshold=3, recovery_time=30.0)
forex_breaker = CircuitBreaker(failure_threshold=3, recovery_time=30.0)
