import React, { useState, useCallback } from 'react';
import ConnectionStatus from './ConnectionStatus';

const API_BASE = '/api';

/**
 * HealthDashboard - System status panel.
 * Shows connectivity status of all architecture components.
 * Displayed as a collapsible section for administrative purposes.
 */
export default function HealthDashboard() {
  const [checks, setChecks] = useState({
    gateway: { status: 'idle' },
    'market-service': { status: 'idle' },
    postgresql: { status: 'idle' },
    'coingecko-api': { status: 'idle' },
    'forex-api': { status: 'idle' },
  });
  const [overallStatus, setOverallStatus] = useState('idle');
  const [isRunning, setIsRunning] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const runAllChecks = useCallback(async () => {
    setIsRunning(true);

    setChecks(prev => {
      const updated = {};
      for (const key of Object.keys(prev)) {
        updated[key] = { status: 'loading' };
      }
      return updated;
    });

    // Check Gateway
    const gatewayStart = performance.now();
    try {
      const res = await fetch('/gateway/health');
      await res.json();
      const elapsed = performance.now() - gatewayStart;
      setChecks(prev => ({
        ...prev,
        gateway: {
          status: 'healthy',
          responseTime: elapsed,
          type: 'Nginx Reverse Proxy',
        },
      }));
    } catch (err) {
      const elapsed = performance.now() - gatewayStart;
      setChecks(prev => ({
        ...prev,
        gateway: {
          status: 'unhealthy',
          responseTime: elapsed,
          error: err.message,
          type: 'Nginx Reverse Proxy',
        },
      }));
    }

    // Full health check via Gateway -> FastAPI
    try {
      const res = await fetch(`${API_BASE}/health/full`);
      const data = await res.json();

      const newChecks = {};
      for (const check of data.checks) {
        newChecks[check.service] = {
          status: check.status,
          responseTime: check.response_time_ms,
          error: check.error,
          type: getServiceType(check.service),
        };
      }

      setChecks(prev => ({ ...prev, ...newChecks }));
      setOverallStatus(data.status);
    } catch (err) {
      setChecks(prev => ({
        ...prev,
        'market-service': {
          status: 'unhealthy',
          error: `Backend unreachable: ${err.message}`,
          type: 'FastAPI Microservice',
        },
        postgresql: {
          status: 'unhealthy',
          error: 'Cannot verify (backend disconnected)',
          type: 'PostgreSQL 16',
        },
        'coingecko-api': {
          status: 'unhealthy',
          error: 'Cannot verify (backend disconnected)',
          type: 'External API',
        },
        'forex-api': {
          status: 'unhealthy',
          error: 'Cannot verify (backend disconnected)',
          type: 'External API',
        },
      }));
      setOverallStatus('unhealthy');
    }

    setIsRunning(false);
    setLastChecked(new Date().toLocaleTimeString('es-CO'));
  }, []);

  function getServiceType(service) {
    const types = {
      'market-service': 'FastAPI Microservice',
      postgresql: 'PostgreSQL 16 (Internal)',
      'coingecko-api': 'External API - CoinGecko',
      'forex-api': 'External API - Frankfurter / Exchange',
    };
    return types[service] || service;
  }

  const healthyCount = Object.values(checks).filter(c => c.status === 'healthy').length;
  const totalCount = Object.keys(checks).length;

  return (
    <section className="system-status">
      <button
        className="system-status__toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="system-status__toggle-info">
          <span className={`status-card__dot status-card__dot--${overallStatus === 'idle' ? 'idle' : overallStatus === 'healthy' ? 'healthy' : 'unhealthy'}`}></span>
          <span>System Status</span>
          {overallStatus !== 'idle' && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {healthyCount}/{totalCount} services online
            </span>
          )}
        </div>
        <span className={`system-status__toggle-arrow ${isOpen ? 'system-status__toggle-arrow--open' : ''}`}>
          v
        </span>
      </button>

      {isOpen && (
        <div className="system-status__content">
          <div className="section__header">
            <h2 className="section__title">Infrastructure Health</h2>
            <div className="section__actions">
              {lastChecked && (
                <span className="section__timestamp">
                  Last check: {lastChecked}
                </span>
              )}
              <button
                id="run-health-checks"
                className="btn btn--primary"
                onClick={runAllChecks}
                disabled={isRunning}
              >
                {isRunning ? (
                  <>
                    <span className="loading-spinner"></span>
                    Checking...
                  </>
                ) : (
                  'Run Diagnostics'
                )}
              </button>
            </div>
          </div>

          <div className="status-grid">
            <ConnectionStatus service="API Gateway" {...checks.gateway} />
            <ConnectionStatus service="Market Service" {...checks['market-service']} />
            <ConnectionStatus service="PostgreSQL" {...checks.postgresql} />
            <ConnectionStatus service="CoinGecko API" {...checks['coingecko-api']} />
            <ConnectionStatus service="Forex API" {...checks['forex-api']} />
          </div>
        </div>
      )}
    </section>
  );
}
