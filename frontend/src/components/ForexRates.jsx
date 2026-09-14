import React, { useState } from 'react';
import { RefreshIcon } from './Icons';

const currencyNames = {
  COP: 'Peso Colombiano',
  EUR: 'Euro',
  GBP: 'Libra Esterlina',
  JPY: 'Yen Japones',
  BRL: 'Real Brasileno',
  MXN: 'Peso Mexicano',
  CAD: 'Dolar Canadiense',
  AUD: 'Dolar Australiano',
  CHF: 'Franco Suizo',
  CNY: 'Yuan Chino',
  USD: 'Dolar Estadounidense',
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
    <section className="section fade-in">
      <div className="section__header">
        <div>
          <h2 className="section__title">Tasas de Cambio Globales (Forex)</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Cotizaciones oficiales de divisas internacionales y tipos de cambio cruzados.
          </p>
        </div>
        <div className="section__actions">
          {lastUpdated && (
            <span className="section__timestamp">
              Actualizado: {lastUpdated}
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Base:</span>
            <select
              className="select"
              value={baseCurrency}
              onChange={(e) => onCurrencyChange(e.target.value)}
            >
              <option value="USD">USD - Dolar Estadounidense</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - Libra Esterlina</option>
              <option value="COP">COP - Peso Colombiano</option>
              <option value="MXN">MXN - Peso Mexicano</option>
              <option value="BRL">BRL - Real Brasileno</option>
            </select>
          </div>
          <button
            id="fetch-forex-rates"
            className="btn btn--secondary"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshIcon size={15} className={loading ? 'loading-spin' : ''} />
            <span>{loading ? 'Consultando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert--error" style={{ marginBottom: '16px' }}>
          <span>Error al consultar tasas de cambio: {error}</span>
        </div>
      )}

      {/* Tarjetas de pares destacados */}
      <div className="forex-highlights-grid">
        {rates.slice(0, 4).map((rate) => (
          <div key={rate.target_currency} className="forex-pair-card">
            <div className="forex-pair-header">
              <span className="forex-pair-title">{baseCurrency} / {rate.target_currency}</span>
              <span className="forex-pair-badge">En Vivo</span>
            </div>
            <div className="forex-pair-rate">
              {formatRate(rate.rate, rate.target_currency)}
            </div>
            <div className="forex-pair-sub">
              1 {rate.target_currency} = {formatInverse(rate.rate)} {baseCurrency}
            </div>
          </div>
        ))}
      </div>

      {/* Tabla detallada de tasas */}
      {loading && rates.length === 0 ? (
        <div className="data-card">
          <div className="empty-state">
            <span className="loading-spinner"></span>
            <div className="empty-state__text">Consultando cotizaciones de divisas...</div>
          </div>
        </div>
      ) : filteredRates.length === 0 ? (
        <div className="data-card">
          <div className="empty-state">
            <div className="empty-state__title">Sin tasas disponibles</div>
            <div className="empty-state__text">
              Verifica la seleccion de moneda base e intenta de nuevo.
            </div>
          </div>
        </div>
      ) : (
        <div className="data-card">
          <div className="data-card__header">
            <span className="data-card__title">Tipos de Cambio respecto a {baseCurrency}</span>
            <span className="data-card__badge">{filteredRates.length} Divisas</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Nombre de la Divisa</th>
                <th>Tasa de Cambio</th>
                <th>Equivalencia Directa</th>
                <th>Tasa Inversa</th>
              </tr>
            </thead>
            <tbody>
              {filteredRates.map((rate) => (
                <tr key={rate.target_currency}>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {rate.target_currency}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {currencyNames[rate.target_currency] || rate.target_currency}
                  </td>
                  <td className="data-table__rate">
                    {formatRate(rate.rate, rate.target_currency)}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                    1 {baseCurrency} = {formatRate(rate.rate, rate.target_currency)} {rate.target_currency}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    1 {rate.target_currency} = {formatInverse(rate.rate)} {baseCurrency}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
