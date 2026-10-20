import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({
  activeTab,
  onTabChange,
  currency,
  onCurrencyChange,
  onOpenStatus,
  onOpenAuth,
}) {
  const { user } = useAuth();
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

        <button
          className="navbar__status-btn"
          onClick={onOpenStatus}
          title="Ver estado de infraestructura"
        >
          <span className="navbar__status-dot navbar__status-dot--online"></span>
          <span>Operativo</span>
        </button>

        {user ? (
          <button
            onClick={onOpenAuth}
            className="navbar__auth-btn navbar__auth-btn--logged"
            title={`Billetera: ${user.wallet_address || 'Asignada'}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              color: '#38BDF8',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            <span>👤 {user.username}</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#10B981',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              {user.wallet_address ? `${user.wallet_address.slice(0, 10)}...` : 'Wallet'}
            </span>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="btn btn--primary"
            style={{
              padding: '6px 14px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🔑 Ingresar / Registro</span>
          </button>
        )}
      </div>
    </nav>
  );
}
