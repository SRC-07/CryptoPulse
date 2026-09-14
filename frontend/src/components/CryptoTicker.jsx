import React, { useState, useEffect } from 'react';

const API_BASE = '/api';

/**
 * CryptoTicker - Real-time cryptocurrency prices.
 * Fetches data automatically on mount and provides manual refresh.
 */
export default function CryptoTicker({ onDataLoaded }) {
  const [cryptos, setCryptos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchPrices = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/crypto/prices?vs_currency=usd&per_page=10`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      const coins = data.data || [];
      setCryptos(coins);
      setLastUpdated(new Date().toLocaleTimeString('es-CO'));
      if (onDataLoaded) onDataLoaded(coins);
    } catch (err) {
      setError(err.message);
      setCryptos([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPrices();
  }, []);

  const formatPrice = (price) => {
    if (price >= 1) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `$${price.toFixed(6)}`;
  };

  const formatVolume = (volume) => {
    if (!volume) return '-';
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    return `$${volume.toLocaleString()}`;
  };

  const formatMarketCap = (cap) => {
    if (!cap) return '-';
    if (cap >= 1e12) return `$${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `$${(cap / 1e9).toFixed(2)}B`;
    if (cap >= 1e6) return `$${(cap / 1e6).toFixed(2)}M`;
    return `$${cap.toLocaleString()}`;
  };

  return (
    <section className="section">
      <div className="section__header">
        <h2 className="section__title">Mercado de Criptomonedas</h2>
        <div className="section__actions">
          {lastUpdated && (
            <span className="section__timestamp">
              Actualizado: {lastUpdated}
            </span>
          )}
          <button
            id="fetch-crypto-prices"
            className={`btn btn--secondary`}
            onClick={fetchPrices}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Cargando...
              </>
            ) : (
              'Actualizar'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert--error">
          <span>No se pudieron cargar los datos: {error}</span>
        </div>
      )}

      {cryptos.length === 0 && !loading && !error ? (
        <div className="data-card">
          <div className="empty-state">
            <div className="empty-state__title">Sin datos disponibles</div>
            <div className="empty-state__text">
              No se pudieron obtener los precios de mercado. Verifica la conexion e intenta de nuevo.
            </div>
          </div>
        </div>
      ) : loading && cryptos.length === 0 ? (
        <div className="data-card">
          <div className="empty-state">
            <span className="loading-spinner"></span>
            <div className="empty-state__text">Consultando mercados...</div>
          </div>
        </div>
      ) : cryptos.length > 0 ? (
        <div className="data-card fade-in">
          <div className="data-card__header">
            <span className="data-card__title">Top 10 por Capitalizacion de Mercado</span>
            <span className="data-card__badge">En vivo</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Activo</th>
                <th>Precio (USD)</th>
                <th>Cambio 24h</th>
                <th>Volumen 24h</th>
                <th>Cap. Mercado</th>
              </tr>
            </thead>
            <tbody>
              {cryptos.map((coin, idx) => (
                <tr key={coin.coin_id || idx}>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {idx + 1}
                  </td>
                  <td>
                    <div className="data-table__coin">
                      {coin.image_url && (
                        <img
                          className="data-table__coin-icon"
                          src={coin.image_url}
                          alt={coin.name}
                          loading="lazy"
                        />
                      )}
                      <div>
                        <div className="data-table__coin-name">{coin.name}</div>
                        <div className="data-table__coin-symbol">{coin.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="data-table__price">
                    {formatPrice(coin.current_price)}
                  </td>
                  <td>
                    {coin.price_change_percentage_24h != null ? (
                      <span className={`data-table__change ${
                        coin.price_change_percentage_24h >= 0
                          ? 'data-table__change--positive'
                          : 'data-table__change--negative'
                      }`}>
                        {coin.price_change_percentage_24h >= 0 ? '+' : ''}
                        {coin.price_change_percentage_24h.toFixed(2)}%
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>-</span>
                    )}
                  </td>
                  <td className="data-table__volume">
                    {formatVolume(coin.total_volume)}
                  </td>
                  <td className="data-table__volume">
                    {formatMarketCap(coin.market_cap)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
