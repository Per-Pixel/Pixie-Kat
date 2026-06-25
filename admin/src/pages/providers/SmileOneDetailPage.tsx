import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Percent,
  X,
  Loader2,
  Info,
  Search,
  PackageOpen,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Globe,
  Cloud,
  Zap,
  Clock,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  fetchProductList,
  fetchSkuList,
  ScProduct,
  ScSku,
} from '../../services/providerService';
import {
  listGames,
  createGame,
  updateGame,
  replaceGameFields,
  replaceProducts,
  Game,
} from '../../services/catalogService';

// ── Constants & Helpers ───────────────────────────────────────────────────────
const USD_TO_INR = 83.5; // static rate – replace with API fetch if needed

const formatCurrency = (value: number, currency: string) => {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
};

const usdToInr = (usd: number) => usd * USD_TO_INR;

// Simple skeleton component – shimmer animation
const Skeleton = ({ className }: { className?: string }) => (
  <div
    className={`bg-gray-200 rounded ${className || 'h-4 w-full'} relative overflow-hidden`}
    style={{
      backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    }}
  />
);

// Keyframes for shimmer (Tailwind can't generate, but will work inline)
const globalStyles = `@keyframes shimmer { to { background-position-x: -200%; } }`;

// ── Push‑to‑Game Modal ───────────────────────────────────────────────────────
interface PushModalProps {
  skus: ScSku[];
  editedPrices: Record<string, string>;
  product: ScProduct;
  onClose: () => void;
  onDone: () => void;
}

const PushToGameModal: React.FC<PushModalProps> = ({ skus, editedPrices, product, onClose, onDone }) => {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState('');
  const [newGameName, setNewGameName] = useState(product.name);
  const [loadingGames, setLoadingGames] = useState(true);
  const [saving, setSaving] = useState(false);

  const hasServerField = product.subType === 2;
  const fields = Object.keys(product.params ?? {});

  // Load existing games on mount
  useEffect(() => {
    setLoadingGames(true);
    listGames()
      .then(setGames)
      .catch(() => toast.error('Could not load games'))
      .finally(() => setLoadingGames(false));
  }, []);

  const mappedProducts = skus.map((s, idx) => ({
    name: s.description || s.sku,
    amount: s.description || s.sku,
    price: parseFloat(editedPrices[s.sku] ?? String(s.disprice ?? s.price)) || 0,
    cost_price: s.price || null,
    compare_price: null as number | null,
    currency: s.currency || 'USD',
    provider_product_id: s.sku,
    is_popular: false,
    status: 'active' as const,
    sort_order: idx + 1,
  }));

  const handleSave = async () => {
    setSaving(true);
    try {
      let gameId: string;

      if (mode === 'new') {
        if (!newGameName.trim()) { toast.error('Enter a game name'); setSaving(false); return; }
        const newGame = await createGame({
          name: newGameName.trim(),
          slug: slugify(newGameName.trim()),
          provider: 'smile_one',
          provider_game_code: product.apiGame,
          region: null,
          currency_label: 'Credits',
          status: 'draft',
          is_featured: false,
          sort_order: 0,
          how_to_steps: [],
        });
        gameId = newGame.id;
        const autoFields = fields.length
          ? fields.map((key, i) => ({
              field_key: key,
              label: key === 'user_id' ? 'User ID' : key === 'server_id' ? 'Server ID' : key,
              field_type: 'text' as const,
              placeholder: `Enter ${key}`,
              is_required: true,
              options: [],
              sort_order: i + 1,
            }))
          : [{ field_key: 'user_id', label: 'User ID', field_type: 'text' as const, placeholder: 'Enter User ID', is_required: true, options: [], sort_order: 1 },
            ...(hasServerField ? [{ field_key: 'server_id', label: 'Server ID', field_type: 'text' as const, placeholder: 'Enter Server ID', is_required: true, options: [], sort_order: 2 }] : []),
        ];
        await replaceGameFields(gameId, autoFields);
      } else {
        if (!selectedGameId) { toast.error('Select a game'); setSaving(false); return; }
        gameId = selectedGameId;
        await updateGame(gameId, { provider: 'smile_one', provider_game_code: product.apiGame });
      }

      await replaceProducts(gameId, mappedProducts);
      toast.success(`${mappedProducts.length} SKUs synced successfully!`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message || 'Sync failed');
    } finally {
      setSaving(false);
    }
  };

  // Render a preview list when the modal is open (optional quick view)
  const PreviewList = () => (
    <div className="mt-4 max-h-48 overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-2 py-1 text-left">SKU</th>
            <th className="px-2 py-1 text-right">USD</th>
            <th className="px-2 py-1 text-right">INR</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {mappedProducts.map(p => (
            <tr key={p.provider_product_id} className="hover:bg-gray-50">
              <td className="px-2 py-1 font-mono text-xs text-gray-600">{p.provider_product_id}</td>
              <td className="px-2 py-1 text-right">{formatCurrency(p.price, 'USD')}</td>
              <td className="px-2 py-1 text-right text-gray-500">{formatCurrency(usdToInr(p.price), 'INR')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={e => e.stopPropagation()}>
      <AnimatePresence>
        <motion.div
          key="modal"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-white/30 backdrop-blur-lg rounded-2xl shadow-xl w-full max-w-md border border-white/20"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/20">
            <div>
              <h3 className="font-semibold text-gray-800">Push to Game</h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {skus.length} SKUs · {product.name} ({product.apiGame})
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200/30 transition-colors">
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {/* Mode selector */}
            <div className="flex rounded-xl overflow-hidden border border-gray-300 bg-white">
              <button
                onClick={() => setMode('existing')}
                className={`flex-1 py-2 text-sm font-medium ${mode === 'existing' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Add to Existing Game
              </button>
              <button
                onClick={() => setMode('new')}
                className={`flex-1 py-2 text-sm font-medium ${mode === 'new' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                Create New Game
              </button>
            </div>

            {/* Content based on mode */}
            {mode === 'existing' ? (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Select Game</label>
                {loadingGames ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <select
                    className="input w-full"
                    value={selectedGameId}
                    onChange={e => setSelectedGameId(e.target.value)}
                  >
                    <option value="">— choose a game —</option>
                    {games.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-gray-400 mt-1.5">Existing packages for that game will be replaced.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">Game Name</label>
                  <input
                    className="input w-full"
                    value={newGameName}
                    onChange={e => setNewGameName(e.target.value)}
                    placeholder="e.g. Mobile Legends"
                  />
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 text-xs text-blue-700 space-y-0.5">
                  <p className="font-medium">Auto-configured from SmileCode:</p>
                  <p>• Provider game code: <span className="font-mono">{product.apiGame}</span></p>
                  <p>• Type: {product.type}{product.subType ? ` (subType ${product.subType})` : ''}</p>
                  <p>• Player fields: {fields.length ? fields.join(' + ') : (hasServerField ? 'user_id + server_id' : 'user_id')}</p>
                  <p>• Status: Draft (activate after review)</p>
                </div>
                {/* Optional preview of mapped products */}
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-primary-600 underline">Preview SKUs to sync</summary>
                  <PreviewList />
                </details>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-gray-600">{mappedProducts.length} packages will be synced</span>
              <span className="text-gray-400 text-xs">Existing packages will be replaced</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-3 px-6 pb-4">
            <button onClick={onClose} className="btn btn-outline flex-1">Cancel</button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary flex-1"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              {saving ? 'Syncing…' : `Sync ${mappedProducts.length} SKUs`}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────
const SmileOneDetailPage: React.FC = () => {
  const navigate = useNavigate();

  const [productList, setProductList] = useState<ScProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ScProduct | null>(null);
  const [skuList, setSkuList] = useState<ScSku[]>([]);
  const [editedPrices, setEditedPrices] = useState<Record<string, string>>({});
  const [markup, setMarkup] = useState('5');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingSkus, setLoadingSkus] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customApiGame, setCustomApiGame] = useState('');

  // Load product list on mount
  useEffect(() => {
    fetchProductList()
      .then(setProductList)
      .catch(e => toast.error((e as Error).message))
      .finally(() => setLoadingProducts(false));
  }, []);

  const handleSelectProduct = async (product: ScProduct) => {
    setSelectedProduct(product);
    setSkuList([]);
    setEditedPrices({});
    setLoadingSkus(true);
    try {
      const { skuList: skus } = await fetchSkuList(product.apiGame);
      setSkuList(skus);
      const initial: Record<string, string> = {};
      skus.forEach(s => {
        initial[s.sku] = String(s.disprice ?? s.price);
      });
      setEditedPrices(initial);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoadingSkus(false);
    }
  };

  const applyMarkup = () => {
    const pct = parseFloat(markup);
    if (isNaN(pct)) { toast.error('Enter a valid markup %'); return; }
    const next: Record<string, string> = {};
    skuList.forEach(s => {
      next[s.sku] = (s.price * (1 + pct / 100)).toFixed(4);
    });
    setEditedPrices(next);
    toast.success(`${pct}% markup applied to all prices`);
  };

  const totalMarginUsd = skuList.reduce((sum, s) => {
    const sell = parseFloat(editedPrices[s.sku] ?? String(s.price)) || 0;
    return sum + (sell - s.price);
  }, 0);

  const totalMarginInr = usdToInr(totalMarginUsd);

  const firstCurrency = skuList[0]?.currency ?? 'USD';

  const filteredProducts = productList.filter(p => {
    const q = searchQuery.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.apiGame.toLowerCase().includes(q);
  });

  const handleCustomFetch = () => {
    const code = customApiGame.trim();
    if (!code) { toast.error('Enter an apiGame code'); return; }
    handleSelectProduct({ name: code, type: 'topup' as const, apiGame: code, isMultiPurchase: false });
    setCustomApiGame('');
  };

  // Helper to render loading skeleton for product list
  const ProductListSkeleton = () => (
    <ul className="divide-y divide-gray-100">
      {[...Array(5)].map((_, i) => (
        <li key={i} className="p-4">
          <Skeleton className="h-4 w-3/4 mb-2" />
          <Skeleton className="h-3 w-1/2" />
        </li>
      ))}
    </ul>
  );

  // Helper to render loading skeleton for SKU table rows
  const SkuTableSkeleton = () => (
    <tbody className="divide-y divide-gray-100">
      {[...Array(5)].map((_, i) => (
        <tr key={i} className="hover:bg-gray-50">
          <td className="px-5 py-3"><Skeleton className="h-4 w-24" /></td>
          <td className="px-5 py-3"><Skeleton className="h-4 w-32" /></td>
          <td className="px-5 py-3 text-right"><Skeleton className="h-4 w-12" /></td>
          <td className="px-5 py-3 text-right"><Skeleton className="h-4 w-20" /></td>
          <td className="px-5 py-3 text-right"><Skeleton className="h-4 w-12" /></td>
        </tr>
      ))}
    </tbody>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/providers')} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">SmileCode — Product Catalog</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Select a product to browse SKUs and sync them to your game pages.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Step 1: Product list ────────────────────────────────── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Your Products</h2>
              <button
                onClick={() => {
                  setLoadingProducts(true);
                  fetchProductList()
                    .then(setProductList)
                    .catch(e => toast.error((e as Error).message))
                    .finally(() => setLoadingProducts(false));
                }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingProducts ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="px-3 py-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search products or code…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                />
              </div>
            </div>
            {loadingProducts ? (
              <div className="p-4"><ProductListSkeleton /></div>
            ) : productList.length === 0 ? (
              <div className="p-8 text-center">
                <PackageOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No products found.</p>
                <p className="text-xs text-gray-400 mt-1">Check your SmileCode credentials.</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-6 text-center">
                <Search className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No match for "{searchQuery}"</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {filteredProducts.map(p => (
                  <li key={p.apiGame}>
                    <button
                      onClick={() => handleSelectProduct(p)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                        selectedProduct?.apiGame === p.apiGame
                          ? 'bg-primary-50 border-l-2 border-primary-500'
                          : 'hover:bg-gray-50 border-l-2 border-transparent'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">{p.apiGame}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${p.type === 'voucher' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{p.type}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="px-3 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs font-medium text-gray-500 mb-1.5">Try custom apiGame code</p>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. mobilelegends"
                  value={customApiGame}
                  onChange={e => setCustomApiGame(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCustomFetch()}
                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-400 font-mono"
                />
                <button
                  onClick={handleCustomFetch}
                  disabled={!customApiGame.trim()}
                  className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Fetch
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Step 2: SKU list ────────────────────────────────────── */}
        <div className="lg:col-span-2">
          {!selectedProduct ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-16 text-center h-full flex flex-col items-center justify-center">
              <PackageOpen className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Select a product to view SKUs</p>
              <p className="text-gray-400 text-sm mt-1">Click any product on the left to load its pricing.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-6 flex flex-col" style={{ maxHeight: 'calc(100vh - 100px)' }}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
                <div>
                  <h2 className="font-semibold text-gray-900">{selectedProduct.name}</h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {loadingSkus ? 'Loading…' : `${skuList.length} SKUs · ${firstCurrency}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {skuList.length > 0 && (
                    <button onClick={() => setPushOpen(true)} className="btn btn-primary btn-md">
                      <Download className="w-4 h-4 mr-2" />Push to Game
                    </button>
                  )}
                </div>
              </div>

              {skuList.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-gray-100 bg-gray-50 shrink-0">
                  <span className="text-sm text-gray-600 font-medium">Markup:</span>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="200"
                        step="0.5"
                        className="input w-24 pr-7 text-sm"
                        value={markup}
                        onChange={e => setMarkup(e.target.value)}
                      />
                      <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                    <button onClick={applyMarkup} className="btn btn-outline btn-sm">Apply to all</button>
                  </div>
                  <div className="ml-auto text-sm text-gray-600">
                    Total margin: <span className="font-semibold text-green-600">{totalMarginUsd.toFixed(4)} {firstCurrency} ({formatCurrency(totalMarginInr, 'INR')})</span>
                  </div>
                </div>
              )}

              {loadingSkus ? (
                <div className="p-12 flex justify-center"><Skeleton className="h-8 w-48" /></div>
              ) : skuList.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-400 text-sm">No SKUs found for this product.</p>
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Your Price (USD)</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {skuList.map(s => {
                        const sell = parseFloat(editedPrices[s.sku] ?? String(s.price)) || 0;
                        const margin = sell - s.price;
                        const isEdited = editedPrices[s.sku] !== String(s.disprice ?? s.price);
                        return (
                          <tr key={s.sku} className="hover:bg-gray-50 transition-colors">
                            <td className="px-5 py-3 text-xs font-mono text-gray-400">{s.sku}</td>
                            <td className="px-5 py-3 text-gray-900 font-medium">{s.description || s.sku}</td>
                            <td className="px-5 py-3 text-right text-gray-500">{s.price.toFixed(4)}</td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex flex-col items-end">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.0001"
                                  className={`w-28 text-right px-2 py-1 text-sm rounded-lg border transition-colors ${isEdited ? 'border-primary-300 bg-primary-50 text-primary-700 font-semibold' : 'border-gray-200 bg-white text-gray-900'} focus:outline-none focus:ring-2 focus:ring-primary-400`}
                                  value={editedPrices[s.sku] ?? String(s.price)}
                                  onChange={e => setEditedPrices(prev => ({ ...prev, [s.sku]: e.target.value }))}
                                />
                                <span className="text-xs text-gray-500 mt-0.5">≈ {formatCurrency(usdToInr(sell), 'INR')}</span>
                              </div>
                            </td>
                            <td className={`px-5 py-3 text-right font-medium ${margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {margin >= 0 ? '+' : ''}{margin.toFixed(4)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2 text-xs text-gray-500 shrink-0">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <strong>Cost</strong> = wholesale price from SmileCode (what you pay). <strong>Your Price</strong> = what customers pay. Edit per row or use the markup tool.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {pushOpen && selectedProduct && (
        <PushToGameModal
          skus={skuList}
          editedPrices={editedPrices}
          product={selectedProduct}
          onClose={() => setPushOpen(false)}
          onDone={() => { setPushOpen(false); navigate('/products/games'); }}
        />
      )}

      {/* Global style for shimmer */}
      <style>{globalStyles}</style>
    </div>
  );
};

export default SmileOneDetailPage;
