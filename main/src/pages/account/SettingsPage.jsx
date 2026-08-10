import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Bell, Shield, Monitor, ChevronRight, X, Loader2 } from "lucide-react";
import { pageBackground } from "./accountShared";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

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
  const { user } = useAuth();

  const [notifications, setNotifications] = useState({
    email_notifications: true,
    sms_notifications: false,
    marketing_emails: true,
    order_notifications: true,
    login_alerts: true,
  });
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [saving, setSaving] = useState(null);

  const [showComingSoon, setShowComingSoon] = useState(false);
  const [comingSoonFeature, setComingSoonFeature] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("user_settings")
      .select("email_notifications, sms_notifications, marketing_emails, order_notifications, login_alerts")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setNotifications(data);
        setLoadingPrefs(false);
      });
  }, [user?.id]);

  const toggleNotification = async (key) => {
    const newVal = !notifications[key];
    setNotifications((prev) => ({ ...prev, [key]: newVal }));
    setSaving(key);
    await supabase
      .from("user_settings")
      .update({ [key]: newVal, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    setSaving(null);
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
            {loadingPrefs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-7 w-7 animate-spin text-[#6c49ff]" />
              </div>
            ) : (
              <>
                <SettingsSection title="Notifications" icon={Bell}>
                  <ToggleSwitch
                    label="Email Updates"
                    description="Receive emails about account updates and new features."
                    enabled={notifications.email_notifications}
                    onChange={() => toggleNotification("email_notifications")}
                  />
                  <ToggleSwitch
                    label="SMS Alerts"
                    description="Get important account alerts via SMS."
                    enabled={notifications.sms_notifications}
                    onChange={() => toggleNotification("sms_notifications")}
                  />
                  <ToggleSwitch
                    label="Marketing Communications"
                    description="Receive promotional offers and news."
                    enabled={notifications.marketing_emails}
                    onChange={() => toggleNotification("marketing_emails")}
                  />
                  <ToggleSwitch
                    label="Order Status"
                    description="Get notified when your order status changes."
                    enabled={notifications.order_notifications}
                    onChange={() => toggleNotification("order_notifications")}
                  />
                  <ToggleSwitch
                    label="Login Alerts"
                    description="Get notified when your account is accessed from a new device."
                    enabled={notifications.login_alerts}
                    onChange={() => toggleNotification("login_alerts")}
                  />
                  {saving && (
                    <p className="text-xs text-[#6c49ff] font-medium pt-1 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                    </p>
                  )}
                </SettingsSection>

                <SettingsSection title="Security" icon={Shield}>
                  <button
                    type="button"
                    onClick={() => navigate("/account/security/change-password")}
                    className="flex w-full items-center justify-between py-4 text-left group"
                  >
                    <div>
                      <p className="text-base font-bold text-slate-800 group-hover:text-[#6c49ff] transition-colors">Change Password</p>
                      <p className="mt-1 text-sm text-slate-500">Update your login password.</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[#6c49ff] transition-colors" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/account/security")}
                    className="flex w-full items-center justify-between py-4 text-left group border-t border-slate-100"
                  >
                    <div>
                      <p className="text-base font-bold text-slate-800 group-hover:text-[#6c49ff] transition-colors">Security Center</p>
                      <p className="mt-1 text-sm text-slate-500">Manage 2FA, active sessions, and more.</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[#6c49ff] transition-colors" />
                  </button>
                </SettingsSection>

                <SettingsSection title="Display Preferences" icon={Monitor}>
                  <ToggleSwitch
                    label="Dark Mode"
                    description="Toggle dark mode appearance."
                    enabled={false}
                    onChange={() => handleComingSoon("Dark Mode")}
                  />
                  <ToggleSwitch
                    label="Compact View"
                    description="Decrease spacing to see more content on screen."
                    enabled={false}
                    onChange={() => handleComingSoon("Compact View")}
                  />
                </SettingsSection>

                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => navigate("/account")}
                    className="flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#6c49ff] to-[#8b6dff] text-lg font-bold text-white shadow-[0_14px_28px_rgba(108,73,255,0.3)] transition hover:scale-[1.02]"
                  >
                    Back to Account
                  </button>
                </div>
              </>
            )}
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
