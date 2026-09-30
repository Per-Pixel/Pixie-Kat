import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Copy,
  CreditCard,
  Gamepad2,
  Mail,
  Phone,
  ReceiptText,
  RefreshCw,
  UserRound,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { pageBackground } from "./accountShared";

const statusBadgeStyle = {
  completed:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending:    "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-blue-50 text-blue-600 border-blue-200",
  failed:     "bg-red-50 text-red-600 border-red-200",
  refunded:   "bg-purple-50 text-purple-700 border-purple-200",
  cancelled:  "bg-slate-100 text-slate-600 border-slate-200",
  on_hold:    "bg-orange-50 text-orange-700 border-orange-200",
};

const formatDateTime = (ts) =>
  new Date(ts).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

const prettifyKey = (key) =>
  key.replace(/[_-]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const Card = ({ title, icon: Icon, children }) => (
  <section className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(91,79,118,0.14)] backdrop-blur-xl sm:p-6">
    <div className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-[#f0ebff] text-[#6c49ff]">
        <Icon className="size-4" />
      </span>
      <h2 className="text-base font-bold text-slate-950">{title}</h2>
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

const DetailRow = ({ label, children }) => (
  <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
    <span className="shrink-0 text-slate-500">{label}</span>
    <span className="min-w-0 break-all text-right font-semibold text-slate-900">{children}</span>
  </div>
);

const CopyButton = ({ value }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="ml-2 inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
      aria-label={copied ? "Copied" : "Copy to clipboard"}
    >
      {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
    </button>
  );
};

const OrderDetailsPage = () => {
  const location = useLocation();
  const { user } = useAuth();
  const orderId = location.pathname.split("/orders/")[1];
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadOrder = () => {
    if (!orderId || !user?.id) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from("orders")
      .select("id, product_id, product_name, quantity, total_amount, currency, status, payment_method, payment_id, razorpay_order_id, aluu_order_id, unit_selling_price, created_at, updated_at, metadata")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setOrder(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, user?.id]);

  const accountFields = Object.entries(order?.metadata?.account_fields ?? {}).filter(([, value]) => value);
  const contact = order?.metadata?.contact ?? {};
  const gameSlug = order?.metadata?.game_slug;

  return (
    <div className="min-h-screen px-4 pb-28 pt-24 text-slate-900 sm:px-6 md:px-8 md:pt-28" style={pageBackground}>
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mx-auto max-w-4xl space-y-6"
      >
        <Link
          to="/account?section=orders"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-[#6c49ff]"
        >
          <ArrowLeft className="size-4" />
          Back to My Orders
        </Link>

        {loading ? (
          <div className="rounded-[24px] border border-white/70 bg-white/80 p-14 text-center text-sm text-slate-400 shadow-[0_18px_50px_rgba(91,79,118,0.14)] backdrop-blur-xl">
            Loading order details…
          </div>
        ) : !order ? (
          <div className="rounded-[24px] border border-white/70 bg-white/80 p-14 text-center shadow-[0_18px_50px_rgba(91,79,118,0.14)] backdrop-blur-xl">
            <p className="text-lg font-semibold text-slate-700">Order not found</p>
            <p className="mt-2 text-sm text-slate-400">This order doesn’t exist or doesn’t belong to your account.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <section className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(91,79,118,0.14)] backdrop-blur-xl sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6c49ff] to-[#8b6dff] text-white shadow-[0_12px_24px_rgba(108,73,255,0.28)]">
                    <ReceiptText className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Order</p>
                    <h1 className="mt-1 flex items-center text-xl font-extrabold tracking-tight text-slate-950">
                      #{order.id.slice(0, 8).toUpperCase()}
                      <CopyButton value={order.id} />
                    </h1>
                    <p className="mt-1 break-all font-mono text-xs text-slate-400">{order.id}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Placed {formatDateTime(order.created_at)}
                      {order.updated_at && order.updated_at !== order.created_at && (
                        <> · Updated {formatDateTime(order.updated_at)}</>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-semibold capitalize ${statusBadgeStyle[order.status] ?? "border-slate-200 bg-slate-100 text-slate-600"}`}>
                    {order.status.replace(/_/g, " ")}
                  </span>
                  <button
                    type="button"
                    onClick={loadOrder}
                    className="flex size-9 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                    aria-label="Refresh order"
                  >
                    <RefreshCw className="size-4" />
                  </button>
                </div>
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Package */}
              <Card title="Package" icon={Gamepad2}>
                <div className="divide-y divide-slate-100">
                  <DetailRow label="Product">{order.product_name}</DetailRow>
                  {order.metadata?.game_name && <DetailRow label="Game">{order.metadata.game_name}</DetailRow>}
                  <DetailRow label="Quantity">{order.quantity ?? 1}</DetailRow>
                  {order.unit_selling_price != null && Number(order.unit_selling_price) > 0 && (
                    <DetailRow label="Unit price">{order.currency} {Number(order.unit_selling_price).toFixed(2)}</DetailRow>
                  )}
                  <DetailRow label="Total paid">
                    <span className="text-lg font-extrabold text-[#6c49ff]">
                      {order.currency} {Number(order.total_amount).toFixed(2)}
                    </span>
                  </DetailRow>
                </div>
                {gameSlug && (
                  <Link
                    to={`/games/${gameSlug}`}
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-[#6c49ff] to-[#8b6dff] px-6 text-sm font-bold text-white shadow-[0_12px_24px_rgba(108,73,255,0.28)] transition hover:scale-[1.01]"
                  >
                    Order again
                  </Link>
                )}
              </Card>

              {/* Delivery */}
              <Card title="Delivery details" icon={UserRound}>
                {accountFields.length === 0 && !order.metadata?.verified_username ? (
                  <p className="text-sm text-slate-400">No delivery details recorded for this order.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {accountFields.map(([key, value]) => (
                      <DetailRow key={key} label={prettifyKey(key)}>{String(value)}</DetailRow>
                    ))}
                    {order.metadata?.verified_username && (
                      <DetailRow label="Verified username">{order.metadata.verified_username}</DetailRow>
                    )}
                  </div>
                )}
              </Card>

              {/* Payment */}
              <Card title="Payment" icon={CreditCard}>
                <div className="divide-y divide-slate-100">
                  <DetailRow label="Method">
                    <span className="capitalize">{order.payment_method ?? "—"}</span>
                  </DetailRow>
                  {order.payment_id && (
                    <DetailRow label="Payment reference">
                      <span className="inline-flex items-center">
                        <span className="font-mono text-xs">{order.payment_id}</span>
                        <CopyButton value={order.payment_id} />
                      </span>
                    </DetailRow>
                  )}
                  {order.razorpay_order_id && (
                    <DetailRow label="Gateway order">
                      <span className="inline-flex items-center">
                        <span className="font-mono text-xs">{order.razorpay_order_id}</span>
                        <CopyButton value={order.razorpay_order_id} />
                      </span>
                    </DetailRow>
                  )}
                  {order.aluu_order_id && (
                    <DetailRow label="Gateway order">
                      <span className="inline-flex items-center">
                        <span className="font-mono text-xs">{order.aluu_order_id}</span>
                        <CopyButton value={order.aluu_order_id} />
                      </span>
                    </DetailRow>
                  )}
                </div>
              </Card>

              {/* Contact */}
              <Card title="Contact for this order" icon={Mail}>
                <div className="divide-y divide-slate-100">
                  {contact.email ? (
                    <DetailRow label="Email">{contact.email}</DetailRow>
                  ) : null}
                  {contact.whatsapp ? (
                    <DetailRow label="WhatsApp">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="size-3.5 text-emerald-500" />
                        {contact.whatsapp}
                      </span>
                    </DetailRow>
                  ) : null}
                  {!contact.email && !contact.whatsapp && (
                    <p className="py-2 text-sm text-slate-400">No contact details were captured for this order.</p>
                  )}
                </div>
              </Card>
            </div>

            <p className="text-center text-sm text-slate-400">
              Something wrong with this order?{" "}
              <Link to="/support" className="font-semibold text-[#6c49ff] hover:underline">
                Contact support
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default OrderDetailsPage;
