import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Save, Gamepad2, ListChecks, Package, Plus, Trash2,
  GripVertical, Info, ExternalLink,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  createGame, updateGame, getGameWithRelations, replaceGameFields, replaceProducts,
  Game, GameField, Product, GameFieldType, GameStatus, GameProvider, HowToStep,
} from '../../services/catalogService';
import ImageSourceField from '../../components/common/ImageSourceField';

type FieldDraft = Partial<GameField> & { _key: string };
type ProductDraft = Partial<Product> & { _key: string };

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
  region: '', status: 'draft', is_featured: false, instructions: '',
};

const GameEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [slugTouched, setSlugTouched] = useState(isEdit);

  const [form, setForm] = useState<GameForm>(emptyForm);
  const [steps, setSteps] = useState<HowToStep[]>([]);
  const [fields, setFields] = useState<FieldDraft[]>([]);
  const [products, setProducts] = useState<ProductDraft[]>([]);

  const change = <K extends keyof GameForm>(key: K, value: GameForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const game = await getGameWithRelations(id);
      setForm({
        slug: game.slug, name: game.name, subtitle: game.subtitle ?? '',
        description: game.description ?? '', image_url: game.image_url ?? '',
        banner_url: game.banner_url ?? '', category: game.category ?? '',
        currency_label: game.currency_label, provider: game.provider,
        provider_game_code: game.provider_game_code ?? '', region: game.region ?? '',
        status: game.status, is_featured: game.is_featured, instructions: game.instructions ?? '',
      });
      setSteps(game.how_to_steps ?? []);
      setFields((game.game_fields ?? []).map((f) => ({ ...f, _key: uid() })));
      setProducts((game.products ?? []).map((p) => ({ ...p, _key: uid() })));
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
  const addProduct = () =>
    setProducts((prev) => [
      ...prev,
      { _key: uid(), name: '', amount: '', price: 0, compare_price: undefined, currency: 'INR', is_popular: false, status: 'active' },
    ]);

  const updateProductDraft = (key: string, patch: Partial<ProductDraft>) =>
    setProducts((prev) => prev.map((p) => (p._key === key ? { ...p, ...patch } : p)));

  const removeProduct = (key: string) =>
    setProducts((prev) => prev.filter((p) => p._key !== key));

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
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<Game> = {
        slug: slugify(form.slug),
        name: form.name.trim(),
        subtitle: form.subtitle || null,
        description: form.description || null,
        image_url: form.image_url || null,
        banner_url: form.banner_url || null,
        category: form.category || null,
        currency_label: form.currency_label || 'Diamonds',
        provider: form.provider,
        provider_game_code: form.provider_game_code || null,
        region: form.region || null,
        status: form.status,
        is_featured: form.is_featured,
        instructions: form.instructions || null,
        how_to_steps: steps.filter((s) => s.title.trim()),
      };

      const game = isEdit && id ? await updateGame(id, payload) : await createGame(payload);

      await replaceGameFields(
        game.id,
        fields.map((f) => ({
          field_key: keyify(f.field_key || ''),
          label: f.label,
          field_type: f.field_type ?? 'text',
          placeholder: f.placeholder ?? null,
          help_text: f.help_text ?? null,
          is_required: f.is_required ?? true,
          options: f.options ?? [],
          validation_regex: f.validation_regex ?? null,
        }))
      );

      await replaceProducts(
        game.id,
        products.map((p) => ({
          name: p.name,
          amount: p.amount ?? null,
          description: p.description ?? null,
          price: Number(p.price ?? 0),
          compare_price: p.compare_price != null && p.compare_price !== ('' as unknown) ? Number(p.compare_price) : null,
          currency: p.currency ?? 'INR',
          image_url: p.image_url ?? null,
          sku: p.sku ?? null,
          provider_product_id: p.provider_product_id ?? null,
          stock: p.stock != null ? Number(p.stock) : null,
          is_popular: p.is_popular ?? false,
          status: p.status ?? 'active',
        }))
      );

      toast.success(isEdit ? 'Game updated' : 'Game created');
      navigate('/products/games');
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
            <p className="text-gray-600 mt-1">Configure the game, its input fields and packages</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
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
                        <button type="button" onClick={() => moveField(f._key, -1)} className="text-gray-400 hover:text-gray-700 px-1">↑</button>
                        <button type="button" onClick={() => moveField(f._key, 1)} className="text-gray-400 hover:text-gray-700 px-1">↓</button>
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
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">Packages / Denominations</h2>
              </div>
              <button onClick={addProduct} type="button" className="btn btn-outline btn-sm">
                <Plus className="w-4 h-4 mr-1" />Add Package
              </button>
            </div>

            {products.length === 0 ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-sm text-gray-500">
                No packages yet. Add the top-up amounts customers can buy.
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((p) => (
                  <div key={p._key} className="rounded-lg border border-gray-200 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-4">
                        <label className="label mb-1 block text-xs">Name <span className="text-red-500">*</span></label>
                        <input className="input" placeholder="Diamonds 100 + 10" value={p.name ?? ''} onChange={(e) => updateProductDraft(p._key, { name: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label mb-1 block text-xs">Amount</label>
                        <input className="input" placeholder="110" value={p.amount ?? ''} onChange={(e) => updateProductDraft(p._key, { amount: e.target.value })} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label mb-1 block text-xs">Price</label>
                        <input type="number" step="0.01" min="0" className="input" value={p.price ?? ''} onChange={(e) => updateProductDraft(p._key, { price: e.target.value as unknown as number })} />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label mb-1 block text-xs">Compare</label>
                        <input type="number" step="0.01" min="0" className="input" value={(p.compare_price as number | undefined) ?? ''} onChange={(e) => updateProductDraft(p._key, { compare_price: e.target.value as unknown as number })} />
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-3">
                        <label className="inline-flex items-center gap-1 text-xs text-gray-700">
                          <input type="checkbox" checked={p.is_popular ?? false} onChange={(e) => updateProductDraft(p._key, { is_popular: e.target.checked })} />
                          Popular
                        </label>
                        <button type="button" onClick={() => removeProduct(p._key)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {form.provider !== 'manual' && (
                        <div className="sm:col-span-4">
                          <label className="label mb-1 block text-xs">Provider Product ID</label>
                          <input className="input font-mono text-sm" placeholder="Smile.one denomination id" value={p.provider_product_id ?? ''} onChange={(e) => updateProductDraft(p._key, { provider_product_id: e.target.value })} />
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <ImageSourceField
                        label="Package Image"
                        value={p.image_url ?? ''}
                        onChange={(url) => updateProductDraft(p._key, { image_url: url })}
                        placeholder="/img/promotion/starlight.webp or https://..."
                        folder="products"
                        previewClassName="h-20 w-32"
                      />
                    </div>
                  </div>
                ))}
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Publishing</h2>
            <div className="space-y-4">
              <div>
                <label className="label mb-1.5 block">Status</label>
                <select className="input" value={form.status} onChange={(e) => change('status', e.target.value as GameStatus)}>
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">Featured</p>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Instructions / Alert</h2>
            <textarea rows={4} className="input h-auto resize-none" placeholder="Optional note shown on the page (e.g., Double Diamonds alert)." value={form.instructions} onChange={(e) => change('instructions', e.target.value)} />
          </section>
        </div>
      </div>
    </div>
  );
};

export default GameEditor;
