import React, { useState, useMemo } from 'react';
import { SearchIcon, RefreshIcon, TrendingUpIcon, TrendingDownIcon, CloseIcon } from './Icons';
import Sparkline from './Sparkline';

export default function CryptoMarket({
  cryptos = [],
  loading = false,
  error = null,
  lastUpdated = null,
  fiatCurrency = 'USD',
  fiatRate = 1,
  onRefresh,
  onOpenSimulate,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('market_cap');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedCoin, setSelectedCoin] = useState(null);

  const filteredCryptos = useMemo(() => {
    let list = [...cryptos];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        c => c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
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

  const formatPrice = (priceUSD) => {
    if (!priceUSD && priceUSD !== 0) return '--';
    const rate = fiatRate || 1;
    const converted = priceUSD * rate;

    if (fiatCurrency === 'COP') {
      if (converted >= 1000) {
        return `$${converted.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP`;
      }
      return `$${converted.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} COP`;
    }

    if (fiatCurrency === 'EUR') {
      if (converted >= 1) {
        return `€${converted.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return `€${converted.toFixed(6)}`;
    }

    // Default USD
    if (converted >= 1) {
      return `$${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${converted.toFixed(6)}`;
  };

  const formatLarge = (numUSD) => {
    if (!numUSD) return '--';
    const rate = fiatRate || 1;
    const converted = numUSD * rate;
    const symbol = fiatCurrency === 'EUR' ? '€' : '$';
    const suffix = fiatCurrency === 'COP' ? ' COP' : '';

    if (converted >= 1e12) return `${symbol}${(converted / 1e12).toFixed(2)}T${suffix}`;
    if (converted >= 1e9) return `${symbol}${(converted / 1e9).toFixed(2)}B${suffix}`;
    if (converted >= 1e6) return `${symbol}${(converted / 1e6).toFixed(2)}M${suffix}`;
    return `${symbol}${converted.toLocaleString()}${suffix}`;
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
      {/* Encabezado de Sección */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 510, color: 'var(--color-paper)', letterSpacing: '-0.022em' }}>
            Cotizaciones de Criptomonedas
          </h2>
          <p style={{ color: 'var(--color-fog)', fontSize: '14px', marginTop: '4px' }}>
            Precios consolidados en tiempo real, volumen transaccional y capitalización de mercado global.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {lastUpdated && (
            <span style={{ fontSize: '12px', color: 'var(--color-ash)', fontFamily: 'var(--font-mono)' }}>
              Actualizado: {lastUpdated}
            </span>
          )}
          <button
            id="fetch-crypto-prices"
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
          <span>Error al consultar cotizaciones: {error}</span>
        </div>
      )}

      {/* Contenedor Principal de la Tabla de Mercados Estilo Linear */}
      <div className="table-card">
        {/* Barra de Herramientas: Búsqueda y Chips de Filtro */}
        <div className="table-card__toolbar">
          <div className="search-input-wrapper">
            <SearchIcon size={16} style={{ color: 'var(--color-fog)', flexShrink: 0 }} />
            <input
              type="text"
              className="search-input"
              placeholder="Buscar por activo o símbolo (ej: BTC, Solana)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className={`chip-pill ${filterType === 'all' ? 'chip-pill--active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              Todos ({cryptos.length})
            </button>
            <button
              className={`chip-pill ${filterType === 'gainers' ? 'chip-pill--active' : ''}`}
              onClick={() => setFilterType('gainers')}
            >
              Ganadores 24h
            </button>
            <button
              className={`chip-pill ${filterType === 'losers' ? 'chip-pill--active' : ''}`}
              onClick={() => setFilterType('losers')}
            >
              Perdedores 24h
            </button>
            <button
              className={`chip-pill ${filterType === 'top5' ? 'chip-pill--active' : ''}`}
              onClick={() => setFilterType('top5')}
            >
              Top 5
            </button>
          </div>
        </div>

        {/* Estado de Carga o Vacío */}
        {loading && cryptos.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--color-fog)' }}>
            <span className="loading-spin" style={{ display: 'inline-block', width: '22px', height: '22px', border: '2px solid var(--color-graphite)', borderTopColor: 'var(--color-mist)', borderRadius: '50%', marginBottom: '12px' }}></span>
            <div style={{ fontSize: '13px' }}>Consultando libro de órdenes y cotizaciones en vivo...</div>
          </div>
        ) : filteredCryptos.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--color-fog)' }}>
            <div style={{ fontSize: '15px', color: 'var(--color-paper)', fontWeight: 510, marginBottom: '6px' }}>
              No se encontraron activos
            </div>
            <div style={{ fontSize: '13px' }}>
              Prueba con otro término de búsqueda o restablece los filtros.
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table-linear">
              <thead>
                <tr>
                  <th style={{ width: '48px', textAlign: 'center' }}>#</th>
                  <th>Activo</th>
                  <th
                    className="sortable"
                    onClick={() => toggleSort('price')}
                    title="Ordenar por precio"
                  >
                    Precio (USD) {sortBy === 'price' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th
                    className="sortable"
                    onClick={() => toggleSort('change')}
                    title="Ordenar por cambio 24h"
                  >
                    Cambio 24h {sortBy === 'change' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th>Volumen 24h</th>
                  <th
                    className="sortable"
                    onClick={() => toggleSort('market_cap')}
                    title="Ordenar por capitalización"
                  >
                    Cap. Mercado {sortBy === 'market_cap' ? (sortOrder === 'desc' ? '▼' : '▲') : ''}
                  </th>
                  <th style={{ width: '130px' }}>Tendencia 7d</th>
                  <th style={{ textAlign: 'right', paddingRight: '20px' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filteredCryptos.map((coin, idx) => {
                  const isPositive = (coin.price_change_percentage_24h || 0) >= 0;
                  return (
                    <tr
                      key={coin.coin_id || coin.symbol || idx}
                      onClick={() => setSelectedCoin(coin)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ textAlign: 'center', color: 'var(--color-ash)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {idx + 1}
                      </td>

                      <td>
                        <div className="coin-cell">
                          {coin.image_url ? (
                            <img
                              className="coin-icon"
                              src={coin.image_url}
                              alt={coin.name}
                              loading="lazy"
                            />
                          ) : (
                            <div className="coin-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--color-fog)' }}>
                              {coin.symbol?.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="coin-name">{coin.name}</div>
                            <div className="coin-symbol">{coin.symbol}</div>
                          </div>
                        </div>
                      </td>

                      <td className="text-mono" style={{ color: 'var(--color-paper)', fontWeight: 510 }}>
                        {formatPrice(coin.current_price)}
                      </td>

                      <td>
                        {coin.price_change_percentage_24h != null ? (
                          <span className={`badge-tag ${isPositive ? 'badge-tag--positive' : 'badge-tag--negative'}`}>
                            {isPositive ? '+' : ''}{coin.price_change_percentage_24h.toFixed(2)}%
                          </span>
                        ) : (
                          <span style={{ color: 'var(--color-ash)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>--</span>
                        )}
                      </td>

                      <td className="text-mono" style={{ color: 'var(--color-mist)' }}>
                        {formatLarge(coin.total_volume)}
                      </td>

                      <td className="text-mono" style={{ color: 'var(--color-mist)' }}>
                        {formatLarge(coin.market_cap)}
                      </td>

                      <td>
                        <Sparkline
                          points={coin.sparkline_in_7d}
                          isPositive={isPositive}
                        />
                      </td>

                      <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            className="btn-ghost"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCoin(coin);
                            }}
                          >
                            Ficha
                          </button>
                          {onOpenSimulate && (
                            <button
                              className="btn-ghost"
                              style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--color-acid-lime)', borderColor: 'rgba(228, 242, 34, 0.3)' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenSimulate(coin.symbol);
                              }}
                            >
                              Operar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Ficha Técnica Estilo Linear Command Dialog */}
      {selectedCoin && (
        <div className="modal-backdrop" onClick={() => setSelectedCoin(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {selectedCoin.image_url && (
                  <img
                    src={selectedCoin.image_url}
                    alt={selectedCoin.name}
                    style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--color-smoke)' }}
                  />
                )}
                <div>
                  <h3 className="modal-title">{selectedCoin.name}</h3>
                  <span style={{ color: 'var(--color-fog)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                    {selectedCoin.symbol} &bull; Cotización Oficial
                  </span>
                </div>
              </div>

              <button className="modal-close-btn" onClick={() => setSelectedCoin(null)} aria-label="Cerrar modal">
                <CloseIcon size={16} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '10px', margin: '16px 0 24px' }}>
              <div style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-graphite)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Precio Actual
                </div>
                <div style={{ fontSize: '18px', fontWeight: 510, color: 'var(--color-paper)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                  {formatPrice(selectedCoin.current_price)}
                </div>
              </div>

              <div style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-graphite)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Variación 24h
                </div>
                <div className={`text-mono ${selectedCoin.price_change_percentage_24h >= 0 ? 'text-positive' : 'text-negative'}`} style={{ fontSize: '18px', fontWeight: 510, marginTop: '4px' }}>
                  {selectedCoin.price_change_percentage_24h >= 0 ? '+' : ''}
                  {selectedCoin.price_change_percentage_24h?.toFixed(2)}%
                </div>
              </div>

              <div style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-graphite)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Máximo 24h
                </div>
                <div className="text-mono text-positive" style={{ fontSize: '15px', fontWeight: 510, marginTop: '4px' }}>
                  {selectedCoin.high_24h ? formatPrice(selectedCoin.high_24h) : '--'}
                </div>
              </div>

              <div style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-graphite)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Mínimo 24h
                </div>
                <div className="text-mono text-negative" style={{ fontSize: '15px', fontWeight: 510, marginTop: '4px' }}>
                  {selectedCoin.low_24h ? formatPrice(selectedCoin.low_24h) : '--'}
                </div>
              </div>

              <div style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-graphite)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Cap. de Mercado
                </div>
                <div className="text-mono" style={{ fontSize: '15px', fontWeight: 510, color: 'var(--color-paper)', marginTop: '4px' }}>
                  {formatLarge(selectedCoin.market_cap)}
                </div>
              </div>

              <div style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-graphite)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Volumen Negociado
                </div>
                <div className="text-mono" style={{ fontSize: '15px', fontWeight: 510, color: 'var(--color-paper)', marginTop: '4px' }}>
                  {formatLarge(selectedCoin.total_volume)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn-ghost"
                onClick={() => setSelectedCoin(null)}
              >
                Cerrar
              </button>
              {onOpenSimulate && (
                <button
                  className="btn-lime"
                  onClick={() => {
                    const sym = selectedCoin.symbol;
                    setSelectedCoin(null);
                    onOpenSimulate(sym);
                  }}
                >
                  Simular Orden con {selectedCoin.symbol} &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

