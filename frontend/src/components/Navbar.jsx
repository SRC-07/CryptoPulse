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
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      {/* Brand & Logo */}
      <div
        className="navbar__brand"
        onClick={() => onTabChange('markets')}
        style={{ cursor: 'pointer' }}
      >
        <div className="navbar__logo-glyph">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 13h4.5l2.5-6.5 4 13 3-6.5h4"
              stroke="#ffffff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span className="navbar__name">CryptoPulse</span>
      </div>

      {/* Primary Navigation Tabs */}
      <nav className="navbar__nav" aria-label="Navegación Principal">
        <button
          className={`navbar__link ${activeTab === 'markets' ? 'navbar__link--active' : ''}`}
          onClick={() => onTabChange('markets')}
        >
          Mercados
        </button>
        <button
          className={`navbar__link ${activeTab === 'portfolio' ? 'navbar__link--active' : ''}`}
          onClick={() => onTabChange('portfolio')}
        >
          Mi Cartera
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
          Tasas
        </button>
        <button
          className={`navbar__link ${activeTab === 'roi' ? 'navbar__link--active' : ''}`}
          onClick={() => onTabChange('roi')}
        >
          Calculadora ROI
        </button>
        {user && (
          <button
            className={`navbar__link ${activeTab === 'profile' ? 'navbar__link--active' : ''}`}
            onClick={() => onTabChange('profile')}
          >
            Perfil
          </button>
        )}
      </nav>

      {/* Actions & Profile */}
      <div className="navbar__actions">
        {/* Selector de Moneda de Referencia */}
        <select
          className="navbar__currency-select"
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          title="Moneda de visualización"
        >
          <option value="USD">USD ($)</option>
          <option value="COP">COP ($)</option>
          <option value="EUR">EUR (€)</option>
        </select>

        {/* Estado de Autenticación */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              className={`navbar__user-badge ${activeTab === 'profile' ? 'navbar__user-badge--active' : ''}`}
              onClick={() => onTabChange('profile')}
              title={`Ver perfil de ${user.username}`}
              style={{ cursor: 'pointer' }}
            >
              <div className="navbar__user-avatar">
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <span style={{ fontSize: '13px', fontWeight: 510, color: 'var(--color-paper)' }}>
                {user.username}
              </span>
            </div>

            <button
              onClick={logout}
              className="btn-ghost"
              style={{ padding: '5px 10px', fontSize: '11px' }}
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={onOpenAuth}
              className="navbar__link"
              style={{ color: 'var(--color-mist)' }}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={onOpenAuth}
              className="btn-white-pill"
            >
              Crear Cuenta
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
