import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Layout, Plus, Trash2, Globe, Mail, Link as LinkIcon, Share2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface FooterNavLink {
  label: string;
  href: string;
}

interface FooterSocialLink {
  label: string;
  href: string;
  icon: string;
}

interface FooterSettings {
  cta_label_text: string;
  cta_heading_bold: string;
  cta_heading_light: string;
  contact_email: string;
  contact_label: string;
  copyright_text: string;
  brand_name_text: string;
  nav_links: FooterNavLink[];
  social_links: FooterSocialLink[];
}

const defaultFooterSettings: FooterSettings = {
  cta_label_text: 'Get In Touch',
  cta_heading_bold: 'Ready to level up your game?',
  cta_heading_light: 'Top up your favorite titles instantly or explore our premium membership plans.',
  contact_email: 'support@pixiekatstore.com',
  contact_label: 'Reach us at:',
  copyright_text: '© 2026 Pixie Kat Store. All rights reserved.',
  brand_name_text: 'pixie kat store',
  nav_links: [
    { label: 'How It Works', href: '/how-it-works' },
    { label: 'Games', href: '/games' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Support', href: '/support' },
    { label: 'Terms', href: '/terms' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Refund Policy', href: '/refund-policy' },
  ],
  social_links: [
    { label: 'LinkedIn', href: 'https://linkedin.com', icon: 'linkedin' },
    { label: 'Facebook', href: 'https://facebook.com', icon: 'facebook' },
    { label: 'Twitter', href: 'https://twitter.com', icon: 'twitter' },
  ],
};

function mergeSettings(raw: Partial<FooterSettings> | null | undefined): FooterSettings {
  if (!raw || Object.keys(raw).length === 0) return defaultFooterSettings;
  return {
    ...defaultFooterSettings,
    ...raw,
    nav_links: Array.isArray(raw.nav_links) && raw.nav_links.length > 0
      ? raw.nav_links.map((l) => ({ label: l.label ?? '', href: l.href ?? '' }))
      : defaultFooterSettings.nav_links,
    social_links: Array.isArray(raw.social_links) && raw.social_links.length > 0
      ? raw.social_links.map((s) => ({ label: s.label ?? '', href: s.href ?? '', icon: s.icon ?? '' }))
      : defaultFooterSettings.social_links,
  };
}

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

const FooterEditor: React.FC = () => {
  const [settings, setSettings] = useState<FooterSettings>(defaultFooterSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_settings')
      .select('footer_settings')
      .maybeSingle();

    if (error) toast.error(error.message);
    else setSettings(mergeSettings(data?.footer_settings as Partial<FooterSettings>));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('store_settings')
      .upsert({ id: true, footer_settings: settings }, { onConflict: 'id' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Footer settings saved');
  };

  const setField = <K extends keyof Omit<FooterSettings, 'nav_links' | 'social_links'>>(
    key: K,
    value: FooterSettings[K]
  ) => setSettings((prev) => ({ ...prev, [key]: value }));

  const updateNavLink = (index: number, patch: Partial<FooterNavLink>) =>
    setSettings((prev) => ({
      ...prev,
      nav_links: prev.nav_links.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    }));

  const addNavLink = () =>
    setSettings((prev) => ({
      ...prev,
      nav_links: [...prev.nav_links, { label: 'New Link', href: '/' }],
    }));

  const removeNavLink = (index: number) =>
    setSettings((prev) => ({
      ...prev,
      nav_links: prev.nav_links.filter((_, i) => i !== index),
    }));

  const updateSocialLink = (index: number, patch: Partial<FooterSocialLink>) =>
    setSettings((prev) => ({
      ...prev,
      social_links: prev.social_links.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    }));

  const addSocialLink = () =>
    setSettings((prev) => ({
      ...prev,
      social_links: [...prev.social_links, { label: 'Instagram', href: 'https://instagram.com', icon: 'instagram' }],
    }));

  const removeSocialLink = (index: number) =>
    setSettings((prev) => ({
      ...prev,
      social_links: prev.social_links.filter((_, i) => i !== index),
    }));

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading footer settings…</div>;
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
          <Layout className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Footer Editor</h1>
            <p className="text-sm text-gray-500">Customize storefront CTA, links, email, brand text & copyright</p>
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

      {/* CTA & Contact Row */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary-600" /> CTA & Contact Section
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <TextInput label="CTA Label Badge" value={settings.cta_label_text} onChange={(v) => setField('cta_label_text', v)} placeholder="Get In Touch" />
          <TextInput label="Contact Label" value={settings.contact_label} onChange={(v) => setField('contact_label', v)} placeholder="Reach us at:" />
        </div>
        <TextInput label="CTA Heading (Bold Accent)" value={settings.cta_heading_bold} onChange={(v) => setField('cta_heading_bold', v)} placeholder="Ready to level up your game?" />
        <TextInput label="CTA Subheading (Light Description)" value={settings.cta_heading_light} onChange={(v) => setField('cta_heading_light', v)} multiline rows={2} />
        <TextInput label="Contact Support Email" value={settings.contact_email} onChange={(v) => setField('contact_email', v)} placeholder="support@pixiekatstore.com" />
      </section>

      {/* Nav Links */}
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary-600" /> Footer Navigation Links
          </h2>
          <button type="button" onClick={addNavLink} className="btn btn-outline btn-sm">
            <Plus className="mr-1 h-4 w-4" />Add Link
          </button>
        </div>
        <div className="space-y-3">
          {settings.nav_links.map((link, index) => (
            <div key={index} className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <input
                className="input flex-1"
                placeholder="Link Label (e.g. Games)"
                value={link.label}
                onChange={(e) => updateNavLink(index, { label: e.target.value })}
              />
              <input
                className="input flex-1"
                placeholder="URL / Path (e.g. /games)"
                value={link.href}
                onChange={(e) => updateNavLink(index, { href: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeNavLink(index)}
                className="text-red-500 hover:text-red-700 p-2"
                title="Remove link"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Social Links & Branding */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Share2 className="h-5 w-5 text-primary-600" /> Social Links
            </h2>
            <button type="button" onClick={addSocialLink} className="btn btn-outline btn-sm">
              <Plus className="mr-1 h-4 w-4" />Add Social
            </button>
          </div>
          <div className="space-y-3">
            {settings.social_links.map((social, index) => (
              <div key={index} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
                <input
                  className="input w-1/3"
                  placeholder="Platform"
                  value={social.label}
                  onChange={(e) => updateSocialLink(index, { label: e.target.value })}
                />
                <input
                  className="input flex-1"
                  placeholder="URL"
                  value={social.href}
                  onChange={(e) => updateSocialLink(index, { href: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeSocialLink(index)}
                  className="text-red-500 hover:text-red-700 p-2"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary-600" /> Branding & Copyright
          </h2>
          <TextInput label="Brand Name Display Text" value={settings.brand_name_text} onChange={(v) => setField('brand_name_text', v)} placeholder="pixie kat store" helpText="Large letters shown above bottom bar" />
          <TextInput label="Copyright Text" value={settings.copyright_text} onChange={(v) => setField('copyright_text', v)} placeholder="© 2026 Pixie Kat Store. All rights reserved." />
        </section>
      </div>
    </div>
  );
};

export default FooterEditor;
