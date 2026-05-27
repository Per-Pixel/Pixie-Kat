import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Key, Shield, Smartphone, Clock, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { pageBackground } from "./accountShared";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

function SecurityCard({ icon: Icon, title, description, badge, badgeColor, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-[22px] border border-white/60 bg-white/80 p-6 text-left shadow-[0_10px_30px_rgba(91,79,118,0.10)] backdrop-blur-sm transition hover:border-[#8b6dff]/40 hover:shadow-[0_14px_36px_rgba(108,73,255,0.12)] hover:bg-white"
    >
      <div className="flex items-center gap-5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6c49ff]/10 to-[#8b6dff]/10">
          <Icon className="h-5 w-5 text-[#6c49ff]" />
        </div>
        <div>
          <p className="text-base font-bold text-slate-900">{title}</p>
          <p className="mt-0.5 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
        {badge && (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeColor}`}>
            {badge}
          </span>
        )}
        <ChevronRight className="h-5 w-5 text-slate-300" />
      </div>
    </button>
  );
}

const SecurityPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [twoFactor, setTwoFactor] = useState(null);
  const [loginHistory, setLoginHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      supabase
        .from("user_2fa_config")
        .select("is_enabled, method")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("user_login_history")
        .select("id, browser, device_type, city, country, ip_address, success, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]).then(([{ data: tfa }, { data: logs }]) => {
      setTwoFactor(tfa);
      setLoginHistory(logs ?? []);
      setLoading(false);
    });
  }, [user?.id]);

  const formatTs = (ts) =>
    new Date(ts).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="min-h-screen px-4 pb-28 pt-24 text-slate-900 sm:px-6 md:px-8 md:pt-28" style={pageBackground}>
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          {/* Header */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/account")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-sm transition hover:bg-white"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Security Center</h1>
              <p className="text-sm text-slate-500 mt-0.5">Manage how your account is protected.</p>
            </div>
          </div>

          {/* Security actions */}
          <div className="space-y-3">
            <SecurityCard
              icon={Key}
              title="Change Password"
              description="Update your login password to keep your account secure."
              onClick={() => navigate("/account/security/change-password")}
            />
            <SecurityCard
              icon={Smartphone}
              title="Two-Factor Authentication"
              description="Add a second layer of protection using an authenticator app."
              badge={twoFactor?.is_enabled ? "Enabled" : "Off"}
              badgeColor={twoFactor?.is_enabled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-500"
              }
              onClick={() => navigate("/account/security/two-factor")}
            />
            <SecurityCard
              icon={Shield}
              title="Email Verification"
              description="Your email address verification status."
              badge={user?.email_confirmed_at ? "Verified" : "Unverified"}
              badgeColor={user?.email_confirmed_at
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
              }
              onClick={() => {}}
            />
          </div>

          {/* Recent activity */}
          <div className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_18px_50px_rgba(91,79,118,0.14)] backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-5">
              <Clock className="h-5 w-5 text-[#6c49ff]" />
              <h2 className="text-xl font-bold text-slate-900">Recent Login Activity</h2>
            </div>

            {loading ? (
              <div className="py-8 text-center text-slate-400 text-sm">Loading…</div>
            ) : loginHistory.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">No login history yet.</div>
            ) : (
              <div className="space-y-3">
                {loginHistory.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      {log.success
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        : <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                      }
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {log.browser ?? log.device_type ?? "Unknown device"}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {[log.ip_address, log.city, log.country].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap ml-4">
                      {formatTs(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SecurityPage;
