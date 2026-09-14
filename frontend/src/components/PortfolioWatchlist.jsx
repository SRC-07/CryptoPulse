import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, TrendingUpIcon, TrendingDownIcon } from './Icons';

export default function PortfolioWatchlist({ cryptos = [], fiatRate = 1, fiatCurrency = 'USD' }) {
  const [portfolio, setPortfolio] = useState(() => {
    try {
      const saved = localStorage.getItem('cryptopulse_portfolio');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { symbol: 'BTC', amount: 0.45, buyPrice: 58000 },
      { symbol: 'ETH', amount: 3.2, buyPrice: 2350 },
      { symbol: 'SOL', amount: 15.0, buyPrice: 130 },
    ];
  });

  const [isAdding, setIsAdding] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [amountInput, setAmountInput] = useState('1');

  useEffect(() => {
    try {
      localStorage.setItem('cryptopulse_portfolio', JSON.stringify(portfolio));
    } catch (e) {}
  }, [portfolio]);

  const cryptoMap = {};
  cryptos.forEach(c => {
    cryptoMap[c.symbol] = c;
  });

  let totalValueUSD = 0;
  let totalCostUSD = 0;

  const items = portfolio.map((item, idx) => {
    const coin = cryptoMap[item.symbol] || {
      name: item.symbol,
      symbol: item.symbol,
      current_price: item.buyPrice || 0,
      price_change_percentage_24h: 0,
    };

    const currentPriceUSD = coin.current_price;
    const itemValueUSD = currentPriceUSD * item.amount;
    const itemCostUSD = (item.buyPrice || currentPriceUSD) * item.amount;
    const pnlUSD = itemValueUSD - itemCostUSD;
    const pnlPercent = itemCostUSD > 0 ? (pnlUSD / itemCostUSD) * 100 : 0;

    totalValueUSD += itemValueUSD;
    totalCostUSD += itemCostUSD;

    return {
      index: idx,
      ...item,
      coin,
      currentPriceUSD,
      itemValueUSD,
      pnlUSD,
      pnlPercent,
    };
  });

  const totalPnLUSD = totalValueUSD - totalCostUSD;
  const totalPnLPercent = totalCostUSD > 0 ? (totalPnLUSD / totalCostUSD) * 100 : 0;

  const formatFiat = (amountUSD) => {
    const converted = amountUSD * (fiatRate || 1);
    if (fiatCurrency === 'COP') {
      return `$${converted.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP`;
    }
    return `$${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${fiatCurrency}`;
  };

  const handleAddAsset = (e) => {
    e.preventDefault();
    const qty = parseFloat(amountInput);
    if (isNaN(qty) || qty <= 0) return;

    const coinData = cryptoMap[selectedCoin];
    const buyPrice = coinData ? coinData.current_price : 0;

    const existingIndex = portfolio.findIndex(p => p.symbol === selectedCoin);
    if (existingIndex >= 0) {
      const updated = [...portfolio];
      updated[existingIndex].amount += qty;
      setPortfolio(updated);
    } else {
      setPortfolio([...portfolio, { symbol: selectedCoin, amount: qty, buyPrice }]);
    }

    setAmountInput('1');
    setIsAdding(false);
  };

  const handleRemoveAsset = (idx) => {
    setPortfolio(portfolio.filter((_, i) => i !== idx));
  };

  const handleLoadSample = (sampleType) => {
    if (sampleType === 'balanced') {
      setPortfolio([
        { symbol: 'BTC', amount: 0.5, buyPrice: 60000 },
        { symbol: 'ETH', amount: 4.0, buyPrice: 2400 },
        { symbol: 'SOL', amount: 20.0, buyPrice: 135 },
        { symbol: 'BNB', amount: 5.0, buyPrice: 540 },
      ]);
    } else if (sampleType === 'defi') {
      setPortfolio([
        { symbol: 'ETH', amount: 5.0, buyPrice: 2400 },
        { symbol: 'SOL', amount: 30.0, buyPrice: 140 },
        { symbol: 'AVAX', amount: 50.0, buyPrice: 24 },
        { symbol: 'LINK', amount: 100.0, buyPrice: 11 },
      ]);
    }
  };

  const handleExportCSV = () => {
    if (items.length === 0) return;
    const headers = ['Simbolo', 'Nombre', 'Cantidad', 'Precio_USD', 'Valor_Total_USD', 'Rendimiento_Porcentaje'];
    const rows = items.map(it => [
      it.symbol,
      `"${it.coin.name || it.symbol}"`,
      it.amount,
      it.currentPriceUSD,
      it.itemValueUSD.toFixed(2),
      it.pnlPercent.toFixed(2)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cryptopulse_portfolio_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section className="section fade-in">
      <div className="section__header">
        <div>
          <h2 className="section__title">Seguimiento de Portafolio Personal</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Simula o monitorea el rendimiento en vivo de tus tenencias cripto.
          </p>
        </div>
        <div className="section__actions">
          {items.length > 0 && (
            <button
              className="btn btn--secondary"
              onClick={handleExportCSV}
              title="Descargar datos del portafolio en archivo CSV"
            >
              Exportar CSV
            </button>
          )}
          <button
            className="btn btn--primary"
            onClick={() => setIsAdding(!isAdding)}
          >
            <PlusIcon size={16} />
            <span>{isAdding ? 'Cancelar' : 'Anadir Activo'}</span>
          </button>
        </div>
      </div>

      {isAdding && (
        <form className="portfolio-add-card fade-in" onSubmit={handleAddAsset}>
          <div className="portfolio-add-grid">
            <div>
              <label className="converter-label">Seleccionar Activo</label>
              <select
                className="converter-select"
                value={selectedCoin}
                onChange={(e) => setSelectedCoin(e.target.value)}
              >
                {cryptos.map(c => (
                  <option key={c.symbol} value={c.symbol}>
                    {c.name} ({c.symbol}) - ${c.current_price?.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="converter-label">Cantidad Poseida</label>
              <input
                type="number"
                step="any"
                min="0.000001"
                className="converter-input"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="ej: 0.5"
                required
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button type="submit" className="btn btn--primary" style={{ width: '100%', height: '42px' }}>
                Guardar en Portafolio
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="hero__stats" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card__label">Valor Total del Portafolio</div>
          <div className="stat-card__value" style={{ color: 'var(--accent-cyan)' }}>
            {formatFiat(totalValueUSD)}
          </div>
          <div className="stat-card__change" style={{ color: 'var(--text-muted)' }}>
            Equivalente en {fiatCurrency}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Rendimiento Estimado (P&L)</div>
          <div className={`stat-card__value ${totalPnLUSD >= 0 ? 'text-positive' : 'text-negative'}`}>
            {totalPnLUSD >= 0 ? '+' : ''}{formatFiat(totalPnLUSD)}
          </div>
          <div className={`stat-card__change ${totalPnLUSD >= 0 ? 'stat-card__change--positive' : 'stat-card__change--negative'}`}>
            {totalPnLUSD >= 0 ? <TrendingUpIcon size={14} /> : <TrendingDownIcon size={14} />}
            <span>{totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}% total</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Activos en Posicion</div>
          <div className="stat-card__value">
            {portfolio.length}
          </div>
          <div className="stat-card__change" style={{ color: 'var(--text-muted)' }}>
            posiciones activas
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="data-card">
          <div className="empty-state">
            <div className="empty-state__title">Tu portafolio esta vacio</div>
            <div className="empty-state__text">
              Comienza anadiendo criptomonedas o carga una plantilla simulada para explorar el rendimiento.
            </div>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button className="btn btn--secondary" onClick={() => handleLoadSample('balanced')}>
                Cargar Portafolio Equilibrado
              </button>
              <button className="btn btn--secondary" onClick={() => handleLoadSample('defi')}>
                Cargar Portafolio DeFi
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="data-card">
          <div className="data-card__header">
            <span className="data-card__title">Distribucion de Activos</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="shortcut-chip" onClick={() => handleLoadSample('balanced')}>
                Cargar Equilibrado
              </button>
              <button className="shortcut-chip" onClick={() => setPortfolio([])}>
                Limpiar
              </button>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Activo</th>
                <th>Cantidad</th>
                <th>Precio Actual</th>
                <th>Valor Total</th>
                <th>Rendimiento</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.symbol}>
                  <td>
                    <div className="data-table__coin">
                      {item.coin.image_url && (
                        <img
                          className="data-table__coin-icon"
                          src={item.coin.image_url}
                          alt={item.symbol}
                        />
                      )}
                      <div>
                        <div className="data-table__coin-name">{item.coin.name}</div>
                        <div className="data-table__coin-symbol">{item.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {item.amount.toLocaleString()} {item.symbol}
                  </td>
                  <td className="data-table__price">
                    ${item.currentPriceUSD?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    {formatFiat(item.itemValueUSD)}
                  </td>
                  <td>
                    <span className={`data-table__change ${item.pnlPercent >= 0 ? 'data-table__change--positive' : 'data-table__change--negative'}`}>
                      {item.pnlPercent >= 0 ? '+' : ''}{item.pnlPercent.toFixed(2)}%
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-icon-danger"
                      onClick={() => handleRemoveAsset(item.index)}
                      title="Eliminar de portafolio"
                    >
                      <TrashIcon size={15} />
                    </button>
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
