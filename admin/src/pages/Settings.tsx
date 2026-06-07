import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Bell, Shield, Globe, CreditCard, Store,
  Mail, Phone, Lock, Key, AlertTriangle, CheckCircle,
  ToggleLeft, ToggleRight, Info,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ComingSoonModal from '../components/common/ComingSoonModal';
import clsx from 'clsx';

type Tab = 'store' | 'payment' | 'notifications' | 'security';

const tabs: Array<{ id: Tab; label: string; icon: React.ComponentType<any> }> = [
  { id: 'store', label: 'Store', icon: Store },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
];

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
  const [comingSoon, setComingSoon] = useState<{ open: boolean; feature: string }>({ open: false, feature: '' });

  // Store settings state
  const [storeName, setStoreName] = useState('PixieKat');
  const [storeEmail, setStoreEmail] = useState('support@pixiekat.com');
  const [currency, setCurrency] = useState('PKS');
  const [timezone, setTimezone] = useState('Asia/Kuala_Lumpur');
  const [supportPhone, setSupportPhone] = useState('+60 12-345 6789');
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Notification settings state
  const [emailOnNewOrder, setEmailOnNewOrder] = useState(true);
  const [emailOnRefund, setEmailOnRefund] = useState(true);
  const [emailOnNewUser, setEmailOnNewUser] = useState(false);
  const [emailOnFailed, setEmailOnFailed] = useState(true);
  const [smsOnOrder, setSmsOnOrder] = useState(false);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [dailyReport, setDailyReport] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);

  // Security state
  const [twoFactor, setTwoFactor] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('60');
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [failedAttemptLock, setFailedAttemptLock] = useState(true);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success('Settings saved successfully!');
  };

  const openComingSoon = (feature: string) => setComingSoon({ open: true, feature });

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
                      <input className="input" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                    </div>
                    <div>
                      <label className="label mb-1.5 block">Support Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input className="input pl-10" type="email" value={storeEmail} onChange={(e) => setStoreEmail(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="label mb-1.5 block">Support Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input className="input pl-10" value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className="label mb-1.5 block">Default Currency</label>
                      <select className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                        <option value="PKS">PKS (PixieKat Store)</option>
                        <option value="MYR">MYR (Malaysian Ringgit)</option>
                        <option value="USD">USD (US Dollar)</option>
                        <option value="SGD">SGD (Singapore Dollar)</option>
                        <option value="IDR">IDR (Indonesian Rupiah)</option>
                      </select>
                    </div>
                    <div>
                      <label className="label mb-1.5 block">Timezone</label>
                      <select className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
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
                    checked={maintenanceMode}
                    onChange={setMaintenanceMode}
                    label="Maintenance Mode"
                    description="Temporarily close the store for maintenance. Customers will see a maintenance page."
                  />
                  {maintenanceMode && (
                    <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">Maintenance mode is ON. Your store is hidden from customers.</p>
                    </div>
                  )}
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
                      { name: 'Wallet Balance', desc: 'Internal PixieKat wallet — always active', active: true, native: true },
                      { name: 'Stripe', desc: 'Credit/debit card payments via Stripe', active: false, native: false },
                      { name: 'PayPal', desc: 'PayPal checkout integration', active: false, native: false },
                      { name: 'Cryptocurrency', desc: 'Accept BTC, ETH, USDT via payment processor', active: false, native: false },
                      { name: 'Bank Transfer', desc: 'Manual bank transfer with receipt upload', active: false, native: false },
                    ].map((gw) => (
                      <div key={gw.name} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{gw.name}</p>
                          <p className="text-xs text-gray-500">{gw.desc}</p>
                        </div>
                        {gw.native ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                            <CheckCircle className="w-3.5 h-3.5" /> Always On
                          </span>
                        ) : (
                          <button
                            onClick={() => openComingSoon(`${gw.name} Integration`)}
                            className="text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Configure →
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Tax & Pricing" description="Configure tax rates and pricing display">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label mb-1.5 block">Tax Rate (%)</label>
                      <input className="input" type="number" defaultValue="0" min="0" max="100" step="0.1" />
                      <p className="text-xs text-gray-400 mt-1">Set 0 to disable tax</p>
                    </div>
                    <div>
                      <label className="label mb-1.5 block">Price Display</label>
                      <select className="input">
                        <option>Tax Inclusive</option>
                        <option>Tax Exclusive</option>
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
                    <Toggle checked={emailOnNewOrder} onChange={setEmailOnNewOrder} label="New Order" description="Get emailed when a new order is placed" />
                    <Toggle checked={emailOnFailed} onChange={setEmailOnFailed} label="Failed Payment" description="Get alerted when a payment fails" />
                    <Toggle checked={emailOnRefund} onChange={setEmailOnRefund} label="Refund Request" description="Notify when a customer requests a refund" />
                    <Toggle checked={emailOnNewUser} onChange={setEmailOnNewUser} label="New User Registration" description="Email when someone creates an account" />
                  </div>
                </SectionCard>

                <SectionCard title="SMS Notifications" description="Mobile alerts for critical events">
                  <Toggle checked={smsOnOrder} onChange={setSmsOnOrder} label="Order Alerts via SMS" description="Requires SMS gateway setup" />
                  {smsOnOrder && (
                    <div className="mt-3">
                      <label className="label mb-1.5 block">SMS Recipient Number</label>
                      <input className="input" placeholder="+60 12-345 6789" />
                    </div>
                  )}
                </SectionCard>

                <SectionCard title="Reports & Summaries">
                  <div className="divide-y divide-gray-100">
                    <Toggle checked={dailyReport} onChange={setDailyReport} label="Daily Revenue Report" description="Receive a daily summary of sales and orders" />
                    <Toggle checked={weeklyReport} onChange={setWeeklyReport} label="Weekly Analytics Report" description="Weekly performance digest every Monday" />
                    <Toggle checked={pushNotifs} onChange={setPushNotifs} label="In-App Notifications" description="Show notifications inside the admin panel" />
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
                    <Toggle checked={twoFactor} onChange={setTwoFactor} label="Two-Factor Authentication (2FA)"
                      description="Require an OTP code on every admin login" />
                    <Toggle checked={loginAlerts} onChange={setLoginAlerts} label="Login Alerts"
                      description="Email notification when a new device logs in" />
                    <Toggle checked={failedAttemptLock} onChange={setFailedAttemptLock} label="Account Lockout"
                      description="Lock account after 5 consecutive failed login attempts" />
                  </div>
                </SectionCard>

                <SectionCard title="Session Management">
                  <div className="space-y-4">
                    <div>
                      <label className="label mb-1.5 block">Session Timeout (minutes)</label>
                      <input className="input w-32" type="number" value={sessionTimeout}
                        onChange={(e) => setSessionTimeout(e.target.value)} min="5" max="1440" />
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
