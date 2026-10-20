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
    <section style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: 510, color: 'var(--color-paper)', letterSpacing: '-0.022em' }}>
          Calculadora de Proyección y Rendimiento (ROI)
        </h2>
        <p style={{ color: 'var(--color-fog)', fontSize: '14px', marginTop: '4px' }}>
          Simula el crecimiento potencial de un portafolio mediante interés compuesto en el tiempo.
        </p>
      </div>

      <div className="table-card" style={{ maxWidth: '960px', padding: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
          {/* Parámetros de Entrada */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="simulate-input-group">
              <label className="simulate-label">Capital Inicial de Inversión (USD)</label>
              <input
                type="number"
                min="10"
                step="50"
                className="simulate-input"
                value={initialAmount}
                onChange={(e) => setInitialAmount(e.target.value)}
              />
            </div>

            <div className="simulate-input-group">
              <label className="simulate-label">Activo Cripto de Referencia</label>
              <select
                className="simulate-input"
                value={selectedCoin}
                onChange={(e) => setSelectedCoin(e.target.value)}
                style={{ background: 'var(--color-obsidian)', cursor: 'pointer' }}
              >
                {cryptos.map(c => (
                  <option key={c.symbol} value={c.symbol}>
                    {c.name} ({c.symbol}) &bull; ${c.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
            </div>

            <div className="simulate-input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="simulate-label">Rendimiento Anual Estimado (APY %)</label>
                <span className="text-mono" style={{ color: 'var(--color-paper)', fontWeight: 510, fontSize: '13px' }}>
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
                style={{ width: '100%', accentColor: 'var(--color-acid-lime)', cursor: 'pointer', marginTop: '8px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="simulate-input-group">
                <label className="simulate-label">Horizonte Temporal</label>
                <select
                  className="simulate-input"
                  value={years}
                  onChange={(e) => setYears(e.target.value)}
                  style={{ background: 'var(--color-obsidian)', cursor: 'pointer' }}
                >
                  <option value="0.5">6 Meses</option>
                  <option value="1">1 Año</option>
                  <option value="2">2 Años</option>
                  <option value="3">3 Años</option>
                  <option value="5">5 Años</option>
                </select>
              </div>

              <div className="simulate-input-group">
                <label className="simulate-label">Frecuencia Capitalización</label>
                <select
                  className="simulate-input"
                  value={compoundFrequency}
                  onChange={(e) => setCompoundFrequency(e.target.value)}
                  style={{ background: 'var(--color-obsidian)', cursor: 'pointer' }}
                >
                  <option value="12">Mensual</option>
                  <option value="1">Anual</option>
                  <option value="365">Diaria</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tarjeta de Salida de Proyección (Precision Showcase) */}
          <div
            style={{
              background: 'var(--color-obsidian)',
              border: '1px solid var(--color-graphite)',
              borderRadius: 'var(--radius-cards)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '20px',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span className="badge-tag badge-tag--positive">Proyección Compuesta</span>
                <span className="badge-tag badge-tag--neutral">{years} {years === '1' ? 'Año' : 'Años'}</span>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Valor Total Estimado al Finalizar
                </div>
                <div
                  className="text-mono"
                  style={{
                    fontSize: '32px',
                    fontWeight: 510,
                    color: 'var(--color-paper)',
                    letterSpacing: '-0.02em',
                    marginTop: '4px',
                  }}
                >
                  {calculation ? formatMoney(calculation.futureValueUSD) : '--'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-ash)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                  (${calculation ? calculation.futureValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '--'} USD)
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div
                  style={{
                    background: 'var(--color-carbon)',
                    border: '1px solid var(--color-graphite)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Ganancia Proyectada
                  </div>
                  <div className="text-mono text-positive" style={{ fontSize: '16px', fontWeight: 510, marginTop: '4px' }}>
                    +{calculation ? formatMoney(calculation.totalProfitUSD) : '--'}
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--color-carbon)',
                    border: '1px solid var(--color-graphite)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: '11px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Retorno (ROI)
                  </div>
                  <div className="text-mono text-positive" style={{ fontSize: '16px', fontWeight: 510, marginTop: '4px' }}>
                    +{calculation ? `${calculation.roiPercent.toFixed(1)}%` : '--'}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--color-ash)', borderTop: '1px solid var(--color-graphite)', paddingTop: '12px', lineHeight: 1.5 }}>
              Modelo financiero analítico con tasa constante. Las fluctuaciones del mercado en vivo pueden alterar los rendimientos reales.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

