import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgePercent,
  Check,
  CheckCircle2,
  CreditCard,
  Crown,
  Loader2,
  Smartphone,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";

import { fallbackGameImage, gamesData } from "../games/gamesData";
import { publicMediaUrl, supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { loadRazorpayCheckout } from "../../lib/razorpay";
import { API_BASE } from "../../lib/apiBase";

const MIN_COINS = 1;
const MAX_COINS = 10_000; // 1 coin = ₹1

const quickAddAmounts = [100, 500, 1000, 5000, 10000];

const gatewayMethods = [
  { id: "aluu", name: "UPI", description: "Pay instantly with any UPI app", icon: Smartphone },
  { id: "razorpay", name: "Razorpay", description: "UPI, cards, net banking & more", icon: CreditCard },
];

const PENDING_KEY = "pixiekat_pending_service_payment";

const formatCoins = (value) => new Intl.NumberFormat("en-IN").format(value);
const formatInr = (value) => `₹${new Intl.NumberFormat("en-IN").format(Number(value) || 0)}`;

const readPending = () => {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const writePending = (value) => {
  try {
    if (value) localStorage.setItem(PENDING_KEY, JSON.stringify(value));
    else localStorage.removeItem(PENDING_KEY);
  } catch { /* storage unavailable */ }
};

const firstJoined = (value) => (Array.isArray(value) ? value[0] ?? null : value ?? null);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const AddMoneyPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameId } = useParams();
  const { user, profile, isAuthenticated, isLoading: authLoading, refreshProfile } = useAuth();

  const [coins, setCoins] = useState(1000);
  const [method, setMethod] = useState("aluu");
  const [plans, setPlans] = useState([]);
  const [activeMembership, setActiveMembership] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(null);
  const [success, setSuccess] = useState(null);
  const pollToken = useRef(0);

  const game = gamesData.find((item) => item.id === gameId);
  const walletBalance = Number(profile?.wallet_balance ?? 0);
  const activePlan = firstJoined(activeMembership?.membership_plans);

  const loadMemberships = async (userId) => {
    const { data: planRows } = await supabase
      .from("membership_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    setPlans(planRows ?? []);

    if (!userId) {
      setActiveMembership(null);
      return;
    }
    const { data: membership } = await supabase
      .from("user_memberships")
      .select("*, membership_plans(*)")
      .eq("user_id", userId)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveMembership(membership ?? null);
  };

  useEffect(() => {
    setPending(readPending());
    loadMemberships(user?.id);
  }, [user?.id]);

  const postApi = async (path, body) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error("Your session expired. Please log in again.");
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  };

  const finish = async (kind, label) => {
    await refreshProfile().catch(() => {});
    if (kind === "membership") await loadMemberships(user?.id);
    writePending(null);
    setPending(null);
    setSuccess({ kind, label });
  };

  const verifyRazorpay = async (orderId, paymentResponse) => {
    const { response, data } = await postApi("/razorpay/verify-payment", {
      orderId,
      razorpay_order_id: paymentResponse.razorpay_order_id,
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      razorpay_signature: paymentResponse.razorpay_signature,
    });
    if (!response.ok || !data.ok) {
      throw new Error("Payment was received but confirmation is still processing — check your order history shortly.");
    }
  };

  const openRazorpay = (data, description) =>
    loadRazorpayCheckout().then(
      (Razorpay) =>
        new Promise((resolve, reject) => {
          let handled = false;
          const checkout = new Razorpay({
            key: data.razorpay.keyId,
            amount: data.razorpay.amount,
            currency: data.razorpay.currency,
            name: "PixieKat",
            description,
            order_id: data.razorpay.orderId,
            prefill: {
              name: profile?.name || "",
              email: profile?.email || "",
              contact: String(profile?.phone || "").replace(/\D/g, ""),
            },
            theme: { color: "#6d4cff" },
            modal: {
              ondismiss: () => {
                if (!handled) reject(new Error("Payment window closed before completing the payment. If you paid, it will still be credited — use Check status below."));
              },
            },
            handler: (paymentResponse) => {
              handled = true;
              resolve(paymentResponse);
            },
          });
          checkout.on("payment.failed", () => {
            handled = true;
            reject(new Error("Payment failed. Please try again or choose UPI."));
          });
          checkout.open();
        })
    );

  const pollAluu = async (orderId, token) => {
    const deadline = Date.now() + 10 * 60 * 1000;
    while (Date.now() < deadline && pollToken.current === token) {
      try {
        const { data } = await postApi("/aluu/check-payment", { orderId });
        if (data.ok) return "paid";
        if (data.status === "failed") return "failed";
      } catch { /* transient — keep polling */ }
      await sleep(4000);
    }
    return "timeout";
  };

  // Runs the provider payment for a freshly created service order and settles
  // the UI. Throws on a failed/closed payment; returns false when the payment
  // stays open (still pending at the provider).
  const runGatewayPayment = async (data, kind, label, description) => {
    const pendingInfo = { orderId: data.orderId, kind, label, method: data.razorpay ? "razorpay" : "aluu", startedAt: Date.now() };
    writePending(pendingInfo);
    setPending(pendingInfo);

    if (data.razorpay) {
      const paymentResponse = await openRazorpay(data, description);
      await verifyRazorpay(data.orderId, paymentResponse);
      await finish(kind, label);
      return true;
    }

    if (data.aluu?.paymentUrl) {
      const paymentWindow = window.open(data.aluu.paymentUrl, "_blank");
      if (!paymentWindow) {
        window.location.href = data.aluu.paymentUrl;
        return false;
      }
      const token = ++pollToken.current;
      const outcome = await pollAluu(data.orderId, token);
      if (outcome === "paid") {
        await finish(kind, label);
        return true;
      }
      if (outcome === "failed") {
        writePending(null);
        setPending(null);
        throw new Error("Payment failed or the payment link expired. Please try again.");
      }
      setError("Payment was not confirmed yet. If you paid, the coins will appear once the provider confirms — or use Check status below.");
      return false;
    }

    throw new Error("Payment details are missing. Please try again.");
  };

  const requireAuth = () => {
    if (isAuthenticated && user?.id) return true;
    setError("Please log in to continue.");
    setTimeout(() => navigate("/login"), 900);
    return false;
  };

  const handleTopup = async () => {
    setError("");
    setSuccess(null);
    if (!requireAuth()) return;
    if (!Number.isFinite(coins) || coins < MIN_COINS || coins > MAX_COINS) {
      setError(`Enter between ${formatCoins(MIN_COINS)} and ${formatCoins(MAX_COINS)} coins.`);
      return;
    }

    setBusy(true);
    try {
      const { response, data } = await postApi("/wallet/topup", {
        amount: coins,
        payment_method: method,
        contact: { email: profile?.email || "", whatsapp: profile?.phone || "" },
      });
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not start the top-up. Please try again.");
      await runGatewayPayment(data, "topup", `${formatCoins(coins)} coins`, `PixieKat wallet top-up — ${formatCoins(coins)} coins`);
    } catch (err) {
      setError(err.message || "Could not start the top-up. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const buyMembership = async (plan, via) => {
    setError("");
    setSuccess(null);
    if (!requireAuth()) return;

    setBusy(true);
    try {
      const { response, data } = await postApi("/membership/purchase", {
        plan_id: plan.id,
        payment_method: via,
        contact: { email: profile?.email || "", whatsapp: profile?.phone || "" },
      });
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not start the purchase. Please try again.");

      if (via === "wallet") {
        await finish("membership", `${plan.name} membership`);
        return;
      }
      await runGatewayPayment(data, "membership", `${plan.name} membership`, `PixieKat ${plan.name} membership`);
    } catch (err) {
      setError(err.message || "Could not start the purchase. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const resumePending = async () => {
    if (!pending || !isAuthenticated) return;
    setBusy(true);
    setError("");
    try {
      if (pending.method === "aluu") {
        const { data } = await postApi("/aluu/check-payment", { orderId: pending.orderId });
        if (data.ok) {
          await finish(pending.kind, pending.label);
          return;
        }
        if (data.status === "failed") {
          writePending(null);
          setPending(null);
          setError("That payment failed or expired.");
          return;
        }
        setError("Still pending at the provider — complete it in the payment window, then check again.");
        return;
      }

      // Razorpay — the modal was dismissed mid-payment; if it was captured,
      // the webhook has already flipped the order.
      const { data: order } = await supabase
        .from("orders")
        .select("status")
        .eq("id", pending.orderId)
        .maybeSingle();
      if (order && ["processing", "completed"].includes(order.status)) {
        await finish(pending.kind, pending.label);
        return;
      }
      if (order?.status === "failed") {
        writePending(null);
        setPending(null);
        setError("That payment failed or expired.");
        return;
      }
      setError("Payment is not confirmed yet. If you paid, it may still be settling — try again in a minute.");
    } finally {
      setBusy(false);
    }
  };

  const handleCoinInput = (event) => {
    const digitsOnly = event.target.value.replace(/\D/g, "");
    if (!digitsOnly) {
      setCoins(MIN_COINS);
      return;
    }
    setCoins(Math.min(MAX_COINS, Math.max(MIN_COINS, Number(digitsOnly))));
  };

  const addCoins = (amount) => {
    setCoins((current) => Math.min(MAX_COINS, current + amount));
  };

  useEffect(() => () => { pollToken.current += 1; }, []);

  useEffect(() => {
    if (location.hash === "#membership") {
      document.getElementById("membership")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  if (!game) {
    return <Navigate to="/games" replace />;
  }

  const pageBackgroundStyle = {
    backgroundImage: `radial-gradient(circle at top, rgba(255,255,255,0.72), rgba(255,255,255,0.92) 38%, rgba(233,242,250,0.95) 100%), url(${game.image})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  const methodName = gatewayMethods.find((m) => m.id === method)?.name ?? "UPI";

  return (
    <div className="min-h-screen px-4 pb-28 pt-6 text-slate-900 sm:px-6 sm:pb-8 md:px-8" style={pageBackgroundStyle}>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3 sm:mb-8">
          <button
            type="button"
            onClick={() => navigate("/games")}
            className="inline-flex size-11 items-center justify-center rounded-full border border-slate-300/80 bg-white/80 text-slate-600 shadow-sm backdrop-blur"
            aria-label="Back to games"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Wallet</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">Add Coins to Wallet</h1>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 shadow-sm backdrop-blur">
            <span className="flex size-7 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffe3a3,#f6a800)] text-[10px] font-black text-amber-950 shadow-inner">
              PKS
            </span>
            <span className="text-lg font-extrabold text-slate-950">{formatCoins(walletBalance)}</span>
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-white/70 bg-white/70 p-4 shadow-[0_24px_90px_rgba(90,91,120,0.18)] backdrop-blur-xl sm:p-6 md:p-7">
          <div className="mb-6 overflow-hidden rounded-[24px] border border-slate-200/70 bg-gradient-to-r from-slate-950 to-slate-800 text-white shadow-[0_18px_40px_rgba(15,23,42,0.24)]">
            <div className="grid gap-4 p-4 sm:grid-cols-[140px_1fr] sm:p-5">
              <div className="overflow-hidden rounded-[18px] border border-white/10 bg-white/5">
                <img src={game.image} alt={game.name} className="h-28 w-full object-cover sm:h-full" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = fallbackGameImage; }} />
              </div>
              <div className="flex flex-col justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-violet-200">Selected game</p>
                  <h2 className="mt-2 text-2xl font-bold">{game.name}</h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">
                    Add coins to your Pixie Wallet, then spend them on {game.name} or any other top-up.
                  </p>
                </div>
                <Link
                  to="/games"
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <CheckCircle2 size={16} />
                  Pick Favorite game
                </Link>
              </div>
            </div>
          </div>

          {pending && !success ? (
            <div className="mb-6 flex flex-col items-start justify-between gap-3 rounded-[18px] border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center">
              <p className="text-sm font-semibold text-amber-800">
                A {pending.method === "aluu" ? "UPI" : "Razorpay"} payment for {pending.label} is still open. If you completed it, check the status to credit your wallet.
              </p>
              <button
                type="button"
                onClick={resumePending}
                disabled={busy}
                className="shrink-0 rounded-full bg-amber-400 px-5 py-2 text-sm font-bold text-amber-950 transition hover:bg-amber-300 disabled:opacity-50"
              >
                {busy ? "Checking…" : "Check status"}
              </button>
            </div>
          ) : null}

          {success ? (
            <div className="mb-6 flex items-center gap-3 rounded-[18px] border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle2 className="size-6 shrink-0 text-emerald-500" />
              <div>
                <p className="text-sm font-bold text-emerald-800">
                  {success.kind === "topup" ? `${success.label} added to your wallet` : `${success.label} is now active`}
                </p>
                <p className="text-xs text-emerald-700">Balance: {formatCoins(walletBalance)} coins</p>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mb-6 rounded-[18px] border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>
          ) : null}

          <div className="space-y-7">
            <section>
              <h3 className="text-[28px] font-bold tracking-tight text-slate-800">Enter coins</h3>
              <div className="mt-4 rounded-[22px] border border-slate-200 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                <div className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#ffe3a3,#f6a800)] text-[11px] font-black text-amber-950 shadow-inner">
                    PKS
                  </div>
                  <input
                    type="text"
                    value={formatCoins(coins)}
                    onChange={handleCoinInput}
                    className="w-full bg-transparent text-3xl font-extrabold tracking-tight text-slate-950 outline-none"
                    inputMode="numeric"
                    aria-label="Enter coin amount"
                  />
                  <span className="shrink-0 text-lg font-bold text-slate-400">= {formatInr(coins)}</span>
                </div>
                <p className="mt-3 text-sm text-slate-500">1 Pixie Coin = ₹1</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {quickAddAmounts.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => addCoins(amount)}
                      className="rounded-full bg-slate-100 px-5 py-3 text-lg font-semibold text-slate-500 transition hover:bg-slate-200"
                    >
                      +{formatCoins(amount)}
                    </button>
                  ))}
                </div>
                <p className="mt-6 text-sm text-slate-400">
                  Note: You can add between {formatCoins(MIN_COINS)} and {formatCoins(MAX_COINS)} coins per top-up.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-[28px] font-bold tracking-tight text-slate-800">Pay with</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {gatewayMethods.map((gateway) => {
                  const isSelected = method === gateway.id;
                  const Icon = gateway.icon;
                  return (
                    <motion.button
                      key={gateway.id}
                      type="button"
                      whileTap={{ scale: 0.985 }}
                      onClick={() => setMethod(gateway.id)}
                      className={`rounded-[22px] border bg-white p-4 text-left shadow-[0_10px_25px_rgba(15,23,42,0.06)] transition ${
                        isSelected
                          ? "border-[#6b4dff] ring-2 ring-[#6b4dff]/30"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-[12px] border border-slate-200 bg-white text-slate-500 shadow-sm">
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xl font-bold text-slate-800">{gateway.name}</p>
                          <p className="truncate text-sm text-slate-500">{gateway.description}</p>
                        </div>
                        <span className={`size-4 shrink-0 rounded-full border-2 ${isSelected ? "border-[#6b4dff] bg-[#6b4dff]" : "border-slate-300"}`} />
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </section>

            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={handleTopup}
              disabled={busy || authLoading}
              className="flex w-full items-center justify-center gap-2 rounded-[20px] bg-gradient-to-r from-[#6542ff] to-[#9a73ff] px-6 py-5 text-center text-xl font-extrabold leading-tight text-white shadow-[0_16px_30px_rgba(101,66,255,0.35)] disabled:opacity-60 sm:text-2xl"
            >
              {busy ? <Loader2 className="size-6 animate-spin" /> : null}
              {isAuthenticated ? `Pay ${formatInr(coins)} with ${methodName}` : "Log in to add coins"}
            </motion.button>

            <section id="membership">
              <div className="flex items-center gap-2">
                <Crown className="size-6 text-[#6b4dff]" />
                <h3 className="text-[28px] font-bold tracking-tight text-slate-800">Membership</h3>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Members get instant discounts on every top-up. Pay from your wallet balance or with {methodName}.
              </p>

              {activePlan ? (
                <div className="mt-4 flex items-center gap-3 rounded-[22px] border border-emerald-200 bg-emerald-50 p-5">
                  <CheckCircle2 className="size-6 shrink-0 text-emerald-500" />
                  <div>
                    <p className="text-base font-bold text-emerald-800">
                      {activePlan.name} membership active — {Number(activePlan.discount_percent).toFixed(0)}% off every order
                    </p>
                    <p className="text-sm text-emerald-700">
                      Valid until {new Date(activeMembership.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
              ) : plans.length === 0 ? (
                <div className="mt-4 rounded-[22px] border border-slate-200 bg-white/60 p-5 text-sm text-slate-500">
                  No membership plans are available right now.
                </div>
              ) : (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {plans.map((plan) => {
                    const benefits = Array.isArray(plan.benefits) ? plan.benefits : [];
                    const price = Number(plan.price);
                    const walletCovers = isAuthenticated && walletBalance >= price;
                    return (
                      <div key={plan.id} className="flex flex-col rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_10px_25px_rgba(15,23,42,0.06)]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6b4dff]">{plan.name} members</p>
                            <p className="mt-1 text-3xl font-black text-slate-950">
                              {formatInr(price)}
                              <span className="ml-1 text-sm font-semibold text-slate-400">/ {plan.duration_days} days</span>
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
                            <BadgePercent className="size-3.5" />
                            {Number(plan.discount_percent).toFixed(0)}% off
                          </span>
                        </div>
                        {plan.description ? <p className="mt-2 text-sm text-slate-500">{plan.description}</p> : null}
                        {benefits.length > 0 ? (
                          <ul className="mt-3 space-y-1.5">
                            {benefits.slice(0, 3).map((benefit, index) => (
                              <li key={index} className="flex items-start gap-2 text-xs text-slate-600">
                                <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" strokeWidth={3} />
                                {benefit}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="mt-4 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => buyMembership(plan, method)}
                            disabled={busy || authLoading}
                            className="h-11 rounded-full bg-slate-950 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
                          >
                            Buy with {methodName}
                          </button>
                          <button
                            type="button"
                            onClick={() => buyMembership(plan, "wallet")}
                            disabled={busy || authLoading || !walletCovers}
                            className="flex h-11 items-center justify-center gap-2 rounded-full border border-[#6b4dff]/40 text-sm font-bold text-[#6b4dff] transition hover:bg-[#6b4dff]/5 disabled:cursor-not-allowed disabled:opacity-40"
                            title={walletCovers ? "Pay from your Pixie Wallet balance" : "Not enough wallet balance"}
                          >
                            <Wallet className="size-4" />
                            Pay from wallet{isAuthenticated ? ` (${formatCoins(walletBalance)})` : ""}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-8 w-full max-w-[1400px]">
        <footer className="overflow-hidden rounded-[28px] bg-[#1f1f1f] px-4 py-8 text-white shadow-[0_24px_60px_rgba(0,0,0,0.22)] sm:px-6 md:px-8">
          <div className="flex flex-col items-center text-center">
            <img src={publicMediaUrl("/img/logo.png")} alt="PixieKat logo" className="h-14 w-auto object-contain" />
            <p className="mt-4 text-sm text-white/70 sm:text-base">
              Seamless game top-ups and digital vouchers.
            </p>
          </div>

          <div className="mt-6 rounded-[18px] border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-extrabold uppercase tracking-wide text-white/85">Newsletter</p>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="email"
                placeholder="Email address"
                className="h-12 min-w-0 flex-1 rounded-[12px] border border-white/10 bg-[#181818] px-4 text-sm text-white outline-none placeholder:text-white/35"
              />
              <button
                type="button"
                className="h-12 rounded-[12px] bg-[#6542ff] px-5 text-sm font-bold text-white transition hover:bg-[#7a5bff]"
              >
                Go
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AddMoneyPage;
