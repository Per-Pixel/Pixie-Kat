import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Gamepad2, Plus, Trash2, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import ImageSourceField from '../../components/common/ImageSourceField';

interface ProductSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  cta: string;
  bgGradient: string;
  image: string;
}

interface ProductsPageSettings {
  slides: ProductSlide[];
}

const GRADIENT_OPTIONS = [
  'from-blue-700 via-violet-700 to-indigo-900',
  'from-indigo-700 via-fuchsia-700 to-violet-900',
  'from-orange-600 via-rose-700 to-red-900',
  'from-cyan-700 via-sky-700 to-indigo-900',
  'from-emerald-700 via-teal-700 to-cyan-900',
  'from-rose-700 via-pink-700 to-purple-900',
];

const defaultSlides: ProductSlide[] = [
  {
    id: 1,
    title: 'PIXIEKAT STORE',
    subtitle: 'Official Gaming Platform',
    description:
      'PIXIEKAT STORE is a practical solution for every game lover to buy game vouchers without having to go to a physical store.',
    cta: 'WWW.PIXIEKATSTORE.COM',
    bgGradient: 'from-blue-700 via-violet-700 to-indigo-900',
    image: '/img/hero/game-hero-card.gif',
  },
  {
    id: 2,
    title: 'MOBILE LEGENDS',
    subtitle: 'Top Up Diamonds',
    description:
      'Get instant diamonds for Mobile Legends. Fast, secure, and reliable top-up service with 24/7 support.',
    cta: 'TOP UP NOW',
    bgGradient: 'from-indigo-700 via-fuchsia-700 to-violet-900',
    image: '/img/hero/game-mlbb-card.webp',
  },
  {
    id: 3,
    title: 'PUBG GLOBAL',
    subtitle: 'UC Coins Available',
    description:
      'Purchase UC coins for PUBG Mobile Global. Instant delivery and competitive prices guaranteed.',
    cta: 'BUY UC COINS',
    bgGradient: 'from-orange-600 via-rose-700 to-red-900',
    image: '/img/hero/game-pubg-card.webp',
  },
  {
    id: 4,
    title: 'GENSHIN IMPACT',
    subtitle: 'Genesis Crystals',
    description:
      'Top up Genesis Crystals for Genshin Impact. Safe transactions with instant delivery to your account.',
    cta: 'GET CRYSTALS',
    bgGradient: 'from-cyan-700 via-sky-700 to-indigo-900',
    image: '/img/hero/game-genshin-card.webp',
  },
];

const defaultSettings: ProductsPageSettings = { slides: defaultSlides };

function mergeSettings(raw: Partial<ProductsPageSettings> | null | undefined): ProductsPageSettings {
  if (!raw || !Array.isArray(raw.slides) || raw.slides.length === 0) return defaultSettings;
  return {
    slides: raw.slides.map((s, i) => ({
      id: typeof s.id === 'number' ? s.id : i + 1,
      title: s.title || '',
      subtitle: s.subtitle || '',
      description: s.description || '',
      cta: s.cta || '',
      bgGradient: s.bgGradient || GRADIENT_OPTIONS[0],
      image: s.image || '',
    })),
  };
}

const FieldInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}> = ({ label, value, onChange, placeholder, multiline, rows = 3 }) => (
  <div>
    <label className="label mb-1.5 block">{label}</label>
    {multiline ? (
      <textarea
        className="input min-h-[60px]"
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <input
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )}
  </div>
);

const ProductsPageEditor: React.FC = () => {
  const [settings, setSettings] = useState<ProductsPageSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_settings')
      .select('products_page_settings')
      .maybeSingle();

    if (error) toast.error(error.message);
    else setSettings(mergeSettings(data?.products_page_settings as Partial<ProductsPageSettings>));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('store_settings')
      .upsert({ id: true, products_page_settings: settings }, { onConflict: 'id' });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Products page saved');
  };

  const updateSlide = (index: number, patch: Partial<ProductSlide>) =>
    setSettings((prev) => ({
      ...prev,
      slides: prev.slides.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));

  const addSlide = () =>
    setSettings((prev) => {
      const nextId = prev.slides.reduce((max, s) => Math.max(max, s.id), 0) + 1;
      return {
        slides: [
          ...prev.slides,
          {
            id: nextId,
            title: 'NEW SLIDE',
            subtitle: '',
            description: '',
            cta: 'LEARN MORE',
            bgGradient: GRADIENT_OPTIONS[nextId % GRADIENT_OPTIONS.length],
            image: '',
          },
        ],
      };
    });

  const removeSlide = (index: number) =>
    setSettings((prev) => {
      if (prev.slides.length <= 1) {
        toast.error('Keep at least one slide');
        return prev;
      }
      return { slides: prev.slides.filter((_, i) => i !== index) };
    });

  const moveSlide = (index: number, dir: -1 | 1) =>
    setSettings((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.slides.length) return prev;
      const slides = [...prev.slides];
      [slides[index], slides[target]] = [slides[target], slides[index]];
      return { slides };
    });

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading products page…</div>;
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link to="/pages" className="hover:text-primary-600">
              Content
            </Link>
            <span>/</span>
            <span className="text-gray-600">Products Page</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-primary-600" />
            Products Page Editor
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Hero carousel slides for the client{' '}
            <a
              href="/games"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-primary-600 hover:underline"
            >
              /games <ExternalLink className="w-3 h-3" />
            </a>{' '}
            page. Stored in <code className="text-xs bg-gray-100 px-1 rounded">products_page_settings</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={load} className="btn btn-outline btn-md flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" /> Reload
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="btn btn-primary btn-md flex items-center gap-1.5"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </motion.div>

      <div className="space-y-4">
        {settings.slides.map((slide, index) => (
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/80">
              <h2 className="font-semibold text-gray-900 text-sm">
                Slide {index + 1}
                {slide.title ? (
                  <span className="font-normal text-gray-400 ml-2 truncate">{slide.title}</span>
                ) : null}
              </h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => moveSlide(index, -1)}
                  disabled={index === 0}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30"
                  aria-label="Move up"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveSlide(index, 1)}
                  disabled={index === settings.slides.length - 1}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30"
                  aria-label="Move down"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeSlide(index)}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-50"
                  aria-label="Remove slide"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <FieldInput
                  label="Title"
                  value={slide.title}
                  onChange={(v) => updateSlide(index, { title: v })}
                  placeholder="PIXIEKAT STORE"
                />
                <FieldInput
                  label="Subtitle"
                  value={slide.subtitle}
                  onChange={(v) => updateSlide(index, { subtitle: v })}
                  placeholder="Official Gaming Platform"
                />
                <FieldInput
                  label="Description"
                  value={slide.description}
                  onChange={(v) => updateSlide(index, { description: v })}
                  multiline
                  rows={3}
                />
                <FieldInput
                  label="CTA label"
                  value={slide.cta}
                  onChange={(v) => updateSlide(index, { cta: v })}
                  placeholder="TOP UP NOW"
                />
                <div>
                  <label className="label mb-1.5 block">Background gradient</label>
                  <select
                    className="input"
                    value={slide.bgGradient}
                    onChange={(e) => updateSlide(index, { bgGradient: e.target.value })}
                  >
                    {GRADIENT_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                    {!GRADIENT_OPTIONS.includes(slide.bgGradient) && (
                      <option value={slide.bgGradient}>{slide.bgGradient}</option>
                    )}
                  </select>
                  <div className={`mt-2 h-8 rounded-lg bg-gradient-to-r ${slide.bgGradient}`} />
                </div>
              </div>
              <ImageSourceField
                label="Slide image"
                value={slide.image}
                onChange={(url) => updateSlide(index, { image: url })}
                folder="products-page"
                placeholder="/img/hero/game-hero-card.gif"
                previewClassName="h-40 w-full max-w-sm"
              />
            </div>
          </motion.div>
        ))}
      </div>

      <button
        type="button"
        onClick={addSlide}
        className="btn btn-outline btn-md flex items-center gap-1.5"
      >
        <Plus className="w-4 h-4" /> Add slide
      </button>
    </div>
  );
};

export default ProductsPageEditor;
