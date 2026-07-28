import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Type, Image as ImageIcon, Palette, Maximize2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import ImageSourceField from '../../components/common/ImageSourceField';

interface AboutSettings {
  welcome_text: string;
  title_html: string;
  subtext_line1: string;
  subtext_line2: string;
  image_url: string;
  image_alt: string;
  // Style controls
  bg_color: string;
  text_color: string;
  subtext_color: string;
  welcome_text_color: string;
  image_object_fit: 'cover' | 'contain' | 'fill';
  image_border_radius: string;
  section_min_height: string;
  clip_animation_enabled: boolean;
}

const defaultSettings: AboutSettings = {
  welcome_text: 'Welcome to Pixiekat',
  title_html: 'T<b>o</b>p up your <br /> fav<b>o</b>rite games',
  subtext_line1: 'Fast credits, instant delivery — game more, wait less',
  subtext_line2: 'Pixiekat brings you the quickest way to top up diamonds, coins, and credits across all your favorite mobile and PC titles',
  image_url: '/img/about.webp',
  image_alt: 'Background',
  bg_color: '',
  text_color: '#000000',
  subtext_color: '#6b7280',
  welcome_text_color: '',
  image_object_fit: 'cover',
  image_border_radius: '0',
  section_min_height: '100vh',
  clip_animation_enabled: true,
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
    {helpText && <p className="mt-1 text-xs text-gray-400">{helpText}</p>}
  </div>
);

const ColorInput: React.FC<{
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder = '#000000' }) => (
  <div>
    <label className="label mb-1.5 block">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-9 cursor-pointer rounded border border-gray-200 p-0.5"
      />
      <input
        className="input flex-1"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Reset
        </button>
      )}
    </div>
  </div>
);

const AboutEditor: React.FC = () => {
  const [settings, setSettings] = useState<AboutSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_settings')
      .select('about_page_settings')
      .maybeSingle();

    if (error) {
      toast.error(error.message);
    } else if (data?.about_page_settings && Object.keys(data.about_page_settings).length > 0) {
      setSettings((prev) => ({ ...prev, ...data.about_page_settings }));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('store_settings')
      .upsert({ id: true, about_page_settings: settings }, { onConflict: 'id' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('About page settings saved');
  };

  const setField = <K extends keyof AboutSettings>(key: K, value: AboutSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading about page settings…</div>;
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
          <ImageIcon className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">About Page Editor</h1>
            <p className="text-sm text-gray-500">Customise text, image, and styles for the client /about page</p>
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
        {/* Left — Text Content */}
        <div className="space-y-5">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Text Content</h2>
            </div>
            <TextInput
              label="Welcome Text"
              value={settings.welcome_text}
              onChange={(v) => setField('welcome_text', v)}
              placeholder="Welcome to Pixiekat"
            />
            <TextInput
              label="Title (HTML)"
              value={settings.title_html}
              onChange={(v) => setField('title_html', v)}
              placeholder='T<b>o</b>p up your <br /> fav<b>o</b>rite games'
              helpText="Supports HTML: <b> for bold, <br /> for line break"
            />
            <TextInput
              label="Subtext Line 1"
              value={settings.subtext_line1}
              onChange={(v) => setField('subtext_line1', v)}
              placeholder="Fast credits, instant delivery — game more, wait less"
            />
            <TextInput
              label="Subtext Line 2"
              value={settings.subtext_line2}
              onChange={(v) => setField('subtext_line2', v)}
              placeholder="Pixiekat brings you the quickest way to..."
              multiline
              rows={3}
            />
          </section>

          {/* Image */}
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Background Image</h2>
            </div>
            <ImageSourceField
              label="Image URL or upload"
              value={settings.image_url}
              onChange={(url) => setField('image_url', url)}
              folder="about"
              previewClassName="h-44 w-full"
            />
            <TextInput
              label="Image Alt Text"
              value={settings.image_alt}
              onChange={(v) => setField('image_alt', v)}
              placeholder="Background"
            />
          </section>
        </div>

        {/* Right — Style Controls */}
        <div className="space-y-5">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Colors</h2>
            </div>
            <ColorInput
              label="Title Text Color"
              value={settings.text_color}
              onChange={(v) => setField('text_color', v)}
            />
            <ColorInput
              label="Subtext Color"
              value={settings.subtext_color}
              onChange={(v) => setField('subtext_color', v)}
            />
            <ColorInput
              label="Welcome Text Color"
              value={settings.welcome_text_color}
              onChange={(v) => setField('welcome_text_color', v)}
              placeholder="Inherits from theme"
            />
            <ColorInput
              label="Section Background Color"
              value={settings.bg_color}
              onChange={(v) => setField('bg_color', v)}
              placeholder="Transparent (default)"
            />
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Maximize2 className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Image & Layout</h2>
            </div>

            <div>
              <label className="label mb-1.5 block">Image Fit</label>
              <select
                className="input"
                value={settings.image_object_fit}
                onChange={(e) => setField('image_object_fit', e.target.value as AboutSettings['image_object_fit'])}
              >
                <option value="cover">Cover (fills container)</option>
                <option value="contain">Contain (fits inside)</option>
                <option value="fill">Fill (stretches)</option>
              </select>
            </div>

            <TextInput
              label="Image Border Radius"
              value={settings.image_border_radius}
              onChange={(v) => setField('image_border_radius', v)}
              placeholder="0"
              helpText="CSS value, e.g. 0, 8px, 1rem, 50%"
            />

            <TextInput
              label="Section Min Height"
              value={settings.section_min_height}
              onChange={(v) => setField('section_min_height', v)}
              placeholder="100vh"
              helpText="CSS value, e.g. 100vh, 600px"
            />

            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Scroll Clip Animation</p>
                <p className="text-xs text-gray-500">Enable the expanding-mask animation on scroll</p>
              </div>
              <button
                type="button"
                onClick={() => setField('clip_animation_enabled', !settings.clip_animation_enabled)}
                className={`h-6 w-11 rounded-full p-0.5 transition ${settings.clip_animation_enabled ? 'bg-primary-600' : 'bg-gray-200'}`}
              >
                <span className={`block h-5 w-5 rounded-full bg-white shadow transition ${settings.clip_animation_enabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </section>

          {/* Live Preview */}
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">Preview</h2>
            <div
              className="rounded-lg overflow-hidden border border-gray-100 p-6 text-center"
              style={{ backgroundColor: settings.bg_color || '#ffffff', minHeight: '200px' }}
            >
              <p
                className="text-[10px] uppercase tracking-wider mb-2"
                style={{ color: settings.welcome_text_color || '#6b7280' }}
              >
                {settings.welcome_text}
              </p>
              <h3
                className="text-xl font-bold mb-3 special-font"
                style={{ color: settings.text_color || '#000000' }}
                dangerouslySetInnerHTML={{ __html: settings.title_html }}
              />
              <p className="text-xs mb-1" style={{ color: settings.text_color || '#000000' }}>
                {settings.subtext_line1}
              </p>
              <p className="text-xs" style={{ color: settings.subtext_color || '#6b7280' }}>
                {settings.subtext_line2}
              </p>
              {settings.image_url && (
                <div className="mt-4 mx-auto max-w-xs overflow-hidden" style={{ borderRadius: settings.image_border_radius || '0' }}>
                  <img
                    src={settings.image_url}
                    alt={settings.image_alt}
                    className="w-full h-32"
                    style={{ objectFit: settings.image_object_fit }}
                  />
                </div>
              )}
            </div>
          </section>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">Applying changes</p>
            <p>Save here — stored in <code>about_page_settings</code> (separate from the homepage About section). No redeploy needed.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutEditor;
