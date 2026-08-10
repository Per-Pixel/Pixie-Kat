import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Search, PackageOpen, ChevronRight,
  Wifi, WifiOff, Coins, Download, AlertCircle, CheckCircle2,
  Terminal, Info,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  smilecoin, extractSmSkus,
  SM_CATALOG, SmGameCatalogEntry, SmSku, SmHealthResponse, SmPointsResponse,
} from '../../services/smilecoinService';
import {
  listGames, createGame, replaceProducts, replaceGameFields, Game,
} from '../../services/catalogService';

// ── Helpers ──────────────────────────────────────────────────────────────────

function skuPrice(sku: SmSku): number {
  return parseFloat(String(sku.price)) || 0;
}

// ── Status Banner ─────────────────────────────────────────────────────────────

interface StatusProps {
  health: SmHealthResponse | null;
  points: SmPointsResponse | null;
  loading: boolean;
  onRefresh: () => void;
}

const StatusBanner: React.FC<StatusProps> = ({ health, points, loading, onRefresh }) => {
  const online = health?.ok === true;
  const smilePoints =
    health ? (points?.smile_points ?? points?.points ?? points?.balance ?? '—') : '—';

  return (
    <div className={`rounded-xl border p-4 flex flex-wrap items-center gap-4 ${online ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center gap-2">
        {online
          ? <Wifi className="w-4 h-4 text-green-600" />
          : <WifiOff className="w-4 h-4 text-red-500" />}
        <span className={`text-sm font-semibold ${online ? 'text-green-700' : 'text-red-600'}`}>
          Gateway {online ? 'Online' : 'Offline'}
        </span>
        {health && <span className="text-xs text-gray-400 font-mono">localhost:3001</span>}
      </div>

      {online && (
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-500" />
          <span className="text-sm text-gray-700">
            Smile Points: <strong className="text-amber-600">{String(smilePoints)}</strong>
          </span>
        </div>
      )}

      {health && (
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${health.testOrders ? 'bg-red-500' : 'bg-gray-400'}`} />
          <span className="text-xs text-gray-500">
            Test orders {health.testOrders ? 'ENABLED' : 'disabled'}
          </span>
        </div>
      )}

      <button
        onClick={onRefresh}
        disabled={loading}
        className="ml-auto p-1.5 rounded-lg hover:bg-white/60 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
};

// ── Push to Game Modal ────────────────────────────────────────────────────────

interface PushModalProps {
  skus: SmSku[];
  catalogEntry: SmGameCatalogEntry;
  onClose: () => void;
  onDone: () => void;
}

const PushModal: React.FC<PushModalProps> = ({ skus, catalogEntry, onClose, onDone }) => {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [games, setGames] = useState<Game[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [newName, setNewName] = useState(catalogEntry.name);
  const [loadingGames, setLoadingGames] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listGames()
      .then(setGames)
      .catch(() => toast.error('Could not load games'))
      .finally(() => setLoadingGames(false));
  }, []);

  const mappedProducts = skus.map((s, idx) => ({
    name: s.spu,
    amount: s.spu,
    price: skuPrice(s),
    cost_price: skuPrice(s),
    compare_price: null as number | null,
    currency: 'USD',
    provider_product_id: s.id,
    is_popular: false,
    status: 'active' as const,
    sort_order: idx + 1,
  }));

  const handleSave = async () => {
    setSaving(true);
    try {
      let gameId: string;
      if (mode === 'new') {
        if (!newName.trim()) { toast.error('Enter a game name'); setSaving(false); return; }
        const slug = newName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const newGame = await createGame({
          name: newName.trim(),
          slug,
          provider: 'smilecoin',
          provider_game_code: catalogEntry.slug,
          region: catalogEntry.region,
          currency_label: 'Credits',
          status: 'draft',
          is_featured: false,
          sort_order: 0,
          how_to_steps: [],
        });
        gameId = newGame.id;
        await replaceGameFields(gameId, [
          { field_key: 'userid', label: 'User ID', field_type: 'text', placeholder: 'Enter your User ID', is_required: true, options: [], sort_order: 1 },
          { field_key: 'zoneid', label: 'Zone ID', field_type: 'text', placeholder: 'Enter Zone ID (or leave blank)', is_required: false, options: [], sort_order: 2 },
        ]);
      } else {
        if (!selectedId) { toast.error('Select a game'); setSaving(false); return; }
        gameId = selectedId;
      }
      await replaceProducts(gameId, mappedProducts);
      toast.success(`${mappedProducts.length} SKUs synced to game!`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message || 'Sync failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Push to Game</h3>
            <p className="text-xs text-gray-500 mt-0.5">{skus.length} SKUs · {catalogEntry.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">✕</button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {(['existing', 'new'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === m ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {m === 'existing' ? 'Existing Game' : 'Create New Game'}
              </button>
            ))}
          </div>

          {mode === 'existing' ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Select Game</label>
              {loadingGames ? (
                <div className="h-9 bg-gray-100 rounded-lg animate-pulse" />
              ) : (
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}
                >
                  <option value="">— choose a game —</option>
                  {games.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Game Name</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>
              <div className="bg-violet-50 border border-violet-100 rounded-lg px-3 py-2.5 text-xs text-violet-700 space-y-0.5">
                <p className="font-semibold">Auto-configured:</p>
                <p>• Provider: smilecoin · slug: {catalogEntry.slug}</p>
                <p>• Region: {catalogEntry.region}</p>
                <p>• Fields: User ID + Zone ID · Status: Draft</p>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-gray-600">{mappedProducts.length} packages will be synced</span>
            <span className="text-xs text-gray-400">Existing packages replaced</span>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 pb-5">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {saving ? 'Syncing…' : `Sync ${mappedProducts.length} SKUs`}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

const SmileCoinDetailPage: React.FC = () => {
  const navigate = useNavigate();

  const [health, setHealth] = useState<SmHealthResponse | null>(null);
  const [points, setPoints] = useState<SmPointsResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  const [liveProducts, setLiveProducts] = useState<string[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<SmGameCatalogEntry | null>(null);
  const [skus, setSkus] = useState<SmSku[]>([]);
  const [skuLoading, setSkuLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pushOpen, setPushOpen] = useState(false);

  const fetchStatus = async () => {
    setStatusLoading(true);
    try {
      const [h, p] = await Promise.all([smilecoin.health(), smilecoin.points().catch(() => null)]);
      setHealth(h);
      setPoints(p);
    } catch {
      setHealth(null);
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchLiveProducts = async () => {
    try {
      const list = await smilecoin.products();
      setLiveProducts(list.map(p => p.name));
    } catch {
      // ignore — fall back to static catalog
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchLiveProducts();
  }, []);

  const handleSelectEntry = async (entry: SmGameCatalogEntry) => {
    setSelectedEntry(entry);
    setSkus([]);
    setSkuLoading(true);
    try {
      const res = await smilecoin.productlist(entry.slug);
      setSkus(extractSmSkus(res));
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load SKUs');
    } finally {
      setSkuLoading(false);
    }
  };

  const filteredCatalog = SM_CATALOG.filter(e => {
    const q = searchQuery.toLowerCase();
    return !q || e.name.toLowerCase().includes(q) || e.slug.toLowerCase().includes(q);
  });

  const liveSet = new Set(liveProducts.map(n => n.toLowerCase()));
  const isLive = (slug: string) => liveSet.has(slug.toLowerCase());

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/providers')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💎</span>
              <h1 className="text-2xl font-bold text-gray-900">SmileCoin</h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-violet-100 text-violet-700 rounded-full">Smile.One</span>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              Browse products and SKUs from the Smilecoin API, then sync them to your game catalog.
            </p>
          </div>
          <button
            onClick={() => navigate('/providers/smile-coin/api-console')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Terminal className="w-4 h-4" />
            API Console
          </button>
        </div>
      </motion.div>

      {/* Gateway Status */}
      <StatusBanner
        health={health}
        points={points}
        loading={statusLoading}
        onRefresh={fetchStatus}
      />

      {/* No gateway warning */}
      {!statusLoading && !health && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Gateway not reachable</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Start the Pixie-Kat server: <code className="font-mono bg-amber-100 px-1 rounded">node index.js</code> in <code className="font-mono bg-amber-100 px-1 rounded">main/server/</code> — and add <code className="font-mono bg-amber-100 px-1 rounded">SC_EMAIL / SC_UID / SC_KEY</code> to <code className="font-mono bg-amber-100 px-1 rounded">main/server/.env</code>
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* ── Left: Product Catalog ────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Game Catalog</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {liveProducts.length > 0 ? `${liveProducts.length} products verified live` : 'Static catalog — connect gateway for live data'}
              </p>
            </div>

            <div className="px-3 py-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search games…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
            </div>

            <ul className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
              {filteredCatalog.map(entry => (
                <li key={entry.slug}>
                  <button
                    onClick={() => handleSelectEntry(entry)}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                      selectedEntry?.slug === entry.slug
                        ? 'bg-violet-50 border-l-2 border-violet-500'
                        : 'hover:bg-gray-50 border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl leading-none">{entry.emoji}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{entry.name}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{entry.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isLive(entry.slug) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" title="Verified live" />
                      )}
                      <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Right: SKU Table ──────────────────────────────── */}
        <div className="lg:col-span-2">
          {!selectedEntry ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center flex flex-col items-center justify-center">
              <PackageOpen className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Select a game to view SKUs</p>
              <p className="text-gray-400 text-sm mt-1">Click any game on the left to load its pricing from the Smilecoin API.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedEntry.emoji}</span>
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedEntry.name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {skuLoading ? 'Loading…' : `${skus.length} SKUs · ${selectedEntry.region}`}
                    </p>
                  </div>
                </div>
                {skus.length > 0 && (
                  <button
                    onClick={() => setPushOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Push to Game
                  </button>
                )}
              </div>

              {skuLoading ? (
                <div className="divide-y divide-gray-100">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="px-5 py-3 flex gap-4 animate-pulse">
                      <div className="h-4 bg-gray-100 rounded w-16" />
                      <div className="h-4 bg-gray-100 rounded flex-1" />
                      <div className="h-4 bg-gray-100 rounded w-16" />
                    </div>
                  ))}
                </div>
              ) : skus.length === 0 ? (
                <div className="p-12 text-center">
                  <PackageOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No SKUs found — gateway may be offline or product unavailable.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                          <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description (SPU)</th>
                          <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {skus.map(s => (
                          <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 text-xs font-mono text-gray-400">{s.id}</td>
                            <td className="px-5 py-3 text-gray-900 font-medium">{s.spu}</td>
                            <td className="px-5 py-3 text-right font-semibold text-violet-700">${skuPrice(s).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2 text-xs text-gray-500">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Prices are in USD from the Smilecoin API. Use the markup tool in SmileCode if needed.</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {pushOpen && selectedEntry && skus.length > 0 && (
        <PushModal
          skus={skus}
          catalogEntry={selectedEntry}
          onClose={() => setPushOpen(false)}
          onDone={() => { setPushOpen(false); navigate('/products/games'); }}
        />
      )}
    </div>
  );
};

export default SmileCoinDetailPage;
