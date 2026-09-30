import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Bell, Shield, CreditCard, Store, Palette,
  Mail, Phone, Lock, Key, AlertTriangle, CheckCircle, Info,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ComingSoonModal from '../components/common/ComingSoonModal';
import ImageSourceField from '../components/common/ImageSourceField';
import { supabase } from '../lib/supabase';
import clsx from 'clsx';

type Tab = 'store' | 'appearance' | 'payment' | 'notifications' | 'security';

const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'store', label: 'Store', icon: Store },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

interface AppearanceSettings {
  favicon_url: string;
  icon_url: string;
  logo_url: string;
  header_brand_text: string;
  tab_title_active: string;
  tab_title_inactive: string;
  music_url: string;
  music_playback_rate: number;
  music_volume: number;
}

const defaultAppearance: AppearanceSettings = {
  favicon_url: '',
  icon_url: '',
  logo_url: '/img/logo.png',
  header_brand_text: 'PixieKat',
  tab_title_active: 'PixieKat',
  tab_title_inactive: 'Come back to PixieKat!',
  music_url: '/audio/loop.mp3',
  music_playback_rate: 1,
  music_volume: 0.5,
};

interface StoreSettings {
  store_name: string;
  support_email: string;
  default_currency: string;
  timezone: string;
  support_phone: string;
  maintenance_mode: boolean;
}

interface PaymentSettings {
  wallet_enabled: boolean;
  stripe_enabled: boolean;
  paypal_enabled: boolean;
  crypto_enabled: boolean;
  bank_transfer_enabled: boolean;
  tax_rate: number;
  prices_include_tax: boolean;
}

interface NotificationSettings {
  email_on_new_order: boolean;
  email_on_refund: boolean;
  email_on_new_user: boolean;
  email_on_failed_payment: boolean;
  sms_on_new_order: boolean;
  sms_recipient: string;
  in_app_notifications: boolean;
  daily_revenue_report: boolean;
  weekly_analytics_report: boolean;
}

interface SecuritySettings {
  two_factor_required: boolean;
  login_alerts: boolean;
  failed_attempt_lock: boolean;
  session_timeout_minutes: number;
}

const defaultStore: StoreSettings = {
  store_name: 'PixieKat',
  support_email: 'support@pixiekat.com',
  default_currency: 'PKS',
  timezone: 'Asia/Kuala_Lumpur',
  support_phone: '+60 12-345 6789',
  maintenance_mode: false,
};

const defaultPayment: PaymentSettings = {
  wallet_enabled: true,
  stripe_enabled: false,
  paypal_enabled: false,
  crypto_enabled: false,
  bank_transfer_enabled: false,
  tax_rate: 0,
  prices_include_tax: true,
};

const defaultNotifications: NotificationSettings = {
  email_on_new_order: true,
  email_on_refund: true,
  email_on_new_user: false,
  email_on_failed_payment: true,
  sms_on_new_order: false,
  sms_recipient: '',
  in_app_notifications: true,
  daily_revenue_report: true,
  weekly_analytics_report: true,
};

const defaultSecurity: SecuritySettings = {
  two_factor_required: false,
  login_alerts: true,
  failed_attempt_lock: true,
  session_timeout_minutes: 60,
};

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}
const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, description }) => (
  <div className="flex items-center justify-between py-3">
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-900">{label}</p>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={clsx('relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-4', checked ? 'bg-primary-600' : 'bg-gray-200')}
    >
      <span className={clsx('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', checked && 'translate-x-5')} />
    </button>
  </div>
);

const SectionCard: React.FC<{ title: string; description?: string; children: React.ReactNode }> = ({ title, description, children }) => (
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <div className="px-6 py-4 border-b border-gray-100">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('store');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [comingSoon, setComingSoon] = useState<{ open: boolean; feature: string }>({ open: false, feature: '' });

  // Store settings state
  const [store, setStore] = useState<StoreSettings>(defaultStore);

  // Appearance (persisted)
  const [appearance, setAppearance] = useState<AppearanceSettings>(defaultAppearance);

  // Payment settings state
  const [payment, setPayment] = useState<PaymentSettings>(defaultPayment);

  // Notification settings state
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);

  // Security state
  const [security, setSecurity] = useState<SecuritySettings>(defaultSecurity);

  const loadSettings = async () => {
    setLoading(true);
    const storePromise = supabase
      .from('store_settings')
      .select('store_name, support_email, support_phone, default_currency, timezone, maintenance_mode, appearance_settings, tax_rate, prices_include_tax, wallet_enabled, stripe_enabled, paypal_enabled, crypto_enabled, bank_transfer_enabled')
      .maybeSingle();

    const notificationPromise = supabase
      .from('admin_notification_settings')
      .select('*')
      .maybeSingle();

    const securityPromise = supabase
      .from('admin_security_settings')
      .select('*')
      .maybeSingle();

    const [storeResult, notificationResult, securityResult] = await Promise.all([
      storePromise,
      notificationPromise,
      securityPromise,
    ]);

    if (storeResult.error) {
      toast.error(storeResult.error.message);
    } else if (storeResult.data) {
      const data = storeResult.data;
      setStore({
        store_name: data.store_name ?? defaultStore.store_name,
        support_email: data.support_email ?? defaultStore.support_email,
        support_phone: data.support_phone ?? defaultStore.support_phone,
        default_currency: data.default_currency ?? defaultStore.default_currency,
        timezone: data.timezone ?? defaultStore.timezone,
        maintenance_mode: data.maintenance_mode ?? defaultStore.maintenance_mode,
      });
      setPayment({
        wallet_enabled: data.wallet_enabled ?? defaultPayment.wallet_enabled,
        stripe_enabled: data.stripe_enabled ?? defaultPayment.stripe_enabled,
        paypal_enabled: data.paypal_enabled ?? defaultPayment.paypal_enabled,
        crypto_enabled: data.crypto_enabled ?? defaultPayment.crypto_enabled,
        bank_transfer_enabled: data.bank_transfer_enabled ?? defaultPayment.bank_transfer_enabled,
        tax_rate: data.tax_rate ?? defaultPayment.tax_rate,
        prices_include_tax: data.prices_include_tax ?? defaultPayment.prices_include_tax,
      });

      if (data.appearance_settings && typeof data.appearance_settings === 'object') {
        const raw = data.appearance_settings as Partial<AppearanceSettings>;
        setAppearance({
          ...defaultAppearance,
          ...raw,
          music_playback_rate: Number.isFinite(Number(raw.music_playback_rate))
            ? Number(raw.music_playback_rate)
            : 1,
          music_volume: Number.isFinite(Number(raw.music_volume))
            ? Number(raw.music_volume)
            : 0.5,
        });
      }
    }

    if (notificationResult.error) {
      toast.error(notificationResult.error.message);
    } else if (notificationResult.data) {
      const data = notificationResult.data;
      setNotifications({
        email_on_new_order: data.email_on_new_order ?? defaultNotifications.email_on_new_order,
        email_on_refund: data.email_on_refund ?? defaultNotifications.email_on_refund,
        email_on_new_user: data.email_on_new_user ?? defaultNotifications.email_on_new_user,
        email_on_failed_payment: data.email_on_failed_payment ?? defaultNotifications.email_on_failed_payment,
        sms_on_new_order: data.sms_on_new_order ?? defaultNotifications.sms_on_new_order,
        sms_recipient: data.sms_recipient ?? defaultNotifications.sms_recipient,
        in_app_notifications: data.in_app_notifications ?? defaultNotifications.in_app_notifications,
        daily_revenue_report: data.daily_revenue_report ?? defaultNotifications.daily_revenue_report,
        weekly_analytics_report: data.weekly_analytics_report ?? defaultNotifications.weekly_analytics_report,
      });
    }

    if (securityResult.error) {
      toast.error(securityResult.error.message);
    } else if (securityResult.data) {
      const data = securityResult.data;
      setSecurity({
        two_factor_required: data.two_factor_required ?? defaultSecurity.two_factor_required,
        login_alerts: data.login_alerts ?? defaultSecurity.login_alerts,
        failed_attempt_lock: data.failed_attempt_lock ?? defaultSecurity.failed_attempt_lock,
        session_timeout_minutes: data.session_timeout_minutes ?? defaultSecurity.session_timeout_minutes,
      });
    }

    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);

    if (activeTab === 'appearance') {
      const payload: AppearanceSettings = {
        ...appearance,
        music_playback_rate: Math.min(2, Math.max(0.5, Number(appearance.music_playback_rate) || 1)),
        music_volume: Math.min(1, Math.max(0, Number(appearance.music_volume) || 0)),
      };
      const { error } = await supabase
        .from('store_settings')
        .upsert({ id: true, appearance_settings: payload }, { onConflict: 'id' });
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      setAppearance(payload);
      toast.success('Appearance settings saved');
      return;
    }

    if (activeTab === 'store') {
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          id: true,
          store_name: store.store_name,
          support_email: store.support_email,
          support_phone: store.support_phone,
          default_currency: store.default_currency,
          timezone: store.timezone,
          maintenance_mode: store.maintenance_mode,
        }, { onConflict: 'id' });
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Store settings saved');
      return;
    }

    if (activeTab === 'payment') {
      const { error } = await supabase
        .from('store_settings')
        .upsert({
          id: true,
          wallet_enabled: payment.wallet_enabled,
          stripe_enabled: payment.stripe_enabled,
          paypal_enabled: payment.paypal_enabled,
          crypto_enabled: payment.crypto_enabled,
          bank_transfer_enabled: payment.bank_transfer_enabled,
          tax_rate: Math.min(100, Math.max(0, Number(payment.tax_rate) || 0)),
          prices_include_tax: payment.prices_include_tax,
        }, { onConflict: 'id' });
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Payment settings saved');
      return;
    }

    if (activeTab === 'notifications') {
      const { error } = await supabase
        .from('admin_notification_settings')
        .upsert({
          id: true,
          email_on_new_order: notifications.email_on_new_order,
          email_on_refund: notifications.email_on_refund,
          email_on_new_user: notifications.email_on_new_user,
          email_on_failed_payment: notifications.email_on_failed_payment,
          sms_on_new_order: notifications.sms_on_new_order,
          sms_recipient: notifications.sms_recipient,
          in_app_notifications: notifications.in_app_notifications,
          daily_revenue_report: notifications.daily_revenue_report,
          weekly_analytics_report: notifications.weekly_analytics_report,
        }, { onConflict: 'id' });
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Notification settings saved');
      return;
    }

    if (activeTab === 'security') {
      const { error } = await supabase
        .from('admin_security_settings')
        .upsert({
          id: true,
          two_factor_required: security.two_factor_required,
          login_alerts: security.login_alerts,
          failed_attempt_lock: security.failed_attempt_lock,
          session_timeout_minutes: Math.min(1440, Math.max(5, Number(security.session_timeout_minutes) || 60)),
        }, { onConflict: 'id' });
      setSaving(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Security settings saved');
      return;
    }

    setSaving(false);
  };

  const openComingSoon = (feature: string) => setComingSoon({ open: true, feature });

  const setAppearanceField = <K extends keyof AppearanceSettings>(key: K, value: AppearanceSettings[K]) =>
    setAppearance((prev) => ({ ...prev, [key]: value }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Configure your PixieKat store preferences</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-md self-start sm:self-auto">
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Saving…</>
          ) : (
            <><Save className="w-4 h-4 mr-2" />Save Changes</>
          )}
        </button>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex overflow-x-auto border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  'flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-all',
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-700 bg-primary-50/30'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                )}>
                <Icon className="w-4 h-4" />{tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {/* ---- STORE TAB ---- */}
            {activeTab === 'store' && (
              <motion.div key="store" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-6">
                <SectionCard title="Store Information" description="Basic details shown to customers">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label mb-1.5 block">Store Name</label>
                      <input className="input" value={store.store_name} onChange={(e) => setStore((s) => ({ ...s, store_name: e.target.value }))} />
                    </div>
                    <div>
                      <label className="label mb-1.5 block">Support Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input className="input pl-10" type="email" value={store.support_email} onChange={(e) => setStore((s) => ({ ...s, support_email: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="label mb-1.5 block">Support Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input className="input pl-10" value={store.support_phone} onChange={(e) => setStore((s) => ({ ...s, support_phone: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="label mb-1.5 block">Default Currency</label>
                      <select className="input" value={store.default_currency} onChange={(e) => setStore((s) => ({ ...s, default_currency: e.target.value }))}>
                        <option value="PKS">PKS (PixieKat Store)</option>
                        <option value="MYR">MYR (Malaysian Ringgit)</option>
                        <option value="USD">USD (US Dollar)</option>
                        <option value="SGD">SGD (Singapore Dollar)</option>
                        <option value="IDR">IDR (Indonesian Rupiah)</option>
                      </select>
                    </div>
                    <div>
                      <label className="label mb-1.5 block">Timezone</label>
                      <select className="input" value={store.timezone} onChange={(e) => setStore((s) => ({ ...s, timezone: e.target.value }))}>
                        <option value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur (UTC+8)</option>
                        <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                        <option value="Asia/Jakarta">Asia/Jakarta (UTC+7)</option>
                        <option value="UTC">UTC</option>
                      </select>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Store Status" description="Control store visibility">
                  <Toggle
                    checked={store.maintenance_mode}
                    onChange={(v) => setStore((s) => ({ ...s, maintenance_mode: v }))}
                    label="Maintenance Mode"
                    description="Temporarily close the store for maintenance. Customers will see a maintenance page."
                  />
                  {store.maintenance_mode && (
                    <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">Maintenance mode is ON. Your store is hidden from customers.</p>
                    </div>
                  )}
                </SectionCard>
              </motion.div>
            )}

            {/* ---- APPEARANCE TAB ---- */}
            {activeTab === 'appearance' && (
              <motion.div key="appearance" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-6">
                <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Saved to <code className="text-xs bg-blue-100 px-1 rounded">store_settings.appearance_settings</code>.
                    Use PNG or ICO for favicon (16×16 / 32×32). Hard-refresh the storefront if icons look cached.
                  </p>
                </div>

                <SectionCard title="Branding" description="Logo, favicon, and header identity on the storefront">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ImageSourceField
                      label="Logo"
                      value={appearance.logo_url}
                      onChange={(url) => setAppearanceField('logo_url', url)}
                      folder="appearance"
                      placeholder="/img/logo.png"
                      previewClassName="h-16 w-16"
                    />
                    <div>
                      <label className="label mb-1.5 block">Header brand text</label>
                      <input
                        className="input"
                        value={appearance.header_brand_text}
                        onChange={(e) => setAppearanceField('header_brand_text', e.target.value)}
                        placeholder="PixieKat"
                      />
                      <p className="text-xs text-gray-400 mt-1">Shown next to the logo in the navbar</p>
                    </div>
                    <ImageSourceField
                      label="Favicon"
                      value={appearance.favicon_url}
                      onChange={(url) => setAppearanceField('favicon_url', url)}
                      folder="appearance"
                      placeholder="Upload a 32×32 PNG or ICO"
                      previewClassName="h-10 w-10"
                    />
                    <ImageSourceField
                      label="App icon (apple-touch)"
                      value={appearance.icon_url}
                      onChange={(url) => setAppearanceField('icon_url', url)}
                      folder="appearance"
                      placeholder="Optional higher-res icon"
                      previewClassName="h-16 w-16"
                    />
                  </div>
                </SectionCard>

                <SectionCard title="Browser tab titles" description="Titles swap when the visitor leaves or returns to the tab">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label mb-1.5 block">Active tab title</label>
                      <input
                        className="input"
                        value={appearance.tab_title_active}
                        onChange={(e) => setAppearanceField('tab_title_active', e.target.value)}
                        placeholder="PixieKat"
                      />
                    </div>
                    <div>
                      <label className="label mb-1.5 block">Inactive tab title</label>
                      <input
                        className="input"
                        value={appearance.tab_title_inactive}
                        onChange={(e) => setAppearanceField('tab_title_inactive', e.target.value)}
                        placeholder="Come back to PixieKat!"
                      />
                      <p className="text-xs text-gray-400 mt-1">Shown when the browser tab is hidden</p>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Background music" description="Navbar loop track — speed uses HTML audio playbackRate (0.5–2×)">
                  <div className="space-y-4">
                    <div>
                      <label className="label mb-1.5 block">Music URL</label>
                      <input
                        className="input"
                        value={appearance.music_url}
                        onChange={(e) => setAppearanceField('music_url', e.target.value)}
                        placeholder="/audio/loop.mp3"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label mb-1.5 block">
                          Playback speed ({Number(appearance.music_playback_rate).toFixed(2)}×)
                        </label>
                        <input
                          type="range"
                          min={0.5}
                          max={2}
                          step={0.05}
                          className="w-full"
                          value={appearance.music_playback_rate}
                          onChange={(e) => setAppearanceField('music_playback_rate', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="label mb-1.5 block">
                          Volume ({Math.round(Number(appearance.music_volume) * 100)}%)
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          className="w-full"
                          value={appearance.music_volume}
                          onChange={(e) => setAppearanceField('music_volume', Number(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* ---- PAYMENT TAB ---- */}
            {activeTab === 'payment' && (
              <motion.div key="payment" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-6">
                <div className="flex items-start gap-2 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">Payment gateway integrations require API credentials. Contact your gateway provider for keys.</p>
                </div>
                <SectionCard title="Active Payment Methods" description="Enable or disable payment gateways">
                  <div className="divide-y divide-gray-100">
                    {[
                      { key: 'wallet_enabled' as const, name: 'Wallet Balance', desc: 'Internal PixieKat wallet — always active', native: true },
                      { key: 'stripe_enabled' as const, name: 'Stripe', desc: 'Credit/debit card payments via Stripe', native: false },
                      { key: 'paypal_enabled' as const, name: 'PayPal', desc: 'PayPal checkout integration', native: false },
                      { key: 'crypto_enabled' as const, name: 'Cryptocurrency', desc: 'Accept BTC, ETH, USDT via payment processor', native: false },
                      { key: 'bank_transfer_enabled' as const, name: 'Bank Transfer', desc: 'Manual bank transfer with receipt upload', native: false },
                    ].map((gw) => (
                      <div key={gw.name} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{gw.name}</p>
                          <p className="text-xs text-gray-500">{gw.desc}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {gw.native ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                              <CheckCircle className="w-3.5 h-3.5" /> Always On
                            </span>
                          ) : (
                            <>
                              <Toggle
                                checked={payment[gw.key]}
                                onChange={(v) => setPayment((p) => ({ ...p, [gw.key]: v }))}
                                label=""
                              />
                              <button
                                onClick={() => openComingSoon(`${gw.name} Integration`)}
                                className="text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                Configure →
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Tax & Pricing" description="Configure tax rates and pricing display">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label mb-1.5 block">Tax Rate (%)</label>
                      <input
                        className="input"
                        type="number"
                        value={payment.tax_rate}
                        min={0}
                        max={100}
                        step={0.1}
                        onChange={(e) => setPayment((p) => ({ ...p, tax_rate: Number(e.target.value) }))}
                      />
                      <p className="text-xs text-gray-400 mt-1">Set 0 to disable tax</p>
                    </div>
                    <div>
                      <label className="label mb-1.5 block">Price Display</label>
                      <select
                        className="input"
                        value={payment.prices_include_tax ? 'inclusive' : 'exclusive'}
                        onChange={(e) => setPayment((p) => ({ ...p, prices_include_tax: e.target.value === 'inclusive' }))}
                      >
                        <option value="inclusive">Tax Inclusive</option>
                        <option value="exclusive">Tax Exclusive</option>
                      </select>
                    </div>
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* ---- NOTIFICATIONS TAB ---- */}
            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-6">
                <SectionCard title="Email Notifications" description="Receive email alerts for store events">
                  <div className="divide-y divide-gray-100">
                    <Toggle checked={notifications.email_on_new_order} onChange={(v) => setNotifications((n) => ({ ...n, email_on_new_order: v }))} label="New Order" description="Get emailed when a new order is placed" />
                    <Toggle checked={notifications.email_on_failed_payment} onChange={(v) => setNotifications((n) => ({ ...n, email_on_failed_payment: v }))} label="Failed Payment" description="Get alerted when a payment fails" />
                    <Toggle checked={notifications.email_on_refund} onChange={(v) => setNotifications((n) => ({ ...n, email_on_refund: v }))} label="Refund Request" description="Notify when a customer requests a refund" />
                    <Toggle checked={notifications.email_on_new_user} onChange={(v) => setNotifications((n) => ({ ...n, email_on_new_user: v }))} label="New User Registration" description="Email when someone creates an account" />
                  </div>
                </SectionCard>

                <SectionCard title="SMS Notifications" description="Mobile alerts for critical events">
                  <Toggle checked={notifications.sms_on_new_order} onChange={(v) => setNotifications((n) => ({ ...n, sms_on_new_order: v }))} label="Order Alerts via SMS" description="Requires SMS gateway setup" />
                  {notifications.sms_on_new_order && (
                    <div className="mt-3">
                      <label className="label mb-1.5 block">SMS Recipient Number</label>
                      <input
                        className="input"
                        placeholder="+60 12-345 6789"
                        value={notifications.sms_recipient}
                        onChange={(e) => setNotifications((n) => ({ ...n, sms_recipient: e.target.value }))}
                      />
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Reports & Summaries">
                  <div className="divide-y divide-gray-100">
                    <Toggle checked={notifications.daily_revenue_report} onChange={(v) => setNotifications((n) => ({ ...n, daily_revenue_report: v }))} label="Daily Revenue Report" description="Receive a daily summary of sales and orders" />
                    <Toggle checked={notifications.weekly_analytics_report} onChange={(v) => setNotifications((n) => ({ ...n, weekly_analytics_report: v }))} label="Weekly Analytics Report" description="Weekly performance digest every Monday" />
                    <Toggle checked={notifications.in_app_notifications} onChange={(v) => setNotifications((n) => ({ ...n, in_app_notifications: v }))} label="In-App Notifications" description="Show notifications inside the admin panel" />
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* ---- SECURITY TAB ---- */}
            {activeTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-6">
                <SectionCard title="Authentication" description="Control admin access security">
                  <div className="divide-y divide-gray-100">
                    <Toggle checked={security.two_factor_required} onChange={(v) => setSecurity((s) => ({ ...s, two_factor_required: v }))} label="Two-Factor Authentication (2FA)"
                      description="Require an OTP code on every admin login" />
                    <Toggle checked={security.login_alerts} onChange={(v) => setSecurity((s) => ({ ...s, login_alerts: v }))} label="Login Alerts"
                      description="Email notification when a new device logs in" />
                    <Toggle checked={security.failed_attempt_lock} onChange={(v) => setSecurity((s) => ({ ...s, failed_attempt_lock: v }))} label="Account Lockout"
                      description="Lock account after 5 consecutive failed login attempts" />
                  </div>
                </SectionCard>

                <SectionCard title="Session Management">
                  <div className="space-y-4">
                    <div>
                      <label className="label mb-1.5 block">Session Timeout (minutes)</label>
                      <input
                        className="input w-32"
                        type="number"
                        value={security.session_timeout_minutes}
                        onChange={(e) => setSecurity((s) => ({ ...s, session_timeout_minutes: Number(e.target.value) }))}
                        min={5}
                        max={1440}
                      />
                      <p className="text-xs text-gray-400 mt-1">Inactive sessions are logged out after this duration</p>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Password & API Keys">
                  <div className="space-y-3">
                    <button className="btn btn-outline btn-md w-full sm:w-auto flex items-center gap-2">
                      <Lock className="w-4 h-4" /> Change Password
                    </button>
                    <button onClick={() => openComingSoon('API Key Management')}
                      className="btn btn-outline btn-md w-full sm:w-auto flex items-center gap-2 ml-0 sm:ml-2">
                      <Key className="w-4 h-4" /> Manage API Keys
                    </button>
                  </div>
                </SectionCard>

                <SectionCard title="Danger Zone" description="Irreversible actions — proceed with caution">
                  <div className="space-y-3">
                    <div className="p-4 border border-red-200 rounded-xl bg-red-50">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-red-800">Export All Data</p>
                          <p className="text-xs text-red-600 mt-0.5">Download a full backup of all orders, users, and products.</p>
                        </div>
                        <button onClick={() => openComingSoon('Full Data Export')}
                          className="text-xs font-medium text-red-700 bg-white border border-red-300 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                          Export
                        </button>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <ComingSoonModal
        isOpen={comingSoon.open}
        onClose={() => setComingSoon({ open: false, feature: '' })}
        featureName={comingSoon.feature}
        description="This settings feature is currently being developed. Check back soon!"
      />
    </div>
  );
};

export default Settings;
