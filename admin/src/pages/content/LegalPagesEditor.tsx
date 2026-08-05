import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, RefreshCw, FileText, Plus, Trash2, Shield, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import clsx from 'clsx';

export interface PolicySection {
  heading: string;
  content: string;
}

export interface PolicyDoc {
  title: string;
  subtitle: string;
  last_updated: string;
  sections: PolicySection[];
}

export interface LegalSettings {
  terms: PolicyDoc;
  privacy: PolicyDoc;
  refund: PolicyDoc;
}

type LegalTabKey = 'terms' | 'privacy' | 'refund';

const defaultPolicy = (title: string, subtitle: string): PolicyDoc => ({
  title,
  subtitle,
  last_updated: new Date().toISOString().slice(0, 10),
  sections: [
    {
      heading: '1. Overview',
      content: 'Enter the main policy terms and details here.',
    },
  ],
});

const defaultLegalSettings: LegalSettings = {
  terms: {
    title: 'Terms of Service',
    subtitle: 'Please read these terms carefully before using Pixie Kat Store services.',
    last_updated: '2026-08-01',
    sections: [
      {
        heading: '1. Acceptance of Terms',
        content: 'By accessing or using Pixie Kat Store, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree, you are prohibited from using our services.',
      },
      {
        heading: '2. Account & Top-Up Services',
        content: 'You are responsible for ensuring correct user IDs, zone IDs, and account info when making digital game top-up transactions. Pixie Kat Store is not responsible for incorrect details submitted by the buyer.',
      },
      {
        heading: '3. Modifications to Service',
        content: 'Pixie Kat Store reserves the right to modify prices, product availability, or terms at any time without prior notice.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'How we collect, use, and protect your personal information.',
    last_updated: '2026-08-01',
    sections: [
      {
        heading: '1. Information We Collect',
        content: 'We collect account details, order transaction history, game identification numbers, and contact info necessary to fulfill digital orders and provide customer support.',
      },
      {
        heading: '2. Data Protection & Security',
        content: 'Your personal data is encrypted in transit and at rest. We do not sell your personal data to third parties under any circumstances.',
      },
      {
        heading: '3. Third-Party Services',
        content: 'Payment processing and automated order fulfillment may transmit necessary transaction fields to authorized gateway and API partners.',
      },
    ],
  },
  refund: {
    title: 'Refund & Cancellation Policy',
    subtitle: 'Guidelines for order refunds, wallet adjustments, and failed transaction processing.',
    last_updated: '2026-08-01',
    sections: [
      {
        heading: '1. Digital Goods Non-Refundability',
        content: 'Due to the nature of instant digital top-ups and game vouchers, completed orders where items have been successfully delivered are non-refundable.',
      },
      {
        heading: '2. Failed Orders & Wallet Refunds',
        content: 'If an order fails or cannot be delivered due to system errors, the payment amount will be automatically refunded back to your Pixie Kat Wallet balance.',
      },
      {
        heading: '3. Support Requests',
        content: 'For disputes or order issues, please contact support within 24 hours of transaction with your Order ID and player credentials.',
      },
    ],
  },
};

function mergePolicy(raw: Partial<PolicyDoc> | undefined, fallback: PolicyDoc): PolicyDoc {
  if (!raw) return fallback;
  return {
    title: raw.title ?? fallback.title,
    subtitle: raw.subtitle ?? fallback.subtitle,
    last_updated: raw.last_updated ?? fallback.last_updated,
    sections: Array.isArray(raw.sections) && raw.sections.length > 0
      ? raw.sections.map((s) => ({ heading: s.heading ?? '', content: s.content ?? '' }))
      : fallback.sections,
  };
}

function mergeSettings(raw: Partial<LegalSettings> | null | undefined): LegalSettings {
  if (!raw || Object.keys(raw).length === 0) return defaultLegalSettings;
  return {
    terms: mergePolicy(raw.terms, defaultLegalSettings.terms),
    privacy: mergePolicy(raw.privacy, defaultLegalSettings.privacy),
    refund: mergePolicy(raw.refund, defaultLegalSettings.refund),
  };
}

const tabConfigs: Array<{ key: LegalTabKey; label: string }> = [
  { key: 'terms', label: 'Terms of Service' },
  { key: 'privacy', label: 'Privacy Policy' },
  { key: 'refund', label: 'Refund Policy' },
];

const LegalPagesEditor: React.FC = () => {
  const [settings, setSettings] = useState<LegalSettings>(defaultLegalSettings);
  const [activeTab, setActiveTab] = useState<LegalTabKey>('terms');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_settings')
      .select('legal_settings')
      .maybeSingle();

    if (error) toast.error(error.message);
    else setSettings(mergeSettings(data?.legal_settings as Partial<LegalSettings>));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('store_settings')
      .upsert({ id: true, legal_settings: settings }, { onConflict: 'id' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Legal & policy settings saved');
  };

  const currentDoc = settings[activeTab];

  const updateDoc = (patch: Partial<PolicyDoc>) =>
    setSettings((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], ...patch },
    }));

  const updateSection = (index: number, patch: Partial<PolicySection>) =>
    updateDoc({
      sections: currentDoc.sections.map((sec, i) => (i === index ? { ...sec, ...patch } : sec)),
    });

  const addSection = () =>
    updateDoc({
      sections: [
        ...currentDoc.sections,
        {
          heading: `${currentDoc.sections.length + 1}. New Section`,
          content: '',
        },
      ],
    });

  const removeSection = (index: number) =>
    updateDoc({
      sections: currentDoc.sections.filter((_, i) => i !== index),
    });

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading legal settings…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Legal & Policy Pages Editor</h1>
            <p className="text-sm text-gray-500">Manage Terms of Service, Privacy Policy, and Refund Policy</p>
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

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabConfigs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={clsx(
                'flex-1 py-3.5 text-center text-sm font-semibold border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-700 bg-primary-50/40'
                  : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          {/* Main Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label mb-1.5 block">Page Title</label>
              <input
                className="input"
                value={currentDoc.title}
                onChange={(e) => updateDoc({ title: e.target.value })}
              />
            </div>
            <div>
              <label className="label mb-1.5 block">Last Updated Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  className="input pl-10"
                  value={currentDoc.last_updated}
                  onChange={(e) => updateDoc({ last_updated: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label mb-1.5 block">Subheading / Brief Summary</label>
            <input
              className="input"
              value={currentDoc.subtitle}
              onChange={(e) => updateDoc({ subtitle: e.target.value })}
            />
          </div>

          {/* Sections List */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Policy Sections</h3>
              <button type="button" onClick={addSection} className="btn btn-outline btn-sm">
                <Plus className="mr-1 h-4 w-4" />Add Section
              </button>
            </div>

            <div className="space-y-4">
              {currentDoc.sections.map((section, index) => (
                <div key={index} className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <input
                      className="input font-semibold flex-1"
                      placeholder="Section Heading (e.g. 1. Acceptance)"
                      value={section.heading}
                      onChange={(e) => updateSection(index, { heading: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => removeSection(index)}
                      className="text-red-500 hover:text-red-700 p-2 shrink-0"
                      title="Remove section"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div>
                    <textarea
                      className="input min-h-[100px]"
                      rows={4}
                      placeholder="Section body text..."
                      value={section.content}
                      onChange={(e) => updateSection(index, { content: e.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalPagesEditor;
