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
          <span>CP</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="navbar__name">CryptoPulse</span>
          <span className="navbar__tagline">Terminal v2.0</span>
        </div>
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
          Tasas Forex
        </button>
        <button
          className={`navbar__link ${activeTab === 'roi' ? 'navbar__link--active' : ''}`}
          onClick={() => onTabChange('roi')}
        >
          Calculadora ROI
        </button>
      </nav>

      {/* Actions & Profile */}
      <div className="navbar__actions">
        {/* Selector de Moneda de Referencia */}
        <select
          className="navbar__currency-select"
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          title="Moneda base de visualización"
        >
          <option value="USD">USD ($)</option>
          <option value="COP">COP ($)</option>
          <option value="EUR">EUR (€)</option>
        </select>

        {/* Indicador de Estado del Clúster */}
        <button
          className="navbar__status-pill"
          onClick={onOpenStatus}
          title="Ver diagnóstico de clúster y balanceo least_conn"
        >
          <span className="navbar__status-dot"></span>
          <span>Operativo</span>
        </button>

        {/* Estado de Autenticación */}
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              className="navbar__user-badge"
              onClick={() => onTabChange('portfolio')}
              title={`Billetera: ${user.wallet_address || 'Asignada'}`}
            >
              <div className="navbar__user-avatar">
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 510, color: 'var(--color-paper)' }}>
                {user.username}
              </span>
              <span
                className="text-mono"
                style={{
                  fontSize: '11px',
                  color: 'var(--color-pulse-green)',
                  background: 'var(--color-pulse-green-bg)',
                  padding: '1px 6px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-pulse-green-border)'
                }}
              >
                {user.wallet_address ? `${user.wallet_address.slice(0, 8)}...` : 'Wallet 1:1'}
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
