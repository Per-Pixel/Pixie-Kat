import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Image, Tag, Star } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  createPromoItem,
  updatePromoItem,
  listPromoItems,
  listGames,
  Game,
  PromoItem,
  PromoSection,
} from '../../services/catalogService';
import ImageSourceField from '../../components/common/ImageSourceField';

interface PromoEditorProps {
  section: PromoSection;
  backPath: string;
  sectionLabel: string;
}

interface FormState {
  title: string;
  image_url: string;
  flag: string;
  link_url: string;
  game_id: string;
  rating: string;
  price: string;
  compare_price: string;
  discount_pct: string;
  currency: string;
  is_active: boolean;
}

const empty: FormState = {
  title: '', image_url: '', flag: '', link_url: '', game_id: '',
  rating: '', price: '', compare_price: '', discount_pct: '',
  currency: 'INR', is_active: true,
};

const PromoEditor: React.FC<PromoEditorProps> = ({ section, backPath, sectionLabel }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id) && id !== 'new';

  const [form, setForm] = useState<FormState>(empty);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [games, setGames] = useState<Game[]>([]);

  const change = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const load = useCallback(async () => {
    const [gamesData] = await Promise.all([listGames()]);
    setGames(gamesData);

    if (!isEdit || !id) return;

    setLoading(true);
    try {
      const items = await listPromoItems(section);
      const item = items.find((i) => i.id === id);
      if (!item) {
        toast.error('Item not found');
        navigate(backPath);
        return;
      }
      setForm({
        title: item.title,
        image_url: item.image_url ?? '',
        flag: item.flag ?? '',
        link_url: item.link_url ?? '',
        game_id: item.game_id ?? '',
        rating: item.rating != null ? String(item.rating) : '',
        price: item.price != null ? String(item.price) : '',
        compare_price: item.compare_price != null ? String(item.compare_price) : '',
        discount_pct: item.discount_pct != null ? String(item.discount_pct) : '',
        currency: item.currency ?? 'INR',
        is_active: item.is_active,
      });
    } finally {
      setLoading(false);
    }
  }, [id, isEdit, section, backPath, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const buildPayload = (): Partial<PromoItem> => ({
    section,
    title: form.title.trim(),
    image_url: form.image_url.trim() || null,
    flag: form.flag.trim() || null,
    link_url: form.link_url.trim() || null,
    game_id: form.game_id || null,
    rating: form.rating !== '' ? Number(form.rating) : null,
    price: form.price !== '' ? Number(form.price) : null,
    compare_price: form.compare_price !== '' ? Number(form.compare_price) : null,
    discount_pct: form.discount_pct !== '' ? Number(form.discount_pct) : null,
    currency: form.currency || 'INR',
    is_active: form.is_active,
  });

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit && id) {
        await updatePromoItem(id, payload);
        toast.success('Updated');
      } else {
        await createPromoItem(payload);
        toast.success('Created');
      }
      navigate(backPath);
    } catch (err) {
      toast.error((err as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading…</div>;
  }

  const isTrending = section === 'trending';

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(backPath)} className="p-2 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdit ? 'Edit' : 'Add'} {sectionLabel} Item
            </h1>
            <p className="text-gray-600 mt-1">
              {isTrending
                ? 'Configure the trending game card shown in the homepage carousel'
                : 'Configure a promotional offer card shown in the homepage grid'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <button onClick={() => navigate(backPath)} className="btn btn-outline btn-md">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-md">
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Saving…</>
            ) : (
              <><Save className="w-4 h-4 mr-2" />Save</>
            )}
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Tag className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Content</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label mb-1.5 block">Title <span className="text-red-500">*</span></label>
                <input
                  className="input"
                  placeholder={isTrending ? 'e.g., Black Myth Wukong' : 'e.g., MLBB Leomord Special Pack'}
                  value={form.title}
                  onChange={(e) => change('title', e.target.value)}
                />
              </div>
              <div>
                <label className="label mb-1.5 block">Link to Game (optional)</label>
                <select
                  className="input"
                  value={form.game_id}
                  onChange={(e) => change('game_id', e.target.value)}
                >
                  <option value="">— No linked game —</option>
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">When clicked the card routes to this game's top-up page.</p>
              </div>
              <div>
                <label className="label mb-1.5 block">Override Link URL</label>
                <input
                  className="input"
                  placeholder="/games/mobile-legends"
                  value={form.link_url}
                  onChange={(e) => change('link_url', e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">Overrides the linked game URL if both are set.</p>
              </div>
              {!isTrending && (
                <div>
                  <label className="label mb-1.5 block">Flag / Emoji</label>
                  <input
                    className="input"
                    placeholder="🇮🇳"
                    maxLength={8}
                    value={form.flag}
                    onChange={(e) => change('flag', e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Optional country flag or emoji shown on the card.</p>
                </div>
              )}
            </div>
          </section>

          {/* Image */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <Image className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Image</h2>
            </div>
            <div className="space-y-4">
              <ImageSourceField
                label="Image"
                value={form.image_url}
                onChange={(url) => change('image_url', url)}
                placeholder="/img/games/my-game.webp or https://..."
                folder={`homepage/${section}`}
              />
            </div>
          </section>

          {/* Trending-specific: pricing */}
          {isTrending && (
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-5">
                <Star className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Pricing & Rating</h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label mb-1.5 block">Price</label>
                  <input
                    type="number" step="0.01" min="0" className="input"
                    placeholder="51" value={form.price}
                    onChange={(e) => change('price', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label mb-1.5 block">Compare Price</label>
                  <input
                    type="number" step="0.01" min="0" className="input"
                    placeholder="69" value={form.compare_price}
                    onChange={(e) => change('compare_price', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label mb-1.5 block">Discount %</label>
                  <input
                    type="number" min="0" max="100" className="input"
                    placeholder="15" value={form.discount_pct}
                    onChange={(e) => change('discount_pct', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label mb-1.5 block">Rating (0–100)</label>
                  <input
                    type="number" min="0" max="100" className="input"
                    placeholder="81" value={form.rating}
                    onChange={(e) => change('rating', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label mb-1.5 block">Currency</label>
                  <select className="input" value={form.currency} onChange={(e) => change('currency', e.target.value)}>
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="PKR">PKR (Rs)</option>
                    <option value="BRL">BRL (R$)</option>
                  </select>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Visibility</h2>
            <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Active</p>
                <p className="text-xs text-gray-500">Show on homepage</p>
              </div>
              <button
                type="button"
                onClick={() => change('is_active', !form.is_active)}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-primary-600' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </section>

          {/* Preview */}
          {isTrending ? (
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Card Preview</h2>
              <div className="rounded-xl border-2 border-black bg-transparent p-3 max-w-[200px]">
                <div className="mb-3 overflow-hidden rounded-lg bg-gray-100 h-28">
                  {form.image_url ? (
                    <img src={form.image_url} alt="" className="h-full w-full object-cover object-top" />
                  ) : (
                    <div className="h-full w-full bg-gray-200" />
                  )}
                </div>
                <p className="text-sm font-semibold text-black truncate">{form.title || 'Game Title'}</p>
                <div className="mt-1 flex items-center gap-1 text-xs text-black">
                  <span>⭐</span>
                  <span className="font-bold text-yellow-400">{form.rating || '—'}</span>
                  <span>/100</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  {form.compare_price && <span className="text-xs text-gray-400 line-through">₹{form.compare_price}</span>}
                  <span className="text-sm font-bold text-black">{form.price ? `₹${form.price}` : '—'}</span>
                  {form.discount_pct && <span className="rounded bg-orange-500 px-1 py-0.5 text-[10px] text-white">{form.discount_pct}%</span>}
                </div>
              </div>
            </section>
          ) : (
            <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Card Preview</h2>
              <div className="relative rounded-xl overflow-hidden w-32" style={{ aspectRatio: '15/16' }}>
                <div className="absolute inset-0 bg-gray-200">
                  {form.image_url && <img src={form.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                {form.flag && <span className="absolute right-1 top-1 text-sm">{form.flag}</span>}
                <span className="absolute left-1 top-1 rounded-full bg-lime-400 px-1.5 py-0.5 text-[9px] font-bold text-black">Promo</span>
                <p className="absolute bottom-1 left-1 right-1 text-[10px] font-semibold text-white line-clamp-2 leading-snug">
                  {form.title || 'Offer title'}
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromoEditor;
