import React from 'react';

// Fallback inicial para que la cinta jamás aparezca vacía o con huecos en los primeros milisegundos
const DEFAULT_TICKER_COINS = [
  { symbol: 'BTC', current_price: 82577.0, price_change_percentage_24h: 1.81 },
  { symbol: 'ETH', current_price: 2437.69, price_change_percentage_24h: 1.40 },
  { symbol: 'USDT', current_price: 0.9991, price_change_percentage_24h: -0.01 },
  { symbol: 'BNB', current_price: 738.36, price_change_percentage_24h: 1.43 },
  { symbol: 'XRP', current_price: 1.33, price_change_percentage_24h: 1.83 },
  { symbol: 'USDC', current_price: 0.9998, price_change_percentage_24h: -0.02 },
  { symbol: 'SOL', current_price: 106.13, price_change_percentage_24h: 2.76 },
  { symbol: 'ADA', current_price: 0.68, price_change_percentage_24h: 2.72 },
  { symbol: 'AVAX', current_price: 28.45, price_change_percentage_24h: 3.45 },
  { symbol: 'DOGE', current_price: 0.245, price_change_percentage_24h: 3.37 },
  { symbol: 'DOT', current_price: 6.85, price_change_percentage_24h: 2.70 },
  { symbol: 'LINK', current_price: 16.4, price_change_percentage_24h: 3.27 },
  { symbol: 'SUI', current_price: 2.88, price_change_percentage_24h: 5.11 },
  { symbol: 'NEAR', current_price: 5.72, price_change_percentage_24h: 3.81 },
  { symbol: 'UNI', current_price: 9.35, price_change_percentage_24h: 3.08 },
  { symbol: 'LTC', current_price: 88.5, price_change_percentage_24h: 2.07 },
  { symbol: 'BCH', current_price: 420.0, price_change_percentage_24h: 2.06 },
  { symbol: 'SHIB', current_price: 0.0000215, price_change_percentage_24h: 3.86 },
  { symbol: 'PEPE', current_price: 0.0000108, price_change_percentage_24h: 5.88 },
  { symbol: 'XLM', current_price: 0.32, price_change_percentage_24h: 4.91 },
  { symbol: 'TRX', current_price: 0.198, price_change_percentage_24h: 1.02 },
  { symbol: 'APT', current_price: 11.8, price_change_percentage_24h: 3.96 },
  { symbol: 'KAS', current_price: 0.165, price_change_percentage_24h: 2.48 },
  { symbol: 'XMR', current_price: 162.0, price_change_percentage_24h: 1.31 },
  { symbol: 'RENDER', current_price: 7.45, price_change_percentage_24h: 4.93 },
];

export default function TickerBar({
  cryptos = [],
  fiatCurrency = 'USD',
  fiatRate = 1,
  onSelectCoin,
}) {
  const activeCoins = cryptos && cryptos.length > 0 ? cryptos : DEFAULT_TICKER_COINS;

  // Asegurar que el grupo base tenga al menos 20 elementos para cubrir cualquier resolución de pantalla
  let baseGroup = [...activeCoins];
  while (baseGroup.length < 24) {
    baseGroup = [...baseGroup, ...activeCoins];
  }

  const formatPrice = (usdPrice) => {
    if (usdPrice == null) return '--';
    const rate = fiatRate || 1;
    const converted = usdPrice * rate;

    if (fiatCurrency === 'COP') {
      if (converted >= 1000000) {
        return `$${(converted / 1000000).toFixed(2)}M COP`;
      }
      return `$${converted.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP`;
    }

    if (fiatCurrency === 'EUR') {
      if (converted >= 1) {
        return `€${converted.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return `€${converted.toFixed(4)}`;
    }

    // Default USD
    if (converted >= 1) {
      return `$${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${converted.toFixed(4)}`;
  };

  const renderItem = (coin, key) => {
    const isPositive = (coin.price_change_percentage_24h || 0) >= 0;
    return (
      <div
        key={key}
        className="ticker-item"
        onClick={() => onSelectCoin && onSelectCoin(coin)}
      >
        <span className="ticker-symbol">{coin.symbol}</span>
        <span className="ticker-price">{formatPrice(coin.current_price)}</span>
        <span className={`ticker-change ${isPositive ? 'text-positive' : 'text-negative'}`}>
          {isPositive ? '+' : ''}
          {coin.price_change_percentage_24h != null
            ? `${coin.price_change_percentage_24h.toFixed(2)}%`
            : '--'}
        </span>
      </div>
    );
  };

  return (
    <div className="ticker-bar" title="Cinta de cotizaciones en tiempo real - Pausa al pasar el cursor">
      <div className="ticker-track">
        {/* Grupo 1 */}
        <div className="ticker-group">
          {baseGroup.map((coin, index) => renderItem(coin, `g1-${coin.symbol}-${index}`))}
        </div>

        {/* Grupo 2 idéntico para scroll infinito continuo sin huecos */}
        <div className="ticker-group" aria-hidden="true">
          {baseGroup.map((coin, index) => renderItem(coin, `g2-${coin.symbol}-${index}`))}
        </div>
      </div>
    </div>
  );
}
