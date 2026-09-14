# CryptoPulse — Documento de Arquitectura del Sistema (3 Entregas)

Este documento detalla la arquitectura de software distribuida para las tres fases del proyecto CryptoPulse, correspondiente al modelo de microservicios, perimetro seguro y persistencia poliglota.

---

## 1. Diagrama de Bloques Global (3 Entregas)

```mermaid
graph TD
    classDef client fill:#1E293B,stroke:#3B82F6,stroke-width:2px,color:#FFFFFF;
    classDef gateway fill:#0F172A,stroke:#00E5A3,stroke-width:2px,color:#FFFFFF;
    classDef service fill:#1E293B,stroke:#00E5A3,stroke-width:2px,color:#FFFFFF;
    classDef db fill:#0B1E2E,stroke:#EAB308,stroke-width:2px,color:#FFFFFF;
    classDef external fill:#1E293B,stroke:#94A3B8,stroke-dasharray: 5 5,color:#FFFFFF;

    subgraph CapaCliente["Capa de Cliente (Navegador Web)"]
        FE["Frontend Web SPA (React 18 / Vite)<br/>Puerto 3000"]:::client
    end

    subgraph Perimetro["Perimetro Seguro de Entrada"]
        GW["API Gateway / Reverse Proxy (Nginx 1.27)<br/>Puerto 8080"]:::gateway
    end

    subgraph RedInterna["Red Privada Docker (cryptopulse-internal)"]
        subgraph E1["Fase 1: Entregable 1 (Operativo)"]
            MS1["Market Service #1 (FastAPI)"]:::service
            DB1[("Db1: PostgreSQL 16<br/>Relacional ACID")]:::db
        end

        subgraph E2["Fase 2: Entregable 2 (Persistencia Poliglota)"]
            MS2["Market Service #2 (FastAPI Replica)"]:::service
            PS["Portfolio Service (FastAPI / JWT)"]:::service
            DB2[("Db2: MongoDB 7.0<br/>Documental BSON")]:::db
        end

        subgraph E3["Fase 3: Entregable 3 (Eventos y Resiliencia)"]
            NW["Notification Worker (Async)"]:::service
            DB3[("Db3: Redis 7 In-Memory<br/>Cache TTL 30s & Pub/Sub")]:::db
        end
    end

    subgraph Externas["APIs Financieras Externas"]
        CG["CoinGecko API v3"]:::external
        FX["Frankfurter / Exchange API"]:::external
    end

    FE -->|HTTP / REST| GW
    GW -->|Proxy / Balanceo| MS1
    GW -->|Load Balancing E2| MS2
    GW -->|Auth & Portafolios E2| PS

    MS1 -->|SQLAlchemy Async| DB1
    MS2 -->|SQLAlchemy Async| DB1
    MS1 -->|Precios Cripto| CG
    MS1 -->|Tasas Forex| FX

    PS -->|Motor Driver| DB2
    MS1 -.->|Cache-Aside E3| DB3
    MS1 -.->|Publish Eventos E3| DB3
    NW -.->|Subscribe Eventos E3| DB3
```

---

## 2. Justificacion de la Persistencia Poliglota

| Base de Datos | Tipo | Rol en el Sistema | Razon de Seleccion |
|---|---|---|---|
| **PostgreSQL 16** | Relacional (ACID) | Historico transaccional de precios e indices | Garantiza integridad referencial estricta y precision para calculos monetarios. |
| **MongoDB 7.0** | NoSQL Documental (BSON) | Usuarios, carteras personalizadas y configuraciones | Flexibilidad para registrar portafolios con cantidades y tipos de activos variables por usuario. |
| **Redis 7** | In-Memory (Clave-Valor) | Cache de baja latencia (<1 ms) y bus Pub/Sub | Reduce llamadas a APIs externas respetando limites de tasa y distribuye eventos de alerta. |

---

## 3. Matriz de Entregables

1. **Entregable 1**: Frontend React + Gateway Nginx + Market Service FastAPI + PostgreSQL 16 en red privada.
2. **Entregable 2**: MongoDB 7.0 + Portfolio Service + Balanceo de carga Nginx en dos instancias backend.
3. **Entregable 3**: Redis 7 + Notification Worker + Circuit Breaker + Dashboard Grafana/Prometheus.
