import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, ListOrdered, Plus, Trash2, Layers } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface Step {
  id: number;
  title: string;
  icon: string;
  description: string;
  details: string[];
  image: string;
}

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface Stat {
  value: string;
  label: string;
}

interface HowItWorksSettings {
  heading_prefix: string;
  heading_accent: string;
  subheading: string;
  video_url: string;
  banner_title: string;
  banner_body: string;
  cta_title: string;
  cta_body: string;
  footer_title: string;
  footer_body: string;
  steps: Step[];
  features: Feature[];
  stats: Stat[];
}

const defaultSettings: HowItWorksSettings = {
  heading_prefix: 'How it',
  heading_accent: 'works?',
  subheading:
    'Top up your favorite games instantly, securely, and at the best prices — from start to finish.',
  video_url: '',
  banner_title: 'What is PixieKat?',
  banner_body:
    'PixieKat is your trusted, instant game top-up platform. We deliver in-game credits, diamonds, and currency directly to your account — no login required, no delays.',
  cta_title: 'Ready to top up?',
  cta_body:
    'Join thousands of gamers who trust PixieKat for fast, secure top-ups every time.',
  footer_title: 'Stop waiting.\nStart playing.',
  footer_body:
    'Top up your favorite game in under 5 minutes — no account sharing, no delays, just instant delivery straight to your account.',
  steps: [
    {
      id: 1,
      title: 'Pick Your Game',
      icon: '🎮',
      description: 'Browse 50+ supported titles and select the game you want to top up.',
      details: ['MLBB, PUBG, Free Fire & more', 'New titles added every week', 'All officially supported games', 'Search or filter by category'],
      image: '🎯',
    },
    {
      id: 2,
      title: 'Choose Package',
      icon: '💎',
      description: 'Select a top-up amount — from starter packs to premium bundles at the best prices.',
      details: ['Flexible denomination options', 'Bonus rewards on select packages', 'Member-exclusive discounts', 'Zero hidden fees, always'],
      image: '💰',
    },
    {
      id: 3,
      title: 'Enter Game Details',
      icon: '📝',
      description: 'Type in your Game ID and server. We guide you every step of the way.',
      details: ['Enter your Game ID / User ID', 'Select server if required', 'We help you locate your ID', 'Details verified before processing'],
      image: '🔍',
    },
    {
      id: 4,
      title: 'Secure Checkout',
      icon: '💳',
      description: 'Pay using your preferred method. Every transaction is SSL-encrypted and safe.',
      details: ['UPI, Cards, Net Banking & Wallets', 'SSL-encrypted checkout', 'Instant payment confirmation', 'No data stored after purchase'],
      image: '🔒',
    },
    {
      id: 5,
      title: 'Instant Delivery',
      icon: '⚡',
      description: 'Credits land in your game account within minutes. No waiting, no hassle.',
      details: ['Average delivery: 2–5 minutes', 'Real-time order tracking', '24/7 support if needed', '99.9% successful delivery rate'],
      image: '🎉',
    },
  ],
  features: [
    { icon: '⚡', title: 'Instant Delivery', description: 'Most orders fulfilled within 2–5 minutes, guaranteed.' },
    { icon: '🛡️', title: '100% Secure', description: 'Bank-grade SSL encryption on every single transaction.' },
    { icon: '💰', title: 'Best Prices', description: 'Competitive rates and exclusive member-only deals.' },
    { icon: '🎯', title: '99.9% Success Rate', description: 'Industry-leading delivery success across all games.' },
    { icon: '📱', title: '24/7 Support', description: 'Real humans ready to help you around the clock.' },
    { icon: '🎁', title: 'Bonus Rewards', description: 'Earn extra credits and gifts with every purchase.' },
  ],
  stats: [
    { value: '5,000+', label: 'Happy Gamers' },
    { value: '50+', label: 'Games Supported' },
    { value: '99.9%', label: 'Success Rate' },
    { value: '~2 Min', label: 'Avg. Delivery' },
  ],
};

const TextInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  helpText?: string;
}> = ({ label, value, onChange, placeholder, multiline, rows = 3, helpText }) => (
  <div>
    <label className="label mb-1.5 block">{label}</label>
    {multiline ? (
      <textarea className="input min-h-[60px]" rows={rows} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <input className="input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    )}
    {helpText && <p className="mt-1 text-xs text-gray-400">{helpText}</p>}
  </div>
);

function mergeSettings(raw: Partial<HowItWorksSettings> | null | undefined): HowItWorksSettings {
  if (!raw || Object.keys(raw).length === 0) return defaultSettings;
  return {
    ...defaultSettings,
    ...raw,
    steps: Array.isArray(raw.steps) && raw.steps.length > 0
      ? raw.steps.map((s, i) => ({
          id: s.id ?? i + 1,
          title: s.title ?? '',
          icon: s.icon ?? '',
          description: s.description ?? '',
          details: Array.isArray(s.details) ? s.details : [],
          image: s.image ?? '',
        }))
      : defaultSettings.steps,
    features: Array.isArray(raw.features) && raw.features.length > 0 ? raw.features : defaultSettings.features,
    stats: Array.isArray(raw.stats) && raw.stats.length > 0 ? raw.stats : defaultSettings.stats,
  };
}

const HowItWorksEditor: React.FC = () => {
  const [settings, setSettings] = useState<HowItWorksSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_settings')
      .select('how_it_works_settings')
      .maybeSingle();

    if (error) toast.error(error.message);
    else setSettings(mergeSettings(data?.how_it_works_settings as Partial<HowItWorksSettings>));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('store_settings')
      .upsert({ id: true, how_it_works_settings: settings }, { onConflict: 'id' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('How It Works settings saved');
  };

  const setField = <K extends keyof HowItWorksSettings>(key: K, value: HowItWorksSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const updateStep = (index: number, patch: Partial<Step>) =>
    setSettings((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));

  const addStep = () =>
    setSettings((prev) => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          id: Math.max(0, ...prev.steps.map((s) => s.id)) + 1,
          title: 'New Step',
          icon: '✨',
          description: '',
          details: [],
          image: '📌',
        },
      ],
    }));

  const removeStep = (index: number) =>
    setSettings((prev) => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));

  const updateFeature = (index: number, patch: Partial<Feature>) =>
    setSettings((prev) => ({
      ...prev,
      features: prev.features.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }));

  const addFeature = () =>
    setSettings((prev) => ({
      ...prev,
      features: [...prev.features, { icon: '✨', title: 'New Feature', description: '' }],
    }));

  const removeFeature = (index: number) =>
    setSettings((prev) => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));

  const updateStat = (index: number, patch: Partial<Stat>) =>
    setSettings((prev) => ({
      ...prev,
      stats: prev.stats.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }));

  const addStat = () =>
    setSettings((prev) => ({ ...prev, stats: [...prev.stats, { value: '0', label: 'New Stat' }] }));

  const removeStat = (index: number) =>
    setSettings((prev) => ({ ...prev, stats: prev.stats.filter((_, i) => i !== index) }));

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading How It Works settings…</div>;
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <ListOrdered className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">How It Works Editor</h1>
            <p className="text-sm text-gray-500">Steps, features, stats, banners & copy for /how-it-works</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={load} disabled={loading} className="btn btn-outline btn-md">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn btn-primary btn-md">
            {saving ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </motion.div>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Page Header</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="Heading Prefix" value={settings.heading_prefix} onChange={(v) => setField('heading_prefix', v)} />
          <TextInput label="Heading Accent" value={settings.heading_accent} onChange={(v) => setField('heading_accent', v)} />
        </div>
        <TextInput label="Subheading" value={settings.subheading} onChange={(v) => setField('subheading', v)} multiline rows={2} />
        <TextInput label="Video URL" value={settings.video_url} onChange={(v) => setField('video_url', v)} placeholder="https://..." helpText="Optional video for the banner play button" />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Steps</h2>
          </div>
          <button type="button" onClick={addStep} className="btn btn-outline btn-sm">
            <Plus className="mr-1 h-4 w-4" />Add Step
          </button>
        </div>
        <div className="space-y-4">
          {settings.steps.map((step, index) => (
            <div key={`${step.id}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Step {index + 1}</span>
                <button type="button" onClick={() => removeStep(index)} className="text-red-500 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <TextInput label="Title" value={step.title} onChange={(v) => updateStep(index, { title: v })} />
                <TextInput label="Icon" value={step.icon} onChange={(v) => updateStep(index, { icon: v })} />
                <TextInput label="Image / Emoji" value={step.image} onChange={(v) => updateStep(index, { image: v })} />
              </div>
              <TextInput label="Description" value={step.description} onChange={(v) => updateStep(index, { description: v })} multiline rows={2} />
              <TextInput
                label="Details (one per line)"
                value={step.details.join('\n')}
                onChange={(v) => updateStep(index, { details: v.split('\n').map((l) => l.trim()).filter(Boolean) })}
                multiline
                rows={4}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Features Carousel</h2>
          <button type="button" onClick={addFeature} className="btn btn-outline btn-sm">
            <Plus className="mr-1 h-4 w-4" />Add Feature
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {settings.features.map((feature, index) => (
            <div key={index} className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-2 relative">
              <button type="button" onClick={() => removeFeature(index)} className="absolute top-3 right-3 text-red-500 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </button>
              <TextInput label="Icon" value={feature.icon} onChange={(v) => updateFeature(index, { icon: v })} />
              <TextInput label="Title" value={feature.title} onChange={(v) => updateFeature(index, { title: v })} />
              <TextInput label="Description" value={feature.description} onChange={(v) => updateFeature(index, { description: v })} multiline rows={2} />
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Dark Banner</h2>
          <TextInput label="Banner Title" value={settings.banner_title} onChange={(v) => setField('banner_title', v)} />
          <TextInput label="Banner Body" value={settings.banner_body} onChange={(v) => setField('banner_body', v)} multiline rows={4} />
        </section>
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">CTA Card</h2>
          <TextInput label="CTA Title" value={settings.cta_title} onChange={(v) => setField('cta_title', v)} />
          <TextInput label="CTA Body" value={settings.cta_body} onChange={(v) => setField('cta_body', v)} multiline rows={3} />
        </section>
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Footer CTA</h2>
          <TextInput label="Footer Title" value={settings.footer_title} onChange={(v) => setField('footer_title', v)} helpText="Use \\n for line breaks" multiline rows={2} />
          <TextInput label="Footer Body" value={settings.footer_body} onChange={(v) => setField('footer_body', v)} multiline rows={3} />
        </section>
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Stats</h2>
            <button type="button" onClick={addStat} className="btn btn-outline btn-sm">
              <Plus className="mr-1 h-4 w-4" />Add Stat
            </button>
          </div>
          {settings.stats.map((stat, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1">
                <TextInput label="Value" value={stat.value} onChange={(v) => updateStat(index, { value: v })} />
              </div>
              <div className="flex-1">
                <TextInput label="Label" value={stat.label} onChange={(v) => updateStat(index, { label: v })} />
              </div>
              <button type="button" onClick={() => removeStat(index)} className="mb-1 text-red-500 hover:text-red-700 p-2">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default HowItWorksEditor;
