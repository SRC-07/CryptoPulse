import React from 'react';

export default function TickerBar({ cryptos = [], onSelectCoin }) {
  if (!cryptos || cryptos.length === 0) return null;

  return (
    <div className="ticker-bar">
      <div className="ticker-track">
        {cryptos.map((coin) => {
          const isPositive = (coin.price_change_percentage_24h || 0) >= 0;
          return (
            <div
              key={coin.coin_id}
              className="ticker-item"
              onClick={() => onSelectCoin && onSelectCoin(coin)}
            >
              <span className="ticker-symbol">{coin.symbol}</span>
              <span className="ticker-price">
                ${coin.current_price >= 1
                  ? coin.current_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : coin.current_price.toFixed(4)
                }
              </span>
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
