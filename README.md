# CryptoPulse

**Plataforma operativa de inteligencia financiera y seguimiento de activos en tiempo real** construida con arquitectura modular de microservicios.

## Arquitectura del Sistema

```
+-------------+     HTTP      +--------------+     +---------------------------------------+
|             |  ---------->  |              |     |         RED PRIVADA DOCKER            |
|   Frontend  |  Puerto 3000  |  API Gateway |     |  +---------------+  +--------------+  |
|  (React +   |               |   (Nginx)    |---->|  |Market Service |->|  PostgreSQL  |  |
|   Vite)     |  <----------  |  Puerto 8080 |     |  |  (FastAPI)    |  |   (DB)       |  |
|             |               |              |     |  +-------+-------+  +--------------+  |
+-------------+               +--------------+     |          |                            |
                                                   +----------+----------------------------+
                                                              |
                                                   +----------v----------+
                                                   |   APIs EXTERNAS     |
                                                   |  * CoinGecko API    |
                                                   |  * Exchange Forex   |
                                                   +---------------------+
```

### Componentes

| Componente | Tecnologia | Puerto | Red |
|---|---|---|---|
| Frontend Web | React 18 + Vite | 3000 (publico) | `cryptopulse-public` |
| API Gateway | Nginx | 8080 (publico) | `public` + `internal` |
| Market Service | FastAPI (Python) | 8000 (privado) | `cryptopulse-internal` |
| Base de Datos | PostgreSQL 16 | 5432 (privado) | `cryptopulse-internal` |

### APIs Externas Consumidas

- **CoinGecko API**: Precios en tiempo real, volumen y capitalizacion de criptomonedas.
- **Frankfurter / Exchange API**: Tasas de cambio de divisas globales (USD, EUR, COP, GBP, JPY, etc.).

---

## Inicio Rapido

### Prerrequisitos
- Docker Desktop instalado y en ejecucion
- Git (opcional)

### Levantar la plataforma con Docker

```bash
# Navegar al directorio del proyecto
cd cryptopulse

# Levantar todos los servicios
docker compose up --build -d

# Verificar el estado de los contenedores
docker compose ps
```

### URLs de Acceso

| URL | Descripcion |
|---|---|
| http://localhost:3000 | Plataforma Web Operativa - CryptoPulse |
| http://localhost:8080/api/docs | Documentacion interactiva de la API (Swagger UI) |
| http://localhost:8080/api/health/full | Diagnostico de salud de infraestructura (JSON) |

### Detener los servicios

```bash
docker compose down
```

---

## Endpoints de la API

Accesibles a traves del API Gateway en `http://localhost:8080`:

### Criptomonedas
| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/crypto/prices?vs_currency=usd&per_page=10` | Precios en vivo con cache y persistencia |
| GET | `/api/crypto/history?limit=20&symbol=BTC` | Historial almacenado en base de datos |

### Tasas de Cambio (Forex)
| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/forex/rates?base=USD&targets=COP,EUR,GBP` | Tasas en vivo con soporte multi-fuente |
| GET | `/api/forex/history?base=USD&limit=20` | Historial de tasas en base de datos |

### Diagnostico de Infraestructura
| Metodo | Ruta | Descripcion |
|---|---|---|
| GET | `/api/health` | Estado del Market Service |
| GET | `/api/health/database` | Conectividad con PostgreSQL |
| GET | `/api/health/coingecko` | Conectividad con CoinGecko |
| GET | `/api/health/forex` | Conectividad con Forex API |
| GET | `/api/health/full` | Reporte consolidado de todos los servicios |

---

## Stack Tecnologico

- **Frontend**: React 18, Vite 5, CSS3 Moderno (Dark Mode)
- **Backend**: FastAPI (Python 3.12), Uvicorn (ASGI)
- **Base de Datos**: PostgreSQL 16 Alpine
- **API Gateway**: Nginx 1.27 Alpine
- **Contenedorizacion**: Docker, Docker Compose
- **ORM**: SQLAlchemy 2.0 (AsyncIO), asyncpg
- **Cliente HTTP**: httpx (Asincrono con tolerancia a fallos)
- **Validacion**: Pydantic v2

---

## Estructura del Proyecto

```
cryptopulse/
|-- docker-compose.yml          # Orquestacion de contenedores
|-- .env                        # Variables de entorno
|-- README.md
|-- gateway/                    # API Gateway (Nginx)
|   |-- Dockerfile
|   `-- nginx.conf
|-- services/
|   `-- market-service/         # Microservicio de inteligencia de mercado
|       |-- Dockerfile
|       |-- requirements.txt
|       `-- app/
|           |-- main.py         # Punto de entrada FastAPI
|           |-- config.py       # Configuracion del servicio
|           |-- database.py     # Conexion asincrona PostgreSQL
|           |-- models.py       # Modelos de datos
|           |-- schemas.py      # Esquemas de validacion
|           |-- routers/
|           |   |-- health.py   # Diagnostico y monitoreo
|           |   |-- crypto.py   # Operaciones de criptomonedas
|           |   `-- forex.py    # Operaciones de divisas
|           `-- services/
|               |-- coingecko.py    # Cliente CoinGecko
|               `-- frankfurter.py  # Cliente Forex
|-- frontend/                   # Aplicacion Web React
|   |-- Dockerfile
|   |-- package.json
|   |-- vite.config.js
|   `-- src/
|       |-- App.jsx
|       |-- main.jsx
|       |-- index.css
|       `-- components/
|           |-- CryptoTicker.jsx
|           |-- CurrencyConverter.jsx
|           |-- ForexRates.jsx
|           |-- PortfolioWatchlist.jsx
|           `-- SystemStatusModal.jsx
`-- docs/
    `-- architecture-diagram.md
```
