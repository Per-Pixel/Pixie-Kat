import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Save, RefreshCw, Monitor, Tablet, Smartphone,
  Image as ImageIcon, Type, Link2, Palette, Maximize2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import ImageSourceField from '../../../components/common/ImageSourceField';

type Device = 'desktop' | 'tablet' | 'mobile';

interface ImageTransform {
  scale: number;
  rotate: number;
  x: number;
  y: number;
  pos_left: string;
  pos_top: string;
}

interface AboutImage {
  url: string;
  alt: string;
  desktop: ImageTransform;
  tablet: ImageTransform;
  mobile: ImageTransform;
}

interface AboutSettings {
  welcome_text: string;
  title_html: string;
  subtext_line1: string;
  subtext_line2: string;
  button_text: string;
  button_link: string;
  image: AboutImage;
  bg_color: string;
  text_color: string;
  subtext_color: string;
  welcome_text_color: string;
  welcome_font_size: string;
  title_font_size: string;
  subtext_font_size: string;
  image_object_fit: 'cover' | 'contain' | 'fill';
  image_border_radius: string;
  section_min_height: string;
  clip_animation_enabled: boolean;
}

const defaultTransform = (): ImageTransform => ({
  scale: 100, rotate: 0, x: 0, y: 0, pos_left: '50%', pos_top: '50%',
});

const defaultImage = (): AboutImage => ({
  url: '/img/about.webp',
  alt: 'Background',
  desktop: defaultTransform(),
  tablet: defaultTransform(),
  mobile: defaultTransform(),
});

const defaultSettings: AboutSettings = {
  welcome_text: 'Welcome to Pixiekat',
  title_html: 'T<b>o</b>p up your <br /> fav<b>o</b>rite games',
  subtext_line1: 'Fast credits, instant delivery — game more, wait less',
  subtext_line2: 'Pixiekat brings you the quickest way to top up diamonds, coins, and credits across all your favorite mobile and PC titles',
  button_text: '',
  button_link: '/about',
  image: defaultImage(),
  bg_color: '',
  text_color: '#000000',
  subtext_color: '#6b7280',
  welcome_text_color: '',
  welcome_font_size: '',
  title_font_size: '',
  subtext_font_size: '',
  image_object_fit: 'cover',
  image_border_radius: '0',
  section_min_height: '100vh',
  clip_animation_enabled: true,
};

const deviceTabs: { key: Device; Icon: React.FC<{ className?: string }>; label: string }[] = [
  { key: 'desktop', Icon: Monitor, label: 'Desktop' },
  { key: 'tablet', Icon: Tablet, label: 'Tablet' },
  { key: 'mobile', Icon: Smartphone, label: 'Mobile' },
];

function mergeTransform(raw: Partial<ImageTransform> | undefined): ImageTransform {
  return { ...defaultTransform(), ...(raw ?? {}) };
}

/** Merge DB payload (incl. legacy flat image_url / image_alt) into full settings. */
function mergeLoadedSettings(raw: Record<string, unknown>): AboutSettings {
  const legacyUrl = typeof raw.image_url === 'string' ? raw.image_url : undefined;
  const legacyAlt = typeof raw.image_alt === 'string' ? raw.image_alt : undefined;
  const rawImage = (raw.image && typeof raw.image === 'object')
    ? (raw.image as Partial<AboutImage> & Record<string, unknown>)
    : {};

  const image: AboutImage = {
    url: (typeof rawImage.url === 'string' && rawImage.url) || legacyUrl || defaultImage().url,
    alt: (typeof rawImage.alt === 'string' && rawImage.alt) || legacyAlt || defaultImage().alt,
    desktop: mergeTransform(rawImage.desktop as Partial<ImageTransform> | undefined),
    tablet: mergeTransform(rawImage.tablet as Partial<ImageTransform> | undefined),
    mobile: mergeTransform(rawImage.mobile as Partial<ImageTransform> | undefined),
  };

  const {
    image_url: _iu,
    image_alt: _ia,
    image: _img,
    ...rest
  } = raw;

  return {
    ...defaultSettings,
    ...(rest as Partial<AboutSettings>),
    image,
  };
}

const NumberInput: React.FC<{
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; unit?: string;
}> = ({ label, value, onChange, min, max, step = 1, unit }) => (
  <div>
    <label className="label mb-1 block text-xs">
      {label}{unit && <span className="ml-1 text-gray-400 font-normal">{unit}</span>}
    </label>
    <input
      type="number" min={min} max={max} step={step}
      className="input py-1.5 text-sm"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </div>
);

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
  const [activeDevice, setActiveDevice] = useState<Device>('desktop');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_settings')
      .select('about_settings')
      .maybeSingle();

    if (error) {
      toast.error(error.message);
    } else if (data?.about_settings && Object.keys(data.about_settings).length > 0) {
      setSettings(mergeLoadedSettings(data.about_settings as Record<string, unknown>));
    } else {
      setSettings(defaultSettings);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('store_settings')
      .upsert({ id: true, about_settings: settings }, { onConflict: 'id' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Homepage about section saved');
  };

  const setField = <K extends keyof AboutSettings>(key: K, value: AboutSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const setImageMeta = <K extends 'url' | 'alt'>(field: K, value: string) =>
    setSettings((prev) => ({
      ...prev,
      image: { ...prev.image, [field]: value },
    }));

  const setTransformField = (
    device: Device,
    field: keyof ImageTransform,
    value: number | string,
  ) => setSettings((prev) => ({
    ...prev,
    image: {
      ...prev.image,
      [device]: { ...prev.image[device], [field]: value },
    },
  }));

  const tx = settings.image[activeDevice];

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading about settings…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Sticky header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 flex flex-col gap-4 rounded-lg border border-gray-200 bg-white/95 p-6 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <ImageIcon className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">About Section Editor</h1>
            <p className="text-sm text-gray-500">Homepage about block — text, CTA, image transforms & styles</p>
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px]">
        {/* Left — form */}
        <div className="space-y-5">
          <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <TextInput
                label="Welcome Font Size"
                value={settings.welcome_font_size}
                onChange={(v) => setField('welcome_font_size', v)}
                placeholder="e.g. 0.875rem"
                helpText="CSS size; blank = default"
              />
              <TextInput
                label="Title Font Size"
                value={settings.title_font_size}
                onChange={(v) => setField('title_font_size', v)}
                placeholder="e.g. 2.5rem"
              />
              <TextInput
                label="Subtext Font Size"
                value={settings.subtext_font_size}
                onChange={(v) => setField('subtext_font_size', v)}
                placeholder="e.g. 1rem"
              />
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">CTA Button</h2>
            </div>
            <TextInput
              label="Button Text"
              value={settings.button_text}
              onChange={(v) => setField('button_text', v)}
              placeholder="Learn More"
              helpText="Leave empty to hide the button on the live site"
            />
            <TextInput
              label="Button Link"
              value={settings.button_link}
              onChange={(v) => setField('button_link', v)}
              placeholder="/about"
            />
          </section>

          <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Image</h2>
            </div>
            <ImageSourceField
              label="Image URL or upload"
              value={settings.image.url}
              onChange={(url) => setImageMeta('url', url)}
              folder="about"
              previewClassName="h-44 w-full"
            />
            <TextInput
              label="Image Alt Text"
              value={settings.image.alt}
              onChange={(v) => setImageMeta('alt', v)}
              placeholder="Background"
            />

            <div className="flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2">
              {deviceTabs.map(({ key, Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveDevice(key)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${activeDevice === key ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-800'
                    }`}
                >
                  <Icon className="h-3.5 w-3.5" />{label}
                </button>
              ))}
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-gray-700">
                Transform — <span className="capitalize text-primary-600">{activeDevice}</span>
              </p>
              <p className="mb-3 text-xs text-gray-400">
                Scale {tx.scale}% · Rotate {tx.rotate}° · X {tx.x}px Y {tx.y}px
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <NumberInput label="Scale" unit="%" value={tx.scale} onChange={(v) => setTransformField(activeDevice, 'scale', v)} min={10} max={500} />
                <NumberInput label="Rotate" unit="deg" value={tx.rotate} onChange={(v) => setTransformField(activeDevice, 'rotate', v)} min={-180} max={180} />
                <NumberInput label="X offset" unit="px" value={tx.x} onChange={(v) => setTransformField(activeDevice, 'x', v)} min={-500} max={500} />
                <NumberInput label="Y offset" unit="px" value={tx.y} onChange={(v) => setTransformField(activeDevice, 'y', v)} min={-500} max={500} />
                <div>
                  <label className="label mb-1 block text-xs">Position Left <span className="font-normal text-gray-400">(CSS %)</span></label>
                  <input
                    className="input py-1.5 text-sm"
                    placeholder="50%"
                    value={tx.pos_left}
                    onChange={(e) => setTransformField(activeDevice, 'pos_left', e.target.value)}
                  />
                </div>
                <div>
                  <label className="label mb-1 block text-xs">Position Top <span className="font-normal text-gray-400">(CSS %)</span></label>
                  <input
                    className="input py-1.5 text-sm"
                    placeholder="50%"
                    value={tx.pos_top}
                    onChange={(e) => setTransformField(activeDevice, 'pos_top', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
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

          <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Maximize2 className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Layout & Animation</h2>
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
        </div>

        {/* Right — sticky live preview */}
        <div className="xl:sticky xl:top-24 xl:self-start">
          <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Live Preview</h2>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500">
                {activeDevice}
              </span>
            </div>
            <div
              className="overflow-hidden rounded-lg border border-gray-100 p-6 text-center"
              style={{ backgroundColor: settings.bg_color || '#ffffff', minHeight: '280px' }}
            >
              <p
                className="mb-2 text-[10px] uppercase tracking-wider"
                style={{
                  color: settings.welcome_text_color || '#6b7280',
                  fontSize: settings.welcome_font_size || undefined,
                }}
              >
                {settings.welcome_text}
              </p>
              <h3
                className="special-font mb-3 text-xl font-bold"
                style={{
                  color: settings.text_color || '#000000',
                  fontSize: settings.title_font_size || undefined,
                }}
                dangerouslySetInnerHTML={{ __html: settings.title_html }}
              />
              <p
                className="mb-1 text-xs"
                style={{
                  color: settings.text_color || '#000000',
                  fontSize: settings.subtext_font_size || undefined,
                }}
              >
                {settings.subtext_line1}
              </p>
              <p
                className="text-xs"
                style={{
                  color: settings.subtext_color || '#6b7280',
                  fontSize: settings.subtext_font_size || undefined,
                }}
              >
                {settings.subtext_line2}
              </p>
              {settings.button_text && (
                <a
                  href={settings.button_link || '#'}
                  className="mt-4 inline-block rounded-md bg-primary-600 px-4 py-2 text-xs font-semibold text-white"
                  onClick={(e) => e.preventDefault()}
                >
                  {settings.button_text}
                </a>
              )}
              {settings.image.url && (
                <div
                  className="relative mx-auto mt-4 h-40 max-w-xs overflow-hidden"
                  style={{ borderRadius: settings.image_border_radius || '0' }}
                >
                  <img
                    src={settings.image.url}
                    alt={settings.image.alt}
                    className="absolute"
                    style={{
                      left: tx.pos_left,
                      top: tx.pos_top,
                      width: '100%',
                      height: '100%',
                      objectFit: settings.image_object_fit,
                      transform: `translate(-50%,-50%) scale(${tx.scale / 100}) rotate(${tx.rotate}deg) translate(${tx.x}px,${tx.y}px)`,
                    }}
                  />
                </div>
              )}
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <p className="mb-0.5 font-semibold">Applying changes</p>
              <p>Save here — the live homepage reads <code>about_settings</code> on next load. No redeploy needed.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AboutEditor;
