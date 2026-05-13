import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, Shield, Monitor, Smartphone, X } from "lucide-react";
import { pageBackground } from "./accountShared";

const ToggleSwitch = ({ label, description, enabled, onChange }) => (
  <div className="flex items-center justify-between py-4">
    <div className="pr-4">
      <p className="text-base font-bold text-slate-800">{label}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#8b6dff] focus:ring-offset-2 ${
        enabled ? "bg-[#6c49ff]" : "bg-slate-200"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </div>
);

const SettingsSection = ({ title, icon: Icon, children }) => (
  <div className="mb-8">
    <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-[#6c49ff]">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
    </div>
    <div className="divide-y divide-slate-100">
      {children}
    </div>
  </div>
);

const SettingsPage = () => {
  const navigate = useNavigate();

  const [settings, setSettings] = useState({
    notifications: {
      emailUpdates: true,
      smsAlerts: false,
      marketing: true,
      orderStatus: true,
    },
    security: {
      twoFactor: false,
      loginAlerts: true,
    },
    display: {
      darkMode: false,
      compactView: false,
    },
  });

  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState("");

  const toggleSetting = (category, key) => {
    setSettings((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: !prev[category][key],
      },
    }));
  };

  const handleComingSoon = (featureName) => {
    setComingSoonFeature(featureName);
    setShowComingSoon(true);
  };

  return (
    <div className="min-h-screen px-4 pb-28 pt-24 text-slate-900 sm:px-6 md:px-8 md:pt-28" style={pageBackground}>
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <button
              onClick={() => navigate("/account")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-sm transition hover:bg-white"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Manage Settings</h1>
          </div>

          <section className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_18px_50px_rgba(91,79,118,0.14)] backdrop-blur-xl sm:p-10">
            <SettingsSection title="Notifications" icon={Bell}>
              <ToggleSwitch
                label="Email Updates"
                description="Receive emails about updates and new features."
                enabled={settings.notifications.emailUpdates}
                onChange={() => toggleSetting("notifications", "emailUpdates")}
              />
              <ToggleSwitch
                label="SMS Alerts"
                description="Get important account alerts via SMS."
                enabled={settings.notifications.smsAlerts}
                onChange={() => toggleSetting("notifications", "smsAlerts")}
              />
              <ToggleSwitch
                label="Marketing Communications"
                description="Receive promotional offers and news."
                enabled={settings.notifications.marketing}
                onChange={() => toggleSetting("notifications", "marketing")}
              />
              <ToggleSwitch
                label="Order Status"
                description="Get notified when your order status changes."
                enabled={settings.notifications.orderStatus}
                onChange={() => toggleSetting("notifications", "orderStatus")}
              />
            </SettingsSection>

            <SettingsSection title="Security" icon={Shield}>
              <ToggleSwitch
                label="Two-Factor Authentication (2FA)"
                description="Add an extra layer of security to your account."
                enabled={settings.security.twoFactor}
                onChange={() => handleComingSoon("Two-Factor Authentication")}
              />
              <ToggleSwitch
                label="Login Alerts"
                description="Get notified of logins from new devices."
                enabled={settings.security.loginAlerts}
                onChange={() => handleComingSoon("Login Alerts")}
              />
              <div className="py-4">
                <button type="button" onClick={() => handleComingSoon("Change Password")} className="text-sm font-bold text-[#6c49ff] hover:underline">
                  Change Password
                </button>
              </div>
            </SettingsSection>

            <SettingsSection title="Display Preferences" icon={Monitor}>
              <ToggleSwitch
                label="Dark Mode"
                description="Toggle dark mode appearance (currently relies on system settings if disabled)."
                enabled={settings.display.darkMode}
                onChange={() => handleComingSoon("Dark Mode")}
              />
              <ToggleSwitch
                label="Compact View"
                description="Decrease spacing to see more content on screen."
                enabled={settings.display.compactView}
                onChange={() => handleComingSoon("Compact View")}
              />
            </SettingsSection>

            {/* Save Button */}
            <div className="pt-6">
              <button
                type="button"
                onClick={() => navigate("/account")}
                className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#6c49ff] to-[#8b6dff] text-lg font-bold text-white shadow-[0_14px_28px_rgba(108,73,255,0.3)] transition hover:scale-[1.02]"
              >
                Save Preferences
              </button>
            </div>
          </section>
        </motion.div>
      </div>

      {/* Coming Soon Modal */}
      <AnimatePresence>
        {showComingSoon && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Coming Soon</h3>
                <button
                  type="button"
                  onClick={() => setShowComingSoon(false)}
                  className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-4 text-base text-slate-600">
                The <span className="font-semibold text-[#6c49ff]">{comingSoonFeature}</span> feature is currently under development and will be available soon!
              </p>
              <button
                type="button"
                onClick={() => setShowComingSoon(false)}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#6c49ff] to-[#8b6dff] py-3 text-sm font-bold text-white shadow-[0_10px_20px_rgba(108,73,255,0.2)] transition hover:scale-[1.02]"
              >
                Got it
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
