import React, { useState, useMemo } from 'react';
import { SwapIcon } from './Icons';

export default function CurrencyConverter({ cryptos = [], forexRates = {}, forexBase = 'USD' }) {
  const [amount, setAmount] = useState('1');
  const [fromCurrency, setFromCurrency] = useState('BTC');
  const [toCurrency, setToCurrency] = useState('COP');

  // Mapa de precios de criptos en USD
  const cryptoPricesInUSD = useMemo(() => {
    const map = {};
    cryptos.forEach(c => {
      map[c.symbol] = c.current_price;
    });
    return map;
  }, [cryptos]);

  // Mapa de tasas de fiat respecto a USD
  const fiatRatesFromUSD = useMemo(() => {
    const rates = { USD: 1, ...forexRates };
    // Asegurar valores referenciales comunes si faltasen
    if (!rates.COP) rates.COP = 4120.0;
    if (!rates.EUR) rates.EUR = 0.92;
    if (!rates.GBP) rates.GBP = 0.79;
    if (!rates.MXN) rates.MXN = 19.8;
    if (!rates.BRL) rates.BRL = 5.65;
    if (!rates.JPY) rates.JPY = 154.2;
    return rates;
  }, [forexRates]);

  // Lista de opciones disponibles
  const cryptoOptions = cryptos.map(c => ({
    code: c.symbol,
    name: `${c.name} (${c.symbol})`,
    type: 'crypto',
  }));

  const fiatOptions = [
    { code: 'USD', name: 'Dolar Estadounidense (USD)', type: 'fiat' },
    { code: 'COP', name: 'Peso Colombiano (COP)', type: 'fiat' },
    { code: 'EUR', name: 'Euro (EUR)', type: 'fiat' },
    { code: 'GBP', name: 'Libra Esterlina (GBP)', type: 'fiat' },
    { code: 'MXN', name: 'Peso Mexicano (MXN)', type: 'fiat' },
    { code: 'BRL', name: 'Real Brasileno (BRL)', type: 'fiat' },
    { code: 'JPY', name: 'Yen Japones (JPY)', type: 'fiat' },
  ];

  // Calculo de conversion
  const conversionResult = useMemo(() => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) return null;

    // 1. Obtener valor de 1 unidad de "from" en USD
    let fromValueInUSD = 1;
    if (cryptoPricesInUSD[fromCurrency]) {
      fromValueInUSD = cryptoPricesInUSD[fromCurrency];
    } else if (fiatRatesFromUSD[fromCurrency]) {
      fromValueInUSD = 1 / fiatRatesFromUSD[fromCurrency];
    }

    // 2. Convertir ese valor a "to"
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
    <section className="section fade-in">
      <div className="section__header">
        <div>
          <h2 className="section__title">Conversor Global de Activos</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Calculadora en tiempo real entre criptomonedas y divisas internacionales.
          </p>
        </div>
      </div>

      {/* Tarjeta del Conversor */}
      <div className="converter-card">
        <div className="converter-grid">
          {/* Lado Origen */}
          <div className="converter-group">
            <label className="converter-label">Monto a Convertir</label>
            <input
              type="number"
              min="0"
              step="any"
              className="converter-input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <label className="converter-label" style={{ marginTop: '12px' }}>Moneda de Origen</label>
            <select
              className="converter-select"
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
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

          {/* Boton Swap */}
          <div className="converter-swap-wrapper">
            <button
              className="converter-swap-btn"
              onClick={handleSwap}
              title="Intercambiar monedas"
              type="button"
            >
              <SwapIcon size={20} />
            </button>
          </div>

          {/* Lado Destino */}
          <div className="converter-group">
            <label className="converter-label">Resultado Estimado</label>
            <div className="converter-output">
              {conversionResult ? (
                formatResultNumber(conversionResult.total, toCurrency)
              ) : (
                '--'
              )}
            </div>
            <label className="converter-label" style={{ marginTop: '12px' }}>Moneda de Destino</label>
            <select
              className="converter-select"
              value={toCurrency}
              onChange={(e) => setToCurrency(e.target.value)}
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

        {/* Tasa de Cambio Unitaria */}
        {conversionResult && (
          <div className="converter-rate-badge">
            <span>Tasa de referencia:</span>
            <strong>
              1 {fromCurrency} = {formatResultNumber(conversionResult.unitRate, toCurrency)} {toCurrency}
            </strong>
          </div>
        )}

        {/* Atajos rapidos */}
        <div className="converter-shortcuts">
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Conversiones Frecuentes:</span>
          <button className="shortcut-chip" onClick={() => handleQuickConvert('BTC', 'COP', '1')}>
            1 BTC a COP
          </button>
          <button className="shortcut-chip" onClick={() => handleQuickConvert('ETH', 'USD', '1')}>
            1 ETH a USD
          </button>
          <button className="shortcut-chip" onClick={() => handleQuickConvert('USD', 'COP', '100')}>
            100 USD a COP
          </button>
          <button className="shortcut-chip" onClick={() => handleQuickConvert('EUR', 'USD', '500')}>
            500 EUR a USD
          </button>
          <button className="shortcut-chip" onClick={() => handleQuickConvert('SOL', 'USD', '5')}>
            5 SOL a USD
          </button>
        </div>
      </div>
    </section>
  );
}
