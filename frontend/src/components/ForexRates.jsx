import React, { useState } from 'react';
import { RefreshIcon, SearchIcon } from './Icons';

const currencyNames = {
  COP: 'Peso Colombiano',
  EUR: 'Euro',
  GBP: 'Libra Esterlina',
  JPY: 'Yen Japonés',
  BRL: 'Real Brasileño',
  MXN: 'Peso Mexicano',
  CAD: 'Dólar Canadiense',
  AUD: 'Dólar Australiano',
  CHF: 'Franco Suizo',
  CNY: 'Yuan Chino',
  USD: 'Dólar Estadounidense',
};

export default function ForexRates({
  rates = [],
  baseCurrency = 'USD',
  onCurrencyChange,
  loading = false,
  error = null,
  lastUpdated = null,
  onRefresh,
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const formatRate = (rate, currency) => {
    if (!rate && rate !== 0) return '--';
    if (['JPY', 'COP'].includes(currency)) {
      return rate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return rate.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  };

  const formatInverse = (rate) => {
    if (!rate || rate === 0) return '--';
    const inv = 1 / rate;
    if (inv >= 1) return inv.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    return inv.toFixed(6);
  };

  const filteredRates = rates.filter(r => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    const name = currencyNames[r.target_currency] || '';
    return r.target_currency.toLowerCase().includes(q) || name.toLowerCase().includes(q);
  });

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 510, color: 'var(--color-paper)', letterSpacing: '-0.022em' }}>
            Tasas de Cambio Globales
          </h2>
          <p style={{ color: 'var(--color-fog)', fontSize: '14px', marginTop: '4px' }}>
            Cotizaciones oficiales de divisas internacionales y tipos de cambio cruzados en tiempo real.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {lastUpdated && (
            <span style={{ fontSize: '12px', color: 'var(--color-ash)', fontFamily: 'var(--font-mono)' }}>
              Actualizado: {lastUpdated}
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--color-fog)' }}>Moneda Base:</span>
            <select
              className="navbar__currency-select"
              value={baseCurrency}
              onChange={(e) => onCurrencyChange(e.target.value)}
            >
              <option value="USD">USD (Dólar)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="GBP">GBP (Libra)</option>
              <option value="COP">COP (Peso)</option>
              <option value="MXN">MXN (Mexicano)</option>
              <option value="BRL">BRL (Real)</option>
            </select>
          </div>

          <button
            id="fetch-forex-rates"
            className="btn-ghost"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshIcon size={14} className={loading ? 'loading-spin' : ''} />
            <span>{loading ? 'Consultando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          background: 'var(--color-coral-red-bg)',
          border: '1px solid var(--color-coral-red-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          color: 'var(--color-coral-red)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>Error al consultar tasas de cambio: {error}</span>
        </div>
      )}

      {/* Tarjetas de Divisas Clave */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
        {rates.slice(0, 4).map((rate) => (
          <div
            key={rate.target_currency}
            style={{
              background: 'var(--color-carbon)',
              border: '1px solid var(--color-graphite)',
              borderRadius: 'var(--radius-cards)',
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: 'inset 0 0 0 1px rgba(255, 255, 255, 0.02)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {currencyNames[rate.target_currency] || rate.target_currency}
              </span>
              <span className="badge-tag badge-tag--neutral">{rate.target_currency}</span>
            </div>

            <div className="text-mono" style={{ fontSize: '22px', fontWeight: 510, color: 'var(--color-paper)' }}>
              {formatRate(rate.rate, rate.target_currency)}
            </div>

            <div style={{ fontSize: '11px', color: 'var(--color-ash)', fontFamily: 'var(--font-mono)' }}>
              1 {rate.target_currency} = {formatInverse(rate.rate)} {baseCurrency}
            </div>
          </div>
        ))}
      </div>

      {/* Tabla Completa de Forex */}
      <div className="table-card">
        <div className="table-card__toolbar">
          <div className="search-input-wrapper">
            <SearchIcon size={16} style={{ color: 'var(--color-fog)', flexShrink: 0 }} />
            <input
              type="text"
              className="search-input"
              placeholder="Filtrar por código o nombre de divisa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <span style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
            Total pares monitoreados: <strong className="text-mono" style={{ color: 'var(--color-paper)' }}>{filteredRates.length}</strong>
          </span>
        </div>

        {filteredRates.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-fog)', fontSize: '13px' }}>
            No se encontraron divisas coincidentes.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-linear">
              <thead>
                <tr>
                  <th>Divisa Objetivo</th>
                  <th>Nombre Oficial</th>
                  <th>Tipo de Cambio (1 {baseCurrency} =)</th>
                  <th>Inverso (1 Divisa =)</th>
                  <th style={{ textAlign: 'right', paddingRight: '20px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredRates.map((r) => (
                  <tr key={r.target_currency}>
                    <td style={{ fontWeight: 510, color: 'var(--color-paper)' }}>
                      <span className="text-mono">{baseCurrency}/{r.target_currency}</span>
                    </td>
                    <td style={{ color: 'var(--color-mist)' }}>
                      {currencyNames[r.target_currency] || r.target_currency}
                    </td>
                    <td className="text-mono" style={{ color: 'var(--color-paper)', fontWeight: 510 }}>
                      {formatRate(r.rate, r.target_currency)} {r.target_currency}
                    </td>
                    <td className="text-mono" style={{ color: 'var(--color-fog)' }}>
                      {formatInverse(r.rate)} {baseCurrency}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                      <span className="badge-tag badge-tag--positive">
                        Oficial
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

