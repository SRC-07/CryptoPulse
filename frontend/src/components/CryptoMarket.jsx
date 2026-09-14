import React, { useState, useMemo } from 'react';
import { SearchIcon, RefreshIcon, TrendingUpIcon, TrendingDownIcon, CloseIcon } from './Icons';
import Sparkline from './Sparkline';

export default function CryptoMarket({ cryptos = [], loading = false, error = null, lastUpdated = null, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('market_cap');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedCoin, setSelectedCoin] = useState(null);

  const filteredCryptos = useMemo(() => {
    let list = [...cryptos];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
      );
    }

    if (filterType === 'gainers') {
      list = list.filter(c => (c.price_change_percentage_24h || 0) > 0);
    } else if (filterType === 'losers') {
      list = list.filter(c => (c.price_change_percentage_24h || 0) < 0);
    } else if (filterType === 'top5') {
      list = list.slice(0, 5);
    }

    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortBy === 'price') {
        valA = a.current_price || 0;
        valB = b.current_price || 0;
      } else if (sortBy === 'change') {
        valA = a.price_change_percentage_24h || 0;
        valB = b.price_change_percentage_24h || 0;
      } else {
        valA = a.market_cap || 0;
        valB = b.market_cap || 0;
      }

      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

    return list;
  }, [cryptos, searchTerm, filterType, sortBy, sortOrder]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const formatPrice = (price) => {
    if (!price && price !== 0) return '--';
    if (price >= 1) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `$${price.toFixed(6)}`;
  };

  const formatLarge = (num) => {
    if (!num) return '--';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  return (
    <section className="section fade-in">
      <div className="section__header">
        <div>
          <h2 className="section__title">Cotizaciones de Criptomonedas</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Precios en tiempo real, volumen transaccional y capitalizacion de mercado.
          </p>
        </div>
        <div className="section__actions">
          {lastUpdated && (
            <span className="section__timestamp">
              Actualizado: {lastUpdated}
            </span>
          )}
          <button
            id="fetch-crypto-prices"
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
          <span>Error al consultar cotizaciones: {error}</span>
        </div>
      )}

      <div className="market-controls">
        <div className="market-search">
          <SearchIcon size={18} className="market-search__icon" />
          <input
            type="text"
            className="market-search__input"
            placeholder="Buscar por activo (ej: Bitcoin, SOL, ETH)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-chips">
          <button
            className={`filter-chip ${filterType === 'all' ? 'filter-chip--active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            Todos ({cryptos.length})
          </button>
          <button
            className={`filter-chip ${filterType === 'gainers' ? 'filter-chip--active' : ''}`}
            onClick={() => setFilterType('gainers')}
          >
            Ganadores 24h
          </button>
          <button
            className={`filter-chip ${filterType === 'losers' ? 'filter-chip--active' : ''}`}
            onClick={() => setFilterType('losers')}
          >
            Perdedores 24h
          </button>
          <button
            className={`filter-chip ${filterType === 'top5' ? 'filter-chip--active' : ''}`}
            onClick={() => setFilterType('top5')}
          >
            Top 5
          </button>
        </div>
      </div>

      {loading && cryptos.length === 0 ? (
        <div className="data-card">
          <div className="empty-state">
            <span className="loading-spinner"></span>
            <div className="empty-state__text">Consultando cotizaciones de mercado...</div>
          </div>
        </div>
      ) : filteredCryptos.length === 0 ? (
        <div className="data-card">
          <div className="empty-state">
            <div className="empty-state__title">No se encontraron resultados</div>
            <div className="empty-state__text">
              Intenta cambiar el criterio de busqueda o reiniciar los filtros.
            </div>
          </div>
        </div>
      ) : (
        <div className="data-card">
          <div className="data-card__header">
            <span className="data-card__title">Mercado Activo</span>
            <span className="data-card__badge">Datos en Vivo</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '48px' }}>#</th>
                <th>Activo</th>
                <th
                  onClick={() => toggleSort('price')}
                  style={{ cursor: 'pointer' }}
                  title="Ordenar por precio"
                >
                  Precio (USD) {sortBy === 'price' ? (sortOrder === 'desc' ? ' (v)' : ' (^)') : ''}
                </th>
                <th
                  onClick={() => toggleSort('change')}
                  style={{ cursor: 'pointer' }}
                  title="Ordenar por cambio"
                >
                  Cambio 24h {sortBy === 'change' ? (sortOrder === 'desc' ? ' (v)' : ' (^)') : ''}
                </th>
                <th>Volumen 24h</th>
                <th
                  onClick={() => toggleSort('market_cap')}
                  style={{ cursor: 'pointer' }}
                  title="Ordenar por capitalizacion"
                >
                  Cap. Mercado {sortBy === 'market_cap' ? (sortOrder === 'desc' ? ' (v)' : ' (^)') : ''}
                </th>
                <th>Tendencia</th>
                <th style={{ textAlign: 'right' }}>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {filteredCryptos.map((coin, idx) => (
                <tr
                  key={coin.coin_id || idx}
                  className="data-table__row-clickable"
                  onClick={() => setSelectedCoin(coin)}
                >
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
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
                      <span style={{ color: 'var(--text-muted)' }}>--</span>
                    )}
                  </td>
                  <td className="data-table__volume">
                    {formatLarge(coin.total_volume)}
                  </td>
                  <td className="data-table__volume">
                    {formatLarge(coin.market_cap)}
                  </td>
                  <td style={{ width: '120px' }}>
                    <Sparkline
                      points={coin.sparkline_in_7d}
                      isPositive={(coin.price_change_percentage_24h || 0) >= 0}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-text-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCoin(coin);
                      }}
                    >
                      Ver Ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedCoin && (
        <div className="modal-overlay fade-in" onClick={() => setSelectedCoin(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="data-table__coin">
                {selectedCoin.image_url && (
                  <img
                    className="data-table__coin-icon"
                    style={{ width: '36px', height: '36px' }}
                    src={selectedCoin.image_url}
                    alt={selectedCoin.name}
                  />
                )}
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>{selectedCoin.name}</h3>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{selectedCoin.symbol}</span>
                </div>
              </div>
              <button className="btn-icon-close" onClick={() => setSelectedCoin(null)}>
                <CloseIcon size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-stat-grid">
                <div className="modal-stat-item">
                  <div className="modal-stat-label">Precio Actual</div>
                  <div className="modal-stat-value" style={{ color: 'var(--accent-cyan)' }}>
                    {formatPrice(selectedCoin.current_price)}
                  </div>
                </div>

                <div className="modal-stat-item">
                  <div className="modal-stat-label">Variacion 24h</div>
                  <div className={`modal-stat-value ${selectedCoin.price_change_percentage_24h >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {selectedCoin.price_change_percentage_24h >= 0 ? '+' : ''}
                    {selectedCoin.price_change_percentage_24h?.toFixed(2)}%
                  </div>
                </div>

                <div className="modal-stat-item">
                  <div className="modal-stat-label">Maximo (24h)</div>
                  <div className="modal-stat-value text-positive">
                    {selectedCoin.high_24h ? formatPrice(selectedCoin.high_24h) : '--'}
                  </div>
                </div>

                <div className="modal-stat-item">
                  <div className="modal-stat-label">Minimo (24h)</div>
                  <div className="modal-stat-value text-negative">
                    {selectedCoin.low_24h ? formatPrice(selectedCoin.low_24h) : '--'}
                  </div>
                </div>

                <div className="modal-stat-item">
                  <div className="modal-stat-label">Capitalizacion de Mercado</div>
                  <div className="modal-stat-value">
                    {formatLarge(selectedCoin.market_cap)}
                  </div>
                </div>

                <div className="modal-stat-item">
                  <div className="modal-stat-label">Volumen Negociado (24h)</div>
                  <div className="modal-stat-value">
                    {formatLarge(selectedCoin.total_volume)}
                  </div>
                </div>
              </div>

              <div className="modal-footer-note">
                Activo cotizado globalmente. Datos provistos con verificacion de integridad y persistencia.
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
