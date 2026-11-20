import React, { useState, useEffect } from 'react';
import { BellIcon, CloseIcon, CheckCircleIcon, AlertCircleIcon, RefreshIcon, TrendingUpIcon, TrendingDownIcon } from './Icons';

export default function NotificationModal({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('cryptopulse_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all'); // all, order, alert, system

  // Cargar notificaciones desde backend con fallback a localStorage
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=25');
      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          setNotifications(data.data);
          try {
            localStorage.setItem('cryptopulse_notifications', JSON.stringify(data.data));
          } catch {}
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      // Fallback
    }

    // Si falló backend, intentar desde localStorage
    try {
      const saved = localStorage.getItem('cryptopulse_notifications');
      if (saved) {
        setNotifications(JSON.parse(saved));
      } else {
        // Datos iniciales de demostración
        setNotifications([
          {
            id: 'notif-init-1',
            event: 'SYSTEM_WELCOME',
            title: 'Bienvenido a CryptoPulse',
            message: 'Billetera institucional asignada con $10,000 USD simulados bajo aislamiento 1:1 en PostgreSQL 16.',
            type: 'system',
            timestamp: Date.now() / 1000 - 3600,
            read: false,
          },
          {
            id: 'notif-init-2',
            event: 'MARKET_SYNC',
            title: 'Clúster Market Sincronizado',
            message: 'Alimentación de precios activos vía CoinGecko y Frankfurter con caché distribuido Redis L1.',
            type: 'market',
            timestamp: Date.now() / 1000 - 1800,
            read: false,
          }
        ]);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    try {
      localStorage.setItem('cryptopulse_notifications', JSON.stringify(updated));
    } catch {}
  };

  const clearAll = async () => {
    try {
      await fetch('/api/notifications', { method: 'DELETE' });
    } catch {}
    setNotifications([]);
    try {
      localStorage.removeItem('cryptopulse_notifications');
    } catch {}
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'order') return n.type === 'order' || n.event === 'ORDER_EXECUTED';
    if (activeFilter === 'alert') return n.type === 'alert' || n.type === 'market' || n.event === 'PRICE_ALERT';
    if (activeFilter === 'system') return n.type === 'system' || n.event === 'SYSTEM_WELCOME';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTime = (ts) => {
    if (!ts) return 'Ahora';
    const seconds = Math.floor((Date.now() / 1000) - ts);
    if (seconds < 60) return `Hace ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return new Date(ts * 1000).toLocaleDateString('es-CO');
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-dialog modal-dialog--wide" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Encabezado */}
        <div className="modal-header" style={{ paddingBottom: '14px', borderBottom: '1px solid var(--color-graphite)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(228, 242, 34, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-acid-lime)'
            }}>
              <BellIcon size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="modal-title" style={{ fontSize: '18px', margin: 0 }}>
                  Notificaciones y alertas
                </h3>
                {unreadCount > 0 && (
                  <span style={{
                    backgroundColor: 'var(--color-acid-lime)',
                    color: '#08090a',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: '10px',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Cerrar">
            <CloseIcon size={16} />
          </button>
        </div>

        {/* Barra de Filtros y Acciones */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '12px 0',
          borderBottom: '1px solid var(--color-graphite)'
        }}>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'all', label: 'Todas' },
              { id: 'order', label: 'Órdenes' },
              { id: 'alert', label: 'Alertas' },
              { id: 'system', label: 'Sistema' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                style={{
                  background: activeFilter === f.id ? 'var(--color-graphite)' : 'transparent',
                  color: activeFilter === f.id ? 'var(--color-paper)' : 'var(--color-fog)',
                  border: '1px solid',
                  borderColor: activeFilter === f.id ? 'var(--color-smoke)' : 'transparent',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: activeFilter === f.id ? 510 : 400,
                  transition: 'all 0.15s ease'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Acciones */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="btn-ghost"
                style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--color-mist)' }}
              >
                Marcar como leído
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="btn-ghost"
                style={{ fontSize: '11px', padding: '4px 8px', color: 'var(--color-ash)' }}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Contenedor de la Lista con Scroll */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 0', minHeight: '260px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-fog)' }}>
              <RefreshIcon size={20} className="loading-spin" style={{ marginBottom: '8px' }} />
              <div>Consultando notificaciones encoladas...</div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--color-fog)' }}>
              <BellIcon size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <div style={{ fontSize: '14px', fontWeight: 510, color: 'var(--color-mist)' }}>
                No hay notificaciones en este filtro
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Las notificaciones aparecerán aquí cuando se ejecuten operaciones o alertas.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredNotifications.map((n) => {
                const isOrder = n.type === 'order' || n.event === 'ORDER_EXECUTED';
                const isAlert = n.type === 'alert' || n.event === 'PRICE_ALERT';
                const isBuy = isOrder && (n.payload?.order_type === 'BUY' || (n.title && n.title.includes('BUY')));

                return (
                  <div
                    key={n.id || Math.random()}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px 14px',
                      backgroundColor: n.read ? 'rgba(15, 16, 17, 0.4)' : 'rgba(22, 23, 24, 0.85)',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: n.read ? 'var(--color-graphite)' : 'rgba(228, 242, 34, 0.25)',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    {/* Indicador no leída */}
                    {!n.read && (
                      <span style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-acid-lime)',
                        boxShadow: '0 0 6px var(--color-acid-lime)'
                      }} />
                    )}

                    {/* Icono de Tipo */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: isOrder 
                        ? (isBuy ? 'rgba(39, 166, 68, 0.15)' : 'rgba(235, 87, 87, 0.15)')
                        : (isAlert ? 'rgba(2, 184, 204, 0.15)' : 'rgba(99, 102, 241, 0.15)'),
                      color: isOrder 
                        ? (isBuy ? 'var(--color-pulse-green)' : 'var(--color-coral-red)')
                        : (isAlert ? 'var(--color-signal-teal)' : 'var(--color-iris-violet)'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isOrder ? (
                        isBuy ? <TrendingUpIcon size={16} /> : <TrendingDownIcon size={16} />
                      ) : isAlert ? (
                        <AlertCircleIcon size={16} />
                      ) : (
                        <CheckCircleIcon size={16} />
                      )}
                    </div>

                    {/* Contenido */}
                    <div style={{ flex: 1, paddingRight: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: n.read ? 400 : 510,
                          color: n.read ? 'var(--color-mist)' : 'var(--color-paper)'
                        }}>
                          {n.title}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--color-ash)',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          {formatTime(n.timestamp)}
                        </span>
                      </div>
                      <p style={{
                        fontSize: '12px',
                        color: 'var(--color-fog)',
                        margin: 0,
                        lineHeight: 1.4
                      }}>
                        {n.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          paddingTop: '12px',
          borderTop: '1px solid var(--color-graphite)',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          fontSize: '11px',
          color: 'var(--color-ash)'
        }}>
          <button
            onClick={fetchNotifications}
            className="btn-ghost"
            style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RefreshIcon size={12} className={loading ? 'loading-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>
    </div>
  );
}
