"""
Tests de Balanceo de Cargas y Configuración de Infraestructura (ISO 9126: Eficiencia)
CryptoPulse - Segunda Entrega

Valida que:
1. El archivo gateway/nginx.conf tiene configurados los upstreams con algoritmo 'least_conn'.
2. Existen múltiples réplicas declaradas para Market Service y Portfolio Service.
3. El Rate Limiter de protección contra DoS está configurado a 15 req/s.
4. El archivo docker-compose.yml declara la topología multi-base de datos asignada correctamente:
   - Market Service -> MongoDB (Ticks/Series temporales) + Redis (L1)
   - Portfolio Service -> PostgreSQL (Usuarios y Billeteras 1:1 ACID)
"""

import re
from pathlib import Path

ROOT_PATH = Path(__file__).resolve().parent.parent
NGINX_CONF = ROOT_PATH / "gateway" / "nginx.conf"
DOCKER_COMPOSE = ROOT_PATH / "docker-compose.yml"


def test_nginx_load_balancer_configuration():
    """Verifica que el Gateway NGINX tenga balanceo de carga least_conn y réplicas."""
    assert NGINX_CONF.exists(), f"No se encontró el archivo de configuración {NGINX_CONF}"
    content = NGINX_CONF.read_text(encoding="utf-8")

    # 1. Validar upstream de Market Service
    assert "upstream market_service_cluster {" in content
    assert "market-service-1:8000" in content
    assert "market-service-2:8000" in content

    # 2. Validar upstream de Portfolio Service
    assert "upstream portfolio_service_cluster {" in content
    assert "portfolio-service-1:8001" in content
    assert "portfolio-service-2:8001" in content

    # 3. Validar algoritmo least_conn (ISO 9126: Eficiencia / Comportamiento temporal)
    least_conn_occurrences = len(re.findall(r"\bleast_conn\b", content))
    assert least_conn_occurrences >= 2, "Debe haber al menos 2 directivas least_conn (uno por cada clúster)"

    # 4. Validar Rate Limiter (Protección contra DoS y saturación)
    assert "limit_req_zone $binary_remote_addr zone=api_limit:10m rate=15r/s" in content
    assert "limit_req zone=api_limit burst=25 nodelay" in content


def test_docker_compose_cluster_topology():
    """Verifica que docker-compose.yml configure los contenedores de base de datos y réplicas."""
    assert DOCKER_COMPOSE.exists(), f"No se encontró {DOCKER_COMPOSE}"
    compose_text = DOCKER_COMPOSE.read_text(encoding="utf-8")

    # Contenedores de réplicas
    assert "market-service-1:" in compose_text
    assert "market-service-2:" in compose_text
    assert "portfolio-service-1:" in compose_text
    assert "portfolio-service-2:" in compose_text
    assert "notification-worker:" in compose_text
    assert "gateway:" in compose_text

    # Bases de datos dedicadas
    assert "mongodb:" in compose_text
    assert "postgres:" in compose_text
    assert "redis:" in compose_text

    # Conexión correcta de bases de datos desde .env
    env_file = ROOT_PATH / ".env"
    assert env_file.exists()
    env_text = env_file.read_text(encoding="utf-8")

    # Market service apunta a MongoDB y Redis
    assert "mongodb://cryptopulse:" in env_text
    assert "redis://redis:6379" in env_text
    # Portfolio service apunta a PostgreSQL
    assert "postgresql+asyncpg://" in env_text
