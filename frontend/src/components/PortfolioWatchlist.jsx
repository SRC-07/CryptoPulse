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
  initialCoin = null,
}) {
  const { user, token, wallet, walletLoading, walletError, refreshWallet, isAuthenticated } = useAuth();

  // Estado para la orden de simulación (Compra / Venta)
  const [orderSide, setOrderSide] = useState('BUY');
  const [selectedCoin, setSelectedCoin] = useState(initialCoin || 'BTC');
  const [orderQuantity, setOrderQuantity] = useState('0.1');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderFeedback, setOrderFeedback] = useState(null); // { type: 'success' | 'error', message: '' }

  // Historial de órdenes de simulación
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('positions'); // 'positions' | 'simulate' | 'history'

  useEffect(() => {
    if (initialCoin) {
      setSelectedCoin(initialCoin);
      setActiveTab('simulate');
    }
  }, [initialCoin]);

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
    if (fiatCurrency === 'EUR') {
      return `€${converted.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
    }
    return `$${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
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
    <section style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '40px' }}>
      {/* Cabecera Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 510, color: 'var(--color-paper)', letterSpacing: '-0.022em' }}>
            Billetera Personal y Simulador Transaccional
          </h2>
          <p style={{ color: 'var(--color-fog)', fontSize: '14px', marginTop: '4px' }}>
            {isAuthenticated
              ? `Billetera privada de trading de ${user?.username} con ejecución y balance en tiempo real.`
              : 'Simula operaciones de compra/venta y gestiona activos cripto en tiempo real con fondos virtuales.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAuthenticated && (
            <button
              className="btn-ghost"
              onClick={() => { refreshWallet(); fetchOrderHistory(); }}
              disabled={walletLoading}
              title="Actualizar balance de billetera"
            >
              <RefreshIcon size={14} className={walletLoading ? 'loading-spin' : ''} />
              <span>Sincronizar</span>
            </button>
          )}

          {isAuthenticated && portfolioAssets.length > 0 && (
            <button
              className="btn-ghost"
              onClick={handleExportCSV}
              title="Exportar posiciones en formato CSV"
            >
              Exportar CSV
            </button>
          )}

          {!isAuthenticated && (
            <button
              className="btn-lime"
              onClick={onOpenAuth}
            >
              Crear Cuenta / Iniciar Sesión &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Banner de Invitado Estilo Linear si no está autenticado */}
      {!isAuthenticated && (
        <div
          style={{
            background: 'var(--color-carbon)',
            border: '1px solid var(--color-smoke)',
            borderRadius: 'var(--radius-cards)',
            padding: '24px 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            flexWrap: 'wrap',
            boxShadow: 'var(--shadow-card-elevated)',
          }}
        >
          <div style={{ maxWidth: '780px' }}>
            <div style={{ marginBottom: '8px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 510, color: 'var(--color-paper)' }}>
                Billetera Privada
              </h3>
            </div>
            <p style={{ color: 'var(--color-fog)', fontSize: '13px', lineHeight: 1.6 }}>
              Cada cuenta dispone de <strong>su propia billetera privada</strong> con <strong>$10,000 USD de capital virtual</strong> para practicar estrategias de trading, comprar y vender criptomonedas a cotizaciones reales de mercado sin arriesgar dinero real.
            </p>
          </div>

          <button
            className="btn-white-pill"
            onClick={onOpenAuth}
          >
            Obtener mi Billetera Personal &rarr;
          </button>
        </div>
      )}

      {/* Cockpit de Billetera (Linear Command Banner) */}
      <div className="wallet-banner">
        <div>
          <div className="wallet-banner__title">
            {isAuthenticated ? 'Dirección de Billetera' : 'Billetera de Demostración'}
          </div>
          <div
            className="text-mono"
            style={{
              fontSize: '15px',
              fontWeight: 510,
              color: isAuthenticated ? 'var(--color-pulse-green)' : 'var(--color-fog)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '320px',
            }}
            title={wallet?.wallet_address || user?.wallet_address}
          >
            {isAuthenticated
              ? (wallet?.wallet_address || user?.wallet_address || 'Asignada')
              : 'DEMO-PREVIEW-WALLET'}
          </div>
          <div className="wallet-banner__sub">
            {isAuthenticated ? 'Billetera Privada Protegida' : 'Modo invitado • Inicia sesión para guardar'}
          </div>
        </div>

        <div>
          <div className="wallet-banner__title">Saldo Disponible</div>
          <div className="wallet-banner__balance" style={{ color: 'var(--color-paper)' }}>
            {formatFiat(fiatBalance)}
          </div>
          <div className="wallet-banner__sub">
            {fiatCurrency} Virtual para Simulación
          </div>
        </div>

        <div>
          <div className="wallet-banner__title">Valor Total Portafolio</div>
          <div className="wallet-banner__balance">
            {formatFiat(totalWalletValueUSD)}
          </div>
          <div className="wallet-banner__sub">
            Efectivo + {portfolioAssets.length} activos
          </div>
        </div>

        <div>
          <div className="wallet-banner__title">Rendimiento Cripto (P&L)</div>
          <div
            className={`wallet-banner__balance ${totalPnLUSD >= 0 ? 'text-positive' : 'text-negative'}`}
          >
            {totalPnLUSD >= 0 ? '+' : ''}{formatFiat(totalPnLUSD)}
          </div>
          <div className="wallet-banner__sub" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span className={`badge-tag ${totalPnLUSD >= 0 ? 'badge-tag--positive' : 'badge-tag--negative'}`}>
              {totalPnLPercent >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
            </span>
            <span>total</span>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación del Módulo Estilo Linear */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-graphite)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className={`chip-pill ${activeTab === 'positions' ? 'chip-pill--active' : ''}`}
            onClick={() => setActiveTab('positions')}
          >
            Mis Activos ({portfolioAssets.length})
          </button>
          <button
            className={`chip-pill ${activeTab === 'simulate' ? 'chip-pill--active' : ''}`}
            onClick={() => setActiveTab('simulate')}
          >
            Simulador de Compra / Venta
          </button>
          {isAuthenticated && (
            <button
              className={`chip-pill ${activeTab === 'history' ? 'chip-pill--active' : ''}`}
              onClick={() => { setActiveTab('history'); fetchOrderHistory(); }}
            >
              Libro de Órdenes ({orders.length})
            </button>
          )}
        </div>

        {activeTab === 'positions' && (
          <button
            className="btn-lime"
            onClick={() => setActiveTab('simulate')}
            style={{ fontSize: '12px', padding: '6px 14px' }}
          >
            <PlusIcon size={13} />
            <span>Nueva Simulación</span>
          </button>
        )}
      </div>

      {/* Pestaña 1: Posiciones / Activos en la Billetera */}
      {activeTab === 'positions' && (
        <div className="table-card">
          <div className="table-card__toolbar">
            <div>
              <span style={{ fontSize: '14px', fontWeight: 510, color: 'var(--color-paper)' }}>
                Distribución de Posiciones en Portafolio
              </span>
              <div style={{ fontSize: '12px', color: 'var(--color-fog)', marginTop: '2px' }}>
                {isAuthenticated
                  ? 'Posiciones activas con cálculo de rentabilidad P&L en tiempo real.'
                  : 'Modo demostración: Abre el simulador para realizar tus primeras operaciones.'}
              </div>
            </div>
          </div>

          {portfolioAssets.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--color-fog)' }}>
              <div style={{ fontSize: '16px', fontWeight: 510, color: 'var(--color-paper)', marginBottom: '8px' }}>
                Tu billetera no tiene posiciones activas
              </div>
              <p style={{ fontSize: '13px', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.6 }}>
                {isAuthenticated
                  ? `Tienes ${formatFiat(fiatBalance)} disponibles. Ejecuta una orden en el Simulador para adquirir tus primeras criptomonedas a precio de mercado en vivo.`
                  : 'Inicia sesión para operar con tu saldo virtual de $10,000 USD o haz simulaciones en vivo.'}
              </p>
              <button
                className="btn-lime"
                onClick={() => setActiveTab('simulate')}
              >
                Abrir Simulador de Inversión &rarr;
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table-linear">
                <thead>
                  <tr>
                    <th>Activo</th>
                    <th>Cantidad</th>
                    <th>Precio Compra Prom.</th>
                    <th>Precio Actual</th>
                    <th>Valor Total</th>
                    <th>Rendimiento (P&L)</th>
                    <th style={{ textAlign: 'right', paddingRight: '20px' }}>Acción</th>
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
                          <div className="coin-cell">
                            {coinMeta.image_url ? (
                              <img
                                className="coin-icon"
                                src={coinMeta.image_url}
                                alt={asset.symbol}
                              />
                            ) : (
                              <div className="coin-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--color-fog)' }}>
                                {asset.symbol?.slice(0, 2)}
                              </div>
                            )}
                            <div>
                              <div className="coin-name">{asset.coin_name || coinMeta.name || asset.symbol}</div>
                              <div className="coin-symbol">{asset.symbol}</div>
                            </div>
                          </div>
                        </td>

                        <td className="text-mono" style={{ color: 'var(--color-paper)', fontWeight: 510 }}>
                          {asset.quantity.toLocaleString(undefined, { maximumFractionDigits: 6 })} {asset.symbol}
                        </td>

                        <td className="text-mono" style={{ color: 'var(--color-mist)' }}>
                          ${asset.average_buy_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td className="text-mono" style={{ color: 'var(--color-paper)', fontWeight: 510 }}>
                          ${livePrice?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        <td className="text-mono" style={{ color: 'var(--color-paper)', fontWeight: 510 }}>
                          {formatFiat(asset.current_value_usd || (asset.quantity * livePrice))}
                        </td>

                        <td>
                          <span className={`badge-tag ${isPositive ? 'badge-tag--positive' : 'badge-tag--negative'}`}>
                            {isPositive ? '+' : ''}{(asset.pnl_percentage || 0).toFixed(2)}%
                            <span style={{ opacity: 0.8, marginLeft: '4px' }}>
                              ({isPositive ? '+' : ''}{formatFiat(asset.pnl_usd || 0)})
                            </span>
                          </span>
                        </td>

                        <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                          <button
                            className="btn-trade-sell"
                            style={{ padding: '4px 12px', fontSize: '12px' }}
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
            </div>
          )}
        </div>
      )}

      {/* Pestaña 2: Simulador Transaccional (Compra / Venta) */}
      {activeTab === 'simulate' && (
        <div className="table-card" style={{ maxWidth: '780px', margin: '0 auto', width: '100%' }}>
          <div className="table-card__toolbar">
            <div>
              <span style={{ fontSize: '15px', fontWeight: 510, color: 'var(--color-paper)' }}>
                Terminal de Simulación de Órdenes
              </span>
              <div style={{ fontSize: '12px', color: 'var(--color-fog)', marginTop: '2px' }}>
                Ejecuta compras y ventas a precios en tiempo real con actualización inmediata de saldos.
              </div>
            </div>

            <span
              className="text-mono"
              style={{
                fontSize: '12px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-pills)',
                background: 'var(--color-obsidian)',
                color: 'var(--color-paper)',
                border: '1px solid var(--color-graphite)',
              }}
            >
              Saldo Disp: {formatFiat(fiatBalance)}
            </span>
          </div>

          <form onSubmit={handleExecuteOrder} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Selector de Tipo de Operación (Compra vs Venta) con Estilo Linear */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setOrderSide('BUY')}
                className={orderSide === 'BUY' ? 'btn-trade-buy' : 'btn-ghost'}
                style={{
                  padding: '12px',
                  fontWeight: 510,
                  fontSize: '14px',
                  background: orderSide === 'BUY' ? 'var(--color-pulse-green)' : 'transparent',
                  color: orderSide === 'BUY' ? 'var(--color-void)' : 'var(--color-fog)',
                  borderColor: orderSide === 'BUY' ? 'var(--color-pulse-green)' : 'var(--color-graphite)',
                }}
              >
                Comprar Cripto (BUY)
              </button>

              <button
                type="button"
                onClick={() => setOrderSide('SELL')}
                className={orderSide === 'SELL' ? 'btn-trade-sell' : 'btn-ghost'}
                style={{
                  padding: '12px',
                  fontWeight: 510,
                  fontSize: '14px',
                  background: orderSide === 'SELL' ? 'var(--color-coral-red)' : 'transparent',
                  color: orderSide === 'SELL' ? 'var(--color-paper)' : 'var(--color-fog)',
                  borderColor: orderSide === 'SELL' ? 'var(--color-coral-red)' : 'var(--color-graphite)',
                }}
              >
                Vender Cripto (SELL)
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="simulate-input-group">
                <label className="simulate-label">Seleccionar Activo Cripto</label>
                <select
                  className="simulate-input"
                  value={selectedCoin}
                  onChange={(e) => setSelectedCoin(e.target.value.toUpperCase())}
                  style={{ cursor: 'pointer', background: 'var(--color-obsidian)' }}
                >
                  {cryptos.map(c => (
                    <option key={c.symbol} value={c.symbol}>
                      {c.name} ({c.symbol}) &bull; ${c.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="simulate-input-group">
                <label className="simulate-label">Cantidad a Operar</label>
                <input
                  type="number"
                  step="any"
                  min="0.000001"
                  className="simulate-input"
                  value={orderQuantity}
                  onChange={(e) => setOrderQuantity(e.target.value)}
                  placeholder="ej: 0.25"
                  required
                />
              </div>
            </div>

            {/* Recibo Estimado de la Orden (Precision Slip) */}
            <div
              style={{
                background: 'var(--color-obsidian)',
                border: '1px solid var(--color-graphite)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-fog)' }}>Precio en Vivo ({selectedCoin}):</span>
                <span className="text-mono" style={{ color: 'var(--color-paper)', fontWeight: 510 }}>
                  ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-fog)' }}>Cantidad solicitada:</span>
                <span className="text-mono" style={{ color: 'var(--color-paper)', fontWeight: 510 }}>
                  {parsedQty} {selectedCoin}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--color-graphite)',
                  fontSize: '15px',
                  fontWeight: 510,
                  alignItems: 'center',
                }}
              >
                <span style={{ color: 'var(--color-mist)' }}>
                  {orderSide === 'BUY' ? 'Costo Total Estimado:' : 'Ingreso Estimado:'}
                </span>
                <span
                  className="text-mono"
                  style={{
                    fontSize: '17px',
                    color: orderSide === 'BUY' ? 'var(--color-paper)' : 'var(--color-pulse-green)',
                    fontWeight: 510,
                  }}
                >
                  {formatFiat(estimatedOrderCostUSD)}
                </span>
              </div>
            </div>

            {/* Feedback Alerts */}
            {orderFeedback && (
              <div
                style={{
                  background: orderFeedback.type === 'success' ? 'var(--color-pulse-green-bg)' : 'var(--color-coral-red-bg)',
                  border: `1px solid ${orderFeedback.type === 'success' ? 'var(--color-pulse-green-border)' : 'var(--color-coral-red-border)'}`,
                  color: orderFeedback.type === 'success' ? 'var(--color-pulse-green)' : 'var(--color-coral-red)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                }}
              >
                {orderFeedback.type === 'success' ? <CheckCircleIcon size={16} /> : <AlertCircleIcon size={16} />}
                <span>{orderFeedback.message}</span>
              </div>
            )}

            {/* Botón de Ejecución de la Orden */}
            <button
              type="submit"
              disabled={orderSubmitting || parsedQty <= 0}
              className={orderSide === 'BUY' ? 'btn-lime' : 'btn-trade-sell'}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                cursor: orderSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {orderSubmitting
                ? 'Procesando Transacción...'
                : isAuthenticated
                ? (orderSide === 'BUY' ? `Confirmar Compra de ${parsedQty} ${selectedCoin}` : `Confirmar Venta de ${parsedQty} ${selectedCoin}`)
                : 'Iniciar Sesión para Confirmar Orden'}
            </button>
          </form>
        </div>
      )}

      {/* Pestaña 3: Historial Transaccional ACID */}
      {activeTab === 'history' && isAuthenticated && (
        <div className="table-card">
          <div className="table-card__toolbar">
            <div>
              <span style={{ fontSize: '15px', fontWeight: 510, color: 'var(--color-paper)' }}>
                Historial Completo de Órdenes
              </span>
              <div style={{ fontSize: '12px', color: 'var(--color-fog)', marginTop: '2px' }}>
                Registro cronológico de todas las operaciones ejecutadas en tu billetera.
              </div>
            </div>

            <button
              className="btn-ghost"
              onClick={fetchOrderHistory}
              disabled={ordersLoading}
              style={{ fontSize: '12px', padding: '5px 12px' }}
            >
              <RefreshIcon size={13} className={ordersLoading ? 'loading-spin' : ''} />
              <span>Refrescar</span>
            </button>
          </div>

          {orders.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--color-fog)' }}>
              <div style={{ fontSize: '15px', fontWeight: 510, color: 'var(--color-paper)', marginBottom: '6px' }}>
                No hay órdenes registradas
              </div>
              <div style={{ fontSize: '13px' }}>
                Tus compras y ventas simuladas aparecerán aquí con su recibo de ejecución y sello temporal.
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table-linear">
                <thead>
                  <tr>
                    <th>ID Orden</th>
                    <th>Fecha / Hora</th>
                    <th>Operación</th>
                    <th>Activo</th>
                    <th>Cantidad</th>
                    <th>Precio Ejecución</th>
                    <th>Total Fiat</th>
                    <th style={{ textAlign: 'right', paddingRight: '20px' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((ord) => (
                    <tr key={ord.id}>
                      <td className="text-mono" style={{ color: 'var(--color-ash)', fontSize: '12px' }}>
                        #{ord.id}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--color-fog)' }}>
                        {new Date(ord.executed_at).toLocaleString('es-CO')}
                      </td>
                      <td>
                        <span
                          className={`badge-tag ${ord.order_type === 'BUY' ? 'badge-tag--positive' : 'badge-tag--negative'}`}
                        >
                          {ord.order_type}
                        </span>
                      </td>
                      <td style={{ fontWeight: 510, color: 'var(--color-paper)' }}>{ord.symbol}</td>
                      <td className="text-mono">{ord.quantity}</td>
                      <td className="text-mono" style={{ color: 'var(--color-paper)', fontWeight: 510 }}>
                        ${ord.execution_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="text-mono" style={{ fontWeight: 510, color: 'var(--color-paper)' }}>
                        {formatFiat(ord.total_fiat)}
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <span className="badge-tag badge-tag--neutral">
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

