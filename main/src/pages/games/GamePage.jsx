import { useEffect, useMemo, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import {
  ChevronDown,
  FileText,
  Info,
  Lightbulb,
  MessageCircle,
} from "lucide-react";

import { fallbackGameImage } from "./gamesData";
import { useGameCatalog } from "./useGameCatalog";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

const defaultBanner = "/img/hero/game-mlbb-card.webp";

const defaultSteps = [
  { title: "Enter Your ID", description: "Provide your account details for verification." },
  { title: "Choose the Package", description: "Select the top-up package you want." },
  { title: "Make Payment", description: "Choose your preferred payment method." },
  { title: "Confirmation", description: "Items are added instantly after payment." },
];

const paymentMethods = [
  { id: "binance", logo: "BINANCE", name: "Binance", description: "Secure online crypto payment", pay: "0.32 USDT", note: "(~ ₹30)", selectedAccent: true },
  { id: "mobikwik", logo: "MobiKwik", name: "Mobikwik", description: "Secure online payment", pay: "₹30" },
  { id: "paytm", logo: "Paytm", name: "Paytm", description: "Secure online payment", pay: "₹30" },
  { id: "upi", logo: "UPI", name: "UPI", description: "Secure online payment", pay: "₹30" },
];

const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  BRL: "R$",
  PKR: "Rs ",
};

const formatPrice = (value, currency = "INR") => {
  if (value == null || value === "") return "";
  const symbol = currencySymbols[currency] ?? `${currency} `;
  return `${symbol}${Number(value).toFixed(2)}`;
};

const SectionTitle = ({ number, children }) => (
  <div className="mb-5 flex items-center gap-3">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6d4cff] text-sm font-bold text-white">
      {number}
    </span>
    <h2 className="text-xl font-bold text-[#10141f] md:text-2xl">{children}</h2>
  </div>
);

const PaymentLogo = ({ children }) => (
  <div className="flex h-10 w-24 shrink-0 items-center justify-center rounded-md border border-[#e2e6ee] bg-white px-2 text-sm font-bold text-[#6d7480] shadow-sm">
    {children}
  </div>
);

const HowToTopUp = ({ steps, mobile = false }) => {
  if (mobile) {
    return (
      <button
        type="button"
        className="flex h-10 w-full items-center justify-between rounded-lg bg-[#7b55ff] px-4 text-left text-sm font-bold text-white shadow-[0_10px_24px_rgba(103,75,255,0.28)]"
      >
        <span className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5" />
          How to Top-Up
        </span>
        <ChevronDown className="h-4 w-4" />
      </button>
    );
  }

  return (
    <section>
      <h2 className="border-l-4 border-[#7555ff] pl-3 text-2xl font-bold text-[#10141f]">
        How to Top-Up
      </h2>
      <div className="relative mt-8 space-y-8 pl-3">
        <div className="absolute left-[31px] top-2 h-[calc(100%-1rem)] w-px bg-[#e3e6ec]" />
        {steps.map((step, index) => (
          <div key={`${step.title}-${index}`} className="relative flex gap-5">
            <span className="z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-[#6d4cff] shadow-[0_8px_20px_rgba(15,23,42,0.1)]">
              {index + 1}
            </span>
            <div>
              <h3 className="text-lg font-bold text-[#10141f]">{step.title}</h3>
              <p className="mt-2 text-sm text-[#5f6977]">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

const InstructionsAlert = ({ title, body }) => (
  <section className="rounded-xl border border-[#f2c8ad] bg-[#fffaf4] px-6 py-5 text-[#c43a0c]">
    <div className="flex items-start gap-3">
      <Info className="mt-1 h-4 w-4 shrink-0 text-[#99a1ad]" />
      <div className="space-y-3 text-sm leading-7">
        <h3 className="font-bold">{title}</h3>
        <p className="whitespace-pre-line">{body}</p>
      </div>
    </div>
  </section>
);

const getMemberPrice = (price, percent) => {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return null;
  const discount = Math.max(1, Math.round(value * percent));
  return Math.max(0, value - discount);
};

const MembershipOffer = ({ selectedPackage }) => {
  const silverPrice = getMemberPrice(selectedPackage?.price, 0.03);
  const goldPrice = getMemberPrice(selectedPackage?.price, 0.05);
  const silverLabel = silverPrice == null ? "Select a pack" : formatPrice(silverPrice, selectedPackage.currency);
  const goldLabel = goldPrice == null ? "Select a pack" : formatPrice(goldPrice, selectedPackage.currency);
  const silverSavings = silverPrice == null ? "" : `Save ${formatPrice(Number(selectedPackage.price) - silverPrice, selectedPackage.currency)} vs ${selectedPackage.priceLabel}`;
  const goldSavings = goldPrice == null ? "" : `Save ${formatPrice(Number(selectedPackage.price) - goldPrice, selectedPackage.currency)} vs ${selectedPackage.priceLabel}`;

  return (
  <section className="rounded-xl bg-[#070b16] p-4 text-white shadow-[0_16px_36px_rgba(5,8,16,0.22)]">
    <div className="flex items-start justify-between gap-4">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f4cc48] text-xs font-black text-[#5d3a00]">GD</span>
        <div>
          <h3 className="text-xl font-bold leading-5">Unlock Member Prices</h3>
          <p className="mt-1 text-xs text-white/70">Save instantly on this pack</p>
        </div>
      </div>
      <span className="rounded border border-[#6b5d19] px-3 py-1 text-xs font-bold text-[#f5cf21]">RECOMMENDED</span>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
        <p className="text-xs font-bold text-white/65">SILVER MEMBERS</p>
        <p className="mt-1 text-2xl font-black">{silverLabel}</p>
        {silverSavings ? <p className="text-xs text-white/65">{silverSavings}</p> : null}
      </div>
      <div className="rounded-lg border border-[#7f6b16] bg-[#282205]/70 p-3">
        <p className="text-xs font-bold text-[#f5cf21]">GOLD MEMBERS</p>
        <p className="mt-1 text-2xl font-black text-[#ffe75b]">{goldLabel}</p>
        {goldSavings ? <p className="text-xs text-[#ffe75b]">{goldSavings}</p> : null}
      </div>
    </div>
    <button type="button" className="mt-3 h-11 w-full rounded-lg bg-[#ffda24] text-sm font-black text-black">
      Buy Membership &amp; Save  -&gt;
    </button>
  </section>
  );
};

const MobileCheckoutBar = ({ selectedPackage, selectedPayment, onPay, isSubmitting }) => (
  <div className="fixed inset-x-0 bottom-24 z-[90] mx-auto block max-w-md px-4 md:hidden">
    <div className="flex h-[72px] items-center gap-3 rounded-t-xl border border-[#e9edf3] bg-white/95 px-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-[#151922]">{selectedPackage?.name ?? "Select a package"}</p>
        <p className="text-xs text-[#7b8492]">ID Required</p>
      </div>
      <div className="min-w-[86px] text-center">
        <p className="text-[10px] font-bold text-[#9aa2ad]">TOTAL</p>
        <p className="text-lg font-black text-[#6d4cff]">{selectedPackage?.priceLabel ?? "—"}</p>
      </div>
      <button type="button" onClick={onPay} disabled={isSubmitting || !selectedPackage} className="h-10 rounded-lg bg-[#aaa] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70">
        {isSubmitting ? "..." : `Pay ${selectedPackage?.priceLabel ?? selectedPayment.name}`}
      </button>
    </div>
  </div>
);

const PageShell = ({ children }) => (
  <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(115deg,#fbfaf5_0%,#eef8f7_48%,#faf8f2_100%)] px-4 pt-24 text-[#10141f]">
    {children}
  </div>
);

const DynamicField = ({ field, value, onChange }) => {
  const baseClass =
    "mt-2 h-14 w-full rounded-xl border border-[#dfe4ec] bg-white px-4 text-base font-bold text-[#141923] outline-none placeholder:text-[#9aa2ad]";

  return (
    <label className="block">
      <span className="text-xs font-bold text-[#6d7480]">
        {field.label.toUpperCase()}
        {field.is_required ? <span className="text-[#e25c5c]"> *</span> : null}
      </span>
      {field.field_type === "select" ? (
        <select className={baseClass} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">{field.placeholder || `Select ${field.label}`}</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          className={baseClass}
          type={field.field_type === "number" ? "number" : field.field_type === "email" ? "email" : field.field_type === "tel" ? "tel" : "text"}
          placeholder={field.placeholder || `Enter ${field.label}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.help_text ? <span className="mt-1 block text-xs text-[#9aa2ad]">{field.help_text}</span> : null}
    </label>
  );
};

const GamePage = () => {
  const { gameId: slug } = useParams();
  const { loading, notFound, game, fields, products } = useGameCatalog(slug);
  const { user, isAuthenticated } = useAuth();

  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState(paymentMethods[0].id);
  const [fieldValues, setFieldValues] = useState({});
  const [contact, setContact] = useState({ email: "", whatsapp: "" });
  const [checkoutError, setCheckoutError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map DB products to the package shape used by the UI.
  const packages = useMemo(
    () =>
      products.map((p) => ({
        id: p.id,
        name: p.name,
        amount: p.amount,
        image: p.image_url,
        popular: p.is_popular,
        currency: p.currency,
        price: Number(p.price),
        comparePrice: p.compare_price ? Number(p.compare_price) : null,
        priceLabel: formatPrice(p.price, p.currency),
        oldPriceLabel: p.compare_price ? formatPrice(p.compare_price, p.currency) : null,
      })),
    [products]
  );

  useEffect(() => {
    if (packages.length > 0) {
      setSelectedPackageId((prev) => prev ?? packages[0].id);
    }
  }, [packages]);

  useEffect(() => {
    if (fields.length > 0) {
      setFieldValues((prev) => {
        const next = { ...prev };
        fields.forEach((f) => {
          if (!(f.field_key in next)) next[f.field_key] = "";
        });
        return next;
      });
    }
  }, [fields]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 text-[#5f6977]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#dfe4ec] border-t-[#6d4cff]" />
          <p className="text-sm font-medium">Loading game…</p>
        </div>
      </PageShell>
    );
  }

  if (notFound || !game) {
    return <Navigate to="/games" replace />;
  }

  const steps = game.how_to_steps && game.how_to_steps.length > 0 ? game.how_to_steps : defaultSteps;
  const bannerImage = game.banner_url || game.image_url || defaultBanner;
  const selectedPackage = packages.find((item) => item.id === selectedPackageId) ?? packages[0] ?? null;
  const selectedPayment = paymentMethods.find((item) => item.id === selectedPaymentId) ?? paymentMethods[0];
  const paymentTotalLabel = selectedPackage?.priceLabel ?? "—";

  const updateField = (key, value) =>
    setFieldValues((prev) => ({ ...prev, [key]: value }));

  const updateContact = (key, value) =>
    setContact((prev) => ({ ...prev, [key]: value }));

  const handlePay = async () => {
    setCheckoutError("");
    setCheckoutSuccess("");

    if (!selectedPackage) {
      setCheckoutError("Please select a package before checkout.");
      return;
    }

    const missingField = fields.find((field) => field.is_required && !String(fieldValues[field.field_key] ?? "").trim());
    if (missingField) {
      setCheckoutError(`Please enter ${missingField.label}.`);
      return;
    }

    if (!contact.email.trim() || !contact.whatsapp.trim()) {
      setCheckoutError("Please enter your email address and WhatsApp number.");
      return;
    }

    if (!isAuthenticated || !user?.id) {
      setCheckoutError("Please log in before placing this order.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      product_id: selectedPackage.id,
      product_name: selectedPackage.name,
      total_amount: selectedPackage.price,
      currency: selectedPackage.currency,
      status: "pending",
      payment_method: selectedPayment.id,
      metadata: {
        game_id: game.id,
        game_slug: game.slug,
        game_name: game.name,
        account_fields: fieldValues,
        contact,
      },
    });
    setIsSubmitting(false);

    if (error) {
      setCheckoutError(error.message || "Could not place this order. Please try again.");
      return;
    }

    setCheckoutSuccess("Order created. Complete payment to start processing.");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(115deg,#fbfaf5_0%,#eef8f7_48%,#faf8f2_100%)] pb-28 pt-24 text-[#10141f] md:pb-16">
      <div className="mx-auto grid max-w-[1480px] gap-10 px-4 md:grid-cols-[394px_minmax(0,1fr)] md:px-8 md:pt-10 lg:px-12">
        <aside className="space-y-8 md:sticky md:top-24 md:self-start">
          <img
            src={bannerImage}
            alt={game.name}
            className="h-36 w-full rounded-xl object-cover shadow-[0_18px_42px_rgba(15,23,42,0.18)] md:h-36"
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = game.image_url || fallbackGameImage;
            }}
          />

          <div className="block md:hidden">
            <HowToTopUp steps={steps} mobile />
          </div>
          <div className="hidden md:block">
            <HowToTopUp steps={steps} />
          </div>

          {game.instructions ? (
            <InstructionsAlert title={`${game.name} Notes`} body={game.instructions} />
          ) : null}
        </aside>

        <main className="rounded-[28px] bg-white/75 px-4 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur md:px-8 lg:px-9">
          <section>
            <SectionTitle number="1">Enter Account Details</SectionTitle>
            {fields.length === 0 ? (
              <p className="text-sm text-[#6d7480]">No account fields configured for this game.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {fields.map((field) => (
                  <DynamicField
                    key={field.id}
                    field={field}
                    value={fieldValues[field.field_key] ?? ""}
                    onChange={(value) => updateField(field.field_key, value)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="mt-7">
            <SectionTitle number="2">Select the Package</SectionTitle>
            {packages.length === 0 ? (
              <p className="text-sm text-[#6d7480]">No packages available right now.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {packages.map((item) => {
                  const selected = selectedPackageId === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedPackageId(item.id)}
                      className={`relative min-h-[100px] rounded-lg border bg-white p-3 text-left shadow-sm transition ${
                        selected ? "border-[#7152ff] bg-[#f6f3ff]" : "border-[#dfe4ec] hover:border-[#c5ccd8]"
                      }`}
                    >
                      {item.popular ? (
                        <span className="absolute -top-2 right-2 rounded-full bg-[#ff7a45] px-2 py-0.5 text-[10px] font-bold text-white">
                          Popular
                        </span>
                      ) : null}
                      <div className="flex items-start justify-between gap-2">
                        {item.image ? (
                          <img src={item.image} alt="" className="h-7 w-12 rounded object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-[#9aa2ad]">{game.currency_label}</span>
                        )}
                        <div className="text-right">
                          <p className={`text-lg font-black ${selected ? "text-[#6d4cff]" : "text-[#141923]"}`}>{item.priceLabel}</p>
                          {item.oldPriceLabel ? <p className="text-xs text-[#777f8c] line-through">{item.oldPriceLabel}</p> : null}
                        </div>
                      </div>
                      <p className="mt-5 text-sm font-medium text-[#3b4350]">{item.name}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      <div className="mx-auto mt-10 grid max-w-[1480px] gap-10 px-4 md:grid-cols-[394px_minmax(0,1fr)] md:px-8 lg:px-12">
        <div className="hidden md:block" />
        <main className="rounded-[28px] bg-white/75 px-4 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur md:col-start-2 md:px-8 lg:px-9">
          <section className="mt-7">
            <SectionTitle number="3">Choose the Payment Method</SectionTitle>
            <MembershipOffer selectedPackage={selectedPackage} />

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {paymentMethods.map((method) => {
                const selected = selectedPaymentId === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedPaymentId(method.id)}
                    className={`min-h-[84px] rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition ${
                      selected ? "border-[#7152ff] ring-2 ring-[#7152ff]/10" : "border-[#e2e6ee] hover:border-[#cbd2de]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <PaymentLogo>{method.logo}</PaymentLogo>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#202634]">{method.name}</p>
                        <p className="text-xs text-[#6d7480]">{method.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[#8a92a0]">YOU PAY</p>
                        <p className={`text-xl font-black ${selected || method.selectedAccent ? "text-[#6d4cff]" : "text-[#10141f]"}`}>{paymentTotalLabel}</p>
                        {method.note ? <p className="text-[10px] text-[#6d7480]">{method.note}</p> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg border border-[#c8baff] bg-[#f3efff] px-5 py-4 text-sm font-bold text-[#3f4654]">
              <Lightbulb className="mr-2 inline h-4 w-4 text-[#f0b429]" />
              <span className="mr-2 text-[#6d7480]">TIP |</span> Use Pixie Wallet for instant processing and extra discounts!
            </div>
          </section>

          <section className="mt-7">
            <SectionTitle number="4">Contact Info</SectionTitle>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <label className="block">
                <span className="text-xs font-bold text-[#6d7480]">EMAIL ADDRESS</span>
                <input className="mt-2 h-14 w-full rounded-xl border border-[#dfe4ec] bg-white px-4 text-base font-bold text-[#141923] outline-none" placeholder="you@example.com" value={contact.email} onChange={(event) => updateContact("email", event.target.value)} />
              </label>
              <div>
                <span className="text-xs font-bold text-[#6d7480]">WHATSAPP NUMBER</span>
                <div className="mt-2 grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-3">
                  <button type="button" className="flex h-14 items-center justify-between rounded-xl border border-[#dfe4ec] bg-white px-3 text-left">
                    <span className="font-bold text-[#4b5563]">IN</span>
                    <span className="text-center text-sm font-bold text-[#141923]">India<br /><span className="text-xs font-medium text-[#6d7480]">+91</span></span>
                    <ChevronDown className="h-4 w-4 text-[#6d7480]" />
                  </button>
                  <input className="h-14 rounded-xl border border-[#dfe4ec] bg-white px-4 text-base font-bold text-[#141923] outline-none placeholder:text-[#9aa2ad]" placeholder="98765 43210" value={contact.whatsapp} onChange={(event) => updateContact("whatsapp", event.target.value)} />
                </div>
              </div>
            </div>

            {checkoutError ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{checkoutError}</p>
            ) : null}
            {checkoutSuccess ? (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{checkoutSuccess}</p>
            ) : null}

            <div className="mt-6 border-t border-[#dfe4ec] pt-6">
              <div className="rounded-xl bg-[#f1f3f5] p-6">
                <div className="flex items-center justify-between border-b border-[#d9dde3] pb-4 text-sm text-[#4b5563]">
                  <span>Package Price</span>
                  <span className="font-bold text-[#10141f]">{selectedPackage?.priceLabel ?? "—"}</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xl font-black text-[#10141f]">Total Pay</span>
                  <span className="text-right">
                    <span className="block text-3xl font-black text-[#6d4cff]">{selectedPackage?.priceLabel ?? "—"}</span>
                    {selectedPayment.note ? <span className="text-xs text-[#6d7480]">{selectedPayment.note}</span> : null}
                  </span>
                </div>
              </div>

              <button type="button" onClick={handlePay} disabled={isSubmitting || !selectedPackage} className="mt-6 h-16 w-full rounded-xl bg-[#aaa] text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-70">
                {isSubmitting ? "Creating order..." : `Pay ${selectedPackage?.priceLabel ?? ""}`}
              </button>
              <p className="mt-5 text-center text-xs text-[#6d7480]">
                By clicking Pay Now, you agree to our <span className="underline">Terms of Service</span>.
              </p>
            </div>
          </section>
        </main>
      </div>

      <button type="button" className="fixed bottom-28 right-4 z-[130] flex h-12 w-12 items-center justify-center rounded-full bg-[#7b55ff] text-white shadow-[0_14px_30px_rgba(103,75,255,0.35)] md:bottom-8 md:right-8">
        <MessageCircle className="h-5 w-5" />
      </button>
      <MobileCheckoutBar selectedPackage={selectedPackage} selectedPayment={selectedPayment} onPay={handlePay} isSubmitting={isSubmitting} />
    </div>
  );
};

export default GamePage;
