import React, { useState, useEffect, useCallback } from 'react';
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

  const [cryptos, setCryptos] = useState([]);
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [cryptoError, setCryptoError] = useState(null);
  const [cryptoLastUpdated, setCryptoLastUpdated] = useState(null);

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

  const marketMetrics = React.useMemo(() => {
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
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currency={currency}
        onCurrencyChange={setCurrency}
        onOpenStatus={() => setStatusModalOpen(true)}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      <TickerBar
        cryptos={cryptos}
        onSelectCoin={() => setActiveTab('markets')}
      />

      {activeTab === 'markets' && (
        <>
          {marketMetrics && (
            <div className="hero__stats" style={{ marginTop: '20px', marginBottom: '24px' }}>
              <div className="stat-card">
                <div className="stat-card__label">Activo Lider del Mercado</div>
                <div className="stat-card__value">
                  {marketMetrics.topCoin.name}
                </div>
                <div className="stat-card__change stat-card__change--positive" style={{ fontFamily: 'var(--font-mono)' }}>
                  ${marketMetrics.topCoin.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card__label">Capitalizacion Global Monitoreada</div>
                <div className="stat-card__value">
                  {formatLarge(marketMetrics.totalMarketCap)}
                </div>
                <div className="stat-card__change" style={{ color: 'var(--text-muted)' }}>
                  Volumen 24h: {formatLarge(marketMetrics.totalVolume)}
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-card__label">Mayor Rendimiento (24h)</div>
                <div className="stat-card__value" style={{ color: 'var(--accent-cyan)' }}>
                  {marketMetrics.topGainer ? marketMetrics.topGainer.symbol : '--'}
                </div>
                {marketMetrics.topGainer && (
                  <div className="stat-card__change stat-card__change--positive">
                    <TrendingUpIcon size={14} />
                    <span>+{marketMetrics.topGainer.price_change_percentage_24h?.toFixed(2)}%</span>
                  </div>
                )}
              </div>

              <div className="stat-card">
                <div className="stat-card__label">Sentimiento del Mercado (24h)</div>
                <div className="stat-card__value">
                  {marketMetrics.avgChange >= 0 ? 'Alcista (+)' : 'Bajista (-)'}
                </div>
                <div className={`stat-card__change ${marketMetrics.avgChange >= 0 ? 'stat-card__change--positive' : 'stat-card__change--negative'}`}>
                  {marketMetrics.avgChange >= 0 ? <TrendingUpIcon size={14} /> : <TrendingDownIcon size={14} />}
                  <span>{marketMetrics.avgChange >= 0 ? '+' : ''}{marketMetrics.avgChange.toFixed(2)}% prom.</span>
                </div>
              </div>
            </div>
          )}

          <CryptoMarket
            cryptos={cryptos}
            loading={cryptoLoading}
            error={cryptoError}
            lastUpdated={cryptoLastUpdated}
            onRefresh={fetchCryptos}
          />
        </>
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

      {activeTab === 'portfolio' && (
        <PortfolioWatchlist
          cryptos={cryptos}
          fiatCurrency={currency}
          fiatRate={currency === 'COP' ? (forexMap.COP || 4120) : currency === 'EUR' ? (forexMap.EUR || 0.92) : 1}
          onOpenAuth={() => setAuthModalOpen(true)}
        />
      )}

      {activeTab === 'roi' && (
        <RoiCalculator
          cryptos={cryptos}
          fiatCurrency={currency}
          fiatRate={currency === 'COP' ? (forexMap.COP || 4120) : currency === 'EUR' ? (forexMap.EUR || 0.92) : 1}
        />
      )}

      <SystemStatusModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />

      <footer className="footer">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            CryptoPulse - Plataforma de Inteligencia Financiera
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Cotizaciones consolidadas en tiempo real. Persistencia transaccional y arquitectura de alta disponibilidad.
          </div>
        </div>

        <div className="footer__links">
          <button
            className="footer__status-indicator"
            onClick={() => setStatusModalOpen(true)}
          >
            <span className="navbar__status-dot navbar__status-dot--online"></span>
            <span>Infraestructura 100% Operativa</span>
          </button>
          <span style={{ color: 'var(--border-accent)' }}>|</span>
          <a
            className="footer__link"
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Especificacion OpenAPI
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
