import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, RefreshCw, BadgePercent, Plus, Trash2, ExternalLink, Crown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface FaqItem {
  question: string;
  answer: string;
}

interface PricingSettings {
  heading: string;
  subheading: string;
  empty_message: string;
  faqs: FaqItem[];
}

const defaultSettings: PricingSettings = {
  heading: 'Membership Plans',
  subheading:
    'Unlock exclusive benefits and save more on your gaming top-ups with our premium membership plans',
  empty_message: 'No membership plans are available right now. Check back soon.',
  faqs: [
    {
      question: 'Can I change my plan anytime?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect on your next eligible purchase.',
    },
    {
      question: 'Do unused benefits carry over?',
      answer: 'Membership discounts apply while your plan is active. Benefits end when the plan expires unless you renew.',
    },
    {
      question: 'Is there a free trial?',
      answer: 'Membership plans are paid subscriptions. Discounts apply immediately after purchase for the plan duration.',
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept UPI, cards, net banking, digital wallets, and Pixie Wallet balance where available.',
    },
  ],
};

const TextInput: React.FC<{
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
      <textarea className="input min-h-[60px]" rows={rows} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <input className="input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    )}
  </div>
);

function mergeSettings(raw: Partial<PricingSettings> | null | undefined): PricingSettings {
  if (!raw || Object.keys(raw).length === 0) return defaultSettings;
  return {
    ...defaultSettings,
    ...raw,
    faqs: Array.isArray(raw.faqs) && raw.faqs.length > 0 ? raw.faqs : defaultSettings.faqs,
  };
}

const PricingCopyEditor: React.FC = () => {
  const [settings, setSettings] = useState<PricingSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_settings')
      .select('pricing_settings')
      .maybeSingle();

    if (error) toast.error(error.message);
    else setSettings(mergeSettings(data?.pricing_settings as Partial<PricingSettings>));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('store_settings')
      .upsert({ id: true, pricing_settings: settings }, { onConflict: 'id' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Pricing page copy saved');
  };

  const setField = <K extends keyof Omit<PricingSettings, 'faqs'>>(key: K, value: PricingSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const updateFaq = (index: number, patch: Partial<FaqItem>) =>
    setSettings((prev) => ({
      ...prev,
      faqs: prev.faqs.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    }));

  const addFaq = () =>
    setSettings((prev) => ({ ...prev, faqs: [...prev.faqs, { question: '', answer: '' }] }));

  const removeFaq = (index: number) =>
    setSettings((prev) => ({ ...prev, faqs: prev.faqs.filter((_, i) => i !== index) }));

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading pricing copy…</div>;
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <BadgePercent className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pricing Copy Editor</h1>
            <p className="text-sm text-gray-500">Headings, empty state & FAQ copy for /pricing</p>
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

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3 text-sm text-blue-900">
        <div className="flex items-center gap-2 flex-1">
          <Crown className="h-5 w-5 shrink-0 text-blue-600" />
          <p>
            <span className="font-semibold">Plan prices & benefits</span> are managed on the Memberships page — not here.
          </p>
        </div>
        <Link to="/memberships" className="btn btn-outline btn-sm inline-flex items-center gap-1.5 shrink-0 border-blue-300 text-blue-800 hover:bg-blue-100">
          Manage Plans <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Page Copy</h2>
        <TextInput label="Heading" value={settings.heading} onChange={(v) => setField('heading', v)} />
        <TextInput label="Subheading" value={settings.subheading} onChange={(v) => setField('subheading', v)} multiline rows={2} />
        <TextInput
          label="Empty Message"
          value={settings.empty_message}
          onChange={(v) => setField('empty_message', v)}
          multiline
          rows={2}
        />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Pricing FAQs</h2>
          <button type="button" onClick={addFaq} className="btn btn-outline btn-sm">
            <Plus className="mr-1 h-4 w-4" />Add FAQ
          </button>
        </div>
        <div className="space-y-3">
          {settings.faqs.map((faq, index) => (
            <div key={index} className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-2 relative">
              <button type="button" onClick={() => removeFaq(index)} className="absolute top-3 right-3 text-red-500 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </button>
              <TextInput label="Question" value={faq.question} onChange={(v) => updateFaq(index, { question: v })} />
              <TextInput label="Answer" value={faq.answer} onChange={(v) => updateFaq(index, { answer: v })} multiline rows={3} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PricingCopyEditor;
