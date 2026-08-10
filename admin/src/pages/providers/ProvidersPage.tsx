import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Plug, CheckCircle2, XCircle, AlertCircle, ChevronRight,
  RefreshCw, Wifi, WifiOff, DollarSign, Activity,
  Zap, Globe, Clock, TrendingUp, Shield, ArrowRight,
} from 'lucide-react';
import { fetchSmileOneStatus, SmileOneStatus } from '../../services/providerService';

const USD_TO_INR = 83.5;

interface ProviderCard {
  id: string;
  name: string;
  logo: string;
  tagline: string;
  description: string;
  path: string;
  color: string;
  gradient: string;
  features: string[];
  regions: string[];
}

const PROVIDERS: ProviderCard[] = [
  {
    id: 'smile_one',
    name: 'Smile.One',
    logo: 'S1',
    tagline: 'Live Connected',
    description: 'Top-up provider for Mobile Legends, Free Fire, PUBG and more.',
    path: '/providers/smile-one',
    color: 'from-blue-500 to-indigo-600',
    gradient: 'from-blue-50 to-indigo-50',
    features: ['Live SKU Sync', 'Auto Pricing', 'Multi-Region'],
    regions: ['PH', 'ID', 'MY', 'SG', 'BR'],
  },
  {
    id: 'codashop',
    name: 'Codashop',
    logo: 'CS',
    tagline: 'Coming Soon',
    description: 'Regional top-up platform for Southeast Asia.',
    path: '',
    color: 'from-orange-400 to-red-500',
    gradient: 'from-orange-50 to-red-50',
    features: ['Direct Integration', 'Fast Delivery', 'Multi-Game'],
    regions: ['ID', 'PH', 'MY'],
  },
  {
    id: 'unipin',
    name: 'UniPin',
    logo: 'UP',
    tagline: 'Coming Soon',
    description: 'Universal game voucher and wallet provider.',
    path: '',
    color: 'from-purple-500 to-pink-600',
    gradient: 'from-purple-50 to-pink-50',
    features: ['Voucher Store', 'Wallet System', '100+ Games'],
    regions: ['Global'],
  },
];

// Animated pulsing dot
const LiveDot: React.FC<{ active: boolean }> = ({ active }) => (
  <span className="relative inline-flex h-2.5 w-2.5">
    {active && (
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
    )}
    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${active ? 'bg-emerald-500' : 'bg-gray-300'}`} />
  </span>
);

const StatusBadge: React.FC<{ status: 'connected' | 'error' | 'unconfigured' | 'loading' }> = ({ status }) => {
  const map = {
    connected:    { icon: CheckCircle2, text: 'Connected',       cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: true },
    error:        { icon: XCircle,      text: 'Error',           cls: 'text-red-600 bg-red-50 border-red-200',             dot: false },
    unconfigured: { icon: AlertCircle,  text: 'Not configured',  cls: 'text-gray-500 bg-gray-100 border-gray-200',         dot: false },
    loading:      { icon: RefreshCw,    text: 'Checking…',       cls: 'text-blue-600 bg-blue-50 border-blue-200',          dot: false },
  };
  const { icon: Icon, text, cls, dot } = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      {dot ? <LiveDot active /> : <Icon className={`w-3.5 h-3.5 ${status === 'loading' ? 'animate-spin' : ''}`} />}
      {text}
    </span>
  );
};

// Animated number counter
const AnimatedBalance: React.FC<{ usd: number }> = ({ usd }) => {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const steps = 40;
    const increment = usd / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= usd) { setDisplayed(usd); clearInterval(timer); }
      else setDisplayed(current);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [usd]);
  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline gap-1">
        <span className="text-xs text-gray-400">$</span>
        <span className="text-lg font-bold text-gray-900">{displayed.toFixed(2)}</span>
        <span className="text-xs text-gray-400">USD</span>
      </div>
      <div className="text-xs text-gray-400">
        ≈ ₹{(displayed * USD_TO_INR).toFixed(0)} INR
      </div>
    </div>
  );
};

const ProvidersPage: React.FC = () => {
  const navigate = useNavigate();
  const [smileStatus, setSmileStatus] = useState<SmileOneStatus | null>(null);
  const [smileLoading, setSmileLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const loadSmileStatus = async () => {
    setSmileLoading(true);
    try {
      const s = await fetchSmileOneStatus();
      setSmileStatus(s);
      setLastChecked(new Date());
    } catch {
      setSmileStatus({ configured: false, connected: false, message: 'Could not reach server' });
    } finally {
      setSmileLoading(false);
    }
  };

  useEffect(() => { loadSmileStatus(); }, []);

  const getSmileStatus = (): 'connected' | 'error' | 'unconfigured' | 'loading' => {
    if (smileLoading) return 'loading';
    if (!smileStatus?.configured) return 'unconfigured';
    if (smileStatus.connected) return 'connected';
    return 'error';
  };

  const smileConnected = getSmileStatus() === 'connected';

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <Plug className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Provider Hub</h1>
            </div>
            <p className="text-gray-500 ml-9">Connect API providers, browse live catalogs, sync to your game pages.</p>
          </div>
          <button
            onClick={loadSmileStatus}
            disabled={smileLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${smileLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Summary strip */}
        <div className="mt-5 flex flex-wrap gap-4">
          {[
            { icon: Wifi, label: 'Active APIs', value: smileConnected ? '1 of 3' : '0 of 3', color: smileConnected ? 'text-emerald-600' : 'text-gray-400' },
            { icon: DollarSign, label: 'Balance', value: smileStatus?.usd_balance != null ? `$${smileStatus.usd_balance.toFixed(2)}` : '—', color: 'text-primary-600' },
            { icon: Globe, label: 'Regions', value: '5 Supported', color: 'text-purple-600' },
            { icon: Clock, label: 'Last Sync', value: lastChecked ? lastChecked.toLocaleTimeString() : 'Never', color: 'text-gray-500' },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 shadow-sm">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <div>
                  <p className="text-xs text-gray-400 leading-none">{stat.label}</p>
                  <p className={`text-sm font-semibold leading-snug ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {PROVIDERS.map((provider, i) => {
          const isSmile = provider.id === 'smile_one';
          const status = isSmile ? getSmileStatus() : 'unconfigured';
          const clickable = !!provider.path;
          const isHovered = hoveredCard === provider.id;

          return (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 200, damping: 20 }}
              onHoverStart={() => clickable && setHoveredCard(provider.id)}
              onHoverEnd={() => setHoveredCard(null)}
              onClick={() => clickable && navigate(provider.path)}
              className={`relative bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${
                clickable
                  ? 'cursor-pointer hover:shadow-xl hover:border-primary-300 hover:-translate-y-0.5'
                  : 'opacity-70'
              } ${isSmile && smileConnected ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-gray-200'} shadow-sm`}
            >
              {/* Gradient top accent */}
              <div className={`h-1 w-full bg-gradient-to-r ${provider.color}`} />

              {/* Subtle background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${provider.gradient} opacity-0 transition-opacity duration-300 ${isHovered ? 'opacity-40' : ''}`} />

              <div className="relative p-5">
                {/* Header row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <motion.div
                      animate={isHovered ? { scale: 1.08, rotate: 3 } : { scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 300 }}
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center text-white font-bold text-sm shadow-md`}
                    >
                      {provider.logo}
                    </motion.div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">{provider.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{provider.tagline}</p>
                    </div>
                  </div>
                  <StatusBadge status={status} />
                </div>

                {/* Balance display for Smile.One */}
                {isSmile && smileStatus?.usd_balance != null && smileStatus.connected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-4 bg-gradient-to-r from-primary-50 to-indigo-50 rounded-xl p-3 border border-primary-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-white rounded-lg shadow-sm flex items-center justify-center">
                          <DollarSign className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">API Balance</p>
                          <AnimatedBalance usd={smileStatus.usd_balance} />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Status</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Activity className="w-3 h-3 text-emerald-500" />
                          <span className="text-xs font-semibold text-emerald-600">Healthy</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Error message */}
                {isSmile && smileStatus && !smileStatus.connected && smileStatus.message && (
                  <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                    <WifiOff className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-600">{smileStatus.message}</p>
                  </div>
                )}

                {/* Description */}
                <p className="text-sm text-gray-500 mb-4 leading-relaxed">{provider.description}</p>

                {/* Feature chips */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {provider.features.map((f) => (
                    <span key={f} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      <Zap className="w-3 h-3" />
                      {f}
                    </span>
                  ))}
                </div>

                {/* Region pills */}
                <div className="flex items-center gap-1.5 mb-4">
                  <Globe className="w-3.5 h-3.5 text-gray-300" />
                  {provider.regions.map((r) => (
                    <span key={r} className="text-xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded font-mono font-semibold">
                      {r}
                    </span>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  {clickable ? (
                    <motion.button
                      animate={isHovered ? { x: 2 } : { x: 0 }}
                      className="flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-800"
                    >
                      Open Provider
                      <motion.span animate={isHovered ? { x: 3 } : { x: 0 }}>
                        <ArrowRight className="w-4 h-4" />
                      </motion.span>
                    </motion.button>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Integration coming soon</span>
                  )}

                  {isSmile && (
                    <button
                      onClick={(e) => { e.stopPropagation(); loadSmileStatus(); }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                      title="Re-check connection"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${smileLoading ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* How Providers Work */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-gradient-to-r from-primary-600 to-indigo-700 rounded-2xl p-6 text-white overflow-hidden relative"
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-20 w-40 h-40 bg-white/5 rounded-full translate-y-1/2" />

        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-lg">How Providers Work</h3>
            </div>
            <p className="text-primary-100 text-sm leading-relaxed">
              Connect a provider to browse its live product catalog by region. Pick a game, set your selling prices with markup,
              then push directly to any game page — all SKUs, IDs and pricing sync automatically.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            {[
              { icon: Plug, step: '1', label: 'Connect API' },
              { icon: TrendingUp, step: '2', label: 'Set Prices' },
              { icon: ChevronRight, step: '3', label: 'Push to Game' },
            ].map(({ icon: Icon, step, label }) => (
              <div key={step} className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2">
                <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-xs font-bold">{step}</span>
                <Icon className="w-4 h-4 text-primary-200" />
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProvidersPage;
