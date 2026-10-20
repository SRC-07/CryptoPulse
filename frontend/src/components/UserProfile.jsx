import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CheckCircleIcon, AlertCircleIcon, RefreshIcon } from './Icons';

export default function UserProfile({
  fiatCurrency = 'USD',
  fiatRate = 1,
  onNavigateTab,
}) {
  const { user, wallet, updateProfile, changePassword, resetSimulatedFunds, logout } = useAuth();

  // Estados de edición de perfil
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [profileError, setProfileError] = useState(null);

  // Estados de cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState(null);
  const [pwdError, setPwdError] = useState(null);

  // Estado de restablecimiento de fondos
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(null);
  const [resetError, setResetError] = useState(null);

  // Copia al portapapeles
  const [copied, setCopied] = useState(false);

  // Preferencias simuladas
  const [orderConfirmation, setOrderConfirmation] = useState(true);
  const [priceAlerts, setPriceAlerts] = useState(true);

  const walletAddr = wallet?.wallet_address || user?.wallet_address || 'Asignada y Protegida';
  const rawBalance = wallet?.fiat_balance != null ? wallet.fiat_balance : 10000;
  const convertedBalance = rawBalance * (fiatRate || 1);

  const formatCurrency = (amount) => {
    if (fiatCurrency === 'COP') {
      return `$${amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP`;
    }
    if (fiatCurrency === 'EUR') {
      return `€${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
    }
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  };

  const handleCopyWallet = () => {
    if (walletAddr) {
      navigator.clipboard.writeText(walletAddr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      await updateProfile(username, email);
      setProfileSuccess('Datos de perfil actualizados correctamente.');
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdSuccess(null);
    setPwdError(null);

    if (newPassword.length < 6) {
      setPwdError('La nueva contraseña debe tener al menos 6 caracteres.');
      setPwdLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('La confirmación de la contraseña no coincide.');
      setPwdLoading(false);
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      setPwdSuccess('Contraseña modificada exitosamente.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdSuccess(null), 4000);
    } catch (err) {
      setPwdError(err.message);
    } finally {
      setPwdLoading(false);
    }
  };

  const handleResetFunds = async () => {
    if (!window.confirm('¿Deseas restablecer el saldo de tu billetera virtual a $10,000 USD?')) {
      return;
    }

    setResetLoading(true);
    setResetSuccess(null);
    setResetError(null);

    try {
      const res = await resetSimulatedFunds();
      setResetSuccess(res.message || 'Fondos restablecidos con éxito.');
      setTimeout(() => setResetSuccess(null), 4000);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px' }}>
      {/* Encabezado Principal de Cuenta */}
      <div
        style={{
          background: 'var(--color-carbon)',
          border: '1px solid var(--color-smoke)',
          borderRadius: 'var(--radius-cards)',
          padding: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--color-obsidian)',
              border: '2px solid var(--color-smoke)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              fontWeight: 600,
              color: 'var(--color-acid-lime)',
              boxShadow: '0 0 20px rgba(226, 255, 78, 0.1)',
            }}
          >
            {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 510, color: 'var(--color-paper)', letterSpacing: '-0.02em' }}>
                {user?.username}
              </h2>
              <span className="badge-tag badge-tag--positive">
                Verificado
              </span>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-fog)', marginTop: '4px' }}>
              {user?.email} &bull; <span className="text-mono">UID: {user?.id ? `CP-${String(user.id).padStart(5, '0')}` : 'CP-0001'}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => onNavigateTab && onNavigateTab('portfolio')}
            className="btn-lime"
          >
            Ir a Mi Cartera &rarr;
          </button>
          <button
            onClick={logout}
            className="btn-ghost"
            style={{ color: 'var(--color-coral-red)', borderColor: 'var(--color-coral-red-border)' }}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      {/* Cockpit de Billetera y Fondos Simulados */}
      <div className="table-card" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 510, color: 'var(--color-paper)' }}>
              Billetera Privada & Capital Virtual
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
              Identificador único de custodia y saldo disponible para operaciones en vivo.
            </span>
          </div>

          <button
            onClick={handleResetFunds}
            disabled={resetLoading}
            className="btn-ghost"
            title="Restablecer el saldo inicial a $10,000 USD"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <RefreshIcon size={13} className={resetLoading ? 'loading-spin' : ''} />
            <span>Restablecer Saldo a $10,000 USD</span>
          </button>
        </div>

        {resetSuccess && (
          <div style={{ padding: '10px 14px', background: 'var(--color-pulse-green-bg)', border: '1px solid var(--color-pulse-green-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-pulse-green)', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircleIcon size={16} />
            <span>{resetSuccess}</span>
          </div>
        )}

        {resetError && (
          <div style={{ padding: '10px 14px', background: 'var(--color-coral-red-bg)', border: '1px solid var(--color-coral-red-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-coral-red)', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircleIcon size={16} />
            <span>{resetError}</span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-graphite)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Dirección de Billetera Privada
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <span className="text-mono text-positive" style={{ fontSize: '14px', fontWeight: 510, wordBreak: 'break-all' }}>
                {walletAddr}
              </span>
              <button
                onClick={handleCopyWallet}
                className="btn-ghost"
                style={{ padding: '4px 8px', fontSize: '11px', flexShrink: 0 }}
              >
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--color-obsidian)', border: '1px solid var(--color-graphite)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
              Saldo Disponible ({fiatCurrency})
            </div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-paper)', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(convertedBalance)}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-fog)', marginTop: '2px' }}>
              Equivalente base: ${rawBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Configuración: Datos de Perfil & Seguridad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {/* Formulario de Información Personal */}
        <div className="table-card" style={{ padding: '24px 28px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 510, color: 'var(--color-paper)', marginBottom: '4px' }}>
            Datos de la Cuenta
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--color-fog)', marginBottom: '18px' }}>
            Modifica tu nombre de usuario y dirección de correo electrónico vinculada.
          </p>

          {profileSuccess && (
            <div style={{ padding: '10px 14px', background: 'var(--color-pulse-green-bg)', border: '1px solid var(--color-pulse-green-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-pulse-green)', fontSize: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircleIcon size={14} />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div style={{ padding: '10px 14px', background: 'var(--color-coral-red-bg)', border: '1px solid var(--color-coral-red-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-coral-red)', fontSize: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircleIcon size={14} />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="simulate-input-group">
              <label className="simulate-label">Nombre de usuario</label>
              <input
                type="text"
                required
                className="simulate-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej: trader_pro"
              />
            </div>

            <div className="simulate-input-group">
              <label className="simulate-label">Correo electrónico</label>
              <input
                type="email"
                required
                className="simulate-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            </div>

            <button
              type="submit"
              disabled={profileLoading}
              className="btn-lime"
              style={{ marginTop: '6px' }}
            >
              {profileLoading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>

        {/* Formulario de Seguridad: Cambio de Contraseña */}
        <div className="table-card" style={{ padding: '24px 28px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 510, color: 'var(--color-paper)', marginBottom: '4px' }}>
            Seguridad & Contraseña
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--color-fog)', marginBottom: '18px' }}>
            Actualiza tu clave de acceso periódicamente para proteger tus operaciones.
          </p>

          {pwdSuccess && (
            <div style={{ padding: '10px 14px', background: 'var(--color-pulse-green-bg)', border: '1px solid var(--color-pulse-green-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-pulse-green)', fontSize: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircleIcon size={14} />
              <span>{pwdSuccess}</span>
            </div>
          )}

          {pwdError && (
            <div style={{ padding: '10px 14px', background: 'var(--color-coral-red-bg)', border: '1px solid var(--color-coral-red-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-coral-red)', fontSize: '12px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircleIcon size={14} />
              <span>{pwdError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="simulate-input-group">
              <label className="simulate-label">Contraseña actual</label>
              <input
                type="password"
                required
                className="simulate-input"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ingresa tu contraseña actual"
              />
            </div>

            <div className="simulate-input-group">
              <label className="simulate-label">Nueva contraseña</label>
              <input
                type="password"
                required
                className="simulate-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div className="simulate-input-group">
              <label className="simulate-label">Confirmar nueva contraseña</label>
              <input
                type="password"
                required
                className="simulate-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la nueva contraseña"
              />
            </div>

            <button
              type="submit"
              disabled={pwdLoading}
              className="btn-ghost"
              style={{ marginTop: '6px' }}
            >
              {pwdLoading ? 'Actualizando...' : 'Actualizar Contraseña'}
            </button>
          </form>
        </div>
      </div>

      {/* Preferencias de Operatoria y Terminal */}
      <div className="table-card" style={{ padding: '24px 28px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 510, color: 'var(--color-paper)', marginBottom: '4px' }}>
          Preferencias de la Terminal
        </h3>
        <p style={{ fontSize: '12px', color: 'var(--color-fog)', marginBottom: '18px' }}>
          Configuración de interfaz y avisos para tu experiencia de trading.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 16px', background: 'var(--color-obsidian)', border: '1px solid var(--color-graphite)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 510, color: 'var(--color-paper)' }}>
                Confirmación de Órdenes
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
                Solicitar confirmación antes de ejecutar una compra o venta simulada
              </div>
            </div>
            <input
              type="checkbox"
              checked={orderConfirmation}
              onChange={(e) => setOrderConfirmation(e.target.checked)}
              style={{ accentColor: 'var(--color-acid-lime)', width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '12px 16px', background: 'var(--color-obsidian)', border: '1px solid var(--color-graphite)', borderRadius: 'var(--radius-md)' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 510, color: 'var(--color-paper)' }}>
                Alertas de Volatilidad
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
                Notificar movimientos de precio superiores al ±5% en 24h
              </div>
            </div>
            <input
              type="checkbox"
              checked={priceAlerts}
              onChange={(e) => setPriceAlerts(e.target.checked)}
              style={{ accentColor: 'var(--color-acid-lime)', width: '18px', height: '18px', cursor: 'pointer' }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
