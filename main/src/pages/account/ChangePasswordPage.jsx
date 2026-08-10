import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { pageBackground } from "./accountShared";
import { supabase } from "../../lib/supabase";

const PasswordInput = ({ id, label, value, onChange, placeholder, showToggle }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-bold text-slate-700">{label}</label>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <Lock className="h-5 w-5 text-slate-400" />
        </div>
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete="new-password"
          className="h-14 w-full rounded-2xl border border-white/50 bg-white/60 pl-12 pr-12 text-base font-medium text-slate-900 outline-none transition focus:border-[#8b6dff] focus:bg-white focus:ring-4 focus:ring-[#8b6dff]/10"
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600 transition"
            tabIndex={-1}
          >
            {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
      </div>
    </div>
  );
};

const PasswordRule = ({ met, label }) => (
  <div className={`flex items-center gap-2 text-sm transition-colors ${met ? "text-emerald-600" : "text-slate-400"}`}>
    <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${met ? "bg-emerald-500" : "bg-slate-300"}`} />
    {label}
  </div>
);

const ChangePasswordPage = () => {
  const navigate = useNavigate();

  const [newPassword, setNewPassword]       = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState("");
  const [success, setSuccess]               = useState(false);

  const rules = [
    { met: newPassword.length >= 8,         label: "At least 8 characters" },
    { met: /[A-Z]/.test(newPassword),        label: "One uppercase letter" },
    { met: /[0-9]/.test(newPassword),        label: "One number" },
    { met: /[^A-Za-z0-9]/.test(newPassword), label: "One special character" },
  ];
  const allRulesMet = rules.every((r) => r.met);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!allRulesMet) { setError("Password does not meet all requirements."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }

    setSaving(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);

    if (err) {
      setError(err.message || "Failed to update password. Please try again.");
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/account/security"), 2000);
    }
  };

  return (
    <div className="min-h-screen px-4 pb-28 pt-24 text-slate-900 sm:px-6 md:px-8 md:pt-28" style={pageBackground}>
      <div className="mx-auto max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <button
              onClick={() => navigate("/account/security")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 shadow-sm transition hover:bg-white"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </button>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Change Password</h1>
          </div>

          <section className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_18px_50px_rgba(91,79,118,0.14)] backdrop-blur-xl sm:p-8">
            {success ? (
              <div className="flex flex-col items-center gap-4 py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Password Updated!</h2>
                <p className="text-sm text-slate-500">
                  Your password has been changed successfully. Redirecting…
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <PasswordInput
                  id="new-password"
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setError(""); }}
                  placeholder="Enter a new password"
                  showToggle
                />

                <PasswordInput
                  id="confirm-password"
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  placeholder="Re-enter your new password"
                  showToggle
                />

                {/* Password rules */}
                {newPassword.length > 0 && (
                  <div className="rounded-xl bg-slate-50 px-4 py-3 space-y-1.5 border border-slate-100">
                    {rules.map((r) => (
                      <PasswordRule key={r.label} met={r.met} label={r.label} />
                    ))}
                  </div>
                )}

                {/* Mismatch hint */}
                {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                  <p className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    Passwords don't match yet
                  </p>
                )}

                {/* API error */}
                {error && (
                  <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-medium text-red-600">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving || !allRulesMet || newPassword !== confirmPassword}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6c49ff] to-[#8b6dff] text-lg font-bold text-white shadow-[0_14px_28px_rgba(108,73,255,0.3)] transition hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {saving
                    ? <><Loader2 className="h-5 w-5 animate-spin" /> Updating…</>
                    : "Update Password"
                  }
                </button>
              </form>
            )}
          </section>
        </motion.div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
