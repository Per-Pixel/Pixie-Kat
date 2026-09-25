import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, ShieldOff, Loader2, Smartphone } from "lucide-react";
import { pageBackground } from "./accountShared";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

const TwoFactorPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [factor, setFactor] = useState(null);          // verified TOTP factor
  const [enroll, setEnroll] = useState(null);          // { factorId, qrCode, secret }
  const [code, setCode] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadFactors = async () => {
    const { data, error: err } = await supabase.auth.mfa.listFactors();
    if (err) {
      setError(err.message);
    } else {
      setFactor(data?.totp?.[0] ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const syncConfigRow = async (enabled) => {
    await supabase
      .from("user_2fa_config")
      .update({
        is_enabled: enabled,
        method: "totp",
        enabled_at: enabled ? new Date().toISOString() : null,
        disabled_at: enabled ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);
  };

  const startEnroll = async () => {
    setWorking(true);
    setError("");
    const { data, error: err } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "PixieKat",
    });
    setWorking(false);
    if (err) {
      setError(err.message);
      return;
    }
    setEnroll({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    setCode("");
  };

  const verifyEnroll = async () => {
    if (code.trim().length < 6) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setWorking(true);
    setError("");
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enroll.factorId,
      code: code.trim(),
    });
    if (err) {
      setWorking(false);
      setError(err.message);
      return;
    }
    await syncConfigRow(true);
    setWorking(false);
    setEnroll(null);
    setNotice("Two-factor authentication is now on. You'll need your authenticator code at every login.");
    loadFactors();
  };

  const cancelEnroll = async () => {
    // Unenroll the pending factor so it doesn't linger half-configured
    if (enroll?.factorId) {
      await supabase.auth.mfa.unenroll({ factorId: enroll.factorId });
    }
    setEnroll(null);
    setCode("");
    setError("");
  };

  const disable2fa = async () => {
    if (!factor) return;
    setWorking(true);
    setError("");
    const { error: err } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (err) {
      setWorking(false);
      setError(err.message);
      return;
    }
    await syncConfigRow(false);
    setWorking(false);
    setNotice("Two-factor authentication is now off.");
    loadFactors();
  };

  return (
    <div className="min-h-screen px-4 pb-28 pt-24 text-slate-900 sm:px-6 md:px-8 md:pt-28" style={pageBackground}>
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-8"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/account/security")}
              className="flex size-10 items-center justify-center rounded-full bg-white/80 shadow-sm transition hover:bg-white"
            >
              <ArrowLeft className="size-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Two-Factor Authentication</h1>
              <p className="mt-0.5 text-sm text-slate-500">Authenticator app (TOTP) — Google Authenticator, Authy, etc.</p>
            </div>
          </div>

          {notice && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-700">
              {notice}
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
              {error}
            </div>
          )}

          <section className="rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_18px_50px_rgba(91,79,118,0.14)] backdrop-blur-xl sm:p-10">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-7 animate-spin text-[#6c49ff]" />
              </div>
            ) : factor ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                    <ShieldCheck className="size-6" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">2FA is enabled</p>
                    <p className="text-sm text-slate-500">
                      Your account asks for an authenticator code at every login.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={disable2fa}
                  disabled={working}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-50 font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                >
                  {working ? <Loader2 className="size-4 animate-spin" /> : <ShieldOff className="size-4" />}
                  Disable 2FA
                </button>
              </div>
            ) : enroll ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-[#6c49ff]/10 text-[#6c49ff]">
                    <Smartphone className="size-6" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">Scan with your authenticator app</p>
                    <p className="text-sm text-slate-500">Then enter the 6-digit code it shows.</p>
                  </div>
                </div>

                <div className="flex justify-center rounded-2xl bg-white p-4">
                  <div dangerouslySetInnerHTML={{ __html: enroll.qrCode }} />
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Can&apos;t scan? Enter this key manually
                  </p>
                  <code className="block break-all rounded-xl bg-slate-100 px-4 py-3 font-mono text-sm text-slate-700">
                    {enroll.secret}
                  </code>
                </div>

                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="6-digit code"
                  className="h-14 w-full rounded-xl border border-[#dfe4ec] bg-white px-4 text-center text-xl font-bold tracking-[0.5em] text-[#141923] outline-none placeholder:font-normal placeholder:tracking-normal placeholder:text-[#9aa2ad]"
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={cancelEnroll}
                    disabled={working}
                    className="h-12 flex-1 rounded-2xl bg-slate-100 font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={verifyEnroll}
                    disabled={working}
                    className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6c49ff] to-[#8b6dff] font-bold text-white shadow-[0_10px_20px_rgba(108,73,255,0.2)] transition hover:scale-[1.02] disabled:opacity-60"
                  >
                    {working ? <Loader2 className="size-4 animate-spin" /> : null}
                    Verify &amp; Enable
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                    <Smartphone className="size-6" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-slate-900">2FA is off</p>
                    <p className="text-sm text-slate-500">
                      Add a second layer of protection — a code from your phone will be required to log in.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={startEnroll}
                  disabled={working}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#6c49ff] to-[#8b6dff] font-bold text-white shadow-[0_10px_20px_rgba(108,73,255,0.2)] transition hover:scale-[1.02] disabled:opacity-60"
                >
                  {working ? <Loader2 className="size-4 animate-spin" /> : null}
                  Enable 2FA
                </button>
              </div>
            )}
          </section>
        </motion.div>
      </div>
    </div>
  );
};

export default TwoFactorPage;
