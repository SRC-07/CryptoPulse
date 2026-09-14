import React from 'react';

/**
 * ConnectionStatus - Individual service status card.
 */
export default function ConnectionStatus({ service, status, responseTime, error, type }) {
  const statusClass = status || 'idle';

  const statusLabels = {
    healthy: 'ONLINE',
    unhealthy: 'OFFLINE',
    loading: 'CHECKING',
    idle: 'PENDING',
  };

  return (
    <div className={`status-card status-card--${statusClass} fade-in`}>
      <div className="status-card__header">
        <span className="status-card__name">{service}</span>
        <span className={`status-card__indicator status-card__indicator--${statusClass}`}>
          <span className={`status-card__dot status-card__dot--${statusClass}`}></span>
          {statusLabels[statusClass] || 'UNKNOWN'}
        </span>
      </div>
      <div className="status-card__meta">
        {type && (
          <span className="status-card__type">{type}</span>
        )}
        {responseTime !== undefined && responseTime !== null && (
          <span className="status-card__response-time">
            Latencia: <span>{responseTime.toFixed(1)} ms</span>
          </span>
        )}
      </div>
      {error && (
        <div className="status-card__error">
          {error}
        </div>
      )}
    </div>
  );
}
