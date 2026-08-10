import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Mail, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

interface ContactSettings {
  business_email: string;
  whatsapp: string;
  phone_display: string;
  phone_hours: string;
  hours_primary: string;
  hours_secondary: string;
  office_lines: string;
  map_embed_url: string;
  whatsapp_message: string;
}

interface EditorState {
  support_email: string;
  support_phone: string;
  contact_settings: ContactSettings;
}

const defaultContactSettings: ContactSettings = {
  business_email: 'business@pixiekat.com',
  whatsapp: '',
  phone_display: '',
  phone_hours: 'Mon–Sat, 10am–7pm IST',
  hours_primary: 'Mon – Sat: 10am – 7pm',
  hours_secondary: 'Sunday: Closed',
  office_lines: 'Pixiekat HQ\n123 Gaming Street, Tech Park\nBangalore, Karnataka 560001\nIndia',
  map_embed_url: '',
  whatsapp_message: 'Hi PixieKat support!',
};

const defaultState: EditorState = {
  support_email: 'support@pixiekat.com',
  support_phone: '',
  contact_settings: defaultContactSettings,
};

const TextInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  helpText?: string;
  type?: string;
}> = ({ label, value, onChange, placeholder, multiline, rows = 3, helpText, type = 'text' }) => (
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
        type={type}
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    )}
    {helpText && <p className="mt-1 text-xs text-gray-400">{helpText}</p>}
  </div>
);

function parseOfficeLines(value: unknown): string {
  if (Array.isArray(value)) return value.filter(Boolean).join('\n');
  if (typeof value === 'string') return value;
  return defaultContactSettings.office_lines;
}

function serializeOfficeLines(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

const ContactEditor: React.FC = () => {
  const [state, setState] = useState<EditorState>(defaultState);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_settings')
      .select('support_email, support_phone, contact_settings')
      .maybeSingle();

    if (error) {
      toast.error(error.message);
    } else if (data) {
      const cs = (data.contact_settings && typeof data.contact_settings === 'object'
        ? data.contact_settings
        : {}) as Partial<ContactSettings & { office_lines: string[] }>;

      setState({
        support_email: data.support_email || defaultState.support_email,
        support_phone: data.support_phone || '',
        contact_settings: {
          ...defaultContactSettings,
          ...cs,
          office_lines: parseOfficeLines(cs.office_lines),
        },
      });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { contact_settings, support_email, support_phone } = state;
    const payload = {
      id: true,
      support_email,
      support_phone,
      contact_settings: {
        ...contact_settings,
        whatsapp: contact_settings.whatsapp.replace(/\D/g, ''),
        office_lines: serializeOfficeLines(contact_settings.office_lines),
      },
    };

    const { error } = await supabase
      .from('store_settings')
      .upsert(payload, { onConflict: 'id' });

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Contact page settings saved');
  };

  const setTop = (key: 'support_email' | 'support_phone', value: string) =>
    setState((prev) => ({ ...prev, [key]: value }));

  const setContact = <K extends keyof ContactSettings>(key: K, value: ContactSettings[K]) =>
    setState((prev) => ({
      ...prev,
      contact_settings: { ...prev.contact_settings, [key]: value },
    }));

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading contact settings…</div>;
  }

  const cs = state.contact_settings;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <Mail className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contact Page Editor</h1>
            <p className="text-sm text-gray-500">Support email, phone, hours, office address & map embed</p>
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Primary Support</h2>
          </div>
          <TextInput
            label="Support Email"
            type="email"
            value={state.support_email}
            onChange={(v) => setTop('support_email', v)}
            placeholder="support@pixiekat.com"
          />
          <TextInput
            label="Support Phone"
            value={state.support_phone}
            onChange={(v) => setTop('support_phone', v)}
            placeholder="+91 98765 43210"
            helpText="Stored in store_settings.support_phone"
          />
          <TextInput
            label="Business Email"
            type="email"
            value={cs.business_email}
            onChange={(v) => setContact('business_email', v)}
            placeholder="business@pixiekat.com"
          />
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary-600" />
            <h2 className="text-lg font-semibold text-gray-900">Phone & WhatsApp</h2>
          </div>
          <TextInput
            label="WhatsApp Number (digits only)"
            value={cs.whatsapp}
            onChange={(v) => setContact('whatsapp', v.replace(/\D/g, ''))}
            placeholder="919876543210"
            helpText="Country code + number, no spaces or symbols"
          />
          <TextInput
            label="Phone Display Text"
            value={cs.phone_display}
            onChange={(v) => setContact('phone_display', v)}
            placeholder="Shown on contact page if set"
          />
          <TextInput
            label="Phone Hours (short)"
            value={cs.phone_hours}
            onChange={(v) => setContact('phone_hours', v)}
            placeholder="Mon–Sat, 10am–7pm IST"
          />
          <TextInput
            label="WhatsApp Prefill Message"
            value={cs.whatsapp_message}
            onChange={(v) => setContact('whatsapp_message', v)}
            placeholder="Hi PixieKat support!"
          />
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Office Hours</h2>
          <TextInput
            label="Hours Primary"
            value={cs.hours_primary}
            onChange={(v) => setContact('hours_primary', v)}
            placeholder="Mon – Sat: 10am – 7pm"
          />
          <TextInput
            label="Hours Secondary"
            value={cs.hours_secondary}
            onChange={(v) => setContact('hours_secondary', v)}
            placeholder="Sunday: Closed"
          />
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Office & Map</h2>
          <TextInput
            label="Office Address Lines"
            value={cs.office_lines}
            onChange={(v) => setContact('office_lines', v)}
            multiline
            rows={5}
            helpText="One line per entry (company name, street, city, country)"
          />
          <TextInput
            label="Google Maps Embed URL"
            value={cs.map_embed_url}
            onChange={(v) => setContact('map_embed_url', v)}
            placeholder="https://www.google.com/maps/embed?..."
            helpText="Full iframe src URL from Google Maps embed"
          />
        </section>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">Applying changes</p>
        <p>Save here, then the live site reads settings from the database automatically on next page load.</p>
      </div>
    </div>
  );
};

export default ContactEditor;
