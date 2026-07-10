import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Save, RefreshCw, Monitor, Tablet, Smartphone, Image as ImageIcon, Type, Link2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import ImageSourceField from '../../components/common/ImageSourceField';

type Device = 'desktop' | 'tablet' | 'mobile';

interface ImageTransform {
  scale: number;
  rotate: number;
  x: number;
  y: number;
  pos_left: string;
  pos_top: string;
}

interface HeroImage {
  url: string;
  show_on_phone: boolean;
  desktop: ImageTransform;
  tablet: ImageTransform;
  mobile: ImageTransform;
}

interface HeroSettings {
  heading: string;
  subheading: string;
  tagline: string;
  button_text: string;
  button_link: string;
  background_video: string;
  images: {
    jinx: HeroImage;
    faze: HeroImage;
    melissa: HeroImage;
  };
}

const defaultTransform = (): ImageTransform => ({ scale: 100, rotate: 0, x: 0, y: 0, pos_left: '50%', pos_top: '50%' });

const defaultHeroImage = (): HeroImage => ({
  url: '', show_on_phone: false,
  desktop: defaultTransform(), tablet: defaultTransform(), mobile: defaultTransform(),
});

const defaultSettings: HeroSettings = {
  heading: 'PixieKat', subheading: 'Instant Gaming Credits', tagline: 'Fast, Secure, Affordable',
  button_text: 'Topup Now', button_link: '/games', background_video: 'videos/hero-1.mp4',
  images: { jinx: defaultHeroImage(), faze: defaultHeroImage(), melissa: defaultHeroImage() },
};

const imageKeys: Array<{ key: keyof HeroSettings['images']; label: string }> = [
  { key: 'jinx',    label: 'Image 1 (Jinx / Left character)' },
  { key: 'faze',    label: 'Image 2 (Center / Logo)' },
  { key: 'melissa', label: 'Image 3 (Right character)' },
];

const deviceTabs: { key: Device; Icon: React.FC<{ className?: string }>; label: string }[] = [
  { key: 'desktop', Icon: Monitor,    label: 'Desktop' },
  { key: 'tablet',  Icon: Tablet,     label: 'Tablet' },
  { key: 'mobile',  Icon: Smartphone, label: 'Mobile' },
];

const NumberInput: React.FC<{
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; unit?: string;
}> = ({ label, value, onChange, min, max, step = 1, unit }) => (
  <div>
    <label className="label mb-1 block text-xs">{label}{unit && <span className="ml-1 text-gray-400 font-normal">{unit}</span>}</label>
    <input
      type="number" min={min} max={max} step={step}
      className="input py-1.5 text-sm"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </div>
);

const TextInput: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string }> = ({
  label, value, onChange, placeholder,
}) => (
  <div>
    <label className="label mb-1.5 block">{label}</label>
    <input className="input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
  </div>
);

const HeroEditor: React.FC = () => {
  const [settings, setSettings] = useState<HeroSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeDevice, setActiveDevice] = useState<Device>('desktop');
  const [expandedImage, setExpandedImage] = useState<keyof HeroSettings['images']>('jinx');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('store_settings')
      .select('hero_settings')
      .maybeSingle();

    if (error) {
      toast.error(error.message);
    } else if (data?.hero_settings && Object.keys(data.hero_settings).length > 0) {
      setSettings((prev) => ({ ...defaultSettings, ...data.hero_settings, images: { ...defaultSettings.images, ...(data.hero_settings.images ?? {}) } }));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('store_settings')
      .upsert({ id: true, hero_settings: settings }, { onConflict: 'id' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Hero settings saved');
  };

  const setField = <K extends keyof HeroSettings>(key: K, value: HeroSettings[K]) =>
    setSettings((prev) => ({ ...prev, [key]: value }));

  const setImageField = <K extends keyof HeroImage>(
    imgKey: keyof HeroSettings['images'], field: K, value: HeroImage[K],
  ) => setSettings((prev) => ({
    ...prev,
    images: { ...prev.images, [imgKey]: { ...prev.images[imgKey], [field]: value } },
  }));

  const setTransformField = (
    imgKey: keyof HeroSettings['images'], device: Device,
    field: keyof ImageTransform, value: number | string,
  ) => setSettings((prev) => ({
    ...prev,
    images: {
      ...prev.images,
      [imgKey]: {
        ...prev.images[imgKey],
        [device]: { ...prev.images[imgKey][device], [field]: value },
      },
    },
  }));

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading hero settings…</div>;
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <ImageIcon className="h-7 w-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Hero Section Editor</h1>
            <p className="text-sm text-gray-500">Customise images, transforms, and text for the homepage hero</p>
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left — Images */}
        <div className="space-y-4">
          {/* Device picker */}
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 shadow-sm w-fit">
            {deviceTabs.map(({ key, Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveDevice(key)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  activeDevice === key ? 'bg-primary-600 text-white' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>

          {imageKeys.map(({ key, label }) => {
            const img = settings.images[key];
            const tx = img[activeDevice];
            const isOpen = expandedImage === key;
            return (
              <section key={key} className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedImage(isOpen ? (null as unknown as typeof key) : key)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    {img.url ? (
                      <img src={img.url} alt="" className="h-10 w-16 rounded object-cover border border-gray-200" />
                    ) : (
                      <div className="h-10 w-16 rounded bg-gray-100 flex items-center justify-center text-gray-400">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{label}</p>
                      <p className="text-xs text-gray-400">
                        Scale {tx.scale}% · Rotate {tx.rotate}° · X {tx.x}px Y {tx.y}px
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400">{isOpen ? '▲' : '▼'}</span>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-100 p-5 space-y-5">
                    <ImageSourceField
                      label="Image URL or upload"
                      value={img.url}
                      onChange={(url) => setImageField(key, 'url', url)}
                      folder="hero"
                      previewClassName="h-24 w-44"
                    />

                    <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">Show on phone</p>
                        <p className="text-xs text-gray-500">Toggle visibility on small phones (&lt;768px)</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImageField(key, 'show_on_phone', !img.show_on_phone)}
                        className={`h-6 w-11 rounded-full p-0.5 transition ${img.show_on_phone ? 'bg-primary-600' : 'bg-gray-200'}`}
                      >
                        <span className={`block h-5 w-5 rounded-full bg-white shadow transition ${img.show_on_phone ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        Transform — <span className="capitalize text-primary-600">{activeDevice}</span>
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <NumberInput label="Scale" unit="%" value={tx.scale} onChange={(v) => setTransformField(key, activeDevice, 'scale', v)} min={10} max={500} />
                        <NumberInput label="Rotate" unit="deg" value={tx.rotate} onChange={(v) => setTransformField(key, activeDevice, 'rotate', v)} min={-180} max={180} />
                        <NumberInput label="X offset" unit="px" value={tx.x} onChange={(v) => setTransformField(key, activeDevice, 'x', v)} min={-500} max={500} />
                        <NumberInput label="Y offset" unit="px" value={tx.y} onChange={(v) => setTransformField(key, activeDevice, 'y', v)} min={-500} max={500} />
                        <div>
                          <label className="label mb-1 block text-xs">Position Left <span className="text-gray-400 font-normal">(CSS %)</span></label>
                          <input className="input py-1.5 text-sm" placeholder="50%" value={tx.pos_left} onChange={(e) => setTransformField(key, activeDevice, 'pos_left', e.target.value)} />
                        </div>
                        <div>
                          <label className="label mb-1 block text-xs">Position Top <span className="text-gray-400 font-normal">(CSS %)</span></label>
                          <input className="input py-1.5 text-sm" placeholder="50%" value={tx.pos_top} onChange={(e) => setTransformField(key, activeDevice, 'pos_top', e.target.value)} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Right — Text & background */}
        <div className="space-y-5">
          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Type className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Text Content</h2>
            </div>
            <TextInput label="Main Heading" value={settings.heading} onChange={(v) => setField('heading', v)} placeholder="PixieKat" />
            <TextInput label="Sub-heading" value={settings.subheading} onChange={(v) => setField('subheading', v)} placeholder="Instant Gaming Credits" />
            <TextInput label="Tagline" value={settings.tagline} onChange={(v) => setField('tagline', v)} placeholder="Fast, Secure, Affordable" />
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">CTA Button</h2>
            </div>
            <TextInput label="Button Text" value={settings.button_text} onChange={(v) => setField('button_text', v)} placeholder="Topup Now" />
            <TextInput label="Button Link" value={settings.button_link} onChange={(v) => setField('button_link', v)} placeholder="/games" />
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Background Video</h2>
            <TextInput
              label="Video path or URL"
              value={settings.background_video}
              onChange={(v) => setField('background_video', v)}
              placeholder="videos/hero-1.mp4"
            />
            <p className="text-xs text-gray-400">Relative to /public, e.g. <code>videos/hero-1.mp4</code></p>
          </section>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold mb-1">Applying changes</p>
            <p>Save here, then the live site reads settings from the database automatically on next page load. No redeploy needed.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroEditor;
