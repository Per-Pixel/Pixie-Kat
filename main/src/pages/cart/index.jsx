import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Gem,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
  Smartphone,
  Trash2,
  UserCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { TiLocationArrow } from "react-icons/ti";

import PageWrapper from "../../components/common/PageWrapper";
import AnimatedTitle from "../../components/common/AnimatedTitle";
import Button from "../../components/common/Button";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { supabase } from "../../lib/supabase";
import { loadRazorpayCheckout } from "../../lib/razorpay";
import {
  cartCount,
  lineQuantityCap,
  productAccountLimit,
  readPendingCheckout,
  writePendingCheckout,
} from "../../lib/cart";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

const currencySymbols = { INR: "₹", USD: "$", EUR: "€", BRL: "R$", PKR: "Rs " };

const formatPrice = (value, currency = "PKS") => {
  const symbol = currencySymbols[currency] ?? `${currency} `;
  return `${symbol}${Number(value).toFixed(2)}`;
};

const paymentMethods = [
  { id: "aluu", name: "UPI Gateway", description: "Pay instantly with any UPI app", icon: Smartphone },
  { id: "razorpay", name: "Razorpay", description: "UPI, cards, net banking & more", icon: CreditCard },
  { id: "wallet", name: "Pixie Wallet", description: "Use your PixieKat wallet balance", icon: Wallet },
];

const easeOutExpo = [0.16, 1, 0.3, 1];

const riseIn = (reduced, delay = 0) => ({
  initial: reduced ? false : { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.6, delay, ease: easeOutExpo },
});

const firstJoined = (value) => (Array.isArray(value) ? value[0] ?? null : value ?? null);

const getMemberUnitPrice = (price, percent) => {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return null;
  const discount = Math.max(1, Math.round(value * (Number(percent) / 100)));
  return Math.max(0, value - discount);
};

// ─── line card ──────────────────────────────────────────────────────────────

const CartLine = ({ item, onQuantity, onRemove, disabled }) => {
  const limit = productAccountLimit(item.product);
  const cap = lineQuantityCap(item.product);
  const fields = Object.entries(item.fieldValues ?? {}).filter(([, v]) => String(v ?? "").trim());

  return (
    <motion.article
      layout
      className="border-hsla relative rounded-md bg-white/[0.03] p-5 sm:p-6"
    >
      <div className="flex items-start gap-4">
        {item.product.image_url || item.gameImage ? (
          <img
            src={item.product.image_url || item.gameImage}
            alt=""
            className="size-14 shrink-0 rounded-md object-cover"
          />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-md bg-violet-300/15 text-violet-300">
            <Gem className="size-6" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="font-general text-[10px] uppercase tracking-[0.2em] text-white/50">
            {item.gameName || "Top-up"}
          </p>
          <h3 className="mt-1 font-general text-base font-bold text-blue-50 sm:text-lg">
            {item.product.name}
          </h3>
          {item.product.amount ? (
            <p className="mt-0.5 font-circular-web text-xs text-white/60">{item.product.amount}</p>
          ) : null}

          {fields.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {fields.map(([key, value]) => (
                <span
                  key={key}
                  className="rounded-full bg-white/10 px-2.5 py-1 font-circular-web text-[11px] text-white/80"
                >
                  {item.fieldLabels?.[key] ?? key}: <span className="font-semibold text-blue-50">{value}</span>
                </span>
              ))}
              {item.playerName ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-1 font-circular-web text-[11px] font-semibold text-emerald-300">
                  <UserCheck className="size-3" /> {item.playerName}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          disabled={disabled}
          aria-label={`Remove ${item.product.name}`}
          className="shrink-0 rounded-full p-2 text-white/40 transition-colors hover:bg-white/10 hover:text-red-300 disabled:opacity-40"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        {cap > 1 ? (
          <div className="flex items-center gap-1 rounded-full border border-white/15 p-1">
            <button
              type="button"
              onClick={() => onQuantity(item.id, item.quantity - 1)}
              disabled={disabled || item.quantity <= 1}
              aria-label="Decrease quantity"
              className="flex size-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 disabled:opacity-30"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-8 text-center font-general text-sm font-bold text-blue-50">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onQuantity(item.id, item.quantity + 1)}
              disabled={disabled || item.quantity >= cap}
              aria-label="Increase quantity"
              className="flex size-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 disabled:opacity-30"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        ) : (
          <span className="rounded-full border border-yellow-300/40 px-3 py-1 font-general text-[10px] font-semibold uppercase tracking-wide text-yellow-300">
            Limit {limit ?? 1} per account
          </span>
        )}
        {cap > 1 && item.quantity >= cap ? (
          <span className="hidden font-circular-web text-[11px] text-white/40 sm:block">
            max {cap} per account
          </span>
        ) : null}

        <div className="text-right">
          <p className="font-circular-web text-xs text-white/50">
            {formatPrice(item.product.price, item.product.currency)} each
          </p>
          <p className="font-zentry text-2xl font-black leading-none text-blue-50">
            {formatPrice(item.product.price * item.quantity, item.product.currency)}
          </p>
        </div>
      </div>
    </motion.article>
  );
};

// ─── processing status ──────────────────────────────────────────────────────

const LineStatus = ({ result }) => {
  if (!result) return null;
  if (result.status === "processing")
    return (
      <span className="flex items-center gap-1.5 font-circular-web text-xs text-sky-300">
        <Loader2 className="size-3.5 animate-spin" />
        {result.total > 1 ? `${result.completed}/${result.total}…` : "Processing…"}
      </span>
    );
  if (result.status === "done")
    return (
      <span className="flex items-center gap-1.5 font-circular-web text-xs text-emerald-300">
        <CheckCircle2 className="size-3.5" />
        {result.total > 1 ? `${result.total}/${result.total} delivered` : "Delivered"}
      </span>
    );
  if (result.status === "partial")
    return (
      <span className="flex items-center gap-1.5 font-circular-web text-xs text-amber-300">
        <CheckCircle2 className="size-3.5" />
        {result.completed}/{result.total} delivered
        {result.failed > 0 ? ` · ${result.failed} refunded` : ""}
      </span>
    );
  if (result.status === "manual")
    return (
      <span className="flex items-center gap-1.5 font-circular-web text-xs text-white/60">
        <Loader2 className="size-3.5" /> Manual fulfillment queued
      </span>
    );
  if (result.status === "failed")
    return (
      <span className="flex items-center gap-1.5 font-circular-web text-xs text-red-300">
        <XCircle className="size-3.5" /> Failed — refunded
      </span>
    );
  return null;
};

// ─── page ───────────────────────────────────────────────────────────────────

const CartPage = () => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { user, profile, isAuthenticated, isLoading: authLoading, refreshProfile } = useAuth();
  const { items, updateQuantity, removeItem, clearCart } = useCart();

  const [paymentMethod, setPaymentMethod] = useState("aluu");
  const [contact, setContact] = useState({ email: "", whatsapp: "" });
  const [membershipDiscount, setMembershipDiscount] = useState(0);
  const [checkoutError, setCheckoutError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lineResults, setLineResults] = useState({});
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [done, setDone] = useState(null);

  const walletBalance = Number(profile?.wallet_balance ?? 0);
  const currencies = useMemo(() => [...new Set(items.map((i) => String(i.product.currency || "PKS").toUpperCase()))], [items]);
  const singleCurrency = currencies.length === 1 ? currencies[0] : null;

  const unitPrice = (product) =>
    membershipDiscount > 0
      ? getMemberUnitPrice(product.price, membershipDiscount) ?? Number(product.price)
      : Number(product.price);

  const subtotal = items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
  const memberSavings = items.reduce(
    (s, i) => s + (Number(i.product.price) - unitPrice(i.product)) * i.quantity,
    0
  );
  const total = subtotal - memberSavings;
  const totalUnits = cartCount(items);
  const processing = isSubmitting;

  // ── restore contact + membership + pending checkout ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem("pixiekat_contact");
      if (raw) {
        const { values } = JSON.parse(raw);
        if (values) setContact((prev) => ({ email: prev.email || values.email || "", whatsapp: prev.whatsapp || values.whatsapp || "" }));
      }
    } catch { /* corrupt storage — ignore */ }
    setPendingCheckout(readPendingCheckout());
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    setContact((prev) => ({
      email: prev.email || profile?.email || user?.email || "",
      whatsapp: prev.whatsapp || profile?.phone || "",
    }));
  }, [isAuthenticated, profile?.email, profile?.phone, user?.email]);

  useEffect(() => {
    if (!user?.id) {
      setMembershipDiscount(0);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_memberships")
      .select("*, membership_plans(*)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .gt("expires_at", new Date().toISOString())
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const plan = firstJoined(data?.membership_plans);
        setMembershipDiscount(Number(plan?.discount_percent) || 0);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const postApi = async (path, body, token) => {
    const response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return { response, data };
  };

  // ── per-unit fulfillment, mapped back onto cart lines ──
  const fulfillLines = async (lines, token) => {
    const results = {};
    for (const line of lines) {
      const totalUnitsInLine = line.order_ids.length;
      let completed = 0;
      let failed = 0;
      let manual = 0;
      let lastError = null;
      const mismatches = [];

      setLineResults((prev) => ({
        ...prev,
        [line.itemId]: { status: "processing", completed: 0, total: totalUnitsInLine },
      }));

      for (const orderId of line.order_ids) {
        try {
          const { response, data } = await postApi("/fulfill-order", { orderId }, token);
          if (response.status === 500) {
            failed++;
            lastError = data.error || "Delivery failed — refunded";
          } else if (data.ok === false) {
            if (data.provisioned === false) {
              manual++;
              lastError = data.error || "Manual fulfillment";
            } else {
              failed++;
              lastError = data.error || "Delivery failed — refunded";
            }
          } else {
            completed++;
            if (data.mismatch) mismatches.push(data.mismatch);
          }
        } catch (err) {
          failed++;
          lastError = err.message;
        }

        results[line.itemId] = {
          status:
            failed + manual + completed < totalUnitsInLine
              ? "processing"
              : failed === totalUnitsInLine
                ? "failed"
                : manual === totalUnitsInLine
                  ? "manual"
                  : failed > 0 || manual > 0 || mismatches.length > 0
                    ? "partial"
                    : "done",
          completed,
          total: totalUnitsInLine,
          failed,
          manual,
          mismatches,
          error: lastError,
        };
        setLineResults((prev) => ({ ...prev, [line.itemId]: results[line.itemId] }));
      }
    }
    return results;
  };

  const finishCheckout = async (lines, method, amountLabel, currency) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    const results = await fulfillLines(lines, token);
    await refreshProfile().catch(() => {});
    writePendingCheckout(null);
    setPendingCheckout(null);
    setDone({ method, amount: amountLabel, currency, results });
    clearCart();
  };

  const buildPayload = () => ({
    payment_method: paymentMethod,
    contact: { email: contact.email.trim(), whatsapp: contact.whatsapp.trim() },
    items: items.map((i) => ({
      product_id: i.product.id,
      quantity: i.quantity,
      unit_amount: unitPrice(i.product),
      metadata: {
        game_id: i.gameId,
        game_slug: i.gameSlug,
        game_name: i.gameName,
        account_fields: i.fieldValues,
        verified_username: i.playerName,
        contact: { email: contact.email.trim(), whatsapp: contact.whatsapp.trim() },
      },
    })),
  });

  const validateCheckout = () => {
    if (items.length === 0) return "Your cart is empty.";
    if (!singleCurrency) return "Cart items use different currencies — please check out one currency at a time.";
    if (!contact.email.trim() || !contact.whatsapp.trim()) return "Please enter your email address and WhatsApp number.";
    if (!isAuthenticated || !user?.id) return "Please log in before checking out.";
    return null;
  };

  const handleCheckout = async () => {
    setCheckoutError("");
    const invalid = validateCheckout();
    if (invalid) {
      setCheckoutError(invalid);
      if (!isAuthenticated) setTimeout(() => navigate("/login"), 900);
      return;
    }

    setIsSubmitting(true);
    setLineResults({});
    setDone(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Your session expired. Please log in again.");

      const { response, data } = await postApi("/cart-checkout", buildPayload(), token);
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not place this order. Please try again.");

      const lines = data.lines.map((l) => ({ itemId: items[l.index]?.id, order_ids: l.order_ids }));
      const totalLabel = formatPrice(data.total, data.currency);

      if (paymentMethod === "wallet") {
        await finishCheckout(lines, "wallet", totalLabel, data.currency);
        setIsSubmitting(false);
        return;
      }

      if (paymentMethod === "aluu") {
        if (!data.aluu?.paymentUrl) throw new Error("UPI payment link is missing. Please try again.");
        writePendingCheckout({
          groupId: data.groupId,
          method: "aluu",
          orderIds: data.lines.flatMap((l) => l.order_ids),
          startedAt: Date.now(),
        });
        const paymentWindow = window.open(data.aluu.paymentUrl, "_blank");
        if (!paymentWindow) {
          setCheckoutError("Pop-up blocked. Redirecting to payment page…");
          setTimeout(() => { window.location.href = data.aluu.paymentUrl; }, 1200);
          return;
        }
        pollAluu(data.groupId, lines, totalLabel, data.currency, token);
        return; // keep isSubmitting — poll resolves it
      }

      if (paymentMethod === "razorpay") {
        const Razorpay = await loadRazorpayCheckout();
        if (!data.razorpay?.keyId || !data.razorpay?.orderId) {
          throw new Error("Razorpay checkout details are missing. Please try again.");
        }
        writePendingCheckout({
          groupId: data.groupId,
          method: "razorpay",
          orderIds: data.lines.flatMap((l) => l.order_ids),
          startedAt: Date.now(),
        });
        let handled = false;
        const checkout = new Razorpay({
          key: data.razorpay.keyId,
          amount: data.razorpay.amount,
          currency: data.razorpay.currency,
          name: "PixieKat",
          description: `PixieKat cart — ${totalUnits} item${totalUnits > 1 ? "s" : ""}`,
          order_id: data.razorpay.orderId,
          prefill: {
            name: profile?.name || user.user_metadata?.name || "",
            email: contact.email.trim(),
            contact: contact.whatsapp.replace(/\D/g, ""),
          },
          notes: { pixiekat_cart_group: data.groupId },
          theme: { color: "#6d4cff" },
          modal: {
            ondismiss: () => {
              if (!handled) {
                setIsSubmitting(false);
                setCheckoutError("Payment window closed. Your order was not charged — the cart is still here when you're ready.");
              }
            },
          },
          handler: async (paymentResponse) => {
            handled = true;
            setCheckoutError("");
            try {
              const { response: verifyResponse, data: verifyData } = await postApi(
                "/razorpay/verify-cart-payment",
                {
                  groupId: data.groupId,
                  razorpay_order_id: paymentResponse.razorpay_order_id,
                  razorpay_payment_id: paymentResponse.razorpay_payment_id,
                  razorpay_signature: paymentResponse.razorpay_signature,
                },
                token
              );
              if (!verifyResponse.ok || !verifyData.ok) {
                setDone({
                  method: "razorpay",
                  amount: totalLabel,
                  paymentPending: true,
                  note: "Payment was received, but confirmation is still processing. Check your order history or contact support.",
                });
                writePendingCheckout(null);
                setPendingCheckout(null);
                clearCart();
                return;
              }
              await finishCheckout(lines, "razorpay", totalLabel, data.currency);
            } finally {
              setIsSubmitting(false);
            }
          },
        });
        checkout.on("payment.failed", () => {
          handled = true;
          setIsSubmitting(false);
          setCheckoutError("Payment failed. Please try again or choose another payment method.");
        });
        checkout.open();
        return; // isSubmitting resolved by handler/dismiss
      }
    } catch (error) {
      setCheckoutError(error.message || "Could not place this order. Please try again.");
      setIsSubmitting(false);
    }
  };

  const pollAluu = async (groupId, lines, totalLabel, currency, token) => {
    setCheckoutError("Waiting for UPI payment confirmation… Complete payment in the opened window.");
    const POLL_INTERVAL_MS = 4000;
    const MAX_POLL_TIME_MS = 10 * 60 * 1000;
    const pollStart = Date.now();

    while (Date.now() - pollStart < MAX_POLL_TIME_MS) {
      try {
        const { data } = await postApi("/aluu/check-cart-payment", { groupId }, token);
        if (data.ok && data.status === "processing") {
          setCheckoutError("");
          await finishCheckout(lines, "aluu", totalLabel, currency);
          setIsSubmitting(false);
          return;
        }
        if (data.status === "failed") {
          setIsSubmitting(false);
          setCheckoutError("Payment failed or the payment link expired. Please try again.");
          writePendingCheckout(null);
          setPendingCheckout(null);
          return;
        }
      } catch { /* transient poll error — keep waiting */ }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }

    setIsSubmitting(false);
    setCheckoutError("Payment was not confirmed in time. If you paid, your orders will appear in order history — or use Resume below.");
  };

  // ── resume a payment that survived a navigation/redirect ──
  const resumePending = async () => {
    if (!pendingCheckout || !isAuthenticated) return;
    setIsSubmitting(true);
    setCheckoutError("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (pendingCheckout.method === "aluu") {
        const { data } = await postApi("/aluu/check-cart-payment", { groupId: pendingCheckout.groupId }, token);
        if (data.status === "failed") {
          writePendingCheckout(null);
          setPendingCheckout(null);
          setCheckoutError("That payment failed or expired.");
          setIsSubmitting(false);
          return;
        }
        if (!data.ok || data.status !== "processing") {
          setCheckoutError("Payment is still pending at the provider. Complete it or try again shortly.");
          setIsSubmitting(false);
          return;
        }
      }

      // Orders that reached 'processing' still need delivery.
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status")
        .in("id", pendingCheckout.orderIds);
      const ready = (orders ?? []).filter((o) => o.status === "processing").map((o) => o.id);
      if (ready.length === 0) {
        setCheckoutError("Payment is not confirmed yet. If you already paid, it may still be settling — try again in a minute.");
        setIsSubmitting(false);
        return;
      }
      const lines = [{ itemId: "__resumed", order_ids: ready }];
      const results = await fulfillLines(lines, token);
      await refreshProfile();
      writePendingCheckout(null);
      setPendingCheckout(null);
      setDone({ method: pendingCheckout.method, amount: null, results });
    } finally {
      setIsSubmitting(false);
    }
  };

  const busy = processing || authLoading;

  return (
    <PageWrapper>
      <section className="mx-auto max-w-7xl px-4 md:px-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 font-general text-[10px] uppercase tracking-[0.2em] text-black/60">
              PixieKat Checkout
            </p>
            <AnimatedTitle
              title="y<b>o</b>ur c<b>a</b>rt"
              containerClass="!mt-0 !items-start !gap-0 !px-0 !text-left !text-5xl !leading-[0.9] md:!text-7xl lg:!text-8xl"
              textColor="#000000"
            />
          </div>
          <p className="max-w-sm font-circular-web text-sm leading-relaxed text-black/70 md:text-right md:text-base">
            Stack top-ups for different games — or different accounts — and pay once.
            Passes and bundles are limited to one per game account.
          </p>
        </div>
      </section>

      <section className="relative mx-2 mt-14 overflow-hidden rounded-[28px] bg-[#000101] py-16 text-blue-50 sm:mx-4 sm:mt-16 sm:rounded-[36px] md:mx-6 md:rounded-[44px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-32 left-1/2 h-72 w-4/5 -translate-x-1/2 rounded-full bg-violet-300/20 blur-[90px]"
        />

        <div className="relative mx-auto max-w-7xl px-4 md:px-10">
          {pendingCheckout && !done ? (
            <div className="border-hsla mb-8 flex flex-col items-start justify-between gap-4 rounded-md bg-white/[0.03] p-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <AlertTriangle className="size-5 shrink-0 text-yellow-300" />
                <p className="font-circular-web text-sm text-white/80">
                  A {pendingCheckout.method === "aluu" ? "UPI" : "Razorpay"} payment for this cart is still open.
                  If you completed it, resume to finish delivery.
                </p>
              </div>
              <Button
                title={busy ? "Checking…" : "Resume payment"}
                rightIcon={<TiLocationArrow />}
                containerClass="bg-yellow-300 flex-center shrink-0"
                onClick={resumePending}
                disabled={busy}
              />
            </div>
          ) : null}

          {done ? (
            <motion.div {...riseIn(reduced)} className="mx-auto max-w-2xl">
              <div className="border-hsla rounded-md bg-white/[0.03] p-8 text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-400/15">
                  <CheckCircle2 className="size-7 text-emerald-300" />
                </span>
                <h2 className="special-font mt-5 font-zentry text-3xl font-black uppercase text-blue-50">
                  {done.paymentPending ? "Payment received" : "Order placed"}
                </h2>
                <p className="mt-2 font-circular-web text-sm text-white/70">
                  {done.paymentPending
                    ? done.note
                    : `${done.amount ?? ""} via ${done.method === "wallet" ? "Pixie Wallet" : done.method === "aluu" ? "UPI" : "Razorpay"} — deliveries are processing below.`}
                </p>

                {done.results ? (
                  <div className="mt-6 space-y-2 text-left">
                    {Object.entries(done.results).map(([itemId, r]) => (
                      <div
                        key={itemId}
                        className="flex items-center justify-between gap-3 rounded-md bg-white/5 px-4 py-3"
                      >
                        <span className="font-circular-web text-xs text-white/60">
                          {itemId === "__resumed" ? "Resumed order" : "Cart line"} · {r.completed}/{r.total} delivered
                        </span>
                        <LineStatus result={r} />
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                  <Button
                    title="Browse games"
                    rightIcon={<TiLocationArrow />}
                    containerClass="bg-yellow-300 flex-center"
                    onClick={() => navigate("/games")}
                  />
                  <Button
                    title="Order history"
                    containerClass="bg-blue-50 flex-center"
                    onClick={() => navigate("/account/orders")}
                  />
                </div>
              </div>
            </motion.div>
          ) : items.length === 0 ? (
            <div className="border-hsla mx-auto max-w-md rounded-md p-10 text-center">
              <ShoppingCart className="mx-auto size-10 text-white/30" />
              <p className="mt-6 font-circular-web text-sm text-white/70">
                Your cart is empty. Pick a package on any game page and hit
                “Add to Cart” — it lands here.
              </p>
              <Button
                title="Browse games"
                rightIcon={<TiLocationArrow />}
                containerClass="mt-8 bg-yellow-300 flex-center mx-auto"
                onClick={() => navigate("/games")}
              />
            </div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
              {/* lines */}
              <div className="space-y-4">
                {items.map((item) => (
                  <CartLine
                    key={item.id}
                    item={item}
                    disabled={busy}
                    onQuantity={updateQuantity}
                    onRemove={removeItem}
                  />
                ))}
                <button
                  type="button"
                  onClick={clearCart}
                  disabled={busy}
                  className="font-general text-xs font-semibold uppercase tracking-wide text-white/40 transition-colors hover:text-red-300 disabled:opacity-40"
                >
                  Clear cart
                </button>
              </div>

              {/* summary */}
              <motion.aside {...riseIn(reduced, 0.1)} className="lg:sticky lg:top-28 lg:self-start">
                <div className="rounded-md bg-violet-300 p-6 text-white sm:p-7">
                  <p className="font-general text-[10px] uppercase tracking-[0.2em] text-white/60">
                    Order summary
                  </p>
                  <div className="mt-4 space-y-2 font-circular-web text-sm text-white/80">
                    <div className="flex justify-between">
                      <span>{totalUnits} item{totalUnits === 1 ? "" : "s"} · {items.length} line{items.length === 1 ? "" : "s"}</span>
                      <span>{formatPrice(subtotal, singleCurrency ?? "PKS")}</span>
                    </div>
                    {memberSavings > 0 ? (
                      <div className="flex justify-between text-yellow-300">
                        <span>Member discount</span>
                        <span>-{formatPrice(memberSavings, singleCurrency ?? "PKS")}</span>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-4 flex items-baseline justify-between border-t border-white/20 pt-4">
                    <span className="font-general text-sm font-bold uppercase">Total</span>
                    <span className="font-zentry text-4xl font-black leading-none">
                      {formatPrice(total, singleCurrency ?? "PKS")}
                    </span>
                  </div>

                  {/* payment method */}
                  <div className="mt-6 space-y-2">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      const selected = paymentMethod === method.id;
                      const walletShort = method.id === "wallet" && walletBalance < total;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id)}
                          disabled={busy}
                          className={`flex w-full items-center gap-3 rounded-md border px-3.5 py-3 text-left transition ${
                            selected
                              ? "border-yellow-300 bg-black/30"
                              : "border-white/15 bg-black/10 hover:border-white/35"
                          }`}
                        >
                          <Icon className="size-4 shrink-0 text-yellow-300" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-general text-xs font-bold text-white">{method.name}</span>
                            <span className="block font-circular-web text-[11px] text-white/60">
                              {method.id === "wallet"
                                ? `Balance: ${formatPrice(walletBalance, singleCurrency ?? "PKS")}`
                                : method.description}
                            </span>
                          </span>
                          {walletShort ? (
                            <Link
                              to="/games/mobile-legends/add-money"
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0 rounded-full bg-yellow-300 px-2.5 py-1 font-general text-[10px] font-bold text-black"
                            >
                              Top up
                            </Link>
                          ) : null}
                          <span
                            className={`size-3 shrink-0 rounded-full border-2 ${
                              selected ? "border-yellow-300 bg-yellow-300" : "border-white/30"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* contact */}
                  <div className="mt-6 space-y-3">
                    <label className="block">
                      <span className="font-general text-[10px] uppercase tracking-[0.2em] text-white/60">
                        Email
                      </span>
                      <input
                        type="email"
                        value={contact.email}
                        onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))}
                        placeholder="you@email.com"
                        className="mt-1.5 h-11 w-full rounded-md border border-white/15 bg-black/20 px-3 font-circular-web text-sm text-white outline-none placeholder:text-white/30 focus:border-yellow-300/60"
                      />
                    </label>
                    <label className="block">
                      <span className="font-general text-[10px] uppercase tracking-[0.2em] text-white/60">
                        WhatsApp number
                      </span>
                      <input
                        type="tel"
                        value={contact.whatsapp}
                        onChange={(e) => setContact((p) => ({ ...p, whatsapp: e.target.value }))}
                        placeholder="For order updates"
                        className="mt-1.5 h-11 w-full rounded-md border border-white/15 bg-black/20 px-3 font-circular-web text-sm text-white outline-none placeholder:text-white/30 focus:border-yellow-300/60"
                      />
                    </label>
                  </div>

                  {!singleCurrency && items.length > 0 ? (
                    <p className="mt-4 rounded-md border border-amber-300/40 bg-amber-300/10 px-3 py-2 font-circular-web text-xs text-amber-200">
                      Your cart mixes currencies ({currencies.join(" + ")}). Remove items so only one
                      currency remains to check out together.
                    </p>
                  ) : null}

                  {checkoutError ? (
                    <p className="mt-4 rounded-md border border-red-300/40 bg-red-400/10 px-3 py-2 font-circular-web text-xs text-red-200">
                      {checkoutError}
                    </p>
                  ) : null}

                  {/* per-line live status while processing */}
                  {Object.keys(lineResults).length > 0 ? (
                    <div className="mt-4 space-y-1.5">
                      {items.map((i) =>
                        lineResults[i.id] ? (
                          <div key={i.id} className="flex items-center justify-between gap-3 rounded bg-black/20 px-3 py-2">
                            <span className="truncate font-circular-web text-xs text-white/70">{i.product.name}</span>
                            <LineStatus result={lineResults[i.id]} />
                          </div>
                        ) : null
                      )}
                    </div>
                  ) : null}

                  <div className="mt-6">
                    <Button
                      title={
                        busy
                          ? "Processing…"
                          : isAuthenticated
                            ? `Pay ${formatPrice(total, singleCurrency ?? "PKS")}`
                            : "Log in to check out"
                      }
                      rightIcon={<TiLocationArrow />}
                      containerClass="w-full bg-yellow-300 flex-center"
                      onClick={handleCheckout}
                      disabled={busy || items.length === 0 || !singleCurrency}
                    />
                  </div>
                  <p className="mt-4 text-center font-circular-web text-[11px] text-white/50">
                    One payment covers the whole cart. Deliveries start instantly after payment.
                  </p>
                </div>
              </motion.aside>
            </div>
          )}
        </div>
      </section>
    </PageWrapper>
  );
};

export default CartPage;
