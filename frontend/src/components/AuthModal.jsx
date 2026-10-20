import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

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
      if (isRegister) {
        if (!username.trim()) throw new Error('Ingresa un nombre de usuario');
        if (password.length < 6) throw new Error('La contraseña debe tener mínimo 6 caracteres');
        await register(username.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '440px', padding: '28px', borderRadius: '16px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary, #fff)' }}>
            {isAuthenticated ? 'Perfil de Usuario' : (isRegister ? 'Crear Cuenta en CryptoPulse' : 'Iniciar Sesión')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              fontSize: '1.4rem',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {isAuthenticated ? (
          <div>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '16px', borderRadius: '10px', marginBottom: '20px' }}>
              <div style={{ marginBottom: '8px', color: '#94A3B8', fontSize: '0.85rem' }}>Usuario autenticado</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#38BDF8' }}>{user?.username}</div>
              <div style={{ fontSize: '0.9rem', color: '#CBD5E1' }}>{user?.email}</div>
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>Billetera Personal Aislada: </span>
                <span style={{ fontFamily: 'monospace', color: '#10B981', fontSize: '0.85rem' }}>
                  {user?.wallet_address || 'Asignada'}
                </span>
              </div>
            </div>

            <button
              onClick={() => { logout(); onClose(); }}
              className="btn btn--danger"
              style={{ width: '100%', padding: '12px', borderRadius: '8px' }}
            >
              Cerrar Sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px' }}>
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(null); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  background: !isRegister ? 'var(--accent-color, #2563EB)' : 'transparent',
                  color: !isRegister ? '#fff' : '#94A3B8',
                }}
              >
                Ingresar
              </button>
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(null); }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  background: isRegister ? 'var(--accent-color, #2563EB)' : 'transparent',
                  color: isRegister ? '#fff' : '#94A3B8',
                }}
              >
                Registrarse
              </button>
            </div>

            {isRegister && (
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#CBD5E1', marginBottom: '6px' }}>Nombre de usuario</label>
                <input
                  type="text"
                  required
                  placeholder="ej: satoshi_trader"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'rgba(15,23,42,0.8)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#CBD5E1', marginBottom: '6px' }}>Correo electrónico</label>
              <input
                type="email"
                required
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#CBD5E1', marginBottom: '6px' }}>Contraseña</label>
              <input
                type="password"
                required
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(15,23,42,0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff',
                }}
              />
            </div>

            {isRegister && (
              <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', padding: '10px', marginBottom: '16px', fontSize: '0.8rem', color: '#6EE7B7' }}>
                ✨ Al registrarte, recibirás automáticamente <strong>tu propia billetera exclusiva</strong> con <strong>$10,000 USD de saldo virtual</strong> para simulaciones.
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px', marginBottom: '16px', fontSize: '0.85rem', color: '#FCA5A5' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn--primary"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Procesando...' : (isRegister ? 'Registrarme y Obtener Wallet' : 'Ingresar')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
