<#
.SYNOPSIS
    CryptoPulse - Script de Orquestación y Control de Clúster (Entrega Final)
.DESCRIPTION
    Automatiza el ciclo de vida, despliegue, escalado, verificación de salud y 
    pruebas del clúster de microservicios con balanceo de carga y persistencia políglota.
.PARAMETER Action
    Acción a ejecutar: up, down, restart, status, health, test, scale, logs
.EXAMPLE
    .\orchestrate.ps1 up
    .\orchestrate.ps1 health
    .\orchestrate.ps1 test
    .\orchestrate.ps1 down
#>

param (
    [Parameter(Position=0)]
    [ValidateSet("up", "down", "restart", "status", "health", "test", "scale", "logs")]
    [string]$Action = "status",

    [Parameter(Position=1)]
    [string]$Target = ""
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   CRYPTOPULSE - ORQUESTADOR DE CLÚSTER (ENTREGA FINAL)         " -ForegroundColor Cyan
Write-Host "   Arquitectura de Microservicios, Resiliencia y Calidad ISO 9126" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

function Check-Docker {
    $dockerCheck = docker ps 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ALERTA] Docker Daemon no responde o Docker Desktop no está iniciado." -ForegroundColor Yellow
        Write-Host "Inicia Docker Desktop para levantar los contenedores del clúster." -ForegroundColor Gray
        return $false
    }
    return $true
}

switch ($Action) {
    "up" {
        Write-Host "[1/4] Verificando Docker Desktop..." -ForegroundColor Yellow
        if (-not (Check-Docker)) { exit 1 }

        Write-Host "[2/4] Construyendo imágenes y orquestando clúster multi-contenedor..." -ForegroundColor Yellow
        docker compose up --build -d

        Write-Host "[3/4] Esperando estabilización de réplicas y bases de datos (15s)..." -ForegroundColor Yellow
        Start-Sleep -Seconds 15

        Write-Host "[4/4] Verificando estado de salud del clúster..." -ForegroundColor Green
        docker compose ps
        Write-Host ""
        Write-Host "Acceso Web: http://localhost:3000" -ForegroundColor Green
        Write-Host "API Gateway: http://localhost:8080/api/health/full" -ForegroundColor Green
    }

    "down" {
        Write-Host "Deteniendo todos los microservicios y redes de forma segura..." -ForegroundColor Yellow
        docker compose down
        Write-Host "Clúster detenido correctamente." -ForegroundColor Green
    }

    "restart" {
        Write-Host "Reiniciando clúster..." -ForegroundColor Yellow
        docker compose restart
        Start-Sleep -Seconds 5
        docker compose ps
    }

    "status" {
        if (Check-Docker) {
            Write-Host "Estado de contenedores en ejecución:" -ForegroundColor Cyan
            docker compose ps
        } else {
            Write-Host "No se puede consultar 'docker compose ps' porque Docker está detenido." -ForegroundColor Gray
        }
    }

    "health" {
        Write-Host "Consultando diagnóstico de disponibilidad y latencias al API Gateway..." -ForegroundColor Cyan
        try {
            $resp = Invoke-RestMethod -Uri "http://localhost:8080/api/health/full" -Method Get -TimeoutSec 5
            Write-Host "Estado Global del Clúster: $($resp.status.ToUpper())" -ForegroundColor ($resp.status -eq "healthy" ? "Green" : "Yellow")
            Write-Host "Timestamp: $($resp.timestamp)" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Servicios e Infraestructura:" -ForegroundColor Cyan
            foreach ($c in $resp.checks) {
                $color = $c.status -eq "healthy" ? "Green" : "Red"
                Write-Host " - [$($c.status.ToUpper())] $($c.service) ($($c.response_time_ms) ms)" -ForegroundColor $color
            }
        } catch {
            Write-Host "[ERROR] No se pudo conectar a http://localhost:8080/api/health/full." -ForegroundColor Red
            Write-Host "Asegúrate de haber iniciado el clúster con: .\orchestrate.ps1 up" -ForegroundColor Gray
        }
    }

    "test" {
        Write-Host "Ejecutando suite automatizada de pruebas de calidad (ISO 9126)..." -ForegroundColor Cyan
        pytest tests/ -v
    }

    "logs" {
        if ($Target -ne "") {
            docker compose logs -f $Target
        } else {
            docker compose logs --tail=50 -f
        }
    }
}
Write-Host ""
