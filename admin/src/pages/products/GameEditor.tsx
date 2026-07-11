import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Gamepad2, ListChecks, Package, Plus, Trash2,
  GripVertical, Info, ExternalLink, ChevronUp, ChevronDown,
  Eye, Globe, TrendingUp, Star, X, Monitor, Tablet, Smartphone, Layers, ListFilter, Link2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  createGame, updateGame, getGameWithRelations, replaceGameFields, replaceProducts,
  createPromoItem, deletePromoItem, listPromoItemsByGame,
  Game, GameField, Product, GameFieldType, GameStatus, GameProvider, HowToStep, ProductStatus,
} from '../../services/catalogService';
import ImageSourceField from '../../components/common/ImageSourceField';

type FieldDraft = Partial<GameField> & { _key: string };

type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'BDT';
interface CurrencyPriceRow { enabled: boolean; selling_price: string; cost_price: string; }
type CurrencyPrices = Record<CurrencyCode, CurrencyPriceRow>;

interface ProductDraft {
  _key: string; id?: string;
  name: string; amount: string; description: string;
  compare_price: string; image_url: string; sku: string;
  provider_product_id: string;
  secondary_provider_product_id: string;
  stock: string;
  is_popular: boolean; status: ProductStatus;
  currency_prices: CurrencyPrices;
  is_default: boolean;
}

interface PageSections {
  trending: boolean; exclusive_offers: boolean;
  trendingItemId: string | null; exclusiveItemId: string | null;
}

const SUPPORTED_CURRENCIES: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: 'INR', symbol: '₹', label: 'INR' },
  { code: 'USD', symbol: '$', label: 'USD' },
  { code: 'EUR', symbol: '€', label: 'EUR' },
  { code: 'BDT', symbol: '৳', label: 'BDT' },
];

const FIELD_TYPES: { value: GameFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'select', label: 'Dropdown (select)' },
];

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const keyify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

const uid = () => Math.random().toString(36).slice(2, 10);

interface GameForm {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  image_url: string;
  banner_url: string;
  category: string;
  currency_label: string;
  provider: GameProvider;
  provider_game_code: string;
  smile_coin_product: string;
  region: string;
  status: GameStatus;
  is_featured: boolean;
  instructions: string;
}

const REGIONS = [
  { code: '', label: '— Not region-specific —' },
  { code: 'ph', label: 'Philippines (PH)' },
  { code: 'id', label: 'Indonesia (ID)' },
  { code: 'my', label: 'Malaysia (MY)' },
  { code: 'sg', label: 'Singapore (SG)' },
  { code: 'br', label: 'Brazil (BR)' },
  { code: 'th', label: 'Thailand (TH)' },
  { code: 'vn', label: 'Vietnam (VN)' },
  { code: 'tw', label: 'Taiwan (TW)' },
  { code: 'global', label: 'Global' },
];

const emptyForm: GameForm = {
  slug: '', name: '', subtitle: '', description: '', image_url: '', banner_url: '',
  category: '', currency_label: 'Diamonds', provider: 'manual', provider_game_code: '',
  smile_coin_product: '', region: '', status: 'draft', is_featured: false, instructions: '',
};

const defaultCurrencyPrices = (price?: number, costPrice?: number | null, currency?: string): CurrencyPrices => {
  const base: CurrencyPrices = {
    INR: { enabled: true, selling_price: '', cost_price: '' },
    USD: { enabled: false, selling_price: '', cost_price: '' },
    EUR: { enabled: false, selling_price: '', cost_price: '' },
    BDT: { enabled: false, selling_price: '', cost_price: '' },
  };
  const primary = (currency && currency in base ? currency : 'INR') as CurrencyCode;
  if (price !== undefined) {
    base[primary] = { enabled: true, selling_price: price > 0 ? String(price) : '', cost_price: costPrice ? String(costPrice) : '' };
  }
  return base;
};

const hydrateCurrencyPrices = (base: CurrencyPrices, metadata?: Record<string, unknown>): CurrencyPrices => {
  const extra = (metadata?.currencies as Record<string, { selling_price?: number; cost_price?: number }>) ?? {};
  for (const [code, prices] of Object.entries(extra)) {
    if (code in base) {
      base[code as CurrencyCode] = {
        enabled: true,
        selling_price: prices.selling_price ? String(prices.selling_price) : '',
        cost_price: prices.cost_price ? String(prices.cost_price) : '',
      };
    }
  }
  return base;
};

const productFromDB = (p: Product): ProductDraft => ({
  _key: Math.random().toString(36).slice(2, 10), id: p.id,
  name: p.name ?? '', amount: p.amount ?? '', description: p.description ?? '',
  compare_price: p.compare_price ? String(p.compare_price) : '',
  image_url: p.image_url ?? '', sku: p.sku ?? '',
  provider_product_id: p.provider_product_id ?? '',
  secondary_provider_product_id: String((p.metadata as Record<string, unknown>)?.secondary_provider_product_id ?? ''),
  stock: p.stock ? String(p.stock) : '',
  is_popular: p.is_popular ?? false, status: p.status ?? 'active',
  currency_prices: hydrateCurrencyPrices(defaultCurrencyPrices(p.price, p.cost_price, p.currency), p.metadata),
  is_default: false,
});

const emptyProductDraft = (): ProductDraft => ({
  _key: Math.random().toString(36).slice(2, 10),
  name: '', amount: '', description: '', compare_price: '', image_url: '',
  sku: '', provider_product_id: '', secondary_provider_product_id: '', stock: '',
  is_popular: false, status: 'active',
  currency_prices: defaultCurrencyPrices(),
  is_default: false,
});

const defaultPageSections: PageSections = { trending: false, exclusive_offers: false, trendingItemId: null, exclusiveItemId: null };

const GameEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const [form, setForm] = useState<GameForm>(emptyForm);
  const [steps, setSteps] = useState<HowToStep[]>([]);
  const [fields, setFields] = useState<FieldDraft[]>([]);
  const [products, setProducts] = useState<ProductDraft[]>([]);
  const [pageSections, setPageSections] = useState<PageSections>(defaultPageSections);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkFilter, setBulkFilter] = useState('');

  const change = <K extends keyof GameForm>(key: K, value: GameForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [game, promoItems] = await Promise.all([
        getGameWithRelations(id),
        listPromoItemsByGame(id),
      ]);
      setForm({
        slug: game.slug, name: game.name, subtitle: game.subtitle ?? '',
        description: game.description ?? '', image_url: game.image_url ?? '',
        banner_url: game.banner_url ?? '', category: game.category ?? '',
        currency_label: game.currency_label, provider: game.provider,
        provider_game_code: game.provider_game_code ?? '',
        smile_coin_product: String((game.metadata as Record<string, unknown>)?.smile_coin_product ?? ''),
        region: game.region ?? '',
        status: game.status, is_featured: game.is_featured, instructions: game.instructions ?? '',
      });
      setSteps(game.how_to_steps ?? []);
      setFields((game.game_fields ?? []).map((f) => ({ ...f, _key: uid() })));
      const defaultProductId = String((game.metadata as Record<string, unknown>)?.default_product_id ?? '');
      setProducts((game.products ?? []).map((p) => {
        const draft = productFromDB(p);
        draft.is_default = Boolean(defaultProductId && p.id === defaultProductId);
        return draft;
      }));
      const tItem = promoItems.find((pi) => pi.section === 'trending');
      const eItem = promoItems.find((pi) => pi.section === 'exclusive_offers');
      setPageSections({
        trending: !!tItem, exclusive_offers: !!eItem,
        trendingItemId: tItem?.id ?? null, exclusiveItemId: eItem?.id ?? null,
      });
    } catch (err) {
      toast.error((err as Error).message || 'Failed to load game');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- Field builder helpers ----
  const addField = () =>
    setFields((prev) => [
      ...prev,
      { _key: uid(), field_key: '', label: '', field_type: 'text', is_required: true, placeholder: '', options: [] },
    ]);

  const updateField = (key: string, patch: Partial<FieldDraft>) =>
    setFields((prev) => prev.map((f) => (f._key === key ? { ...f, ...patch } : f)));

  const removeField = (key: string) =>
    setFields((prev) => prev.filter((f) => f._key !== key));

  const moveField = (key: string, dir: -1 | 1) =>
    setFields((prev) => {
      const idx = prev.findIndex((f) => f._key === key);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });

  // ---- Package helpers ----
  const addProduct = () => setProducts((prev) => [...prev, emptyProductDraft()]);

  const updateProduct = (key: string, patch: Partial<Omit<ProductDraft, 'currency_prices'>>) =>
    setProducts((prev) => prev.map((p) => (p._key === key ? { ...p, ...patch } : p)));

  const updateCurrencyPrice = (key: string, code: CurrencyCode, patch: Partial<CurrencyPriceRow>) =>
    setProducts((prev) => prev.map((p) =>
      p._key === key
        ? { ...p, currency_prices: { ...p.currency_prices, [code]: { ...p.currency_prices[code], ...patch } } }
        : p
    ));

  const removeProduct = (key: string) =>
    setProducts((prev) => prev.filter((p) => p._key !== key));

  const moveProduct = (key: string, dir: -1 | 1) =>
    setProducts((prev) => {
      const idx = prev.findIndex((p) => p._key === key);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy;
    });

  // ---- How-to steps ----
  const addStep = () => setSteps((prev) => [...prev, { title: '', description: '' }]);
  const updateStep = (i: number, patch: Partial<HowToStep>) =>
    setSteps((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  const removeStep = (i: number) => setSteps((prev) => prev.filter((_, idx) => idx !== i));

  const validate = (): string | null => {
    if (!form.name.trim()) return 'Game name is required';
    if (!form.slug.trim()) return 'Slug is required';
    for (const f of fields) {
      if (!f.label?.trim()) return 'Every field needs a label';
      if (!f.field_key?.trim()) return 'Every field needs a key';
    }
    const keys = fields.map((f) => keyify(f.field_key || ''));
    if (new Set(keys).size !== keys.length) return 'Field keys must be unique';
    for (const p of products) {
      if (!p.name?.trim()) return 'Every package needs a name';
    }
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    try {
      const payload: Partial<Game> = {
        slug: slugify(form.slug), name: form.name.trim(),
        subtitle: form.subtitle || null, description: form.description || null,
        image_url: form.image_url || null, banner_url: form.banner_url || null,
        category: form.category || null, currency_label: form.currency_label || 'Diamonds',
        provider: form.provider, provider_game_code: form.provider_game_code || null,
        region: form.region || null, status: form.status, is_featured: form.is_featured,
        instructions: form.instructions || null, how_to_steps: steps.filter((s) => s.title.trim()),
        metadata: {
          ...(form.smile_coin_product ? { smile_coin_product: form.smile_coin_product } : {}),
        },
      };
      const game = isEdit && id ? await updateGame(id, payload) : await createGame(payload);

      await replaceGameFields(game.id, fields.map((f) => ({
        field_key: keyify(f.field_key || ''), label: f.label ?? '',
        field_type: f.field_type ?? 'text', placeholder: f.placeholder ?? null,
        help_text: f.help_text ?? null, is_required: f.is_required ?? true,
        options: f.options ?? [], validation_regex: f.validation_regex ?? null,
      })));

      const savedProducts = await replaceProducts(game.id, products.map((p) => {
        const inr = p.currency_prices.INR;
        const extraCurrencies: Record<string, { selling_price: number; cost_price?: number }> = {};
        for (const { code } of SUPPORTED_CURRENCIES) {
          if (code !== 'INR') {
            const row = p.currency_prices[code];
            if (row.enabled && row.selling_price) {
              extraCurrencies[code] = {
                selling_price: Number(row.selling_price),
                ...(row.cost_price ? { cost_price: Number(row.cost_price) } : {}),
              };
            }
          }
        }
        return {
          name: p.name, amount: p.amount || null, description: p.description || null,
          price: Number(inr.selling_price || 0),
          cost_price: inr.cost_price ? Number(inr.cost_price) : null,
          compare_price: p.compare_price ? Number(p.compare_price) : null,
          currency: 'INR', image_url: p.image_url || null, sku: p.sku || null,
          provider_product_id: p.provider_product_id || null,
          stock: p.stock ? Number(p.stock) : null,
          is_popular: p.is_popular, status: p.status,
          metadata: {
            ...(Object.keys(extraCurrencies).length > 0 ? { currencies: extraCurrencies } : {}),
            ...(p.secondary_provider_product_id ? { secondary_provider_product_id: p.secondary_provider_product_id } : {}),
          },
        };
      }));

      // Update game metadata with default_product_id using the NEW product IDs
      // (replaceProducts deletes and re-creates products with new UUIDs)
      const defaultDraft = products.find((p) => p.is_default);
      let newDefaultProductId: string | undefined;
      if (defaultDraft) {
        const defaultIdx = products.indexOf(defaultDraft);
        newDefaultProductId = savedProducts[defaultIdx]?.id;
      }
      await updateGame(game.id, {
        metadata: {
          ...(form.smile_coin_product ? { smile_coin_product: form.smile_coin_product } : {}),
          ...(newDefaultProductId ? { default_product_id: newDefaultProductId } : {}),
        },
      });

      // Sync page sections
      if (pageSections.trending && !pageSections.trendingItemId) {
        const ni = await createPromoItem({ section: 'trending', title: game.name, image_url: game.image_url, game_id: game.id, currency: 'INR', is_active: true, sort_order: 99 });
        setPageSections((prev) => ({ ...prev, trendingItemId: ni.id }));
      } else if (!pageSections.trending && pageSections.trendingItemId) {
        await deletePromoItem(pageSections.trendingItemId);
        setPageSections((prev) => ({ ...prev, trendingItemId: null }));
      }
      if (pageSections.exclusive_offers && !pageSections.exclusiveItemId) {
        const ni = await createPromoItem({ section: 'exclusive_offers', title: game.name, image_url: game.image_url ?? game.banner_url, game_id: game.id, currency: 'INR', is_active: true, sort_order: 99 });
        setPageSections((prev) => ({ ...prev, exclusiveItemId: ni.id }));
      } else if (!pageSections.exclusive_offers && pageSections.exclusiveItemId) {
        await deletePromoItem(pageSections.exclusiveItemId);
        setPageSections((prev) => ({ ...prev, exclusiveItemId: null }));
      }

      toast.success(isEdit ? 'Game updated' : 'Game created');
      if (!isEdit) navigate('/products/games');
    } catch (e) {
      toast.error((e as Error).message || 'Failed to save game');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading game…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/products/games')} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Game' : 'Add Game'}</h1>
            <p className="text-gray-500 text-sm mt-0.5">Configure the game, packages, and page placement</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <button type="button" onClick={() => setShowPreview(true)} className="btn btn-outline btn-md">
            <Eye className="w-4 h-4 mr-2" />Preview
          </button>
          <button onClick={() => navigate('/products/games')} className="btn btn-outline btn-md">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-md">
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Saving…</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Save Game</>
            )}
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Gamepad2 className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label mb-1.5 block">Game Name <span className="text-red-500">*</span></label>
                  <input
                    className="input"
                    placeholder="e.g., Mobile Legends"
                    value={form.name}
                    onChange={(e) => {
                      change('name', e.target.value);
                      if (!slugTouched) change('slug', slugify(e.target.value));
                    }}
                  />
                </div>
                <div>
                  <label className="label mb-1.5 block">Slug <span className="text-red-500">*</span></label>
                  <input
                    className="input"
                    placeholder="mobile-legends"
                    value={form.slug}
                    onChange={(e) => { setSlugTouched(true); change('slug', e.target.value); }}
                  />
                  <p className="text-xs text-gray-400 mt-1">URL: /games/{form.slug || 'your-slug'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label mb-1.5 block">Subtitle</label>
                  <input className="input" value={form.subtitle} onChange={(e) => change('subtitle', e.target.value)} />
                </div>
                <div>
                  <label className="label mb-1.5 block">Category</label>
                  <input className="input" placeholder="MOBA, Battle Royale…" value={form.category} onChange={(e) => change('category', e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label mb-1.5 block">Description</label>
                <textarea rows={3} className="input h-auto resize-none" value={form.description} onChange={(e) => change('description', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <ImageSourceField
                  label="Card Image"
                  value={form.image_url}
                  onChange={(url) => change('image_url', url)}
                  placeholder="/img/games/mobile-legends.webp or https://..."
                  folder="games/cards"
                />
                <ImageSourceField
                  label="Banner Image"
                  value={form.banner_url}
                  onChange={(url) => change('banner_url', url)}
                  placeholder="/img/hero/game-mlbb-card.webp or https://..."
                  folder="games/banners"
                  previewClassName="h-32 w-full max-w-md"
                />
              </div>
            </div>
          </section>

          {/* Dynamic field builder */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Player Identification Fields</h2>
              </div>
              <button onClick={addField} type="button" className="btn btn-outline btn-sm">
                <Plus className="w-4 h-4 mr-1" />Add Field
              </button>
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 rounded-lg p-3 mb-4">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span>These are the inputs the customer fills before paying. Mobile Legends needs User ID + Zone ID; other games may need only a User ID, an email, or several custom fields.</span>
            </div>

            {fields.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500">
                No fields yet. Add at least one (e.g., User ID).
              </div>
            ) : (
              <div className="space-y-4">
                {fields.map((f, idx) => (
                  <div key={f._key} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-gray-400">
                        <GripVertical className="w-4 h-4" />
                        <span className="text-xs font-medium text-gray-500">Field {idx + 1}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => moveField(f._key, -1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move up"><ChevronUp className="w-4 h-4" /></button>
                        <button type="button" onClick={() => moveField(f._key, 1)} disabled={idx === fields.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move down"><ChevronDown className="w-4 h-4" /></button>
                        <button type="button" onClick={() => removeField(f._key)} className="text-red-500 hover:text-red-700 px-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="label mb-1 block text-xs">Label <span className="text-red-500">*</span></label>
                        <input
                          className="input"
                          placeholder="User ID"
                          value={f.label ?? ''}
                          onChange={(e) => {
                            const label = e.target.value;
                            const autoKey = keyify(label);
                            updateField(f._key, { label, field_key: f.field_key ? f.field_key : autoKey });
                          }}
                        />
                      </div>
                      <div>
                        <label className="label mb-1 block text-xs">Key <span className="text-red-500">*</span></label>
                        <input
                          className="input font-mono text-sm"
                          placeholder="user_id"
                          value={f.field_key ?? ''}
                          onChange={(e) => updateField(f._key, { field_key: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label mb-1 block text-xs">Type</label>
                        <select
                          className="input"
                          value={f.field_type ?? 'text'}
                          onChange={(e) => updateField(f._key, { field_type: e.target.value as GameFieldType })}
                        >
                          {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label mb-1 block text-xs">Placeholder</label>
                        <input
                          className="input"
                          placeholder="Enter User ID"
                          value={f.placeholder ?? ''}
                          onChange={(e) => updateField(f._key, { placeholder: e.target.value })}
                        />
                      </div>
                    </div>
                    {f.field_type === 'select' && (
                      <div className="mt-3">
                        <label className="label mb-1 block text-xs">Options (one per line, label|value)</label>
                        <textarea
                          rows={3}
                          className="input h-auto resize-none font-mono text-sm"
                          placeholder={'Server 1|1\nServer 2|2'}
                          value={(f.options ?? []).map((o) => `${o.label}|${o.value}`).join('\n')}
                          onChange={(e) =>
                            updateField(f._key, {
                              options: e.target.value
                                .split('\n')
                                .map((line) => line.trim())
                                .filter(Boolean)
                                .map((line) => {
                                  const [label, value] = line.split('|');
                                  return { label: label?.trim() ?? '', value: (value ?? label)?.trim() ?? '' };
                                }),
                            })
                          }
                        />
                      </div>
                    )}
                    <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={f.is_required ?? true}
                        onChange={(e) => updateField(f._key, { is_required: e.target.checked })}
                      />
                      Required
                    </label>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Packages */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Packages / Denominations</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkEditOpen((v) => !v)}
                  className={`btn btn-sm flex items-center gap-1.5 ${bulkEditOpen ? 'btn-primary' : 'btn-outline'}`}
                >
                  <ListFilter className="w-3.5 h-3.5" />Bulk Edit
                </button>
                <button onClick={addProduct} type="button" className="btn btn-outline btn-sm">
                  <Plus className="w-4 h-4 mr-1" />Add Package
                </button>
              </div>
            </div>
            <div className="flex items-start gap-2 text-xs text-gray-500 bg-amber-50 rounded-lg p-3 mb-4">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <span><strong>Package Name</strong> is the product title shown to customers (e.g., "Diamonds 100 + 10"). <strong>In-Game Amount</strong> is the display label on the card (e.g., "110 Diamonds" or "Weekly Pass"). Set selling prices per currency below.</span>
            </div>

            {products.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-sm text-gray-500">
                No packages yet. Add the top-up amounts customers can buy.
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((p, idx) => (
                  <div key={p._key} className="rounded-xl border border-gray-200 overflow-hidden">
                    {/* Package header bar */}
                    <div className="flex items-center justify-between bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Package {idx + 1}</span>
                        {p.name && <span className="text-xs text-gray-400">— {p.name}</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button type="button" title={p.is_default ? 'Remove default' : 'Set as default product (auto-selected on storefront)'} onClick={() => setProducts((prev) => prev.map((pp) => pp._key === p._key ? { ...pp, is_default: !pp.is_default } : { ...pp, is_default: false }))} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${p.is_default ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500 hover:bg-violet-50'}`}>
                          <Star className="w-3 h-3" fill={p.is_default ? 'currentColor' : 'none'} />
                          Default
                        </button>
                        <button type="button" title={p.is_popular ? 'Remove popular badge' : 'Mark as popular'} onClick={() => updateProduct(p._key, { is_popular: !p.is_popular })} className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${p.is_popular ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500 hover:bg-amber-50'}`}>
                          <Star className="w-3 h-3" fill={p.is_popular ? 'currentColor' : 'none'} />
                          Popular
                        </button>
                        <select className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary-400" value={p.status} onChange={(e) => updateProduct(p._key, { status: e.target.value as ProductStatus })}>
                          <option value="active">Active</option>
                          <option value="draft">Draft</option>
                          <option value="inactive">Inactive</option>
                        </select>
                        <button type="button" onClick={() => moveProduct(p._key, -1)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move up"><ChevronUp className="w-4 h-4" /></button>
                        <button type="button" onClick={() => moveProduct(p._key, 1)} disabled={idx === products.length - 1} className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move down"><ChevronDown className="w-4 h-4" /></button>
                        <button type="button" onClick={() => removeProduct(p._key)} className="p-1 text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>

                    {/* Package body */}
                    <div className="p-4 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="label mb-1.5 block text-xs">Package Name <span className="text-red-500">*</span></label>
                          <input className="input" placeholder="e.g., Diamonds 100 + 10" value={p.name} onChange={(e) => updateProduct(p._key, { name: e.target.value })} />
                        </div>
                        <div>
                          <label className="label mb-1.5 block text-xs">In-Game Amount <span className="text-gray-400 font-normal">(display label)</span></label>
                          <input className="input" placeholder="e.g., 110 Diamonds or Weekly Pass" value={p.amount} onChange={(e) => updateProduct(p._key, { amount: e.target.value })} />
                        </div>
                      </div>

                      <div>
                        <label className="label mb-1.5 block text-xs">Description <span className="text-gray-400 font-normal">(optional)</span></label>
                        <textarea rows={2} className="input h-auto resize-none text-sm" placeholder="Short note about this package..." value={p.description} onChange={(e) => updateProduct(p._key, { description: e.target.value })} />
                      </div>

                      {/* Multi-currency pricing table */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Globe className="w-4 h-4 text-primary-600" />
                          <span className="text-sm font-semibold text-gray-800">Selling Prices</span>
                          <span className="text-xs text-gray-400">(INR is primary; enable others to sell in multiple currencies)</span>
                        </div>
                        <div className="overflow-hidden rounded-lg border border-gray-200">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-28">Currency</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Selling Price</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Cost Price</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-28">Profit</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {SUPPORTED_CURRENCIES.map(({ code, symbol, label }) => {
                                const row = p.currency_prices[code];
                                const sell = parseFloat(row.selling_price || '0');
                                const cost = parseFloat(row.cost_price || '0');
                                const profit = sell - cost;
                                const margin = sell > 0 && cost > 0 ? ((profit / sell) * 100).toFixed(1) : null;
                                const isLocked = code === 'INR';
                                return (
                                  <tr key={code} className={!row.enabled ? 'bg-gray-50/50 opacity-60' : ''}>
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        {!isLocked && (
                                          <input type="checkbox" checked={row.enabled} onChange={(e) => updateCurrencyPrice(p._key, code, { enabled: e.target.checked })} className="rounded border-gray-300" />
                                        )}
                                        <span className={`text-sm font-medium ${isLocked ? 'text-primary-700' : 'text-gray-700'}`}>
                                          {symbol} {label}{isLocked && <span className="ml-1 text-xs text-gray-400">(primary)</span>}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">{symbol}</span>
                                        <input type="number" step="0.01" min="0" disabled={!row.enabled} className="input pl-6 py-1.5 text-sm w-full" placeholder="0.00" value={row.selling_price} onChange={(e) => updateCurrencyPrice(p._key, code, { selling_price: e.target.value })} />
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="relative">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">{symbol}</span>
                                        <input type="number" step="0.01" min="0" disabled={!row.enabled} className="input pl-6 py-1.5 text-sm w-full" placeholder="0.00" value={row.cost_price} onChange={(e) => updateCurrencyPrice(p._key, code, { cost_price: e.target.value })} />
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      {row.enabled && sell > 0 ? (
                                        <div className="text-xs">
                                          <span className={`font-semibold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{symbol}{Math.abs(profit).toFixed(2)}</span>
                                          {margin && <span className="text-gray-400 ml-1">({margin}%)</span>}
                                        </div>
                                      ) : <span className="text-xs text-gray-300">—</span>}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Compare price + SKU */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="label mb-1.5 block text-xs">Compare Price — INR <span className="text-gray-400 font-normal">(strikethrough)</span></label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                            <input type="number" step="0.01" min="0" className="input pl-6" placeholder="0.00" value={p.compare_price} onChange={(e) => updateProduct(p._key, { compare_price: e.target.value })} />
                          </div>
                        </div>
                        <div>
                          <label className="label mb-1.5 block text-xs">SKU <span className="text-gray-400 font-normal">(optional)</span></label>
                          <input className="input font-mono text-sm" placeholder="e.g., MLBB-100D" value={p.sku} onChange={(e) => updateProduct(p._key, { sku: e.target.value })} />
                        </div>
                      </div>

                      {form.provider !== 'manual' && (
                        <div className="space-y-3">
                          <div>
                            <label className="label mb-1.5 block text-xs">Provider Product ID <span className="text-gray-400 font-normal">(Smile.one / API denomination ID)</span></label>
                            <input className="input font-mono text-sm" placeholder="e.g., mobilelegends_100" value={p.provider_product_id} onChange={(e) => updateProduct(p._key, { provider_product_id: e.target.value })} />
                          </div>
                          <div className="rounded-lg border border-dashed border-primary-300 bg-primary-50/40 p-3 space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Link2 className="w-3.5 h-3.5 text-primary-600" />
                              <span className="text-xs font-semibold text-primary-700">Combined SKU — optional</span>
                              <span className="text-xs text-gray-500">Add a second SKU to bundle two provider items into one purchase</span>
                            </div>
                            <input
                              className="input font-mono text-sm"
                              placeholder="e.g., mobilelegends_weekly (2nd SKU to run alongside)"
                              value={p.secondary_provider_product_id}
                              onChange={(e) => updateProduct(p._key, { secondary_provider_product_id: e.target.value })}
                            />
                            {p.secondary_provider_product_id && (
                              <p className="text-xs text-primary-600">
                                When a customer orders this package, both <code className="bg-primary-100 px-1 rounded">{p.provider_product_id || '…'}</code> and <code className="bg-primary-100 px-1 rounded">{p.secondary_provider_product_id}</code> will be fulfilled.
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      <ImageSourceField label="Package Image (optional)" value={p.image_url} onChange={(url) => updateProduct(p._key, { image_url: url })} placeholder="/img/promotion/starlight.webp or https://..." folder="products" previewClassName="h-20 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Bulk Edit Panel ── */}
            {bulkEditOpen && products.length > 0 && (
              <div className="mt-6 rounded-xl border border-primary-200 bg-primary-50/30 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-primary-50 border-b border-primary-200">
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-4 h-4 text-primary-600" />
                    <span className="text-sm font-semibold text-primary-700">Bulk Edit</span>
                    <span className="text-xs text-gray-500">Edit multiple packages at once. Changes apply live.</span>
                  </div>
                  <input
                    className="input py-1 px-3 text-sm w-52"
                    placeholder="Filter by name…"
                    value={bulkFilter}
                    onChange={(e) => setBulkFilter(e.target.value)}
                  />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white border-b border-gray-200">
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[160px]">#&nbsp;Name</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[110px]">INR Sell ₹</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[110px]">INR Cost ₹</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[110px]">Compare ₹</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[120px]">SKU</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[160px]">Provider ID</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[100px]">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-12">Pop.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {/* Bulk-apply row */}
                      <tr className="bg-amber-50 border-b border-amber-200">
                        <td className="px-3 py-1.5">
                          <span className="text-xs text-amber-700 font-semibold">Apply to all visible →</span>
                        </td>
                        {[
                          { placeholder: '₹ sell all', field: 'inr_sell' },
                          { placeholder: '₹ cost all', field: 'inr_cost' },
                          { placeholder: '₹ compare all', field: 'compare' },
                          { placeholder: 'SKU all', field: 'sku_all' },
                          { placeholder: 'Provider ID all', field: 'pid_all' },
                        ].map(({ placeholder, field }) => (
                          <td key={field} className="px-3 py-1.5">
                            <input
                              className="input py-1 text-xs w-full"
                              placeholder={placeholder}
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (!val) return;
                                const visible = products.filter((p) =>
                                  !bulkFilter || p.name.toLowerCase().includes(bulkFilter.toLowerCase())
                                );
                                visible.forEach((p) => {
                                  if (field === 'inr_sell') updateCurrencyPrice(p._key, 'INR', { selling_price: val });
                                  else if (field === 'inr_cost') updateCurrencyPrice(p._key, 'INR', { cost_price: val });
                                  else if (field === 'compare') updateProduct(p._key, { compare_price: val });
                                  else if (field === 'sku_all') updateProduct(p._key, { sku: val });
                                  else if (field === 'pid_all') updateProduct(p._key, { provider_product_id: val });
                                });
                                e.target.value = '';
                              }}
                            />
                          </td>
                        ))}
                        <td className="px-3 py-1.5">
                          <select
                            className="input py-1 text-xs"
                            defaultValue=""
                            onChange={(e) => {
                              const val = e.target.value as ProductStatus;
                              if (!val) return;
                              const visible = products.filter((p) =>
                                !bulkFilter || p.name.toLowerCase().includes(bulkFilter.toLowerCase())
                              );
                              visible.forEach((p) => updateProduct(p._key, { status: val }));
                              e.target.value = '';
                            }}
                          >
                            <option value="">— status all —</option>
                            <option value="active">Active</option>
                            <option value="draft">Draft</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </td>
                        <td />
                      </tr>

                      {products
                        .filter((p) => !bulkFilter || p.name.toLowerCase().includes(bulkFilter.toLowerCase()))
                        .map((p, idx) => {
                          const inr = p.currency_prices.INR;
                          return (
                            <tr key={p._key} className="hover:bg-gray-50 transition-colors">
                              <td className="px-3 py-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs text-gray-400 shrink-0 w-5">{idx + 1}</span>
                                  <input
                                    className="input py-1 text-xs w-full min-w-[120px]"
                                    value={p.name}
                                    onChange={(e) => updateProduct(p._key, { name: e.target.value })}
                                  />
                                </div>
                              </td>
                              <td className="px-3 py-1.5">
                                <input type="number" step="0.01" min="0" className="input py-1 text-xs w-full" value={inr.selling_price} onChange={(e) => updateCurrencyPrice(p._key, 'INR', { selling_price: e.target.value })} />
                              </td>
                              <td className="px-3 py-1.5">
                                <input type="number" step="0.01" min="0" className="input py-1 text-xs w-full" value={inr.cost_price} onChange={(e) => updateCurrencyPrice(p._key, 'INR', { cost_price: e.target.value })} />
                              </td>
                              <td className="px-3 py-1.5">
                                <input type="number" step="0.01" min="0" className="input py-1 text-xs w-full" value={p.compare_price} onChange={(e) => updateProduct(p._key, { compare_price: e.target.value })} />
                              </td>
                              <td className="px-3 py-1.5">
                                <input className="input py-1 font-mono text-xs w-full" value={p.sku} onChange={(e) => updateProduct(p._key, { sku: e.target.value })} />
                              </td>
                              <td className="px-3 py-1.5">
                                <input className="input py-1 font-mono text-xs w-full" value={p.provider_product_id} onChange={(e) => updateProduct(p._key, { provider_product_id: e.target.value })} />
                              </td>
                              <td className="px-3 py-1.5">
                                <select className="input py-1 text-xs" value={p.status} onChange={(e) => updateProduct(p._key, { status: e.target.value as ProductStatus })}>
                                  <option value="active">Active</option>
                                  <option value="draft">Draft</option>
                                  <option value="inactive">Inactive</option>
                                </select>
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <input type="checkbox" checked={p.is_popular} onChange={(e) => updateProduct(p._key, { is_popular: e.target.checked })} className="rounded border-gray-300" />
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* How-to steps */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">How-to-Top-Up Steps</h2>
              <button onClick={addStep} type="button" className="btn btn-outline btn-sm">
                <Plus className="w-4 h-4 mr-1" />Add Step
              </button>
            </div>
            {steps.length === 0 ? (
              <p className="text-sm text-gray-500">Optional. Add the steps shown to the customer.</p>
            ) : (
              <div className="space-y-3">
                {steps.map((s, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-4">
                      <input className="input" placeholder="Step title" value={s.title} onChange={(e) => updateStep(i, { title: e.target.value })} />
                    </div>
                    <div className="sm:col-span-7">
                      <input className="input" placeholder="Step description" value={s.description} onChange={(e) => updateStep(i, { description: e.target.value })} />
                    </div>
                    <div className="sm:col-span-1">
                      <button type="button" onClick={() => removeStep(i)} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Publishing</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label mb-1.5 block">Status</label>
                <select className="input" value={form.status} onChange={(e) => change('status', e.target.value as GameStatus)}>
                  <option value="draft">Draft — not visible to customers</option>
                  <option value="active">Active — live on site</option>
                  <option value="inactive">Inactive — hidden</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Featured Game</p>
                  <p className="text-xs text-gray-500">Highlight on homepage</p>
                </div>
                <button
                  type="button"
                  onClick={() => change('is_featured', !form.is_featured)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.is_featured ? 'bg-primary-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_featured ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Provider & Currency</h2>
            <div className="space-y-4">
              <div>
                <label className="label mb-1.5 block">Currency Label</label>
                <input className="input" placeholder="Diamonds / UC / Tokens" value={form.currency_label} onChange={(e) => change('currency_label', e.target.value)} />
              </div>
              <div>
                <label className="label mb-1.5 block">Fulfilment Provider</label>
                <select className="input" value={form.provider} onChange={(e) => change('provider', e.target.value as GameProvider)}>
                  <option value="manual">Manual</option>
                  <option value="smile_one">Smile.one</option>
                  <option value="other">Other API</option>
                </select>
              </div>
              {form.provider !== 'manual' && (
                <>
                  <div>
                    <label className="label mb-1.5 block">Provider Game Code</label>
                    <input className="input font-mono text-sm" placeholder="e.g., mobilelegends" value={form.provider_game_code} onChange={(e) => change('provider_game_code', e.target.value)} />
                  </div>
                  <div>
                    <label className="label mb-1.5 block">Region / Server</label>
                    <select className="input" value={form.region} onChange={(e) => change('region', e.target.value)}>
                      {REGIONS.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label mb-1.5 block">
                      SmileCoin Product Code
                      <span className="ml-1 text-xs text-gray-400 font-normal">(player verification)</span>
                    </label>
                    <input
                      className="input font-mono text-sm"
                      placeholder="e.g., Mobile Legends (exact SmileCoin product name)"
                      value={form.smile_coin_product}
                      onChange={(e) => change('smile_coin_product', e.target.value)}
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Leave blank to use the Provider Game Code above. Fill this if SmileCoin returns "Product does not exist" on the game page.
                    </p>
                  </div>
                  {form.provider === 'smile_one' && (
                    <a
                      href="/providers/smile-one"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800 bg-primary-50 rounded-lg px-3 py-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Browse & sync products in Provider Hub
                    </a>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Page Placement</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">Choose which homepage sections feature this game. Applied on Save.</p>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Trending Games</p>
                    <p className="text-xs text-gray-500">Homepage carousel</p>
                  </div>
                </div>
                <button type="button" onClick={() => setPageSections((prev) => ({ ...prev, trending: !prev.trending }))} className={`relative w-11 h-6 rounded-full transition-colors ${pageSections.trending ? 'bg-primary-600' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pageSections.trending ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Exclusive Offers</p>
                    <p className="text-xs text-gray-500">Homepage offers grid</p>
                  </div>
                </div>
                <button type="button" onClick={() => setPageSections((prev) => ({ ...prev, exclusive_offers: !prev.exclusive_offers }))} className={`relative w-11 h-6 rounded-full transition-colors ${pageSections.exclusive_offers ? 'bg-primary-600' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pageSections.exclusive_offers ? 'translate-x-5' : ''}`} />
                </button>
              </div>
              <p className="text-xs text-gray-400">To customise title/image/pricing, visit <a href="/pages/homepage/trending-games" className="text-primary-600 hover:underline">Page Management</a>.</p>
            </div>
          </section>

          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Instructions / Alert</h2>
            <textarea rows={4} className="input h-auto resize-none" placeholder="Optional note shown on the page (e.g., Double Diamonds alert)." value={form.instructions} onChange={(e) => change('instructions', e.target.value)} />
          </section>
        </div>
      </div>

      {/* ── Live Preview Modal ── */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-900">
          <div className="flex items-center justify-between bg-gray-800 px-6 py-3 shrink-0">
            <div className="flex items-center gap-4">
              <h3 className="text-white font-semibold text-sm">Live Preview: {form.name || 'Untitled Game'}</h3>
              <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
                {[
                  { key: 'desktop' as const, Icon: Monitor, label: 'Desktop' },
                  { key: 'tablet' as const, Icon: Tablet, label: 'Tablet' },
                  { key: 'mobile' as const, Icon: Smartphone, label: 'Mobile' },
                ].map(({ key, Icon, label }) => (
                  <button key={key} onClick={() => setPreviewDevice(key)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${previewDevice === key ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'}`}>
                    <Icon className="w-3.5 h-3.5" />{label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-500">Unsaved changes are reflected here</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowPreview(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-gray-700 py-6 px-4 flex items-start justify-center">
            <div
              className="bg-white rounded-lg overflow-hidden shadow-2xl transition-all duration-300"
              style={{
                width: previewDevice === 'desktop' ? '100%' : previewDevice === 'tablet' ? '768px' : '375px',
                maxWidth: '100%',
                minHeight: '600px',
              }}
            >
              {/* ── Mock Game Page ── */}
              <div className="min-h-screen bg-[linear-gradient(115deg,#fbfaf5_0%,#eef8f7_48%,#faf8f2_100%)] pb-16 text-[#10141f]">
                {/* Top bar */}
                <div className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur border-b border-gray-100">
                  <span className="font-bold text-[#6d4cff]">PixieKat</span>
                  <span className="text-xs text-gray-400">Preview Mode</span>
                </div>

                <div className="mx-auto grid max-w-[1480px] gap-10 px-4 pt-6 md:px-8 md:grid-cols-[394px_minmax(0,1fr)] md:pt-6 lg:px-12">
                  {/* Sidebar */}
                  <aside className="space-y-6">
                    {/* Banner */}
                    {form.banner_url || form.image_url ? (
                      <img
                        src={form.banner_url || form.image_url}
                        alt={form.name}
                        className="h-36 w-full rounded-xl object-cover shadow-lg"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="h-36 w-full rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-gray-400 text-sm">
                        No banner image
                      </div>
                    )}

                    {/* How to steps */}
                    <div className="rounded-2xl bg-white/80 p-5 shadow-sm">
                      <h3 className="text-sm font-bold text-gray-800 mb-3">How to Top Up</h3>
                      <div className="space-y-3">
                        {(steps.length > 0 ? steps : [
                          { title: 'Enter Your ID', description: 'Provide your account details.' },
                          { title: 'Choose Package', description: 'Select a top-up package.' },
                          { title: 'Make Payment', description: 'Choose payment method.' },
                          { title: 'Confirmation', description: 'Items delivered instantly.' },
                        ]).map((step, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#6d4cff] text-xs font-bold text-white">{i + 1}</span>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{step.title}</p>
                              <p className="text-xs text-gray-500">{step.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Instructions */}
                    {form.instructions && (
                      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                        <p className="text-xs font-bold text-amber-700 mb-1">{form.name} Notes</p>
                        <p className="text-xs text-amber-600">{form.instructions}</p>
                      </div>
                    )}
                  </aside>

                  {/* Main content */}
                  <main className="rounded-[28px] bg-white/75 px-4 py-7 shadow-lg backdrop-blur md:px-8 lg:px-9">
                    {/* Title */}
                    <div className="mb-6">
                      <h1 className="text-2xl font-black text-gray-900">{form.name || 'Untitled Game'}</h1>
                      {form.subtitle && <p className="text-sm text-gray-500 mt-1">{form.subtitle}</p>}
                      {form.description && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{form.description}</p>}
                    </div>

                    {/* Account fields */}
                    <section className="mb-7">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6d4cff] text-sm font-bold text-white">1</span>
                        <h2 className="text-base font-bold text-gray-800">Enter Account Details</h2>
                      </div>
                      {fields.length === 0 ? (
                        <p className="text-sm text-gray-400">No account fields configured.</p>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                          {fields.map((field) => (
                            <div key={field._key}>
                              <label className="block">
                                <span className="text-xs font-bold text-[#6d7480]">
                                  {(field.label || 'Field').toUpperCase()}
                                  {field.is_required && <span className="text-red-400"> *</span>}
                                </span>
                                <div className="mt-2 h-14 w-full rounded-xl border border-gray-200 bg-white px-4 flex items-center text-sm text-gray-300">
                                  {field.placeholder || `Enter ${field.label}`}
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Mock verification badge */}
                      {form.provider_game_code && (
                        <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-[#f0edff] px-4 py-3 text-sm font-medium text-[#6d4cff]">
                          <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-[#6d4cff] border-t-transparent" />
                          Player verification will appear here when user types their ID
                        </div>
                      )}
                    </section>

                    {/* Packages */}
                    <section className="mb-7">
                      <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6d4cff] text-sm font-bold text-white">2</span>
                        <h2 className="text-base font-bold text-gray-800">Select the Package</h2>
                      </div>
                      {products.length === 0 ? (
                        <p className="text-sm text-gray-400">No packages configured.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                          {products.map((item) => {
                            const inrPrice = item.currency_prices.INR;
                            const priceStr = inrPrice?.selling_price ? `₹${Number(inrPrice.selling_price).toFixed(2)}` : '—';
                            const compareStr = item.compare_price ? `₹${Number(item.compare_price).toFixed(2)}` : null;
                            return (
                              <div
                                key={item._key}
                                className="relative min-h-[100px] rounded-lg border border-gray-200 bg-white p-3 shadow-sm"
                              >
                                {item.is_popular && (
                                  <span className="absolute -top-2 right-2 rounded-full bg-[#ff7a45] px-2 py-0.5 text-[10px] font-bold text-white">
                                    Popular
                                  </span>
                                )}
                                <div className="flex items-start justify-between gap-2">
                                  {item.image_url ? (
                                    <img src={item.image_url} alt="" className="h-7 w-12 rounded object-cover" />
                                  ) : (
                                    <span className="text-xs font-bold text-gray-300">{form.currency_label}</span>
                                  )}
                                  <div className="text-right">
                                    <p className="text-lg font-black text-gray-900">{priceStr}</p>
                                    {compareStr && <p className="text-xs text-gray-400 line-through">{compareStr}</p>}
                                  </div>
                                </div>
                                <p className="mt-5 text-sm font-medium text-gray-600">{item.name || 'Unnamed package'}</p>
                                {item.amount && <p className="text-xs text-gray-400">{item.amount}</p>}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>

                    {/* Payment section (mock) */}
                    <section>
                      <div className="mb-4 flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#6d4cff] text-sm font-bold text-white">3</span>
                        <h2 className="text-base font-bold text-gray-800">Choose Payment Method</h2>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-2">
                        {['UPI', 'Binance', 'Paytm', 'Mobikwik'].map((method) => (
                          <div key={method} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
                            <div>
                              <p className="text-sm font-bold text-gray-800">{method}</p>
                              <p className="text-xs text-gray-400">Secure online payment</p>
                            </div>
                            <span className="text-sm font-bold text-[#6d4cff]">₹—</span>
                          </div>
                        ))}
                      </div>
                    </section>
                  </main>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameEditor;
