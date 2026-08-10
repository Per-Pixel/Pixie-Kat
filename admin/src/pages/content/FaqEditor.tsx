import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, HelpCircle, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface FaqQuestion {
  question: string;
  answer: string;
}

interface FaqCategory {
  title: string;
  icon: string;
  questions: FaqQuestion[];
}

interface FaqSettings {
  heading_prefix: string;
  heading_accent: string;
  subheading: string;
  support_title: string;
  support_body: string;
  footer_title: string;
  footer_body: string;
  categories: FaqCategory[];
}

const defaultCategories: FaqCategory[] = [
  {
    title: 'Payment & Billing',
    icon: '💳',
    questions: [
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major payment methods including UPI, Credit/Debit Cards, Net Banking, and Digital Wallets.',
      },
      {
        question: 'Is my payment information secure?',
        answer: 'Absolutely! We use industry-standard SSL encryption and PCI DSS compliant payment gateways.',
      },
    ],
  },
  {
    title: 'Delivery & Processing',
    icon: '⚡',
    questions: [
      {
        question: 'How long does delivery take?',
        answer: 'Most top-ups are delivered instantly within 2-5 minutes. We guarantee delivery within 24 hours or provide a full refund.',
      },
    ],
  },
  {
    title: 'Account & Membership',
    icon: '👤',
    questions: [
      {
        question: 'Do I need to create an account to make a purchase?',
        answer: 'While you can make guest purchases, creating an account gives you access to order history and exclusive member deals.',
      },
    ],
  },
  {
    title: 'Games & Support',
    icon: '🎮',
    questions: [
      {
        question: 'Which games do you support?',
        answer: 'We support all major mobile games including MLBB, PUBG Mobile, Free Fire, Genshin Impact, and many more.',
      },
    ],
  },
];

const defaultSettings: FaqSettings = {
  heading_prefix: 'Frequently Asked',
  heading_accent: 'Questions',
  subheading:
    "Find answers to common questions about PixieKat's services, payments, and support",
  support_title: 'Still have questions?',
  support_body:
    "Our support team is available 24/7 to help you with any questions or concerns. Whether it's about payments, deliveries, or your account — we're here for you.",
  footer_title: 'Get answers.\nPlay faster.',
  footer_body:
    'Browse our FAQ or reach out anytime — our team is ready to help you top up without any hassle.',
  categories: defaultCategories,
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

function mergeSettings(raw: Partial<FaqSettings> | null | undefined): FaqSettings {
  if (!raw || Object.keys(raw).length === 0) return defaultSettings;
  return {
    ...defaultSettings,
    ...raw,
    categories: Array.isArray(raw.categories) && raw.categories.length > 0
      ? raw.categories.map((c) => ({
          title: c.title ?? '',
          icon: c.icon ?? '❓',
          questions: Array.isArray(c.questions) ? c.questions : [],
        }))
      : defaultSettings.categories,
  };
}

const FaqEditor: React.FC = () => {
  const [settings, setSettings] = useState<FaqSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set([0]));

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_settings')
      .select('faq_settings')
      .maybeSingle();

    if (error) toast.error(error.message);
    else setSettings(mergeSettings(data?.faq_settings as Partial<FaqSettings>));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('store_settings')
      .upsert({ id: true, faq_settings: settings }, { onConflict: 'id' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('FAQ settings saved');
  };

  const setField = <K extends keyof Omit<FaqSettings, 'categories'>>(key: K, value: FaqSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const toggleCat = (index: number) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const updateCategory = (catIndex: number, patch: Partial<FaqCategory>) =>
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.map((c, i) => (i === catIndex ? { ...c, ...patch } : c)),
    }));

  const addCategory = () => {
    setSettings((prev) => ({
      ...prev,
      categories: [...prev.categories, { title: 'New Category', icon: '📋', questions: [] }],
    }));
    setExpandedCats((prev) => new Set([...prev, settings.categories.length]));
  };

  const removeCategory = (catIndex: number) =>
    setSettings((prev) => ({ ...prev, categories: prev.categories.filter((_, i) => i !== catIndex) }));

  const updateQuestion = (catIndex: number, qIndex: number, patch: Partial<FaqQuestion>) =>
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.map((c, i) =>
        i === catIndex
          ? { ...c, questions: c.questions.map((q, qi) => (qi === qIndex ? { ...q, ...patch } : q)) }
          : c
      ),
    }));

  const addQuestion = (catIndex: number) =>
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.map((c, i) =>
        i === catIndex ? { ...c, questions: [...c.questions, { question: '', answer: '' }] } : c
      ),
    }));

  const removeQuestion = (catIndex: number, qIndex: number) =>
    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.map((c, i) =>
        i === catIndex ? { ...c, questions: c.questions.filter((_, qi) => qi !== qIndex) } : c
      ),
    }));

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading FAQ settings…</div>;
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <HelpCircle className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">FAQ Editor</h1>
            <p className="text-sm text-gray-500">Categories, questions & page copy for /faq</p>
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
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">FAQ Categories</h2>
          <button type="button" onClick={addCategory} className="btn btn-outline btn-sm">
            <Plus className="mr-1 h-4 w-4" />Add Category
          </button>
        </div>
        <div className="space-y-3">
          {settings.categories.map((category, catIndex) => {
            const expanded = expandedCats.has(catIndex);
            return (
              <div key={catIndex} className="rounded-lg border border-gray-200 overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleCat(catIndex)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
                >
                  <span className="font-medium text-gray-900">
                    {category.icon} {category.title || 'Untitled Category'}
                    <span className="ml-2 text-xs text-gray-400">({category.questions.length} questions)</span>
                  </span>
                  {expanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                </button>
                {expanded && (
                  <div className="p-4 space-y-4 border-t border-gray-100">
                    <div className="flex items-start justify-between gap-2">
                      <div className="grid flex-1 gap-3 md:grid-cols-2">
                        <TextInput label="Category Title" value={category.title} onChange={(v) => updateCategory(catIndex, { title: v })} />
                        <TextInput label="Icon" value={category.icon} onChange={(v) => updateCategory(catIndex, { icon: v })} />
                      </div>
                      <button type="button" onClick={() => removeCategory(catIndex)} className="mt-6 text-red-500 hover:text-red-700 p-2">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {category.questions.map((q, qIndex) => (
                        <div key={qIndex} className="rounded-lg border border-gray-100 bg-white p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-500">Question {qIndex + 1}</span>
                            <button type="button" onClick={() => removeQuestion(catIndex, qIndex)} className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <TextInput label="Question" value={q.question} onChange={(v) => updateQuestion(catIndex, qIndex, { question: v })} />
                          <TextInput label="Answer" value={q.answer} onChange={(v) => updateQuestion(catIndex, qIndex, { answer: v })} multiline rows={3} />
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => addQuestion(catIndex)} className="btn btn-outline btn-sm">
                      <Plus className="mr-1 h-4 w-4" />Add Question
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Support Banner</h2>
          <TextInput label="Support Title" value={settings.support_title} onChange={(v) => setField('support_title', v)} />
          <TextInput label="Support Body" value={settings.support_body} onChange={(v) => setField('support_body', v)} multiline rows={4} />
        </section>
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Footer CTA</h2>
          <TextInput label="Footer Title" value={settings.footer_title} onChange={(v) => setField('footer_title', v)} multiline rows={2} helpText="Use \\n for line breaks" />
          <TextInput label="Footer Body" value={settings.footer_body} onChange={(v) => setField('footer_body', v)} multiline rows={3} />
        </section>
      </div>
    </div>
  );
};

export default FaqEditor;
