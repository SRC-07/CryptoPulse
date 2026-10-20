import React, { useState, useMemo } from 'react';
import { SwapIcon } from './Icons';

export default function CurrencyConverter({ cryptos = [], forexRates = {}, forexBase = 'USD' }) {
  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] = useState('BTC');
  const [toCurrency, setToCurrency] = useState('COP');

  const cryptoPricesInUSD = useMemo(() => {
    const map = {};
    cryptos.forEach(c => {
      map[c.symbol] = c.current_price;
    });
    return map;
  }, [cryptos]);

  const fiatRatesFromUSD = useMemo(() => {
    const rates = { USD: 1, ...forexRates };
    if (!rates.COP) rates.COP = 4120.0;
    if (!rates.EUR) rates.EUR = 0.92;
    if (!rates.GBP) rates.GBP = 0.79;
    if (!rates.MXN) rates.MXN = 19.8;
    if (!rates.BRL) rates.BRL = 5.65;
    if (!rates.JPY) rates.JPY = 154.2;
    return rates;
  }, [forexRates]);

  const cryptoOptions = cryptos.map(c => ({
    code: c.symbol,
    name: `${c.name} (${c.symbol})`,
    type: 'crypto',
  }));

  const fiatOptions = [
    { code: 'USD', name: 'Dólar Estadounidense (USD)', type: 'fiat' },
    { code: 'COP', name: 'Peso Colombiano (COP)', type: 'fiat' },
    { code: 'EUR', name: 'Euro (EUR)', type: 'fiat' },
    { code: 'GBP', name: 'Libra Esterlina (GBP)', type: 'fiat' },
    { code: 'MXN', name: 'Peso Mexicano (MXN)', type: 'fiat' },
    { code: 'BRL', name: 'Real Brasileño (BRL)', type: 'fiat' },
    { code: 'JPY', name: 'Yen Japonés (JPY)', type: 'fiat' },
  ];

  const conversionResult = useMemo(() => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) return null;

    let fromValueInUSD = 1;
    if (cryptoPricesInUSD[fromCurrency]) {
      fromValueInUSD = cryptoPricesInUSD[fromCurrency];
    } else if (fiatRatesFromUSD[fromCurrency]) {
      fromValueInUSD = 1 / fiatRatesFromUSD[fromCurrency];
    }

    let unitRate = 1;
    if (cryptoPricesInUSD[toCurrency]) {
      unitRate = fromValueInUSD / cryptoPricesInUSD[toCurrency];
    } else if (fiatRatesFromUSD[toCurrency]) {
      unitRate = fromValueInUSD * fiatRatesFromUSD[toCurrency];
    }

    const total = numericAmount * unitRate;
    return {
      unitRate,
      total,
    };
  }, [amount, fromCurrency, toCurrency, cryptoPricesInUSD, fiatRatesFromUSD]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const handleQuickConvert = (from, to, amt = '1') => {
    setFromCurrency(from);
    setToCurrency(to);
    setAmount(amt);
  };

  const formatResultNumber = (num, currencyCode) => {
    if (num == null) return '--';
    if (currencyCode === 'COP') {
      return num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
    if (num >= 1000) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (num >= 1) {
      return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    return num.toFixed(6);
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 510, color: 'var(--color-paper)', letterSpacing: '-0.022em' }}>
          Conversor Global de Activos
        </h2>
        <p style={{ color: 'var(--color-fog)', fontSize: '14px', marginTop: '4px' }}>
          Calculadora en tiempo real entre criptomonedas y divisas internacionales.
        </p>
      </div>

      <div className="table-card" style={{ maxWidth: '880px', padding: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '20px', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="simulate-input-group">
              <label className="simulate-label">Monto a Convertir</label>
              <input
                type="number"
                min="0"
                step="any"
                className="simulate-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="simulate-input-group">
              <label className="simulate-label">Moneda de Origen</label>
              <select
                className="simulate-input"
                value={fromCurrency}
                onChange={(e) => setFromCurrency(e.target.value)}
                style={{ background: 'var(--color-obsidian)', cursor: 'pointer' }}
              >
                <optgroup label="Criptomonedas">
                  {cryptoOptions.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Divisas Fiat">
                  {fiatOptions.map(f => (
                    <option key={f.code} value={f.code}>{f.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '16px' }}>
            <button
              className="btn-ghost"
              onClick={handleSwap}
              title="Intercambiar monedas"
              type="button"
              style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0 }}
            >
              <SwapIcon size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="simulate-input-group">
              <label className="simulate-label">Resultado Estimado</label>
              <div
                className="text-mono"
                style={{
                  background: 'var(--color-obsidian)',
                  border: '1px solid var(--color-graphite)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '18px',
                  fontWeight: 510,
                  color: 'var(--color-paper)',
                  minHeight: '44px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {conversionResult ? (
                  formatResultNumber(conversionResult.total, toCurrency)
                ) : (
                  '--'
                )}
              </div>
            </div>

            <div className="simulate-input-group">
              <label className="simulate-label">Moneda de Destino</label>
              <select
                className="simulate-input"
                value={toCurrency}
                onChange={(e) => setToCurrency(e.target.value)}
                style={{ background: 'var(--color-obsidian)', cursor: 'pointer' }}
              >
                <optgroup label="Divisas Fiat">
                  {fiatOptions.map(f => (
                    <option key={f.code} value={f.code}>{f.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Criptomonedas">
                  {cryptoOptions.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {conversionResult && (
          <div
            style={{
              marginTop: '24px',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-obsidian)',
              border: '1px solid var(--color-graphite)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span style={{ color: 'var(--color-fog)' }}>Tasa de referencia oficial:</span>
            <strong className="text-mono" style={{ color: 'var(--color-paper)' }}>
              1 {fromCurrency} = {formatResultNumber(conversionResult.unitRate, toCurrency)} {toCurrency}
            </strong>
          </div>
        )}

        <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: 'var(--color-fog)' }}>Conversiones Frecuentes:</span>
          <button className="chip-pill" onClick={() => handleQuickConvert('BTC', 'COP', '1')}>
            1 BTC &rarr; COP
          </button>
          <button className="chip-pill" onClick={() => handleQuickConvert('ETH', 'USD', '1')}>
            1 ETH &rarr; USD
          </button>
          <button className="chip-pill" onClick={() => handleQuickConvert('USD', 'COP', '100')}>
            100 USD &rarr; COP
          </button>
          <button className="chip-pill" onClick={() => handleQuickConvert('EUR', 'USD', '500')}>
            500 EUR &rarr; USD
          </button>
          <button className="chip-pill" onClick={() => handleQuickConvert('SOL', 'USD', '5')}>
            5 SOL &rarr; USD
          </button>
        </div>
      </div>
    </section>
  );
}

