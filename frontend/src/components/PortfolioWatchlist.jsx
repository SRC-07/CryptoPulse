import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  PlusIcon,
  TrashIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  RefreshIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from './Icons';

export default function PortfolioWatchlist({
  cryptos = [],
  fiatRate = 1,
  fiatCurrency = 'USD',
  onOpenAuth,
}) {
  const { user, token, wallet, walletLoading, walletError, refreshWallet, isAuthenticated } = useAuth();

  // Estado para la orden de simulación (Compra / Venta)
  const [orderSide, setOrderSide] = useState('BUY');
  const [selectedCoin, setSelectedCoin] = useState('BTC');
  const [orderQuantity, setOrderQuantity] = useState('0.1');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  // Historial de órdenes de simulación
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('positions'); // 'positions' | 'simulate' | 'history'

  // Mapa rápido de criptomonedas para búsqueda O(1) de precio y metadatos
  const cryptoMap = React.useMemo(() => {
    const map = {};
    cryptos.forEach(c => {
      map[c.symbol?.toUpperCase()] = c;
    });
    return map;
  }, [cryptos]);

  // Consultar historial de órdenes al iniciar sesión
  const fetchOrderHistory = useCallback(async () => {
    if (!token) {
      setOrders([]);
      return;
    }
    setOrdersLoading(true);
    try {
      const res = await fetch('/api/wallet/my-orders?limit=25', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch {
      // Manejo silencioso de red
    } finally {
      setOrdersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrderHistory();
    }
  }, [isAuthenticated, fetchOrderHistory]);

  // Formateador de moneda fiat
  const formatFiat = (amountUSD) => {
    const safeUSD = typeof amountUSD === 'number' && !isNaN(amountUSD) ? amountUSD : 0;
    const converted = safeUSD * (fiatRate || 1);
    if (fiatCurrency === 'COP') {
      return `$${converted.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP`;
    }
    return `$${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${fiatCurrency}`;
  };

  // Precio del activo seleccionado para simulación
  const selectedCoinData = cryptoMap[selectedCoin] || cryptos[0] || { current_price: 0, symbol: 'BTC' };
  const currentPrice = selectedCoinData.current_price || 0;
  const parsedQty = parseFloat(orderQuantity) || 0;
  const estimatedOrderCostUSD = parsedQty * currentPrice;

  // Ejecución de orden de simulación conectada con PostgreSQL 16
  const handleExecuteOrder = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (parsedQty <= 0) {
      setOrderFeedback({ type: 'error', message: 'Ingresa una cantidad mayor a cero.' });
      return;
    }

    setOrderSubmitting(true);
    setOrderFeedback(null);

    try {
      const res = await fetch('/api/wallet/simulate/order', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: selectedCoin,
          order_type: orderSide,
          quantity: parsedQty,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || 'Error al ejecutar orden de simulación.');
      }

      setOrderFeedback({
        type: 'success',
        message: data.message || `Orden de ${orderSide} por ${parsedQty} ${selectedCoin} ejecutada con éxito.`,
      });

      // Refrescar billetera e historial en vivo
      await refreshWallet();
      await fetchOrderHistory();
      setOrderQuantity('0.1');
    } catch (err) {
      setOrderFeedback({
        type: 'error',
        message: err.message,
      });
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Exportar activos a CSV
  const handleExportCSV = () => {
    const assetsList = wallet?.assets || [];
    if (assetsList.length === 0) return;
    const headers = ['Simbolo', 'Nombre', 'Cantidad', 'Precio_Compra_Promedio_USD', 'Valor_Actual_USD', 'PnL_USD', 'PnL_Porcentaje'];
    const rows = assetsList.map(a => [
      a.symbol,
      `"${a.coin_name || a.symbol}"`,
      a.quantity,
      a.average_buy_price?.toFixed(2),
      (a.current_value_usd || 0).toFixed(2),
      (a.pnl_usd || 0).toFixed(2),
      (a.pnl_percentage || 0).toFixed(2),
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cryptopulse_wallet_${user?.username || 'user'}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cálculo de totales si está autenticado
  const fiatBalance = wallet?.fiat_balance ?? 10000;
  const portfolioAssets = wallet?.assets || [];
  const totalCryptoValueUSD = portfolioAssets.reduce((sum, a) => sum + (a.current_value_usd || 0), 0);
  const totalWalletValueUSD = wallet?.total_portfolio_value_usd ?? (fiatBalance + totalCryptoValueUSD);
  const totalInvestedUSD = portfolioAssets.reduce((sum, a) => sum + (a.quantity * (a.average_buy_price || 0)), 0);
  const totalPnLUSD = totalCryptoValueUSD - totalInvestedUSD;
  const totalPnLPercent = totalInvestedUSD > 0 ? (totalPnLUSD / totalInvestedUSD) * 100 : 0;

  return (
    <section className="section fade-in">
      {/* Cabecera Principal */}
      <div className="section__header">
        <div>
          <h2 className="section__title">Billetera Personal y Simulador Transaccional</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
            {isAuthenticated
              ? `Billetera exclusiva asignada a ${user?.username} con aislamiento estricto y persistencia ACID en PostgreSQL 16.`
              : 'Simula operaciones de compra/venta y gestiona activos cripto en tiempo real.'}
          </p>
        </div>
        <div className="section__actions">
          {isAuthenticated && (
            <button
              className="btn btn--secondary"
              onClick={() => { refreshWallet(); fetchOrderHistory(); }}
              disabled={walletLoading}
              title="Sincronizar billetera con PostgreSQL"
            >
              <RefreshIcon size={14} />
              <span>Sincronizar</span>
            </button>
          )}
          {isAuthenticated && portfolioAssets.length > 0 && (
            <button
              className="btn btn--secondary"
              onClick={handleExportCSV}
              title="Exportar posiciones en formato CSV"
            >
              Exportar CSV
            </button>
          )}
          {!isAuthenticated && (
            <button
              className="btn btn--primary"
              onClick={onOpenAuth}
            >
              <span>🔑 Iniciar Sesión / Crear Cuenta</span>
            </button>
          )}
        </div>
      </div>

      {/* Banner de Estado / Notificación si no está autenticado */}
      {!isAuthenticated && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(16,185,129,0.08))',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '20px 24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.2rem' }}>🛡️</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Billeteras Personales Aisladas (1:1 por Usuario)
              </h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '780px', lineHeight: 1.5 }}>
              En CryptoPulse, cada usuario registrado posee <strong>su propia billetera independiente</strong> en PostgreSQL 16 con
              <strong> $10,000 USD de saldo virtual</strong>. Las billeteras están estrictamente aisladas mediante llaves criptográficas y
              bloqueo pesimista ACID contra condiciones de carrera.
            </p>
          </div>
          <button
            className="btn btn--primary"
            onClick={onOpenAuth}
            style={{ padding: '10px 20px', fontWeight: 600 }}
          >
            Obtener mi Billetera Personal
          </button>
        </div>
      )}

      {/* Métricas Principales de la Billetera */}
      <div className="hero__stats" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card__label">
            {isAuthenticated ? 'Dirección de Billetera (Aislada)' : 'Modo Demostración'}
          </div>
          <div
            className="stat-card__value"
            style={{
              fontSize: '0.95rem',
              fontFamily: 'var(--font-mono)',
              color: isAuthenticated ? 'var(--color-positive)' : 'var(--text-muted)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={wallet?.wallet_address || user?.wallet_address}
          >
            {isAuthenticated
              ? (wallet?.wallet_address || user?.wallet_address || 'Asignada')
              : 'CP-DEMO-GUEST-WALLET'}
          </div>
          <div className="stat-card__change" style={{ color: 'var(--text-muted)' }}>
            {isAuthenticated ? '🔒 Exclusiva - No compartida' : 'Inicia sesión para persistir'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Saldo Líquido Disponible</div>
          <div className="stat-card__value" style={{ color: 'var(--accent-cyan)' }}>
            {formatFiat(fiatBalance)}
          </div>
          <div className="stat-card__change" style={{ color: 'var(--text-muted)' }}>
            USD Virtual para Simulación
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Valor Total del Portafolio</div>
          <div className="stat-card__value">
            {formatFiat(totalWalletValueUSD)}
          </div>
          <div className="stat-card__change" style={{ color: 'var(--text-muted)' }}>
            Efectivo + Criptoactivos
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__label">Rendimiento Cripto (P&L)</div>
          <div className={`stat-card__value ${totalPnLUSD >= 0 ? 'text-positive' : 'text-negative'}`}>
            {totalPnLUSD >= 0 ? '+' : ''}{formatFiat(totalPnLUSD)}
          </div>
          <div className={`stat-card__change ${totalPnLUSD >= 0 ? 'stat-card__change--positive' : 'stat-card__change--negative'}`}>
            {totalPnLUSD >= 0 ? <TrendingUpIcon size={14} /> : <TrendingDownIcon size={14} />}
            <span>{totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}% total</span>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación del Módulo */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--border-default)', paddingBottom: '12px' }}>
        <button
          className={`navbar__link ${activeTab === 'positions' ? 'navbar__link--active' : ''}`}
          onClick={() => setActiveTab('positions')}
        >
          Mis Activos ({portfolioAssets.length})
        </button>
        <button
          className={`navbar__link ${activeTab === 'simulate' ? 'navbar__link--active' : ''}`}
          onClick={() => setActiveTab('simulate')}
        >
          Simulador de Compra / Venta
        </button>
        {isAuthenticated && (
          <button
            className={`navbar__link ${activeTab === 'history' ? 'navbar__link--active' : ''}`}
            onClick={() => { setActiveTab('history'); fetchOrderHistory(); }}
          >
            Historial de Órdenes ({orders.length})
          </button>
        )}
      </div>

      {/* Pestaña 1: Posiciones / Activos en la Billetera */}
      {activeTab === 'positions' && (
        <div className="data-card">
          <div className="data-card__header">
            <div>
              <span className="data-card__title">Distribución de Activos en Posición</span>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {isAuthenticated
                  ? 'Registros persistidos en PostgreSQL con cálculo de P&L en tiempo real.'
                  : 'Modo invitado: Puedes abrir el simulador para realizar compras de prueba.'}
              </div>
            </div>
            <button
              className="btn btn--primary"
              onClick={() => setActiveTab('simulate')}
              style={{ fontSize: '0.84rem', padding: '6px 14px' }}
            >
              <PlusIcon size={14} />
              <span>Nueva Simulación</span>
            </button>
          </div>

          {portfolioAssets.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>💼</div>
              <div className="empty-state__title">Tu billetera aún no tiene posiciones en criptomonedas</div>
              <div className="empty-state__text" style={{ maxWidth: '480px', margin: '8px auto 20px' }}>
                {isAuthenticated
                  ? `Tienes ${formatFiat(fiatBalance)} disponibles. Utiliza el Simulador de Compra para adquirir tus primeros activos al precio de mercado en vivo.`
                  : 'Inicia sesión para operar con tu saldo virtual de $10,000 USD o realiza una simulación de prueba en el panel.'}
              </div>
              <button
                className="btn btn--primary"
                onClick={() => setActiveTab('simulate')}
              >
                Abrir Simulador de Inversión
              </button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Activo</th>
                  <th>Cantidad</th>
                  <th>Precio Compra Prom.</th>
                  <th>Precio Actual</th>
                  <th>Valor Total</th>
                  <th>Rendimiento (P&L)</th>
                  <th>Acción Rápida</th>
                </tr>
              </thead>
              <tbody>
                {portfolioAssets.map((asset) => {
                  const coinMeta = cryptoMap[asset.symbol] || {};
                  const livePrice = coinMeta.current_price || asset.average_buy_price;
                  const isPositive = (asset.pnl_usd ?? 0) >= 0;

                  return (
                    <tr key={asset.id || asset.symbol}>
                      <td>
                        <div className="data-table__coin">
                          {coinMeta.image_url && (
                            <img
                              className="data-table__coin-icon"
                              src={coinMeta.image_url}
                              alt={asset.symbol}
                            />
                          )}
                          <div>
                            <div className="data-table__coin-name">{asset.coin_name || coinMeta.name || asset.symbol}</div>
                            <div className="data-table__coin-symbol">{asset.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} {asset.symbol}
                      </td>
                      <td className="data-table__price">
                        ${asset.average_buy_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="data-table__price">
                        ${livePrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {formatFiat(asset.current_value_usd || (asset.quantity * livePrice))}
                      </td>
                      <td>
                        <span className={`data-table__change ${isPositive ? 'data-table__change--positive' : 'data-table__change--negative'}`}>
                          {isPositive ? '+' : ''}{(asset.pnl_percentage || 0).toFixed(2)}%
                          <span style={{ fontSize: '0.75rem', opacity: 0.8, marginLeft: '4px' }}>
                            ({isPositive ? '+' : ''}{formatFiat(asset.pnl_usd || 0)})
                          </span>
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn--secondary"
                          style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                          onClick={() => {
                            setSelectedCoin(asset.symbol);
                            setOrderSide('SELL');
                            setOrderQuantity(String(asset.quantity));
                            setActiveTab('simulate');
                          }}
                          title="Vender activo"
                        >
                          Vender
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Pestaña 2: Simulador Transaccional (Compra / Venta) */}
      {activeTab === 'simulate' && (
        <div className="data-card fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="data-card__header">
            <div>
              <span className="data-card__title">Terminal de Simulación de Órdenes</span>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Ejecuta compras y ventas a precios en vivo con validación ACID y actualización inmediata de saldos.
              </div>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.82rem',
                padding: '4px 8px',
                borderRadius: '6px',
                background: 'rgba(59,130,246,0.1)',
                color: 'var(--accent-cyan)',
                border: '1px solid rgba(59,130,246,0.25)',
              }}
            >
              Saldo Disp: {formatFiat(fiatBalance)}
            </span>
          </div>

          <form onSubmit={handleExecuteOrder} style={{ padding: '8px 4px' }}>
            {/* Selector de Tipo de Operación (Compra vs Venta) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setOrderSide('BUY')}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  border: orderSide === 'BUY' ? '2px solid var(--color-positive)' : '1px solid var(--border-default)',
                  background: orderSide === 'BUY' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-secondary)',
                  color: orderSide === 'BUY' ? 'var(--color-positive)' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                🟢 Comprar Cripto (BUY)
              </button>
              <button
                type="button"
                onClick={() => setOrderSide('SELL')}
                style={{
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  border: orderSide === 'SELL' ? '2px solid var(--color-negative)' : '1px solid var(--border-default)',
                  background: orderSide === 'SELL' ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-secondary)',
                  color: orderSide === 'SELL' ? 'var(--color-negative)' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                🔴 Vender Cripto (SELL)
              </button>
            </div>

            <div className="portfolio-add-grid" style={{ marginBottom: '20px' }}>
              <div>
                <label className="converter-label">Seleccionar Activo Cripto</label>
                <select
                  className="converter-select"
                  value={selectedCoin}
                  onChange={(e) => setSelectedCoin(e.target.value.toUpperCase())}
                >
                  {cryptos.map(c => (
                    <option key={c.symbol} value={c.symbol}>
                      {c.name} ({c.symbol}) - ${c.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="converter-label">Cantidad a Operar</label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  className="converter-input"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                  placeholder="ej: 0.25"
                  required
                />
              </div>
            </div>

            {/* Recibo Estimado de la Orden */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: '16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Precio en Vivo ({selectedCoin}):</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.88rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Cantidad solicitada:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                  {parsedQty} {selectedCoin}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--border-default)',
                  fontSize: '1rem',
                  fontWeight: 700,
                }}
              >
                <span>{orderSide === 'BUY' ? 'Costo Total Estimado:' : 'Ingreso Estimado:'}</span>
                <span style={{ color: orderSide === 'BUY' ? 'var(--color-positive)' : 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                  {formatFiat(estimatedOrderCostUSD)}
                </span>
              </div>
            </div>

            {/* Alertas de Feedback */}
            {orderFeedback && (
              <div
                style={{
                  background: orderFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  border: `1px solid ${orderFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                  color: orderFeedback.type === 'success' ? '#6EE7B7' : '#FCA5A5',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.88rem',
                }}
              >
                {orderFeedback.type === 'success' ? <CheckCircleIcon size={18} /> : <AlertCircleIcon size={18} />}
                <span>{orderFeedback.message}</span>
              </div>
            )}

            {/* Botón de Ejecución */}
            <button
              type="submit"
              disabled={orderSubmitting || parsedQty <= 0}
              className={`btn ${orderSide === 'BUY' ? 'btn--primary' : 'btn--secondary'}`}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: orderSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {orderSubmitting
                ? 'Procesando Transacción con Bloqueo ACID...'
                : isAuthenticated
                ? (orderSide === 'BUY' ? `Confirmar Compra de ${parsedQty} ${selectedCoin}` : `Confirmar Venta de ${parsedQty} ${selectedCoin}`)
                : 'Iniciar Sesión para Confirmar Orden'}
            </button>
          </form>
        </div>
      )}

      {/* Pestaña 3: Historial Transaccional ACID */}
      {activeTab === 'history' && isAuthenticated && (
        <div className="data-card fade-in">
          <div className="data-card__header">
            <div>
              <span className="data-card__title">Libro Contable de Órdenes (PostgreSQL 16)</span>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Registro inmutable de simulaciones asociadas a tu billetera personal.
              </div>
            </div>
            <button
              className="btn btn--secondary"
              onClick={fetchOrderHistory}
              disabled={ordersLoading}
              style={{ fontSize: '0.82rem', padding: '4px 10px' }}
            >
              <RefreshIcon size={13} />
              <span>Refrescar</span>
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state__title">No hay órdenes registradas</div>
              <div className="empty-state__text">
                Tus compras y ventas simuladas aparecerán aquí con su recibo de ejecución y sello temporal.
              </div>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID Orden</th>
                  <th>Fecha / Hora</th>
                  <th>Operación</th>
                  <th>Activo</th>
                  <th>Cantidad</th>
                  <th>Precio Ejecución</th>
                  <th>Total Fiat</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => (
                  <tr key={ord.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      #{ord.id}
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {new Date(ord.executed_at).toLocaleString('es-CO')}
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: ord.order_type === 'BUY' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: ord.order_type === 'BUY' ? 'var(--color-positive)' : 'var(--color-negative)',
                        }}
                      >
                        {ord.order_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{ord.symbol}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{ord.quantity}</td>
                    <td className="data-table__price">
                      ${ord.execution_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                      {formatFiat(ord.total_fiat)}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#60A5FA',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                        }}
                      >
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
