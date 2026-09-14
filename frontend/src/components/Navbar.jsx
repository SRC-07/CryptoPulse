import React from 'react';

export default function Navbar({
  activeTab,
  onTabChange,
  currency,
  onCurrencyChange,
  onOpenStatus,
}) {
  return (
    <nav className="navbar">
      <div className="navbar__brand" onClick={() => onTabChange('markets')} style={{ cursor: 'pointer' }}>
        <div className="navbar__logo">CP</div>
        <div>
          <span className="navbar__name">CryptoPulse</span>
          <span className="navbar__tagline">Terminal Financiero</span>
        </div>
      </div>

      <div className="navbar__nav">
        <button
          className={`navbar__link ${activeTab === 'markets' ? 'navbar__link--active' : ''}`}
          onClick={() => onTabChange('markets')}
        >
          Mercados Cripto
        </button>
        <button
          className={`navbar__link ${activeTab === 'converter' ? 'navbar__link--active' : ''}`}
          onClick={() => onTabChange('converter')}
        >
          Conversor
        </button>
        <button
          className={`navbar__link ${activeTab === 'forex' ? 'navbar__link--active' : ''}`}
          onClick={() => onTabChange('forex')}
        >
          Tasas Forex
        </button>
        <button
          className={`navbar__link ${activeTab === 'portfolio' ? 'navbar__link--active' : ''}`}
          onClick={() => onTabChange('portfolio')}
        >
          Mi Portafolio
        </button>
        <button
          className={`navbar__link ${activeTab === 'roi' ? 'navbar__link--active' : ''}`}
          onClick={() => onTabChange('roi')}
        >
          Calculadora ROI
        </button>
      </div>

      <div className="navbar__actions">
        {/* Selector de Moneda de Referencia */}
        <select
          className="navbar__currency-select"
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          title="Moneda de referencia visual"
        >
          <option value="USD">USD ($)</option>
          <option value="COP">COP ($)</option>
          <option value="EUR">EUR (€)</option>
        </select>

        {/* Indicador de Estado Operativo */}
        <button
          className="navbar__status-btn"
          onClick={onOpenStatus}
          title="Ver estado de infraestructura"
        >
          <span className="navbar__status-dot navbar__status-dot--online"></span>
          <span>Operativo</span>
        </button>
      </div>
    </nav>
  );
}
