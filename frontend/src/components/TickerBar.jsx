import React from 'react';

export default function TickerBar({
  cryptos = [],
  fiatCurrency = 'USD',
  fiatRate = 1,
  onSelectCoin,
}) {
  if (!cryptos || cryptos.length === 0) return null;

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

  // Duplicar la lista para lograr un scroll infinito fluido sin cortes
  const marqueeItems = [...cryptos, ...cryptos];

  return (
    <div className="ticker-bar" title="Cinta de cotizaciones en tiempo real - Pausa al pasar el cursor">
      <div className="ticker-track">
        {marqueeItems.map((coin, index) => {
          const isPositive = (coin.price_change_percentage_24h || 0) >= 0;
          return (
            <div
              key={`${coin.coin_id || coin.symbol}-${index}`}
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
        })}
      </div>
    </div>
  );
}
