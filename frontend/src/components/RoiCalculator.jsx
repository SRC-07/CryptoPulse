import React, { useState, useMemo } from 'react';

export default function RoiCalculator({ cryptos = [], fiatRate = 4120, fiatCurrency = 'COP' }) {
  const [initialAmount, setInitialAmount] = useState('1000');
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [annualRate, setAnnualRate] = useState('12');
  const [years, setYears] = useState('1');
  const [compoundFrequency, setCompoundFrequency] = useState('12');

  const calculation = useMemo(() => {
    const P = parseFloat(initialAmount);
    const r = parseFloat(annualRate) / 100;
    const t = parseFloat(years);
    const n = parseFloat(compoundFrequency);

    if (isNaN(P) || P <= 0 || isNaN(r) || isNaN(t) || isNaN(n)) return null;

    const futureValueUSD = P * Math.pow(1 + r / n, n * t);
    const totalProfitUSD = futureValueUSD - P;
    const roiPercent = (totalProfitUSD / P) * 100;

    return {
      futureValueUSD,
      totalProfitUSD,
      roiPercent,
    };
  }, [initialAmount, annualRate, years, compoundFrequency]);

  const formatMoney = (valUSD) => {
    if (valUSD == null) return '--';
    const converted = valUSD * (fiatCurrency === 'COP' ? fiatRate : 1);
    if (fiatCurrency === 'COP') {
      return `$${converted.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP`;
    }
    return `$${valUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  };

  return (
    <section className="section fade-in">
      <div className="section__header">
        <div>
          <h2 className="section__title">Calculadora de Proyeccion y Rendimiento (ROI)</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            Simula el crecimiento potencial de una inversion mediante interes compuesto a lo largo del tiempo.
          </p>
        </div>
      </div>

      <div className="converter-card" style={{ maxWidth: '960px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label className="converter-label">Capital Inicial (USD)</label>
              <input
                type="number"
                min="10"
                step="50"
                className="converter-input"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="converter-label">Activo Objetivo</label>
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
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="converter-label">Rendimiento Estimado Anual (APY %)</label>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                  {annualRate}%
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={annualRate}
                onChange={(e) => setAnnualRate(e.target.value)}
                style={{ width: '100%', accentColor: 'var(--accent-blue)', cursor: 'pointer', marginTop: '6px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="converter-label">Horizonte Temporal</label>
                <select
                  className="converter-select"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                >
                  <option value="0.5">6 Meses</option>
                  <option value="1">1 Ano</option>
                  <option value="2">2 Anos</option>
                  <option value="3">3 Anos</option>
                  <option value="5">5 Anos</option>
                </select>
              </div>

              <div>
                <label className="converter-label">Capitalizacion</label>
                <select
                  className="converter-select"
                  value={compoundFrequency}
                  onChange={(e) => setCompoundFrequency(e.target.value)}
                >
                  <option value="12">Mensual (Recomendado)</option>
                  <option value="1">Anual</option>
                  <option value="365">Diaria</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              <span className="data-card__badge" style={{ marginBottom: '14px', display: 'inline-block' }}>
                Proyeccion Estimada
              </span>

              <div style={{ marginBottom: '20px' }}>
                <div className="stat-card__label">Valor Total Estimado al Finalizar</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                  {calculation ? formatMoney(calculation.futureValueUSD) : '--'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  (${calculation ? calculation.futureValueUSD.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '--'} USD)
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div className="modal-stat-item">
                  <div className="modal-stat-label">Ganancia Proyectada</div>
                  <div className="modal-stat-value text-positive">
                    +{calculation ? formatMoney(calculation.totalProfitUSD) : '--'}
                  </div>
                </div>

                <div className="modal-stat-item">
                  <div className="modal-stat-label">Retorno Total (ROI)</div>
                  <div className="modal-stat-value text-positive">
                    +{calculation ? `${calculation.roiPercent.toFixed(1)}%` : '--'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-default)', paddingTop: '12px' }}>
              Nota: Proyeccion matematica basada en tasa fija constante. Los criptoactivos estan sujetos a volatilidad de mercado.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
