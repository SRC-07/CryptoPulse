import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import TickerBar from './components/TickerBar';
import CryptoMarket from './components/CryptoMarket';
import CurrencyConverter from './components/CurrencyConverter';
import ForexRates from './components/ForexRates';
import PortfolioWatchlist from './components/PortfolioWatchlist';
import RoiCalculator from './components/RoiCalculator';
import UserProfile from './components/UserProfile';
import AuthModal from './components/AuthModal';
import { TrendingUpIcon, TrendingDownIcon } from './components/Icons';

const API_BASE = '/api';
const VALID_TABS = ['markets', 'portfolio', 'converter', 'forex', 'roi', 'profile'];

const getSavedTab = () => {
  try {
    const hash = window.location.hash.replace('#', '').trim();
    if (VALID_TABS.includes(hash)) {
      return hash;
    }
    const saved = localStorage.getItem('cryptopulse_active_tab');
    if (saved && VALID_TABS.includes(saved)) {
      return saved;
    }
  } catch (e) {
    // fallback
  }
  return 'markets';
};

function MainLayout() {
  const [activeTab, setActiveTabState] = useState(getSavedTab);
  const [currency, setCurrencyState] = useState(() => {
    try {
      return localStorage.getItem('cryptopulse_fiat_currency') || 'USD';
    } catch (e) {
      return 'USD';
    }
  });

  const setActiveTab = useCallback((tab) => {
    if (!VALID_TABS.includes(tab)) return;
    setActiveTabState(tab);
    try {
      localStorage.setItem('cryptopulse_active_tab', tab);
      if (window.location.hash !== `#${tab}`) {
        window.location.hash = tab;
      }
    } catch (e) {
      // fallback
    }
  }, []);

  const setCurrency = (c) => {
    setCurrencyState(c);
    try {
      localStorage.setItem('cryptopulse_fiat_currency', c);
    } catch (e) {}
  };

  useEffect(() => {
    if (!window.location.hash || !VALID_TABS.includes(window.location.hash.replace('#', ''))) {
      window.location.hash = activeTab;
    }

    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (VALID_TABS.includes(hash)) {
        setActiveTabState(hash);
        try {
          localStorage.setItem('cryptopulse_active_tab', hash);
        } catch (e) {}
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

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

  // Consultar catálogo amplio de criptomonedas (Top 50)
  const fetchCryptos = useCallback(async () => {
    setCryptoLoading(true);
    setCryptoError(null);
    try {
      const res = await fetch(`${API_BASE}/crypto/prices?vs_currency=usd&per_page=50`);
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

  // Tasa de cambio respecto a la moneda seleccionada (USD, COP, EUR)
  const currentFiatRate = useMemo(() => {
    if (currency === 'COP') return forexMap.COP || 4120;
    if (currency === 'EUR') return forexMap.EUR || 0.92;
    return 1;
  }, [currency, forexMap]);

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

  const formatMetricPrice = (usdPrice) => {
    if (!usdPrice && usdPrice !== 0) return '--';
    const converted = usdPrice * currentFiatRate;
    if (currency === 'COP') {
      return `$${converted.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} COP`;
    }
    if (currency === 'EUR') {
      return `€${converted.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;
    }
    return `$${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`;
  };

  const formatLarge = (numUSD) => {
    if (!numUSD) return '--';
    const converted = numUSD * currentFiatRate;
    const symbol = currency === 'EUR' ? '€' : '$';
    const suffix = currency === 'COP' ? ' COP' : '';

    if (converted >= 1e12) return `${symbol}${(converted / 1e12).toFixed(2)}T${suffix}`;
    if (converted >= 1e9) return `${symbol}${(converted / 1e9).toFixed(2)}B${suffix}`;
    if (converted >= 1e6) return `${symbol}${(converted / 1e6).toFixed(2)}M${suffix}`;
    return `${symbol}${converted.toLocaleString()}${suffix}`;
  };

  return (
    <div className="app">
      {/* Barra de Navegación Superior */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currency={currency}
        onCurrencyChange={setCurrency}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      {/* Cinta Ticker en Tiempo Real con Marquee Continuo y Conversión */}
      <TickerBar
        cryptos={cryptos}
        fiatCurrency={currency}
        fiatRate={currentFiatRate}
        onSelectCoin={() => setActiveTab('markets')}
      />

      {/* Vistas Principales */}
      <main>
        {activeTab === 'markets' && (
          <>
            {/* Hero Section Estilo Linear (Exclusivo de la Pestaña Mercados) */}
            <section className="hero-linear">
              <h1 className="hero__title">
                La plataforma de inteligencia financiera y trading simulado
              </h1>

              <p className="hero__subtitle">
                Plataforma institucional de inteligencia de mercados, cotizaciones en tiempo real y ejecución simulada de órdenes sin riesgo financiero.
              </p>

              <div className="hero__cta-group">
                <button
                  className="btn-lime"
                  onClick={() => setActiveTab('portfolio')}
                >
                  Operar en Mi Cartera &rarr;
                </button>
              </div>

              {/* Tarjetas de Métricas Resumen Dinámicas */}
              {marketMetrics && (
                <div className="metrics-grid">
                  <div className="metric-card">
                    <span className="metric-card__label">Activo Líder</span>
                    <div className="metric-card__value">
                      {marketMetrics.topCoin.name}
                    </div>
                    <div className="metric-card__sub text-mono text-positive">
                      {formatMetricPrice(marketMetrics.topCoin.current_price)}
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

            <CryptoMarket
              cryptos={cryptos}
              loading={cryptoLoading}
              error={cryptoError}
              lastUpdated={cryptoLastUpdated}
              fiatCurrency={currency}
              fiatRate={currentFiatRate}
              onRefresh={fetchCryptos}
              onOpenSimulate={(sym) => {
                if (sym) setSelectedTradingCoin(sym);
                setActiveTab('portfolio');
              }}
            />
          </>
        )}

        {activeTab === 'portfolio' && (
          <PortfolioWatchlist
            cryptos={cryptos}
            fiatCurrency={currency}
            fiatRate={currentFiatRate}
            onOpenAuth={() => setAuthModalOpen(true)}
            initialCoin={selectedTradingCoin}
          />
        )}

        {activeTab === 'profile' && (
          <UserProfile
            fiatCurrency={currency}
            fiatRate={currentFiatRate}
            onNavigateTab={setActiveTab}
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
            fiatRate={currentFiatRate}
          />
        )}
      </main>

      {/* Modal de Autenticación */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
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
