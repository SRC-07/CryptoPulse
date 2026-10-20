import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import TickerBar from './components/TickerBar';
import CryptoMarket from './components/CryptoMarket';
import CurrencyConverter from './components/CurrencyConverter';
import ForexRates from './components/ForexRates';
import PortfolioWatchlist from './components/PortfolioWatchlist';
import RoiCalculator from './components/RoiCalculator';
import SystemStatusModal from './components/SystemStatusModal';
import AuthModal from './components/AuthModal';
import { TrendingUpIcon, TrendingDownIcon } from './components/Icons';

const API_BASE = '/api';

function MainLayout() {
  const [activeTab, setActiveTab] = useState('markets');
  const [currency, setCurrency] = useState('USD');
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedTradingCoin, setSelectedTradingCoin] = useState('BTC');

  // Datos de Criptomonedas (Market Service)
  const [cryptos, setCryptos] = useState([]);
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [cryptoError, setCryptoError] = useState(null);
  const [cryptoLastUpdated, setCryptoLastUpdated] = useState(null);

  // Datos Forex (Market Service)
  const [forexRates, setForexRates] = useState([]);
  const [forexMap, setForexMap] = useState({});
  const [forexBase, setForexBase] = useState('USD');
  const [forexLoading, setForexLoading] = useState(false);
  const [forexError, setForexError] = useState(null);
  const [forexLastUpdated, setForexLastUpdated] = useState(null);

  const fetchCryptos = useCallback(async () => {
    setCryptoLoading(true);
    setCryptoError(null);
    try {
      const res = await fetch(`${API_BASE}/crypto/prices?vs_currency=usd&per_page=15`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      const list = data.data || [];
      setCryptos(list);
      setCryptoLastUpdated(new Date().toLocaleTimeString('es-CO'));
    } catch (err) {
      setCryptoError(err.message);
    }
    setCryptoLoading(false);
  }, []);

  const fetchForex = useCallback(async (base = forexBase) => {
    setForexLoading(true);
    setForexError(null);
    try {
      const res = await fetch(`${API_BASE}/forex/rates?base=${base}&targets=COP,EUR,GBP,JPY,BRL,MXN,CAD,AUD`);
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      const list = data.data || [];
      setForexRates(list);
      setForexMap(data.rates || {});
      setForexLastUpdated(new Date().toLocaleTimeString('es-CO'));
    } catch (err) {
      setForexError(err.message);
    }
    setForexLoading(false);
  }, [forexBase]);

  useEffect(() => {
    fetchCryptos();
    fetchForex('USD');
  }, [fetchCryptos, fetchForex]);

  const handleForexCurrencyChange = (newBase) => {
    setForexBase(newBase);
    fetchForex(newBase);
  };

  // Métricas del Mercado Calculadas
  const marketMetrics = useMemo(() => {
    if (!cryptos || cryptos.length === 0) return null;
    const topCoin = cryptos[0];
    const totalMarketCap = cryptos.reduce((sum, c) => sum + (c.market_cap || 0), 0);
    const totalVolume = cryptos.reduce((sum, c) => sum + (c.total_volume || 0), 0);
    const avgChange = cryptos.reduce((sum, c) => sum + (c.price_change_percentage_24h || 0), 0) / cryptos.length;

    const sortedByChange = [...cryptos].sort((a, b) =>
      (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0)
    );
    const topGainer = sortedByChange[0];

    return {
      topCoin,
      totalMarketCap,
      totalVolume,
      avgChange,
      topGainer,
    };
  }, [cryptos]);

  const formatLarge = (num) => {
    if (!num) return '--';
    if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  return (
    <div className="app">
      {/* Barra de Navegación Superior */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currency={currency}
        onCurrencyChange={setCurrency}
        onOpenStatus={() => setStatusModalOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Cinta Ticker en Tiempo Real */}
      <TickerBar
        cryptos={cryptos}
        onSelectCoin={() => setActiveTab('markets')}
      />

      {/* Hero Section Estilo Linear */}
      <section className="hero-linear">
        <div
          className="hero__announcement"
          onClick={() => setActiveTab('portfolio')}
        >
          <span className="hero__announcement-tag">Entrega 2</span>
          <span>Billeteras Privadas 1:1 con $10,000 USD de saldo simulado en PostgreSQL 16 &rarr;</span>
        </div>

        <h1 className="hero__title">
          La plataforma de inteligencia financiera y trading simulado
        </h1>

        <p className="hero__subtitle">
          Cotizaciones consolidadas en tiempo real, persistencia políglota de alta velocidad con MongoDB y PostgreSQL, resiliencia con Circuit Breaker en Redis y balanceo perimetral L7.
        </p>

        <div className="hero__cta-group">
          <button
            className="btn-lime"
            onClick={() => setActiveTab('portfolio')}
          >
            Operar en Mi Cartera
          </button>
          <button
            className="btn-ghost"
            onClick={() => setStatusModalOpen(true)}
          >
            Ver Diagnóstico del Clúster
          </button>
        </div>

        {/* Tarjetas de Métricas Resumen */}
        {marketMetrics && (
          <div className="metrics-grid">
            <div className="metric-card">
              <span className="metric-card__label">Activo Líder</span>
              <div className="metric-card__value">
                {marketMetrics.topCoin.name}
              </div>
              <div className="metric-card__sub text-mono text-positive">
                ${marketMetrics.topCoin.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="metric-card">
              <span className="metric-card__label">Cap. Global Monitoreada</span>
              <div className="metric-card__value text-mono">
                {formatLarge(marketMetrics.totalMarketCap)}
              </div>
              <div className="metric-card__sub">
                Volumen 24h: {formatLarge(marketMetrics.totalVolume)}
              </div>
            </div>

            <div className="metric-card">
              <span className="metric-card__label">Mayor Rendimiento (24h)</span>
              <div className="metric-card__value" style={{ color: 'var(--color-signal-teal)' }}>
                {marketMetrics.topGainer ? marketMetrics.topGainer.symbol : '--'}
              </div>
              {marketMetrics.topGainer && (
                <div className="metric-card__sub text-mono text-positive">
                  <TrendingUpIcon size={13} />
                  <span>+{marketMetrics.topGainer.price_change_percentage_24h?.toFixed(2)}%</span>
                </div>
              )}
            </div>

            <div className="metric-card">
              <span className="metric-card__label">Sentimiento del Mercado</span>
              <div className="metric-card__value">
                {marketMetrics.avgChange >= 0 ? 'Alcista (+)' : 'Bajista (-)'}
              </div>
              <div className={`metric-card__sub text-mono ${marketMetrics.avgChange >= 0 ? 'text-positive' : 'text-negative'}`}>
                {marketMetrics.avgChange >= 0 ? <TrendingUpIcon size={13} /> : <TrendingDownIcon size={13} />}
                <span>{marketMetrics.avgChange >= 0 ? '+' : ''}{marketMetrics.avgChange.toFixed(2)}% prom.</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Vistas Principales */}
      <main>
        {activeTab === 'markets' && (
          <CryptoMarket
            cryptos={cryptos}
            loading={cryptoLoading}
            error={cryptoError}
            lastUpdated={cryptoLastUpdated}
            onRefresh={fetchCryptos}
            onOpenSimulate={(sym) => {
              if (sym) setSelectedTradingCoin(sym);
              setActiveTab('portfolio');
            }}
          />
        )}

        {activeTab === 'portfolio' && (
          <PortfolioWatchlist
            cryptos={cryptos}
            fiatCurrency={currency}
            fiatRate={currency === 'COP' ? (forexMap.COP || 4120) : currency === 'EUR' ? (forexMap.EUR || 0.92) : 1}
            onOpenAuth={() => setAuthModalOpen(true)}
            initialCoin={selectedTradingCoin}
          />
        )}

        {activeTab === 'converter' && (
          <CurrencyConverter
            cryptos={cryptos}
            forexRates={forexMap}
            forexBase={forexBase}
          />
        )}

        {activeTab === 'forex' && (
          <ForexRates
            rates={forexRates}
            baseCurrency={forexBase}
            onCurrencyChange={handleForexCurrencyChange}
            loading={forexLoading}
            error={forexError}
            lastUpdated={forexLastUpdated}
            onRefresh={() => fetchForex(forexBase)}
          />
        )}

        {activeTab === 'roi' && (
          <RoiCalculator
            cryptos={cryptos}
            fiatCurrency={currency}
            fiatRate={currency === 'COP' ? (forexMap.COP || 4120) : currency === 'EUR' ? (forexMap.EUR || 0.92) : 1}
          />
        )}
      </main>

      {/* Modales Globales */}
      <SystemStatusModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      {/* Footer Estilo Linear */}
      <footer className="footer-linear">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontWeight: 510, color: 'var(--color-paper)' }}>
            CryptoPulse &bull; Terminal de Inteligencia Financiera
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-ash)' }}>
            Persistencia políglota (PostgreSQL 16, MongoDB 7, Redis 7). Billeteras 1:1 aisladas y clúster L7 con least_conn.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => setStatusModalOpen(true)}
            className="navbar__status-pill"
            style={{ fontSize: '11px', padding: '3px 9px' }}
          >
            <span className="navbar__status-dot"></span>
            <span>Clúster 100% Operativo</span>
          </button>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: '12px' }}
          >
            OpenAPI Docs &rarr;
          </a>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
