import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CloseIcon, CheckCircleIcon, AlertCircleIcon } from './Icons';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, isAuthenticated, user, logout } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const emailClean = email.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailClean || !emailRegex.test(emailClean)) {
        throw new Error('Por favor ingresa un correo electrónico válido (ej: usuario@dominio.com).');
      }

      if (isRegister) {
        const usernameClean = username.trim();
        if (!usernameClean || usernameClean.length < 3) {
          throw new Error('El nombre de usuario debe contener al menos 3 caracteres.');
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(usernameClean)) {
          throw new Error('El nombre de usuario sólo puede contener letras, números, guiones y guiones bajos.');
        }
        if (password.length < 6) {
          throw new Error('La contraseña debe tener un mínimo de 6 caracteres para proteger tu cuenta.');
        }
        await register(usernameClean, emailClean, password);
      } else {
        if (!password) {
          throw new Error('Por favor ingresa tu contraseña.');
        }
        await login(emailClean, password);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '420px' }}
      >
        <div className="modal-header">
          <h2 className="modal-title">
            {isAuthenticated ? 'Perfil de Usuario' : (isRegister ? 'Crear Cuenta' : 'Iniciar Sesión')}
          </h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar ventana">
            <CloseIcon size={16} />
          </button>
        </div>

        {isAuthenticated ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div
              style={{
                background: 'var(--color-obsidian)',
                border: '1px solid var(--color-graphite)',
                padding: '18px',
                borderRadius: 'var(--radius-cards)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-fog)' }}>
                Cuenta Autenticada
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--color-carbon)',
                    border: '1px solid var(--color-smoke)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--color-acid-lime)',
                  }}
                >
                  {user?.username?.slice(0, 2).toUpperCase() || 'US'}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 510, color: 'var(--color-paper)' }}>{user?.username}</div>
                  <div style={{ fontSize: '13px', color: 'var(--color-fog)' }}>{user?.email}</div>
                </div>
              </div>

              <div style={{ marginTop: '6px', paddingTop: '10px', borderTop: '1px solid var(--color-graphite)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-fog)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Dirección de Billetera Privada:
                </span>
                <div className="text-mono text-positive" style={{ fontSize: '13px', marginTop: '4px', wordBreak: 'break-all' }}>
                  {user?.wallet_address || 'Asignada y Protegida'}
                </div>
              </div>
            </div>

            <button
              onClick={() => { logout(); onClose(); }}
              className="btn-ghost"
              style={{
                width: '100%',
                padding: '10px',
                color: 'var(--color-coral-red)',
                borderColor: 'var(--color-coral-red-border)',
                background: 'var(--color-coral-red-bg)',
              }}
            >
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Conmutador de modo (Linear Nav Pill) */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--color-obsidian)', border: '1px solid var(--color-graphite)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(null); }}
                style={{
                  flex: 1,
                  padding: '7px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: !isRegister ? 510 : 400,
                  background: !isRegister ? 'var(--color-carbon)' : 'transparent',
                  color: !isRegister ? 'var(--color-paper)' : 'var(--color-fog)',
                  boxShadow: !isRegister ? 'inset 0 0 0 1px var(--color-smoke)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                Ingresar
              </button>

              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(null); }}
                style={{
                  flex: 1,
                  padding: '7px',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: isRegister ? 510 : 400,
                  background: isRegister ? 'var(--color-carbon)' : 'transparent',
                  color: isRegister ? 'var(--color-paper)' : 'var(--color-fog)',
                  boxShadow: isRegister ? 'inset 0 0 0 1px var(--color-smoke)' : 'none',
                  transition: 'all 0.15s',
                }}
              >
                Crear Cuenta
              </button>
            </div>

            {isRegister && (
              <div className="simulate-input-group">
                <label className="simulate-label">Nombre de usuario</label>
                <input
                  type="text"
                  required
                  placeholder="ej: satoshi_trader"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="simulate-input"
                />
              </div>
            )}

            <div className="simulate-input-group">
              <label className="simulate-label">Correo electrónico</label>
              <input
                type="email"
                required
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="simulate-input"
              />
            </div>

            <div className="simulate-input-group">
              <label className="simulate-label">Contraseña</label>
              <input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="simulate-input"
              />
            </div>

            {error && (
              <div
                style={{
                  background: 'var(--color-coral-red-bg)',
                  border: '1px solid var(--color-coral-red-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  fontSize: '12px',
                  color: 'var(--color-coral-red)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircleIcon size={14} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-lime"
              style={{
                width: '100%',
                padding: '11px',
                fontSize: '13px',
                marginTop: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Procesando...' : (isRegister ? 'Registrarme y Obtener Billetera' : 'Iniciar Sesión')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

