import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Sparkles, Eye, EyeOff, Plus, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import ImageSourceField from '../../../components/common/ImageSourceField';

const COLUMN = 'event_jjk_cheaper_settings';
const STOREFRONT_BASE = (import.meta.env.VITE_MAIN_SITE_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:5173';
const PREVIEW_PATH = '/event/jjk-cheaper?preview=1';

type SectionKey =
  | 'nav'
  | 'hero'
  | 'showcase'
  | 'story'
  | 'route'
  | 'breakdown'
  | 'faq'
  | 'cta';

interface JjkSettings {
  status: 'draft' | 'published';
  slug: string;
  seo: { title: string; description: string };
  visibleSections: Record<SectionKey, boolean>;
  placement: {
    homepage_banner: boolean;
    games_page: boolean;
    navbar: boolean;
    direct_url_only: boolean;
    promo_title: string;
    promo_image: string;
  };
  hero: Record<string, string>;
  skins: Array<{
    id: string;
    hero: string;
    sorcerer: string;
    accent: string;
    portrait: string;
    thumbnail: string;
    imagePosition: string;
  }>;
  stats: Array<{ label: string; value: string; helper: string }>;
  phases: Array<{
    id: string;
    label: string;
    title: string;
    dateLabel: string;
    summary: string;
    checkpoint: string;
    cumulativeDraws: number;
    targetId: string;
  }>;
  routeSteps: Array<{
    id: string;
    dateLabel: string;
    title: string;
    kicker: string;
    action: string;
    diamonds: string;
    tokens: string;
    recharge: string;
    cumulativeDraws: number;
  }>;
  breakdown: {
    heading: string;
    equation_label: string;
    equation: string;
    total_label: string;
    total_value: string;
    rules: Array<{ label: string; helper: string }>;
    milestones: Array<{ draws: number; reward: string; includedInRoute: boolean }>;
    safety_title: string;
    safety_body: string;
  };
  faq: { heading: string; items: Array<{ q: string; a: string }> };
  cta: { heading: string; body: string; button_label: string; button_href: string };
  nav: {
    file_code: string;
    archive_label: string;
    store_label: string;
    links: Array<{ id: string; label: string; href: string }>;
  };
}

const SECTION_LABELS: Array<{ key: SectionKey; label: string }> = [
  { key: 'nav', label: 'Sticky archive nav' },
  { key: 'hero', label: 'Hero / cover' },
  { key: 'showcase', label: 'Skin showcase' },
  { key: 'story', label: 'Phase story scroll' },
  { key: 'route', label: 'Mission log / route' },
  { key: 'breakdown', label: 'Cost file' },
  { key: 'faq', label: 'Warning / FAQ' },
  { key: 'cta', label: 'Bottom CTA' },
];

const defaultSettings: JjkSettings = {
  status: 'draft',
  slug: 'jjk-cheaper',
  seo: {
    title: 'MLBB x Jujutsu Kaisen Cheaper Route Guide | PixieKat',
    description:
      'PixieKat cheaper-route guide for the MLBB x Jujutsu Kaisen event — phases, draws, and spend ceiling.',
  },
  visibleSections: {
    nav: true,
    hero: true,
    showcase: true,
    story: true,
    route: true,
    breakdown: true,
    faq: true,
    cta: true,
  },
  placement: {
    homepage_banner: false,
    games_page: false,
    navbar: false,
    direct_url_only: true,
    promo_title: 'Jujutsu Kaisen - Cheaper Guide',
    promo_image: '/img/games/mobile-legends.webp',
  },
  nav: {
    file_code: 'PK / FILE 081',
    archive_label: 'Cursed Archive',
    store_label: 'Exit archive →',
    links: [
      { id: 'jjk-event-guide', label: 'Cover', href: '#jjk-event-guide' },
      { id: 'jjk-phase-story', label: 'Phase Story', href: '#jjk-phase-story' },
      { id: 'jjk-route-planner', label: 'Mission Log', href: '#jjk-route-planner' },
      { id: 'jjk-costs', label: 'Cost File', href: '#jjk-costs' },
      { id: 'jjk-faq', label: 'Warning', href: '#jjk-faq' },
    ],
  },
  hero: {
    collab_mark: 'MLBB × JUJUTSU KAISEN',
    eyebrow: 'PixieKat mission archive / classified route',
    title_line1: 'Cursed',
    title_line2: 'Jujutsu Kaisen',
    summary: '121 draws. Maximum 2,100D.',
    primary_cta: 'Open mission log',
    primary_href: '#jjk-route-planner',
    secondary_cta: 'Recharge',
    secondary_href: '/games',
    date_range_label: 'August 7 - September 5, 2026',
    start_iso: '2026-08-07',
    end_iso: '2026-09-05',
    window_label: 'Operation window',
  },
  skins: [
    { id: 'yuji', hero: 'Yin', sorcerer: 'Yuji Itadori', accent: '#ff3b5c', portrait: '', thumbnail: '', imagePosition: '50% 36%' },
    { id: 'gojo', hero: 'Xavier', sorcerer: 'Satoru Gojo', accent: '#3ec6ee', portrait: '', thumbnail: '', imagePosition: '50% 34%' },
    { id: 'megumi', hero: 'Julian', sorcerer: 'Megumi Fushiguro', accent: '#7a4cff', portrait: '', thumbnail: '', imagePosition: '50% 36%' },
    { id: 'nobara', hero: 'Melissa', sorcerer: 'Nobara Kugisaki', accent: '#ef3340', portrait: '', thumbnail: '', imagePosition: '50% 32%' },
  ],
  stats: [
    { label: 'Daily draw', value: '25D', helper: '50% off the regular 50D single draw' },
    { label: '10× draw', value: '450D', helper: 'Three planned bundles across the full route' },
    { label: 'Route draws', value: '121', helper: 'Ceiling for the cheaper path' },
    { label: 'Max spend', value: '2,100D', helper: 'Stop earlier if the skin drops' },
  ],
  phases: [
    { id: 'preparation', label: 'Phase 01 / Preparation', title: 'Open the barrier', dateLabel: 'Aug 7-17', summary: 'Stack the Weekly Passes. Use only the discounted singles. Save the burst.', checkpoint: '13 draws ready', cumulativeDraws: 13, targetId: 'yuji' },
    { id: 'premium-supply-one', label: 'Phase 02 / Premium Supply I', title: 'Release the first domain', dateLabel: 'Aug 18', summary: 'Daily draw, discounted 10x, then every Phase 1 token. One clean burst.', checkpoint: '54 draws secured', cumulativeDraws: 54, targetId: 'gojo' },
    { id: 'black-flash', label: 'Phase 03 / Black Flash', title: 'Hold the cursed energy', dateLabel: 'Aug 19-24', summary: 'Return to daily singles. Complete the second recharge without overspending.', checkpoint: '60 draw milestone', cumulativeDraws: 60, targetId: 'megumi' },
    { id: 'premium-supply-two', label: 'Phase 04 / Premium Supply II', title: 'Strike the second burst', dateLabel: 'Aug 25', summary: 'Use the second discounted 10x and all 29 Phase 2 tokens in one move.', checkpoint: '100 draws reached', cumulativeDraws: 100, targetId: 'nobara' },
    { id: 'final-domain', label: 'Phase 05 / Final Domain', title: 'Finish only if needed', dateLabel: 'Aug 26-Sep 5', summary: 'Ten daily singles. Use the last 10x only if the skin has not dropped.', checkpoint: '121 draw ceiling', cumulativeDraws: 121, targetId: 'yuji' },
  ],
  routeSteps: [
    { id: 'aug-07-setup', dateLabel: 'Aug 7', title: 'Open the Domain', kicker: 'Start with passes', action: 'Recharge 3 Weekly Diamond Passes, claim rebate tokens, then take the discounted daily draw.', diamonds: '25D draw', tokens: '2 rebate tokens', recharge: '3 Weekly Passes', cumulativeDraws: 3 },
    { id: 'aug-18-phase-one-burst', dateLabel: 'Aug 18', title: 'Phase 1: Domain Burst', kicker: 'First major push', action: 'Daily draw, discounted 10x, then Phase 1 tokens + milestone token.', diamonds: '25D + 450D', tokens: '29 supply + 1 milestone', recharge: '', cumulativeDraws: 54 },
    { id: 'aug-25-phase-two-burst', dateLabel: 'Aug 25', title: 'Phase 2: Black Flash', kicker: 'Second major push', action: 'Daily draw, discounted 10x, then all Phase 2 tokens.', diamonds: '25D + 450D', tokens: '29 supply tokens', recharge: '', cumulativeDraws: 100 },
    { id: 'sep-05-finish', dateLabel: 'Sep 5', title: 'Unlimited Void Finish', kicker: 'Stop if the skin drops', action: 'Final recharge + discounted draws only if Crests are still needed.', diamonds: '500D + 25D + 450D', tokens: '', recharge: '500 Diamonds', cumulativeDraws: 121 },
  ],
  breakdown: {
    heading: 'Cost File',
    equation_label: 'Cheaper route ceiling',
    equation: 'Daily singles + 3× discounted 10x + planned recharges',
    total_label: 'Maximum spend',
    total_value: '2,100D',
    rules: [
      { label: 'First draw each day', helper: '50% off the regular 50D single draw' },
      { label: 'Discounted 10x', helper: 'Three planned bundles across the full route' },
      { label: 'Skin exchange target', helper: 'Crests are drop-dependent, not guaranteed by 121 draws' },
    ],
    milestones: [
      { draws: 10, reward: '1 permanent collaboration reward', includedInRoute: true },
      { draws: 20, reward: '1 Cursed Charm Token', includedInRoute: true },
      { draws: 60, reward: '1 Magic Wheel Potion', includedInRoute: true },
      { draws: 130, reward: '10 Cursed Charm Tokens', includedInRoute: false },
    ],
    safety_title: 'Stop rule',
    safety_body: 'If the collaboration skin drops before the ceiling, stop spending. This guide is a spend ceiling, not a guarantee.',
  },
  faq: {
    heading: 'Warning / FAQ',
    items: [
      { q: 'Is 121 draws a guarantee?', a: 'No. Crests and skin exchange rates are drop-dependent. 121 is the planned cheaper ceiling.' },
      { q: 'Should I buy extra draws early?', a: 'No. Save burst spending for Premium Supply windows and discounted 10x slots only.' },
      { q: 'When should I top up on PixieKat?', a: 'Before each recharge / Premium Supply checkpoint so diamonds are ready for the planned burst.' },
    ],
  },
  cta: {
    heading: 'Ready to run the route?',
    body: 'Top up diamonds on PixieKat before each phase burst so the cheaper path stays on schedule.',
    button_label: 'Top up MLBB diamonds',
    button_href: '/games',
  },
};

function deepMerge(base: Record<string, unknown>, raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const current = base[key];
    if (Array.isArray(value)) {
      out[key] = value.length ? value : current;
    } else if (
      value &&
      typeof value === 'object' &&
      current &&
      typeof current === 'object' &&
      !Array.isArray(current)
    ) {
      out[key] = deepMerge(current as Record<string, unknown>, value);
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

const Field: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}> = ({ label, value, onChange, multiline }) => (
  <div>
    <label className="label mb-1.5 block">{label}</label>
    {multiline ? (
      <textarea className="input min-h-[72px]" rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    )}
  </div>
);

const ToggleRow: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}> = ({ label, checked, onChange, hint }) => (
  <label className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2.5 cursor-pointer hover:bg-gray-50">
    <input
      type="checkbox"
      className="mt-1"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
    />
    <span>
      <span className="block text-sm font-medium text-gray-900">{label}</span>
      {hint ? <span className="block text-xs text-gray-500 mt-0.5">{hint}</span> : null}
    </span>
  </label>
);

const JjkCheaperEditor: React.FC = () => {
  const [settings, setSettings] = useState<JjkSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_settings')
      .select(COLUMN)
      .maybeSingle();

    if (error) toast.error(error.message);
    else {
      const raw = (data as Record<string, unknown> | null)?.[COLUMN];
      setSettings(
        deepMerge(defaultSettings as unknown as Record<string, unknown>, raw) as unknown as JjkSettings
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    const payload = {
      ...settings,
      placement: {
        ...settings.placement,
        direct_url_only:
          !settings.placement.homepage_banner &&
          !settings.placement.games_page &&
          !settings.placement.navbar,
      },
    };
    const { error } = await supabase
      .from('store_settings')
      .upsert({ id: true, [COLUMN]: payload }, { onConflict: 'id' });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSettings(payload);
    toast.success(
      payload.status === 'published'
        ? 'Saved — page is LIVE on /event/jjk-cheaper'
        : 'Saved — still draft (hidden on storefront)'
    );
  };

  const openPreview = () => {
    const url = `${STOREFRONT_BASE}${PREVIEW_PATH}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading JJK cheaper guide…</div>;
  }

  const published = settings.status === 'published';

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link to="/pages" className="hover:text-primary-600">Content</Link>
            <span>/</span>
            <span className="text-gray-600">JJK Cheaper Guide</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-rose-600" />
            JJK Cheaper Guide Editor
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Kazuki-inspired cheaper-route archive for{' '}
            <code className="text-xs bg-gray-100 px-1 rounded">/event/jjk-cheaper</code>.
            Stored in <code className="text-xs bg-gray-100 px-1 rounded">{COLUMN}</code>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={load} className="btn btn-outline btn-md flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4" /> Reload
          </button>
          <button
            type="button"
            onClick={openPreview}
            className="btn btn-outline btn-md flex items-center gap-1.5"
            title="Opens storefront draft preview (?preview=1). Save first to see latest changes."
          >
            <ExternalLink className="w-4 h-4" /> Preview
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn btn-primary btn-md flex items-center gap-1.5">
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save
          </button>
        </div>
      </motion.div>

      {/* Publish + placements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Visibility</h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                published ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
              }`}
            >
              {published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              {published ? 'Published' : 'Draft — hidden'}
            </span>
          </div>
          <select
            className="input"
            value={settings.status}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                status: e.target.value as 'draft' | 'published',
              }))
            }
          >
            <option value="draft">Draft (not shown on storefront)</option>
            <option value="published">Published (public URL works)</option>
          </select>
          <p className="text-xs text-gray-500">
            Keep Draft while you edit. Publishing enables the public route; placement toggles control where promo cards appear.
          </p>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-gray-900">Show this event on</h2>
          <ToggleRow
            label="Homepage exclusive offers"
            checked={settings.placement.homepage_banner}
            onChange={(v) => setSettings((p) => ({ ...p, placement: { ...p.placement, homepage_banner: v } }))}
            hint="Prepends a promo card in Exclusive Offers (requires Published)."
          />
          <ToggleRow
            label="Games catalog grid"
            checked={settings.placement.games_page}
            onChange={(v) => setSettings((p) => ({ ...p, placement: { ...p.placement, games_page: v } }))}
            hint="Shows an Event card at the start of /games."
          />
          <ToggleRow
            label="Main navbar link"
            checked={settings.placement.navbar}
            onChange={(v) => setSettings((p) => ({ ...p, placement: { ...p.placement, navbar: v } }))}
            hint="Adds a desktop nav link using the promo title."
          />
          <Field
            label="Promo title"
            value={settings.placement.promo_title}
            onChange={(v) => setSettings((p) => ({ ...p, placement: { ...p.placement, promo_title: v } }))}
          />
          <ImageSourceField
            label="Promo image"
            value={settings.placement.promo_image}
            onChange={(url) => setSettings((p) => ({ ...p, placement: { ...p.placement, promo_image: url } }))}
            folder="events/jjk-cheaper"
            previewClassName="h-28 w-full max-w-xs"
          />
        </section>
      </div>

      {/* Page sections visibility */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Page sections to render</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {SECTION_LABELS.map(({ key, label }) => (
            <ToggleRow
              key={key}
              label={label}
              checked={settings.visibleSections[key]}
              onChange={(v) =>
                setSettings((p) => ({
                  ...p,
                  visibleSections: { ...p.visibleSections, [key]: v },
                }))
              }
            />
          ))}
        </div>
      </section>

      {/* Hero */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Hero / Cover</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(
            [
              ['collab_mark', 'Collab mark'],
              ['eyebrow', 'Eyebrow'],
              ['title_line1', 'Title line 1'],
              ['title_line2', 'Title line 2'],
              ['summary', 'Summary'],
              ['primary_cta', 'Primary CTA'],
              ['primary_href', 'Primary href'],
              ['secondary_cta', 'Secondary CTA'],
              ['secondary_href', 'Secondary href'],
              ['window_label', 'Window label'],
              ['date_range_label', 'Date range label'],
              ['start_iso', 'Start ISO (YYYY-MM-DD)'],
              ['end_iso', 'End ISO (YYYY-MM-DD)'],
            ] as const
          ).map(([key, label]) => (
            <Field
              key={key}
              label={label}
              value={settings.hero[key] || ''}
              onChange={(v) => setSettings((p) => ({ ...p, hero: { ...p.hero, [key]: v } }))}
              multiline={key === 'summary'}
            />
          ))}
        </div>
      </section>

      {/* Skins */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Skin targets</h2>
          <button
            type="button"
            className="btn btn-outline btn-sm flex items-center gap-1"
            onClick={() =>
              setSettings((p) => ({
                ...p,
                skins: [
                  ...p.skins,
                  {
                    id: `skin-${Date.now()}`,
                    hero: 'Hero',
                    sorcerer: 'Sorcerer',
                    accent: '#ef3340',
                    portrait: '',
                    thumbnail: '',
                    imagePosition: '50% 40%',
                  },
                ],
              }))
            }
          >
            <Plus className="w-3.5 h-3.5" /> Add skin
          </button>
        </div>
        {settings.skins.map((skin, index) => (
          <div key={skin.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800">Skin {index + 1}</h3>
                <button
                  type="button"
                  className="text-red-500 hover:text-red-700 p-1"
                  onClick={() =>
                    setSettings((p) => ({ ...p, skins: p.skins.filter((_, i) => i !== index) }))
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <Field label="ID" value={skin.id} onChange={(v) => setSettings((p) => ({ ...p, skins: p.skins.map((s, i) => (i === index ? { ...s, id: v } : s)) }))} />
              <Field label="MLBB hero" value={skin.hero} onChange={(v) => setSettings((p) => ({ ...p, skins: p.skins.map((s, i) => (i === index ? { ...s, hero: v } : s)) }))} />
              <Field label="Sorcerer" value={skin.sorcerer} onChange={(v) => setSettings((p) => ({ ...p, skins: p.skins.map((s, i) => (i === index ? { ...s, sorcerer: v } : s)) }))} />
              <Field label="Accent color" value={skin.accent} onChange={(v) => setSettings((p) => ({ ...p, skins: p.skins.map((s, i) => (i === index ? { ...s, accent: v } : s)) }))} />
              <Field label="Image position" value={skin.imagePosition} onChange={(v) => setSettings((p) => ({ ...p, skins: p.skins.map((s, i) => (i === index ? { ...s, imagePosition: v } : s)) }))} />
            </div>
            <div className="space-y-3">
              <ImageSourceField
                label="Portrait"
                value={skin.portrait}
                onChange={(url) => setSettings((p) => ({ ...p, skins: p.skins.map((s, i) => (i === index ? { ...s, portrait: url } : s)) }))}
                folder="events/jjk-cheaper"
                previewClassName="h-40 w-full max-w-sm"
              />
              <ImageSourceField
                label="Thumbnail"
                value={skin.thumbnail}
                onChange={(url) => setSettings((p) => ({ ...p, skins: p.skins.map((s, i) => (i === index ? { ...s, thumbnail: url } : s)) }))}
                folder="events/jjk-cheaper"
                previewClassName="h-28 w-full max-w-xs"
              />
            </div>
          </div>
        ))}
      </section>

      {/* Phases */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Phase story</h2>
        {settings.phases.map((phase, index) => (
          <div key={phase.id} className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Label" value={phase.label} onChange={(v) => setSettings((p) => ({ ...p, phases: p.phases.map((x, i) => (i === index ? { ...x, label: v } : x)) }))} />
            <Field label="Title" value={phase.title} onChange={(v) => setSettings((p) => ({ ...p, phases: p.phases.map((x, i) => (i === index ? { ...x, title: v } : x)) }))} />
            <Field label="Date label" value={phase.dateLabel} onChange={(v) => setSettings((p) => ({ ...p, phases: p.phases.map((x, i) => (i === index ? { ...x, dateLabel: v } : x)) }))} />
            <Field label="Checkpoint" value={phase.checkpoint} onChange={(v) => setSettings((p) => ({ ...p, phases: p.phases.map((x, i) => (i === index ? { ...x, checkpoint: v } : x)) }))} />
            <Field label="Target skin id" value={phase.targetId} onChange={(v) => setSettings((p) => ({ ...p, phases: p.phases.map((x, i) => (i === index ? { ...x, targetId: v } : x)) }))} />
            <Field
              label="Cumulative draws"
              value={String(phase.cumulativeDraws)}
              onChange={(v) =>
                setSettings((p) => ({
                  ...p,
                  phases: p.phases.map((x, i) =>
                    i === index ? { ...x, cumulativeDraws: Number(v) || 0 } : x
                  ),
                }))
              }
            />
            <div className="md:col-span-2">
              <Field label="Summary" value={phase.summary} multiline onChange={(v) => setSettings((p) => ({ ...p, phases: p.phases.map((x, i) => (i === index ? { ...x, summary: v } : x)) }))} />
            </div>
          </div>
        ))}
      </section>

      {/* Route steps */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Mission log steps</h2>
          <button
            type="button"
            className="btn btn-outline btn-sm flex items-center gap-1"
            onClick={() =>
              setSettings((p) => ({
                ...p,
                routeSteps: [
                  ...p.routeSteps,
                  {
                    id: `step-${Date.now()}`,
                    dateLabel: 'Day',
                    title: 'New step',
                    kicker: '',
                    action: '',
                    diamonds: '',
                    tokens: '',
                    recharge: '',
                    cumulativeDraws: 0,
                  },
                ],
              }))
            }
          >
            <Plus className="w-3.5 h-3.5" /> Add step
          </button>
        </div>
        {settings.routeSteps.map((step, index) => (
          <div key={step.id} className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 space-y-3">
            <div className="flex justify-between">
              <h3 className="text-sm font-semibold text-gray-800">Step {index + 1}</h3>
              <button
                type="button"
                className="text-red-500"
                onClick={() =>
                  setSettings((p) => ({
                    ...p,
                    routeSteps: p.routeSteps.filter((_, i) => i !== index),
                  }))
                }
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Date" value={step.dateLabel} onChange={(v) => setSettings((p) => ({ ...p, routeSteps: p.routeSteps.map((x, i) => (i === index ? { ...x, dateLabel: v } : x)) }))} />
              <Field label="Title" value={step.title} onChange={(v) => setSettings((p) => ({ ...p, routeSteps: p.routeSteps.map((x, i) => (i === index ? { ...x, title: v } : x)) }))} />
              <Field label="Kicker" value={step.kicker} onChange={(v) => setSettings((p) => ({ ...p, routeSteps: p.routeSteps.map((x, i) => (i === index ? { ...x, kicker: v } : x)) }))} />
              <Field
                label="Cumulative draws"
                value={String(step.cumulativeDraws)}
                onChange={(v) =>
                  setSettings((p) => ({
                    ...p,
                    routeSteps: p.routeSteps.map((x, i) =>
                      i === index ? { ...x, cumulativeDraws: Number(v) || 0 } : x
                    ),
                  }))
                }
              />
              <Field label="Diamonds chip" value={step.diamonds} onChange={(v) => setSettings((p) => ({ ...p, routeSteps: p.routeSteps.map((x, i) => (i === index ? { ...x, diamonds: v } : x)) }))} />
              <Field label="Tokens chip" value={step.tokens} onChange={(v) => setSettings((p) => ({ ...p, routeSteps: p.routeSteps.map((x, i) => (i === index ? { ...x, tokens: v } : x)) }))} />
              <div className="md:col-span-2">
                <Field label="Action" value={step.action} multiline onChange={(v) => setSettings((p) => ({ ...p, routeSteps: p.routeSteps.map((x, i) => (i === index ? { ...x, action: v } : x)) }))} />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Breakdown + FAQ + CTA */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Cost file</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Heading" value={settings.breakdown.heading} onChange={(v) => setSettings((p) => ({ ...p, breakdown: { ...p.breakdown, heading: v } }))} />
          <Field label="Total value" value={settings.breakdown.total_value} onChange={(v) => setSettings((p) => ({ ...p, breakdown: { ...p.breakdown, total_value: v } }))} />
          <Field label="Equation" value={settings.breakdown.equation} multiline onChange={(v) => setSettings((p) => ({ ...p, breakdown: { ...p.breakdown, equation: v } }))} />
          <Field label="Safety body" value={settings.breakdown.safety_body} multiline onChange={(v) => setSettings((p) => ({ ...p, breakdown: { ...p.breakdown, safety_body: v } }))} />
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">FAQ</h2>
        {settings.faq.items.map((item, index) => (
          <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-gray-100 p-3">
            <Field label="Question" value={item.q} onChange={(v) => setSettings((p) => ({ ...p, faq: { ...p.faq, items: p.faq.items.map((x, i) => (i === index ? { ...x, q: v } : x)) } }))} />
            <Field label="Answer" value={item.a} multiline onChange={(v) => setSettings((p) => ({ ...p, faq: { ...p.faq, items: p.faq.items.map((x, i) => (i === index ? { ...x, a: v } : x)) } }))} />
          </div>
        ))}
      </section>

      <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-900">Bottom CTA</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Heading" value={settings.cta.heading} onChange={(v) => setSettings((p) => ({ ...p, cta: { ...p.cta, heading: v } }))} />
          <Field label="Button label" value={settings.cta.button_label} onChange={(v) => setSettings((p) => ({ ...p, cta: { ...p.cta, button_label: v } }))} />
          <Field label="Body" value={settings.cta.body} multiline onChange={(v) => setSettings((p) => ({ ...p, cta: { ...p.cta, body: v } }))} />
          <Field label="Button href" value={settings.cta.button_href} onChange={(v) => setSettings((p) => ({ ...p, cta: { ...p.cta, button_href: v } }))} />
        </div>
      </section>
    </div>
  );
};

export default JjkCheaperEditor;
