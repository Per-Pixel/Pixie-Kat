import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  CirclePlay,
  CreditCard,
  Gem,
  Info,
  Lightbulb,
  ShoppingCart,
  Smartphone,
  Wallet,
} from "lucide-react";

import { fallbackGameImage } from "./gamesData";
import { useGameCatalog } from "./useGameCatalog";
import { useAuth } from "../../contexts/AuthContext";
import { useCart } from "../../contexts/CartContext";
import { publicMediaUrl, supabase } from "../../lib/supabase";
import { API_BASE } from "../../lib/apiBase";
import { sanitizeRichText } from "../../utils/sanitizeRichText";
import { loadRazorpayCheckout } from "../../lib/razorpay";
const defaultBanner = publicMediaUrl("/img/hero/game-mlbb-card.webp");

const COUNTRY_DIAL_CODES = [
  { code: "IN", label: "India", dial: "+91" },
  { code: "US", label: "United States", dial: "+1" },
  { code: "GB", label: "United Kingdom", dial: "+44" },
  { code: "AE", label: "UAE", dial: "+971" },
  { code: "SG", label: "Singapore", dial: "+65" },
  { code: "ID", label: "Indonesia", dial: "+62" },
  { code: "PH", label: "Philippines", dial: "+63" },
  { code: "MY", label: "Malaysia", dial: "+60" },
  { code: "BR", label: "Brazil", dial: "+55" },
];

const defaultSteps = [
  { title: "Enter Your ID", description: "Provide your account details for verification." },
  { title: "Choose the Package", description: "Select the top-up package you want." },
  { title: "Make Payment", description: "Choose your preferred payment method." },
  { title: "Confirmation", description: "Items are added instantly after payment." },
];

// MLBB first-purchase promo explainer — rendered between the double-diamond
// tiers and the regular base+bonus packs in the compact package grid.
const MOBILE_LEGENDS_DOUBLE_NOTE = `1. From 01/01/2025 (Server Time), the first purchase of Diamonds at specific levels (50, 150, 250 and 500 Diamonds) in the Top-up menu will award double the Diamonds.
2. Total Diamonds received for each level:
First purchase of the 50 Diamond level: 50 Base Diamonds + 50 Bonus Diamonds = 100 Diamonds in total
First purchase of the 150 Diamond level: 150 Base Diamonds + 150 Bonus Diamonds = 300 Diamonds in total
First purchase of the 250 Diamond level: 250 Base Diamonds + 250 Bonus Diamonds = 500 Diamonds total
First purchase of the 500 Diamond level: 500 Base Diamonds + 500 Bonus Diamonds = 1000 Diamonds in total
3. For each tier, the double Diamond bonus only applies to your first purchase, regardless of the payment channel or platform.`;

const paymentMethods = [
  { id: "aluu", logo: "UPI", name: "UPI Gateway", description: "Pay instantly with any UPI app", icon: Smartphone },
  { id: "razorpay", logo: "Razorpay", name: "Razorpay", description: "Pay with UPI, cards, net banking, or supported apps", icon: CreditCard },
  { id: "wallet", logo: "Wallet", name: "Pixie Wallet", description: "Use your PixieKat wallet balance for this order", icon: Wallet },
];

const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  BRL: "R$",
  PKR: "Rs ",
};

// Region gating: the free lookup returns a country NAME ("Indonesia") while
// admin config uses ISO codes or names — normalize both sides so they match.
// Mirrored in main/server/index.js; also mirrored in its test file.
const REGION_NAME_TO_CODE = {
  indonesia: "ID",
  brazil: "BR",
  malaysia: "MY",
  singapore: "SG",
  philippines: "PH",
  russia: "RU",
  "russian federation": "RU",
  india: "IN",
  japan: "JP",
  france: "FR",
  turkmenistan: "TM",
  thailand: "TH",
  vietnam: "VN",
  taiwan: "TW",
  "south korea": "KR",
  korea: "KR",
};

const normalizeRegionKey = (value) => {
  const s = String(value ?? "").trim();
  if (!s) return null;
  return REGION_NAME_TO_CODE[s.toLowerCase()] ?? s.toUpperCase();
};

const regionIsBlocked = (country, list) => {
  if (!country || !Array.isArray(list) || list.length === 0) return false;
  const keys = new Set([normalizeRegionKey(country), String(country).trim().toUpperCase()]);
  return list.some(
    (entry) => keys.has(normalizeRegionKey(entry)) || keys.has(String(entry).trim().toUpperCase())
  );
};

const formatPrice = (value, currency = "INR") => {
  if (value == null || value === "") return "";
  const symbol = currencySymbols[currency] ?? `${currency} `;
  return `${symbol}${Number(value).toFixed(2)}`;
};

const SectionTitle = ({ number, children }) => (
  <div className="mb-5 flex items-center gap-3">
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#6d4cff] text-sm font-bold text-white">
      {number}
    </span>
    <h2 className="text-xl font-bold text-[#10141f] md:text-2xl">{children}</h2>
  </div>
);

const CompactPackageCard = ({ item, selected, onSelect, mobileLegends = false }) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={selected}
    className={`relative flex w-full flex-col items-stretch justify-between rounded-lg border bg-white text-left shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7152ff] ${
      mobileLegends ? "min-h-[116px] p-3 md:min-h-[96px] md:p-3.5" : "min-h-[84px] p-3 sm:min-h-[96px] sm:p-3.5"
    } ${selected ? "border-[#7152ff]" : "border-[#dfe4ec] hover:border-[#c5ccd8]"}`}
  >
    {selected ? (
      <span className={mobileLegends
        ? "absolute right-0 top-0 flex size-6 items-center justify-center rounded-bl-lg rounded-tr-lg bg-[#7152ff] text-white md:-right-1.5 md:-top-1.5 md:size-4 md:rounded-full"
        : "absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-[#7152ff] text-white"}
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    ) : null}
    {item.popular ? (
      <span className="absolute -top-2 left-2 rounded-full bg-[#ff7a45] px-2 py-0.5 text-[10px] font-bold text-white">
        Popular
      </span>
    ) : null}
    <div className="flex w-full items-start justify-between gap-1.5">
      <p className={`min-w-0 text-base font-black sm:text-lg ${selected ? "text-[#6d4cff]" : "text-[#141923]"}`}>
        {item.priceLabel}
      </p>
      {item.image ? (
        <img src={item.image} alt="" className={mobileLegends ? `size-7 shrink-0 rounded object-contain md:object-cover ${selected ? "mr-6 md:mr-0" : ""}` : "size-6 shrink-0 rounded object-cover sm:size-7"} />
      ) : (
        <Gem className={mobileLegends
          ? `size-5 shrink-0 text-[#8b6dff] md:size-6 ${selected ? "mr-6 md:mr-0" : ""}`
          : "size-5 shrink-0 text-[#8b6dff] sm:size-6"}
        />
      )}
    </div>
    <p className={mobileLegends
      ? "mt-4 break-words text-xs font-medium leading-snug text-[#3b4350]"
      : "mt-4 text-[11px] font-medium leading-tight text-[#3b4350] sm:text-xs"}
    >
      {mobileLegends ? item.name : item.amount || item.name}
    </p>
  </button>
);

const FeaturedPackageCard = ({ item, selected, onSelect, mobileLegends = false }) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={selected}
    className={`relative flex min-h-[112px] w-full flex-col items-stretch justify-between rounded-lg border bg-white text-left shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7152ff] ${
      mobileLegends ? "p-3 md:p-4" : "p-4"
    } ${selected ? "border-[#7152ff]" : "border-[#dfe4ec] hover:border-[#c5ccd8]"}`}
  >
    {selected ? (
      <span className={mobileLegends
        ? "absolute right-0 top-0 flex size-6 items-center justify-center rounded-bl-lg rounded-tr-lg bg-[#7152ff] text-white md:-right-1.5 md:-top-1.5 md:size-4 md:rounded-full"
        : "absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-[#7152ff] text-white"}
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    ) : null}
    <div className="flex w-full items-start justify-between gap-1.5">
      <p className={`min-w-0 text-base font-black sm:text-lg ${selected ? "text-[#6d4cff]" : "text-[#141923]"}`}>
        {item.priceLabel}
      </p>
      {item.image ? (
        <img src={item.image} alt="" className={mobileLegends ? `size-8 shrink-0 rounded object-contain md:h-7 md:w-10 md:object-cover ${selected ? "mr-6 md:mr-0" : ""}` : "h-6 w-9 shrink-0 rounded object-cover sm:h-7 sm:w-10"} />
      ) : (
        <Gem className={mobileLegends
          ? `size-5 shrink-0 text-[#8b6dff] md:size-6 ${selected ? "mr-6 md:mr-0" : ""}`
          : "size-5 shrink-0 text-[#8b6dff] sm:size-6"}
        />
      )}
    </div>
    <div className="mt-4">
      <p className={mobileLegends ? "break-words text-xs font-bold leading-snug text-[#141923]" : "text-[11px] font-bold leading-tight text-[#141923] sm:text-xs"}>{item.name}</p>
      {item.description ? (
        <p className={mobileLegends ? "mt-1 line-clamp-2 text-xs leading-snug text-[#6d7480]" : "mt-0.5 line-clamp-2 text-[11px] font-medium leading-tight text-[#6d7480]"}>
          {item.description}
        </p>
      ) : null}
    </div>
  </button>
);

const PaymentLogo = ({ children }) => (
  <div className="flex h-10 w-24 shrink-0 items-center justify-center rounded-md border border-[#e2e6ee] bg-white px-2 text-sm font-bold text-[#6d7480] shadow-sm">
    {children}
  </div>
);

const HowToTopUp = ({ steps }) => {
  return (
    <section>
      <h2 className="border-l-4 border-[#7555ff] pl-3 text-2xl font-bold text-[#10141f]">
        How to Top-Up
      </h2>
      <div className="relative mt-8 space-y-8 pl-3">
        <div className="absolute left-[31px] top-2 h-[calc(100%-1rem)] w-px bg-[#e3e6ec]" />
        {steps.map((step, index) => (
          <div key={`${step.title}-${index}`} className="relative flex gap-5">
            <span className="z-10 flex size-11 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-[#6d4cff] shadow-[0_8px_20px_rgba(15,23,42,0.1)]">
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

const InstructionsAlert = ({ title, body, className = "" }) => (
  <section className={`rounded-xl border border-[#f2c8ad] bg-[#fffaf4] px-6 py-5 text-[#c43a0c] ${className}`}>
    <div className="flex items-start gap-3">
      <Info className="mt-1 size-4 shrink-0 text-[#99a1ad]" />
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
  const discount = Math.max(1, Math.round(value * (Number(percent) / 100)));
  return Math.max(0, value - discount);
};

const firstJoined = (value) => (Array.isArray(value) ? value[0] ?? null : value ?? null);

const MembershipOffer = ({ selectedPackage, plans, activeMembership, selectedPlanId, onSelectPlan }) => {
  const activePlan = firstJoined(activeMembership?.membership_plans);

  return (
  <section className="rounded-xl bg-[#070b16] p-4 text-white shadow-[0_16px_36px_rgba(5,8,16,0.22)]">
    <div className="flex items-start justify-between gap-4">
      <div className="flex gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-[#f4cc48] text-xs font-black text-[#5d3a00]">GD</span>
        <div>
          <h3 className="text-xl font-bold leading-5">Unlock Member Prices</h3>
          <p className="mt-1 text-xs text-white/70">
            {activePlan
              ? `${activePlan.name} active: ${Number(activePlan.discount_percent).toFixed(0)}% off this order`
              : "Choose a tier to unlock member pricing"}
          </p>
        </div>
      </div>
      <span className="rounded border border-[#6b5d19] px-3 py-1 text-xs font-bold text-[#f5cf21]">RECOMMENDED</span>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {plans.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm text-white/70 md:col-span-2">
          Membership plans are not configured yet.
        </div>
      ) : plans.map((plan) => {
        const memberPrice = getMemberPrice(selectedPackage?.price, plan.discount_percent);
        const selected = selectedPlanId === plan.id || activePlan?.id === plan.id;
        const savings = memberPrice == null ? "" : formatPrice(Number(selectedPackage.price) - memberPrice, selectedPackage.currency);
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelectPlan(activePlan ? null : plan.id)}
            disabled={Boolean(activePlan)}
            className={`rounded-lg border p-3 text-left transition ${
              selected ? "border-[#f5cf21] bg-[#282205]/70" : "border-white/10 bg-white/[0.03] hover:border-white/25"
            } ${activePlan ? "cursor-default" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-bold ${selected ? "text-[#f5cf21]" : "text-white/65"}`}>
                  {plan.name.toUpperCase()} MEMBERS
                </p>
                <p className="mt-1 text-2xl font-black">
                  {memberPrice == null ? "Select a pack" : formatPrice(memberPrice, selectedPackage.currency)}
                </p>
              </div>
              <span className="rounded bg-white/10 px-2 py-1 text-xs font-bold">
                {Number(plan.discount_percent).toFixed(0)}% OFF
              </span>
            </div>
            <p className="mt-1 text-xs text-white/65">
              {savings ? `Save ${savings} on this pack` : "Member price appears after selecting a pack"}
            </p>
            {!activePlan ? (
              <p className="mt-2 text-xs text-white/55">
                Add membership: {formatPrice(plan.price, plan.currency)} / {plan.duration_days} days
              </p>
            ) : null}
          </button>
        );
      })}
    </div>
    {!activePlan && selectedPlanId ? (
      <button type="button" onClick={() => onSelectPlan(null)} className="mt-3 h-11 w-full rounded-lg bg-[#ffda24] text-sm font-black text-black">
        Remove membership from this order
      </button>
    ) : null}
  </section>
  );
};
const MobileCheckoutBar = ({ selectedPackage, selectedPayment, totalLabel, onPay, onAddToCart, isSubmitting, mobileLegends = false }) => (
  <div className="fixed inset-x-0 bottom-16 z-[90] mx-auto block max-w-md px-4 md:hidden">
    <div className={`flex h-[72px] items-center rounded-t-xl border border-[#e9edf3] bg-white/95 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur ${mobileLegends ? "gap-2 px-2 sm:gap-3 sm:px-3" : "gap-3 px-3"}`}>
      <div className="min-w-0 flex-1">
        <p className={mobileLegends ? "truncate text-xs font-bold text-[#151922] sm:text-sm" : "truncate text-sm font-bold text-[#151922]"}>{selectedPackage?.name ?? "Select a package"}</p>
        <p className="text-xs text-[#7b8492]">ID Required</p>
      </div>
      <div className={mobileLegends ? "min-w-[70px] text-center sm:min-w-[86px]" : "min-w-[86px] text-center"}>
        <p className="text-[10px] font-bold text-[#9aa2ad]">TOTAL</p>
        <p className={mobileLegends ? "text-sm font-black text-[#6d4cff] sm:text-lg" : "text-lg font-black text-[#6d4cff]"}>{totalLabel ?? "..."}</p>
      </div>
      <button
        type="button"
        onClick={onAddToCart}
        disabled={isSubmitting || !selectedPackage}
        aria-label="Add to cart"
        className={mobileLegends ? "flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#6d4cff]/40 text-[#6d4cff] disabled:opacity-50 sm:size-10" : "flex size-10 shrink-0 items-center justify-center rounded-lg border border-[#6d4cff]/40 text-[#6d4cff] disabled:opacity-50"}
      >
        <ShoppingCart className="size-4" />
      </button>
      <button type="button" onClick={onPay} disabled={isSubmitting || !selectedPackage} className={mobileLegends ? "h-10 shrink-0 whitespace-nowrap rounded-lg bg-[#6d4cff] px-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-70 sm:px-4 sm:text-sm" : "h-10 rounded-lg bg-[#6d4cff] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"}>
        {isSubmitting ? "..." : `Pay ${totalLabel ?? selectedPayment.name}`}
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
    <label className="block" id={`game-field-${field.field_key}`}>
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

const FIELD_TTL = 3 * 24 * 60 * 60 * 1000;

const GamePage = () => {
  const { gameId: slug } = useParams();
  const navigate = useNavigate();
  const { loading, notFound, game, fields, products } = useGameCatalog(slug);
  const { user, profile, isAuthenticated } = useAuth();
  const { addItem } = useCart();
  const isMobileLegends = slug === "mobile-legends";
  const [mobileView, setMobileView] = useState({ slug, view: "buy" });
  const activeMobileView = mobileView.slug === slug ? mobileView.view : "buy";

  const [selectedPackageId, setSelectedPackageId] = useState(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState(paymentMethods[0].id);
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [activeMembership, setActiveMembership] = useState(null);
  const [selectedMembershipPlanId, setSelectedMembershipPlanId] = useState(null);
  const [fieldValues, setFieldValues] = useState({});
  const [contact, setContact] = useState({ email: "", whatsapp: "" });
  const [dialCountry, setDialCountry] = useState("IN");
  const [checkoutError, setCheckoutError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartNotice, setCartNotice] = useState(null);

  const [showCartReview, setShowCartReview] = useState(false);
  const [confirmStep, setConfirmStep] = useState(1);
  const [orderComplete, setOrderComplete] = useState(null);
  const orderCompleteShownRef = useRef(false);

  // The confirmation replaces the whole (tall) page — without this the
  // browser clamps the old scroll position and the user lands at the
  // bottom staring at the footer instead of the confirmation. Guard so
  // later status updates (paymentPending -> fulfilled) don't re-yank scroll.
  useLayoutEffect(() => {
    if (!orderComplete || orderCompleteShownRef.current) return;
    orderCompleteShownRef.current = true;
    window.scrollTo({ top: 0, behavior: "instant" });
    ScrollTrigger.refresh();
  }, [orderComplete]);
  const [playerName, setPlayerName] = useState(null);
  const [playerRegion, setPlayerRegion] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const verifyTimer = useRef(null);

  // Map DB products to the package shape used by the UI.
  const packages = useMemo(
    () =>
      products.map((p) => ({
        id: p.id,
        name: p.name,
        amount: p.amount,
        description: p.description ?? null,
        image: p.image_url,
        popular: p.is_popular,
        currency: p.currency,
        price: Number(p.price),
        comparePrice: p.compare_price ? Number(p.compare_price) : null,
        priceLabel: formatPrice(p.price, p.currency),
        oldPriceLabel: p.compare_price ? formatPrice(p.compare_price, p.currency) : null,
        metadata: p.metadata ?? {},
      })),
    [products]
  );

  // Package section presentation: "compact" (dense 3-column grid with pinned
  // featured packs) is opted in per game via admin → metadata.package_layout.
  const packageLayout =
    game?.metadata?.package_layout === "compact" || slug === "mobile-legends"
      ? "compact"
      : "default";
  const packageNoteTop = game?.metadata?.package_note_top ?? null;
  const packageNoteBottom = game?.metadata?.package_note_bottom ?? null;
  const featuredIds = game?.metadata?.package_featured;

  const featuredPackages = useMemo(() => {
    if (packageLayout !== "compact") return [];
    if (Array.isArray(featuredIds) && featuredIds.length > 0) {
      return packages.filter((p) => featuredIds.includes(p.id));
    }
    // No admin pinning yet: heuristically surface weekly/monthly pass-style packs.
    return packages.filter((p) => /weekly|monthly|pass|bundle/i.test(p.name)).slice(0, 2);
  }, [packages, packageLayout, featuredIds]);

  const featuredIdSet = useMemo(() => new Set(featuredPackages.map((p) => p.id)), [featuredPackages]);
  const gridPackages = useMemo(
    () => (packageLayout === "compact" ? packages.filter((p) => !featuredIdSet.has(p.id)) : packages),
    [packages, featuredIdSet, packageLayout]
  );

  // MLBB: the first grid packs are the first-purchase "double" tiers — their
  // amount is a flat "Diamond=N" with no "+bonus" part ("Diamond=55" vs the
  // regular "Diamond=78+8"). Split the grid at the first regular pack so the
  // promo note can sit between the two groups.
  const doubleNoteSplit = useMemo(() => {
    if (!isMobileLegends) return -1;
    const idx = gridPackages.findIndex(
      (p) => !/^Diamond=\d+$/i.test(String(p.amount ?? "").trim())
    );
    return idx > 0 && idx < gridPackages.length ? idx : -1;
  }, [gridPackages, isMobileLegends]);

  // Optional admin-defined section order (metadata.package_sections). When set it
  // fully describes the compact layout: note text blocks, featured wide cards,
  // and titled card groups. Packages not assigned anywhere are appended as a
  // trailing grid.
  const packageSections = useMemo(() => {
    const raw = game?.metadata?.package_sections;
    if (packageLayout !== "compact" || !Array.isArray(raw) || raw.length === 0) return null;

    const byId = new Map(packages.map((p) => [p.id, p]));
    const used = new Set();
    const resolved = raw
      .filter((s) => s && typeof s === "object")
      .map((s) => {
        const type = s.type === "featured" || s.type === "grid" ? s.type : "note";
        if (type === "note") {
          return { type, text: String(s.text ?? ""), items: [] };
        }
        const ids = Array.isArray(s.product_ids) ? s.product_ids : [];
        const items = ids.map((id) => byId.get(id)).filter(Boolean);
        items.forEach((it) => used.add(it.id));
        return { type, title: String(s.title ?? ""), items };
      })
      .filter((s) => (s.type === "note" ? s.text.trim() : s.items.length > 0));

    if (resolved.length === 0 && raw.length > 0) {
      // Sections configured but every product reference is stale — ignore them.
      if (!packages.some((p) => used.has(p.id))) return null;
    }
    const leftover = packages.filter((p) => !used.has(p.id));
    if (leftover.length > 0) resolved.push({ type: "grid", title: "", items: leftover });
    return resolved;
  }, [packages, packageLayout, game?.metadata?.package_sections]);

  useEffect(() => {
    let cancelled = false;

    async function loadMemberships() {
      const { data: plans } = await supabase
        .from("membership_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!cancelled) setMembershipPlans(plans ?? []);

      if (!user?.id) {
        if (!cancelled) setActiveMembership(null);
        return;
      }

      const { data: membership } = await supabase
        .from("user_memberships")
        .select("*, membership_plans(*)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!cancelled) setActiveMembership(membership ?? null);
    }

    loadMemberships();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (packages.length > 0) {
      const defaultId = game?.metadata?.default_product_id;
      const defaultPkg = defaultId ? packages.find((p) => p.id === defaultId) : null;
      setSelectedPackageId((prev) => prev ?? defaultPkg?.id ?? packages[0].id);
    }
  }, [packages, game?.metadata?.default_product_id]);

  // Restore saved field values and contact from localStorage (up to 3 days old)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`pixiekat_fields_${slug}`);
      if (raw) {
        const { values, savedAt } = JSON.parse(raw);
        if (Date.now() - savedAt < FIELD_TTL) {
          setFieldValues((prev) => ({ ...prev, ...values }));
          localStorage.setItem(`pixiekat_fields_${slug}`, JSON.stringify({ values, savedAt: Date.now() }));
        } else {
          localStorage.removeItem(`pixiekat_fields_${slug}`);
        }
      }
    } catch (error) { void error; }
    try {
      const raw = localStorage.getItem("pixiekat_contact");
      if (raw) {
        const { values, savedAt } = JSON.parse(raw);
        if (Date.now() - savedAt < FIELD_TTL) {
          setContact(values);
          localStorage.setItem("pixiekat_contact", JSON.stringify({ values, savedAt: Date.now() }));
        } else {
          localStorage.removeItem("pixiekat_contact");
        }
      }
    } catch (error) { void error; }
  }, [slug]);

  // Auto-fill contact from profile only when fields are still empty
  useEffect(() => {
    if (isAuthenticated) {
      setContact((prev) => ({
        email: prev.email || profile?.email || user?.email || "",
        whatsapp: prev.whatsapp || profile?.phone || "",
      }));
    }
  }, [isAuthenticated, profile?.email, profile?.phone, user?.email]);

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

  const providerGameCode = game?.provider_game_code;
  const smileCoinProduct = game?.metadata?.smile_coin_product;

  // Player name verification for Smile.one games
  useEffect(() => {
    if (!providerGameCode) return;

    setPlayerName(null);
    setPlayerRegion(null);
    setVerifyError("");

    const userIdKey = fields.find((f) => ["user_id", "userid", "player_id", "account_id"].includes(f.field_key))?.field_key;
    const serverIdKey = fields.find((f) => ["zone_id", "server_id", "zoneid"].includes(f.field_key))?.field_key;
    const userId = String(fieldValues[userIdKey] ?? "").trim();
    const zoneId = String(fieldValues[serverIdKey] ?? "").trim();

    if (!userId) return;
    if (serverIdKey && !zoneId) return;

    if (verifyTimer.current) clearTimeout(verifyTimer.current);

    verifyTimer.current = setTimeout(async () => {
      setVerifying(true);
      try {
        const res = await fetch(`${API_BASE}/verify-player`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            zone_id: zoneId || undefined,
            api_game: providerGameCode,
            product: providerGameCode,
            product_id: "1",
            smile_coin_product: smileCoinProduct || undefined,
          }),
        });
        const json = await res.json();
        if (json.success && json.username) {
          setPlayerName(json.username);
        } else {
          setVerifyError(json.message || "Player not found. Check your User ID" + (serverIdKey ? " and Zone ID." : "."));
        }
        setPlayerRegion(json.region ?? null);
      } catch {
        setVerifyError("Could not reach verification server. You can still place your order.");
      } finally {
        setVerifying(false);
      }
    }, 800);

    return () => clearTimeout(verifyTimer.current);
  }, [fieldValues, providerGameCode, fields, smileCoinProduct]);

  // Persist field values to localStorage on every change
  useEffect(() => {
    if (Object.values(fieldValues).some(Boolean)) {
      localStorage.setItem(`pixiekat_fields_${slug}`, JSON.stringify({ values: fieldValues, savedAt: Date.now() }));
    }
  }, [fieldValues, slug]);

  // Persist contact to localStorage on every change
  useEffect(() => {
    if (contact.email || contact.whatsapp) {
      localStorage.setItem("pixiekat_contact", JSON.stringify({ values: contact, savedAt: Date.now() }));
    }
  }, [contact]);

  if (loading) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-4 text-[#5f6977]">
          <div className="size-10 animate-spin rounded-full border-4 border-[#dfe4ec] border-t-[#6d4cff]" />
          <p className="text-sm font-medium">Loading game…</p>
        </div>
      </PageShell>
    );
  }

  if (notFound || !game) {
    return <Navigate to="/games" replace />;
  }

  const steps = game.how_to_steps && game.how_to_steps.length > 0 ? game.how_to_steps : defaultSteps;
  const isYokcash = game.provider === "yokcash";
  const targetUserField = fields.find((f) => ["user_id", "userid", "player_id", "account_id"].includes(f.field_key))?.field_key;
  const targetZoneField = fields.find((f) => ["zone_id", "server_id", "zoneid"].includes(f.field_key))?.field_key;
  const reviewTarget = `${String(fieldValues[targetUserField] ?? "").trim()}${targetZoneField ? ` | Zone ${String(fieldValues[targetZoneField] ?? "").trim()}` : ""}`;
  const bannerImage = game.banner_url || game.image_url || defaultBanner;
  const gameDescription = game.description ? sanitizeRichText(game.description) : null;
  const selectedPackage = packages.find((item) => item.id === selectedPackageId) ?? packages[0] ?? null;
  const selectedPayment = paymentMethods.find((item) => item.id === selectedPaymentId) ?? paymentMethods[0];
  const selectedMembershipPlan = membershipPlans.find((plan) => plan.id === selectedMembershipPlanId) ?? null;
  const discountPlan = firstJoined(activeMembership?.membership_plans) ?? selectedMembershipPlan;
  const packagePrice = Number(selectedPackage?.price ?? 0);
  const memberPrice = discountPlan ? getMemberPrice(packagePrice, discountPlan.discount_percent) : null;
  const discountAmount = memberPrice == null ? 0 : Math.max(0, packagePrice - memberPrice);
  const membershipAddOnAmount = activeMembership ? 0 : Number(selectedMembershipPlan?.price ?? 0);
  const totalAmount = Math.max(0, packagePrice - discountAmount + membershipAddOnAmount);
  const paymentTotalLabel = selectedPackage ? formatPrice(totalAmount, selectedPackage.currency) : "...";

  // Region gating — evaluated from the verified account's detected country.
  // Game-level block (metadata.blocked_regions) rejects every package; package
  // exclusions (metadata.excluded_regions) reject only the selected denomination.
  // Unknown region fails open, matching the verify flow's posture.
  const accountCountry = playerRegion?.country ?? null;
  const gameRegionBlocked = regionIsBlocked(accountCountry, game?.metadata?.blocked_regions);
  const packageRegionBlocked =
    !gameRegionBlocked && regionIsBlocked(accountCountry, selectedPackage?.metadata?.excluded_regions);
  const regionBlocked = gameRegionBlocked || packageRegionBlocked;

  const updateField = (key, value) =>
    setFieldValues((prev) => ({ ...prev, [key]: value }));

  const updateContact = (key, value) =>
    setContact((prev) => ({ ...prev, [key]: value }));

  const scrollToElement = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const focusable = el.matches("input, select, textarea") ? el : el.querySelector("input, select, textarea");
    if (focusable) window.setTimeout(() => focusable.focus({ preventScroll: true }), 450);
  };

  const failCheckout = (message, targetId) => {
    setCheckoutError(message);
    if (targetId) window.setTimeout(() => scrollToElement(targetId), 60);
  };

  const handleReview = () => {
    setCheckoutError("");
    if (!selectedPackage) { failCheckout("Please select a package before checkout.", "package-section"); return; }
    const missingField = fields.find((f) => f.is_required && !String(fieldValues[f.field_key] ?? "").trim());
    if (missingField) { failCheckout(`Please enter ${missingField.label}.`, `game-field-${missingField.field_key}`); return; }
    if (regionBlocked) { failCheckout(`This ${gameRegionBlocked ? "product" : "package"} is not available for players in ${accountCountry}.`, "region-warning"); return; }
    if (!contact.email.trim() || !contact.whatsapp.trim()) { failCheckout("Please enter your email address and WhatsApp number.", contact.email.trim() ? "contact-whatsapp" : "contact-email"); return; }
    if (!isAuthenticated || !user?.id) { failCheckout("Please log in before placing this order.", "checkout-error"); return; }
    setConfirmStep(1);
    setShowCartReview(true);
  };

  const handleAddToCart = () => {
    setCheckoutError("");
    setCartNotice(null);
    if (!selectedPackage) { failCheckout("Please select a package first.", "package-section"); return; }
    const missingField = fields.find((f) => f.is_required && !String(fieldValues[f.field_key] ?? "").trim());
    if (missingField) { failCheckout(`Please enter ${missingField.label}.`, `game-field-${missingField.field_key}`); return; }
    if (regionBlocked) { failCheckout(`This ${gameRegionBlocked ? "product" : "package"} is not available for players in ${accountCountry}.`, "region-warning"); return; }

    const rawProduct = products.find((p) => p.id === selectedPackage.id) ?? selectedPackage;
    const result = addItem({
      gameId: game.id,
      gameSlug: game.slug,
      gameName: game.name,
      gameImage: game.image_url || bannerImage,
      product: {
        id: rawProduct.id,
        name: rawProduct.name,
        amount: rawProduct.amount ?? selectedPackage.amount,
        price: Number(rawProduct.price ?? selectedPackage.price),
        currency: rawProduct.currency ?? selectedPackage.currency,
        image_url: rawProduct.image_url ?? selectedPackage.image ?? null,
        metadata: rawProduct.metadata ?? {},
      },
      fieldValues,
      fieldLabels: Object.fromEntries(fields.map((f) => [f.field_key, f.label])),
      playerName,
      playerRegion: accountCountry,
      quantity: 1,
    });

    if (!result.ok) {
      setCartNotice({ type: "error", text: result.error });
      return;
    }
    setCartNotice({
      type: "success",
      text: result.merged
        ? `Updated quantity in your cart${result.capped ? " (reached the per-account limit)" : ""}.`
        : `${selectedPackage.name} added to your cart.`,
    });
  };

  const handlePay = async () => {
    setCheckoutError("");

    if (!selectedPackage) {
      failCheckout("Please select a package before checkout.", "package-section");
      return;
    }

    const missingField = fields.find((field) => field.is_required && !String(fieldValues[field.field_key] ?? "").trim());
    if (missingField) {
      failCheckout(`Please enter ${missingField.label}.`, `game-field-${missingField.field_key}`);
      return;
    }

    if (regionBlocked) {
      failCheckout(`This ${gameRegionBlocked ? "product" : "package"} is not available for players in ${accountCountry}.`, "region-warning");
      return;
    }

    if (!contact.email.trim() || !contact.whatsapp.trim()) {
      failCheckout("Please enter your email address and WhatsApp number.", contact.email.trim() ? "contact-whatsapp" : "contact-email");
      return;
    }

    if (!isAuthenticated || !user?.id) {
      failCheckout("Please log in before placing this order.", "checkout-error");
      return;
    }

    if (selectedPayment.id === "wallet" && Number(profile?.wallet_balance ?? 0) < totalAmount) {
      failCheckout(`Your wallet balance is too low for ${paymentTotalLabel}. Please add money or use Razorpay.`, "checkout-error");
      return;
    }

    const dialCode = COUNTRY_DIAL_CODES.find((country) => country.code === dialCountry)?.dial ?? "+91";
    const orderContact = `${dialCode} ${contact.whatsapp.trim()}`.slice(0, 32);
    const prefillContact = orderContact.replace(/[^\d+]/g, "");
    const orderMeta = {
      game_id: game.id,
      game_slug: game.slug,
      game_name: game.name,
      account_fields: fieldValues,
      verified_username: playerName,
      verified_region: playerRegion?.country ?? null,
      pricing: {
        package_price: packagePrice,
        membership_discount: discountAmount,
        membership_add_on: membershipAddOnAmount,
        total_amount: totalAmount,
        active_membership_id: activeMembership?.id ?? null,
        selected_membership_plan_id: selectedMembershipPlan?.id ?? null,
        selected_membership_plan_name: selectedMembershipPlan?.name ?? null,
        discount_plan_name: discountPlan?.name ?? null,
      },
      contact: {
        email: contact.email.trim().slice(0, 254),
        whatsapp: orderContact,
      },
    };

    setIsSubmitting(true);
    let paymentModalOpen = false;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your session expired. Please log in again.");
      const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      };
      const postApi = async (path, body) => {
        const response = await fetch(`${API_BASE}${path}`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(body),
        });
        const data = await response.json().catch(() => ({}));
        return { response, data };
      };

      const placeOrder = async (paymentMethod) => postApi("/place-order", {
        product_id: selectedPackage.id,
        product_name: selectedPackage.name,
        total_amount: totalAmount,
        currency: selectedPackage.currency,
        ...(paymentMethod ? { payment_method: paymentMethod } : {}),
        metadata: orderMeta,
      });

      if (selectedPayment.id === "wallet") {
        const { response, data } = await placeOrder(null);
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not place this order. Please try again.");

        const orderId = data.orderId;
        let fulfilled = false;
        let provisioned = true;
        let refunded = false;
        let fulfillError = null;
        let mismatch = null;
        try {
          const { response: fulfillResponse, data: fulfillData } = await postApi("/fulfill-order", { orderId });
          fulfilled = Boolean(fulfillData.ok || fulfillData.already);
          provisioned = fulfillData.provisioned !== false;
          refunded = fulfillResponse.status === 500;
          mismatch = fulfillData.mismatch || null;
          if (!fulfilled) fulfillError = fulfillData.error || null;
        } catch {
          provisioned = false;
        }
        setOrderComplete({ orderId, method: "wallet", amount: paymentTotalLabel, package: selectedPackage.name, fulfilled, provisioned, refunded, mismatch, fulfillError });
        return;
      }

      if (selectedPayment.id === "aluu") {
        const { response, data } = await placeOrder("aluu");
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not start UPI checkout. Please try again.");
        if (!data.aluu?.paymentUrl) throw new Error("UPI payment link is missing. Please try again.");

        const orderId = data.orderId;
        const paymentWindow = window.open(data.aluu.paymentUrl, "_blank");
        if (!paymentWindow) {
          // Popup blocked — fall back to redirect in same tab
          // But first show a message
          setCheckoutError("Pop-up blocked. Redirecting to payment page...");
          setTimeout(() => { window.location.href = data.aluu.paymentUrl; }, 1500);
          return;
        }

        setShowCartReview(false);

        // Poll for payment completion (Aluu link expires after ~8 min)
        const POLL_INTERVAL_MS = 4000;
        const MAX_POLL_TIME_MS = 10 * 60 * 1000; // 10 minutes
        const pollStart = Date.now();
        let paymentConfirmed = false;

        const pollStatus = async () => {
          try {
            const { data: checkData } = await postApi("/aluu/check-payment", { orderId });
            if (checkData.ok && checkData.status === "processing") {
              paymentConfirmed = true;
              return true;
            }
            if (checkData.status === "failed") {
              return "failed";
            }
          } catch { /* ignore poll errors */ }
          return false;
        };

        setCheckoutError("Waiting for UPI payment confirmation… Complete payment in the opened window.");

        const pollLoop = async () => {
          while (Date.now() - pollStart < MAX_POLL_TIME_MS) {
            const result = await pollStatus();
            if (result === true) break;
            if (result === "failed") {
              setIsSubmitting(false);
              setCheckoutError("Payment failed or the payment link expired. Please try again.");
              return;
            }
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          }

          if (!paymentConfirmed) {
            // One final check
            const finalResult = await pollStatus();
            if (finalResult !== true) {
              setIsSubmitting(false);
              setCheckoutError("Payment was not confirmed in time. If you paid, please check your order history — it may still process.");
              return;
            }
          }

          // Payment confirmed — fulfill
          setCheckoutError("");
          try {
            const { response: fulfillResponse, data: fulfillData } = await postApi("/fulfill-order", { orderId });
            const fulfilled = Boolean(fulfillData.ok || fulfillData.already);
            const refunded = fulfillResponse.status === 500 && Boolean(fulfillData.refunded);
            setOrderComplete({
              orderId,
              method: "aluu",
              amount: paymentTotalLabel,
              package: selectedPackage.name,
              fulfilled,
              provisioned: fulfillData.provisioned !== false,
              refunded,
              paymentReceived: true,
              paymentPending: !fulfilled && !refunded,
              mismatch: fulfillData.mismatch || null,
              fulfillError: fulfilled || refunded ? null : fulfillData.error || null,
            });
          } catch {
            setOrderComplete({
              orderId,
              method: "aluu",
              amount: paymentTotalLabel,
              package: selectedPackage.name,
              paymentReceived: true,
              paymentPending: true,
              fulfillError: "Payment was received, but confirmation is still processing. Please contact support with your Order ID.",
            });
          } finally {
            setIsSubmitting(false);
          }
        };

        pollLoop();
        return;
      }

      if (selectedPayment.id === "razorpay") {
        const Razorpay = await loadRazorpayCheckout();
        const { response, data } = await placeOrder("razorpay");
        if (!response.ok || !data.ok) throw new Error(data.error || "Could not start Razorpay checkout. Please try again.");
        if (!data.razorpay?.keyId || !data.razorpay?.orderId) throw new Error("Razorpay checkout details are missing. Please try again.");

        const orderId = data.orderId;
        let paymentHandled = false;
        const finishPayment = async (paymentResponse) => {
          paymentHandled = true;
          setCheckoutError("");
          try {
            const { response: verifyResponse, data: verifyData } = await postApi("/razorpay/verify-payment", {
              orderId,
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            });
            if (!verifyResponse.ok || !verifyData.ok) {
              setOrderComplete({
                orderId,
                method: "razorpay",
                amount: paymentTotalLabel,
                package: selectedPackage.name,
                paymentReceived: true,
                paymentPending: true,
                fulfillError: "Payment was received, but confirmation is still processing. Please contact support with your Order ID.",
              });
              return;
            }

            const { response: fulfillResponse, data: fulfillData } = await postApi("/fulfill-order", { orderId });
            const fulfilled = Boolean(fulfillData.ok || fulfillData.already);
            const refunded = fulfillResponse.status === 500 && Boolean(fulfillData.refunded);
            setOrderComplete({
              orderId,
              method: "razorpay",
              amount: paymentTotalLabel,
              package: selectedPackage.name,
              fulfilled,
              provisioned: fulfillData.provisioned !== false,
              refunded,
              paymentReceived: true,
              paymentPending: !fulfilled && !refunded,
              mismatch: fulfillData.mismatch || null,
              fulfillError: fulfilled || refunded ? null : fulfillData.error || null,
            });
          } catch {
            setOrderComplete({
              orderId,
              method: "razorpay",
              amount: paymentTotalLabel,
              package: selectedPackage.name,
              paymentReceived: true,
              paymentPending: true,
              fulfillError: "Payment was received, but confirmation is still processing. Please contact support with your Order ID.",
            });
          } finally {
            setIsSubmitting(false);
          }
        };

        const checkout = new Razorpay({
          key: data.razorpay.keyId,
          amount: data.razorpay.amount,
          currency: data.razorpay.currency,
          name: "PixieKat",
          description: `PixieKat ${game.name} - ${selectedPackage.name}`,
          order_id: data.razorpay.orderId,
          prefill: {
            name: profile?.name || user.user_metadata?.name || "",
            email: contact.email.trim(),
            contact: prefillContact,
          },
          notes: { pixiekat_order_id: orderId },
          theme: { color: "#6d4cff" },
          modal: {
            ondismiss: () => {
              if (!paymentHandled) {
                setIsSubmitting(false);
                setCheckoutError("Payment window closed. Your order was not charged.");
              }
            },
          },
          handler: finishPayment,
        });
        checkout.on("payment.failed", () => {
          paymentHandled = true;
          setIsSubmitting(false);
          setCheckoutError("Payment failed. Please try again or choose another payment method.");
        });
        setShowCartReview(false);
        checkout.open();
        paymentModalOpen = true;
        return;
      }

      const { response, data } = await placeOrder(selectedPayment.id);
      if (!response.ok || !data.ok) throw new Error(data.error || "Could not place this order. Please try again.");
      setOrderComplete({ orderId: data.orderId, method: selectedPayment.id, amount: paymentTotalLabel, package: selectedPackage.name });
    } catch (error) {
      setCheckoutError(error.message || "Could not place this order. Please try again.");
    } finally {
      if (selectedPayment.id !== "razorpay" && selectedPayment.id !== "aluu" || !paymentModalOpen) setIsSubmitting(false);
    }
  };

  if (orderComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(115deg,#fbfaf5_0%,#eef8f7_48%,#faf8f2_100%)] px-4 pt-24 text-[#10141f]">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
          <div className={`mx-auto mb-5 flex size-16 items-center justify-center rounded-full ${orderComplete.refunded || orderComplete.mismatch ? "bg-amber-100" : "bg-emerald-100"}`}>
            <CheckCircle2 className={`size-8 ${orderComplete.refunded || orderComplete.mismatch ? "text-amber-500" : "text-emerald-600"}`} />
          </div>
          <h2 className="text-2xl font-black text-[#10141f]">
            {orderComplete.refunded
              ? "Delivery Failed — Refunded"
              : orderComplete.mismatch
                ? "Top-up Delivered"
                : "Order Placed!"}
          </h2>
          <p className="mt-2 text-sm text-[#5f6977]">
            {orderComplete.refunded
              ? orderComplete.method === "wallet"
                ? "The top-up could not be delivered. Your wallet has been refunded."
                : "The top-up could not be delivered. Your Razorpay payment has been refunded."
              : orderComplete.mismatch
                ? "Top-up delivered with a partial refund — the provider sent a different package and we credited your wallet."
                : orderComplete.paymentPending
                  ? "Payment received. Your order is still being confirmed — please keep your Order ID for support."
                  : orderComplete.method === "wallet"
                    ? orderComplete.fulfilled
                      ? "Payment confirmed and your top-up has been delivered!"
                      : orderComplete.provisioned
                        ? "Top-up is being processed — please allow a few minutes."
                        : "Payment confirmed. Our team will process your order shortly."
                    : orderComplete.fulfilled
                      ? "Payment confirmed and your top-up has been delivered!"
                      : "Payment confirmed. Our team will process your order shortly."}
          </p>
          {orderComplete.fulfillError && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-700">
              <span className="font-semibold">Details:</span> {orderComplete.fulfillError}
            </p>
          )}
          <div className="mt-6 space-y-2 rounded-xl bg-[#f5f3ff] p-4 text-left text-sm">
            <div className="flex justify-between">
              <span className="text-[#6d7480]">Package</span>
              <span className="font-bold text-[#10141f]">{orderComplete.package}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6d7480]">Amount Paid</span>
              <span className="font-bold text-[#6d4cff]">{orderComplete.amount}</span>
            </div>
            {orderComplete.mismatch?.refund_status === "completed" && (
              <div className="flex justify-between">
                <span className="text-[#6d7480]">Credited Refund</span>
                <span className="font-bold text-emerald-600">+{formatPrice(orderComplete.mismatch.refund_amount, orderComplete.mismatch.refund_currency || "PKS")}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#6d7480]">Payment</span>
              <span className="font-bold capitalize text-[#10141f]">{orderComplete.method}</span>
            </div>
            {orderComplete.orderId && (
              <div className="flex justify-between">
                <span className="text-[#6d7480]">Order ID</span>
                <span className="font-mono text-xs text-[#9aa2ad]">{String(orderComplete.orderId).slice(0, 8)}…</span>
              </div>
            )}
          </div>
          {orderComplete.paymentPending && (
            <p className="mt-4 text-xs text-[#9aa2ad]">
              If your order does not update shortly, contact support with the full Order ID above.
            </p>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 h-12 w-full rounded-xl bg-[#6d4cff] text-sm font-bold text-white"
          >
            Place Another Order
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[linear-gradient(115deg,#fbfaf5_0%,#eef8f7_48%,#faf8f2_100%)] pt-24 text-[#10141f] md:pb-16 ${
      isMobileLegends ? (activeMobileView === "guide" ? "pb-20" : "pb-40") : "pb-28"
    }`}>
      {showCartReview && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-7 shadow-2xl">
            <div className="mb-5 flex items-center gap-3">
              <button type="button" onClick={() => setShowCartReview(false)} className="rounded-full p-2 hover:bg-gray-100">
                <ArrowLeft className="size-5 text-[#6d4cff]" />
              </button>
              <h2 className="text-xl font-black text-[#10141f]">Review Your Order</h2>
            </div>
            <div className="mb-4 rounded-xl bg-[#f5f3ff] p-4">
              <p className="mb-1 text-xs font-bold text-[#9aa2ad]">GAME & PACKAGE</p>
              <p className="font-bold text-[#10141f]">{game.name}</p>
              <p className="text-lg font-black text-[#6d4cff]">{selectedPackage?.name}</p>
            </div>
            {fields.length > 0 && (
              <div className="mb-4 space-y-2 rounded-xl bg-gray-50 p-4">
                <p className="mb-1 text-xs font-bold text-[#9aa2ad]">ACCOUNT DETAILS</p>
                {fields.map((f) => (
                  <div key={f.id} className="flex justify-between text-sm">
                    <span className="text-[#6d7480]">{f.label}</span>
                    <span className="font-bold text-[#10141f]">{fieldValues[f.field_key] || "—"}</span>
                  </div>
                ))}
                {playerName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6d7480]">Verified Name</span>
                    <span className="font-bold text-[#1a7f4b]">{playerName}{playerRegion?.country ? ` (${playerRegion.country})` : ""}</span>
                  </div>
                )}
              </div>
            )}
            <div className="mb-4 space-y-2 rounded-xl bg-gray-50 p-4">
              <p className="mb-1 text-xs font-bold text-[#9aa2ad]">CONTACT</p>
              <div className="flex justify-between text-sm">
                <span className="text-[#6d7480]">Email</span>
                <span className="font-bold text-[#10141f]">{contact.email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#6d7480]">WhatsApp</span>
                <span className="font-bold text-[#10141f]">{contact.whatsapp}</span>
              </div>
            </div>
            <div className="mb-5 rounded-xl bg-[#f1f3f5] p-5">
              <div className="flex justify-between border-b border-[#d9dde3] pb-3 text-sm text-[#4b5563]">
                <span>Package Price</span>
                <span className="font-bold text-[#10141f]">{selectedPackage?.priceLabel}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between border-b border-[#d9dde3] py-3 text-sm text-[#1a7f4b]">
                  <span>{discountPlan?.name} Discount</span>
                  <span className="font-bold">-{formatPrice(discountAmount, selectedPackage?.currency)}</span>
                </div>
              )}
              <div className="mt-3 flex justify-between">
                <span className="text-base font-black text-[#10141f]">Total</span>
                <span className="text-2xl font-black text-[#6d4cff]">{paymentTotalLabel}</span>
              </div>
            </div>
            {isYokcash && confirmStep === 2 && (
              <div className="mb-4 rounded-xl border-2 border-red-300 bg-red-50 p-4">
                <p className="mb-1 text-xs font-black text-red-600">FINAL CHECK — WRONG IDS CANNOT BE REFUNDED</p>
                <p className="text-sm font-bold text-[#10141f]">
                  Diamonds go to <span className="font-black">{reviewTarget || "—"}</span>
                  {playerName ? ` — ${playerName}` : ""}{playerRegion?.country ? ` (${playerRegion.country})` : ""}
                </p>
                {!playerName && !playerRegion?.nickname && (
                  <p className="mt-1 text-xs font-bold text-amber-600">This account could not be verified — check the ID twice.</p>
                )}
                <p className="mt-1 text-xs text-red-600">The provider delivers to exactly the ID above and never validates it. Make sure it is yours.</p>
              </div>
            )}
            {checkoutError ? (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{checkoutError}</p>
            ) : null}
            <div className="flex gap-3">
              <button type="button" onClick={() => (isYokcash && confirmStep === 2 ? setConfirmStep(1) : setShowCartReview(false))} className="h-12 flex-1 rounded-xl border border-[#dfe4ec] text-sm font-bold text-[#4b5563]">
                Go Back
              </button>
              <button
                type="button"
                onClick={() => (isYokcash && confirmStep === 1 ? setConfirmStep(2) : handlePay())}
                disabled={isSubmitting}
                className={`h-12 flex-1 rounded-xl text-sm font-bold text-white disabled:opacity-70 ${isYokcash && confirmStep === 2 ? "bg-red-600" : "bg-[#6d4cff]"}`}
              >
                {isSubmitting
                  ? "Processing..."
                  : isYokcash
                    ? confirmStep === 1 ? "Review Account →" : "Yes — Send Diamonds"
                    : `Confirm & Pay ${paymentTotalLabel}`}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className={isMobileLegends
        ? "mx-auto grid max-w-[1480px] gap-0 px-0 md:gap-10 md:px-8 md:pt-10 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-12"
        : "mx-auto grid max-w-[1480px] gap-10 px-4 md:px-8 md:pt-10 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-12"}
      >
        <aside className={isMobileLegends ? "space-y-0 md:space-y-8 lg:sticky lg:top-24 lg:self-start" : "space-y-8 lg:sticky lg:top-24 lg:self-start"}>
          <img
            src={bannerImage}
            alt={game.name}
            className={isMobileLegends
              ? "h-[9.9rem] w-full rounded-xl object-cover md:h-[8.1rem] md:shadow-[0_18px_42px_rgba(15,23,42,0.18)]"
              : "h-36 w-full rounded-xl object-cover shadow-[0_18px_42px_rgba(15,23,42,0.18)] md:h-36"}
            onError={(event) => {
              event.currentTarget.onerror = null;
              event.currentTarget.src = game.image_url || fallbackGameImage;
            }}
          />

          {isMobileLegends ? (
            <nav aria-label="Mobile Legends sections" className="grid h-14 grid-cols-2 border-b border-[#dfe4ec] bg-white/75 backdrop-blur md:hidden">
              <button
                type="button"
                aria-pressed={activeMobileView === "buy"}
                aria-controls="mobile-legends-buy"
                onClick={() => setMobileView({ slug, view: "buy" })}
                className={`flex min-h-11 items-center justify-center gap-2 border-b-2 font-general text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#7152ff] ${activeMobileView === "buy" ? "border-[#7152ff] text-[#6d4cff]" : "border-transparent text-[#6d7480]"}`}
              >
                <ShoppingCart className="size-4" /> Buy
              </button>
              <button
                type="button"
                aria-pressed={activeMobileView === "guide"}
                aria-controls="mobile-legends-guide"
                onClick={() => setMobileView({ slug, view: "guide" })}
                className={`flex min-h-11 items-center justify-center gap-2 border-b-2 font-general text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[#7152ff] ${activeMobileView === "guide" ? "border-[#7152ff] text-[#6d4cff]" : "border-transparent text-[#6d7480]"}`}
              >
                <CirclePlay className="size-4" /> Guide
              </button>
            </nav>
          ) : null}

          <div className="hidden md:block">
            <HowToTopUp steps={steps} />
          </div>

          {game.instructions ? (
            <InstructionsAlert title={`${game.name} Notes`} body={game.instructions} className={isMobileLegends ? "hidden md:block" : ""} />
          ) : null}
        </aside>

        <main
          id={isMobileLegends ? "mobile-legends-buy" : undefined}
          className={isMobileLegends
            ? `${activeMobileView === "guide" ? "hidden md:block" : ""} rounded-none bg-white/75 px-3 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur md:rounded-[28px] md:px-8 lg:px-9`
            : "rounded-[28px] bg-white/75 px-4 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur md:px-8 lg:px-9"}
        >
          {gameDescription ? <div className={`${isMobileLegends ? "hidden md:block" : ""} mb-7 text-sm leading-7 text-[#5f6977] [&_a]:text-[#6d4cff] [&_a]:underline [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:font-bold [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc`} dangerouslySetInnerHTML={{ __html: gameDescription }} /> : null}
          <section>
            <SectionTitle number="1">
              {isMobileLegends ? <><span className="md:hidden">Put Your ID</span><span className="hidden md:inline">Enter Account Details</span></> : "Enter Account Details"}
            </SectionTitle>
            {fields.length === 0 ? (
              <p className="text-sm text-[#6d7480]">No account fields configured for this game.</p>
            ) : (
              <>
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

                {/* Player verification badge — shows for any game with provider_game_code */}
                {game.provider_game_code && (verifying || playerName || verifyError) && (
                  <div
                    className={`mt-4 flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                      verifying
                        ? "bg-[#f0edff] text-[#6d4cff]"
                        : playerName
                        ? "bg-[#e8f9f0] text-[#1a7f4b]"
                        : verifyError.includes("can still place")
                        ? "bg-[#fffbeb] text-[#92400e]"
                        : "bg-[#fff3f3] text-[#c0392b]"
                    }`}
                  >
                    {verifying ? (
                      <>
                        <div className="size-4 shrink-0 animate-spin rounded-full border-2 border-[#6d4cff] border-t-transparent" />
                        Verifying account…
                      </>
                    ) : playerName ? (
                      <>
                        <CheckCircle2 className="size-4 shrink-0" />
                        Verified: <span className="ml-0.5 font-bold">{playerName}{playerRegion?.country ? ` (${playerRegion.country})` : ""}</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="size-4 shrink-0" />
                        {verifyError}
                        {playerRegion?.country ? <span className="ml-1 font-bold">(Account region: {playerRegion.country})</span> : null}
                      </>
                    )}
                  </div>
                )}

                {/* Region availability warning — red when the whole game is
                    blocked for the account region, amber when only the
                    selected denomination is excluded. */}
                {accountCountry && regionBlocked ? (
                  <div
                    id="region-warning"
                    className={`mt-3 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium ${
                      gameRegionBlocked ? "bg-[#fff3f3] text-[#c0392b]" : "bg-[#fffbeb] text-[#92400e]"
                    }`}
                  >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {gameRegionBlocked
                      ? `This product is not available for players in ${accountCountry}. Orders for this region cannot be fulfilled.`
                      : `This package is not available for players in ${accountCountry}. Please choose a different denomination.`}
                  </div>
                ) : null}
              </>
            )}
          </section>

          <section id="package-section" className="mt-7">
            <SectionTitle number="2">Select the Package</SectionTitle>
            {isMobileLegends && gameDescription ? (
              <div className="mb-6 text-sm leading-6 text-[#5f6977] md:hidden [&_a]:text-[#6d4cff] [&_a]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-bold [&_li]:ml-5 [&_ol]:list-decimal [&_ul]:list-disc" dangerouslySetInnerHTML={{ __html: gameDescription }} />
            ) : null}
            {packages.length === 0 ? (
              <p className="text-sm text-[#6d7480]">No packages available right now.</p>
            ) : packageLayout === "compact" ? (
              packageSections ? (
                <div className="space-y-5">
                  {packageSections.map((section, index) => {
                    if (section.type === "note") {
                      return (
                        <p key={index} className={isMobileLegends
                          ? "whitespace-pre-line text-sm leading-6 text-[#3b4350] md:text-xs md:leading-relaxed"
                          : "whitespace-pre-line text-xs leading-relaxed text-[#3b4350]"}
                        >
                          {section.text}
                        </p>
                      );
                    }
                    if (section.type === "featured") {
                      return (
                        <div key={index} className={isMobileLegends ? "grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3" : "grid grid-cols-3 gap-2.5 sm:gap-3"}>
                          {section.items.map((item) => (
                            <FeaturedPackageCard
                              key={item.id}
                              item={item}
                              selected={selectedPackageId === item.id}
                              onSelect={() => setSelectedPackageId(item.id)}
                              mobileLegends={isMobileLegends}
                            />
                          ))}
                        </div>
                      );
                    }
                    return (
                      <div key={index}>
                        {section.title ? (
                          <h3 className={isMobileLegends ? "mb-3 text-xl font-bold text-[#10141f] md:text-lg md:font-extrabold" : "mb-3 text-lg font-extrabold text-[#10141f]"}>{section.title}</h3>
                        ) : null}
                        <div className={isMobileLegends ? "grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3" : "grid grid-cols-3 gap-2.5 sm:gap-3"}>
                          {section.items.map((item) => (
                            <CompactPackageCard
                              key={item.id}
                              item={item}
                              selected={selectedPackageId === item.id}
                              onSelect={() => setSelectedPackageId(item.id)}
                              mobileLegends={isMobileLegends}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  {packageNoteTop ? (
                    <p className={isMobileLegends ? "mb-5 whitespace-pre-line text-sm leading-6 text-[#3b4350] md:mb-3 md:text-xs md:leading-relaxed" : "mb-3 text-xs leading-relaxed text-[#3b4350]"}>{packageNoteTop}</p>
                  ) : null}

                  {featuredPackages.length > 0 ? (
                    <div className={isMobileLegends ? "mb-6 grid grid-cols-2 gap-2.5 sm:gap-3 md:mb-3 md:grid-cols-3" : "mb-3 grid grid-cols-3 gap-2.5 sm:gap-3"}>
                      {featuredPackages.map((item) => (
                        <FeaturedPackageCard
                          key={item.id}
                          item={item}
                          selected={selectedPackageId === item.id}
                          onSelect={() => setSelectedPackageId(item.id)}
                          mobileLegends={isMobileLegends}
                        />
                      ))}
                    </div>
                  ) : null}

                  {isMobileLegends && gridPackages.length > 0 ? <h3 className="mb-3 text-xl font-bold text-[#10141f] md:hidden">Package</h3> : null}
                  {doubleNoteSplit > 0 ? (
                    <>
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3">
                        {gridPackages.slice(0, doubleNoteSplit).map((item) => (
                          <CompactPackageCard
                            key={item.id}
                            item={item}
                            selected={selectedPackageId === item.id}
                            onSelect={() => setSelectedPackageId(item.id)}
                            mobileLegends
                          />
                        ))}
                      </div>
                      <p className="my-4 whitespace-pre-line text-xs leading-5 text-[#3b4350] md:my-3 md:text-[11px] md:leading-normal">
                        {MOBILE_LEGENDS_DOUBLE_NOTE}
                      </p>
                      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3">
                        {gridPackages.slice(doubleNoteSplit).map((item) => (
                          <CompactPackageCard
                            key={item.id}
                            item={item}
                            selected={selectedPackageId === item.id}
                            onSelect={() => setSelectedPackageId(item.id)}
                            mobileLegends
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className={isMobileLegends ? "grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3" : "grid grid-cols-3 gap-2.5 sm:gap-3"}>
                      {gridPackages.map((item) => (
                        <CompactPackageCard
                          key={item.id}
                          item={item}
                          selected={selectedPackageId === item.id}
                          onSelect={() => setSelectedPackageId(item.id)}
                          mobileLegends={isMobileLegends}
                        />
                      ))}
                    </div>
                  )}

                  {packageNoteBottom ? (
                    <p className={isMobileLegends ? "mt-6 whitespace-pre-line text-sm leading-6 text-[#6d7480] md:mt-3 md:text-xs md:leading-relaxed" : "mt-3 text-xs leading-relaxed text-[#6d7480]"}>{packageNoteBottom}</p>
                  ) : null}
                </div>
              )
            ) : (
              <div>
                {packageNoteTop ? (
                  <p className="mb-3 text-xs leading-relaxed text-[#3b4350]">{packageNoteTop}</p>
                ) : null}
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
                {packageNoteBottom ? (
                  <p className="mt-3 text-xs leading-relaxed text-[#6d7480]">{packageNoteBottom}</p>
                ) : null}
              </div>
            )}
          </section>
        </main>
        {isMobileLegends ? (
          <section
            id="mobile-legends-guide"
            aria-label="Mobile Legends guide"
            className={`${activeMobileView === "guide" ? "" : "hidden"} space-y-8 px-4 py-8 md:hidden`}
          >
            <HowToTopUp steps={steps} />
            {game.instructions ? <InstructionsAlert title={`${game.name} Notes`} body={game.instructions} /> : null}
          </section>
        ) : null}
      </div>

      <div className={isMobileLegends
        ? `mx-auto max-w-[1480px] gap-0 px-0 md:mt-10 md:gap-10 md:px-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-12 ${activeMobileView === "guide" ? "hidden md:grid" : "grid"}`
        : "mx-auto mt-10 grid max-w-[1480px] gap-10 px-4 md:px-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-12"}
      >
        <div className="hidden lg:block" />
        <main className={isMobileLegends
          ? "rounded-none bg-white/75 px-3 py-4 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur md:rounded-[28px] md:px-8 md:py-7 lg:col-start-2 lg:px-9"
          : "rounded-[28px] bg-white/75 px-4 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur md:px-8 lg:col-start-2 lg:px-9"}
        >
          <section className="mt-7">
            <SectionTitle number="3">
              {isMobileLegends ? <><span className="md:hidden">Payment Method</span><span className="hidden md:inline">Choose the Payment Method</span></> : "Choose the Payment Method"}
            </SectionTitle>
            <MembershipOffer
              selectedPackage={selectedPackage}
              plans={membershipPlans}
              activeMembership={activeMembership}
              selectedPlanId={selectedMembershipPlanId}
              onSelectPlan={setSelectedMembershipPlanId}
            />

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {paymentMethods.map((method) => {
                const selected = selectedPaymentId === method.id;

                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedPaymentId(method.id)}
                    aria-pressed={selected}
                    className={`min-h-[84px] rounded-xl border bg-white px-4 py-3 text-left shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7152ff] ${
                      selected ? "border-[#7152ff] ring-2 ring-[#7152ff]/10" : "border-[#e2e6ee] hover:border-[#cbd2de]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <PaymentLogo>{method.logo}</PaymentLogo>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#202634]">{method.name}</p>
                        <p className="text-xs text-[#6d7480]">{method.description}</p>
                        {method.id === "wallet" ? (
                          <p className="mt-1 text-xs font-bold text-[#6d4cff]">
                            Balance: {formatPrice(profile?.wallet_balance ?? 0, selectedPackage?.currency ?? "INR")}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-[#8a92a0]">YOU PAY</p>
                        <p className={`text-xl font-black ${selected ? "text-[#6d4cff]" : "text-[#10141f]"}`}>{paymentTotalLabel}</p>
                        {method.note ? <p className="text-[10px] text-[#6d7480]">{method.note}</p> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg border border-[#c8baff] bg-[#f3efff] px-5 py-4 text-sm font-bold text-[#3f4654]">
              <Lightbulb className="mr-2 inline size-4 text-[#f0b429]" />
              <span className="mr-2 text-[#6d7480]">TIP |</span> Use Pixie Wallet for instant processing and extra discounts!
            </div>
          </section>

          <section id="contact-section" className="mt-7">
            <SectionTitle number="4">Contact Info</SectionTitle>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <label className="block">
                <span className="text-xs font-bold text-[#6d7480]">EMAIL ADDRESS</span>
                <input id="contact-email" className="mt-2 h-14 w-full rounded-xl border border-[#dfe4ec] bg-white px-4 text-base font-bold text-[#141923] outline-none" placeholder="Enter your email" value={contact.email} onChange={(event) => updateContact("email", event.target.value)} />
              </label>
              <div>
                <span className="text-xs font-bold text-[#6d7480]">WHATSAPP NUMBER</span>
                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                  <label className="relative block">
                    <span className="sr-only">Country dial code</span>
                    <select
                      className="h-14 w-full appearance-none rounded-xl border border-[#dfe4ec] bg-white px-3 pr-8 text-left text-sm font-bold text-[#141923] outline-none"
                      value={dialCountry}
                      onChange={(event) => setDialCountry(event.target.value)}
                    >
                      {COUNTRY_DIAL_CODES.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.code} {country.dial} — {country.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#6d7480]" />
                  </label>
                  <input id="contact-whatsapp" className="h-14 rounded-xl border border-[#dfe4ec] bg-white px-4 text-base font-bold text-[#141923] outline-none placeholder:text-[#9aa2ad]" placeholder="WhatsApp number" value={contact.whatsapp} onChange={(event) => updateContact("whatsapp", event.target.value)} />
                </div>
              </div>
            </div>

            {checkoutError ? (
              <p id="checkout-error" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{checkoutError}</p>
            ) : null}

            <div className="mt-6 border-t border-[#dfe4ec] pt-6">
              <div className="rounded-xl bg-[#f1f3f5] p-6">
                <div className="flex items-center justify-between border-b border-[#d9dde3] pb-4 text-sm text-[#4b5563]">
                  <span>Package Price</span>
                  <span className="font-bold text-[#10141f]">{selectedPackage?.priceLabel ?? "..."}</span>
                </div>
                {discountAmount > 0 ? (
                  <div className="mt-4 flex items-center justify-between border-b border-[#d9dde3] pb-4 text-sm text-[#1a7f4b]">
                    <span>{discountPlan?.name} Discount</span>
                    <span className="font-bold">-{formatPrice(discountAmount, selectedPackage?.currency)}</span>
                  </div>
                ) : null}
                {membershipAddOnAmount > 0 ? (
                  <div className="mt-4 flex items-center justify-between border-b border-[#d9dde3] pb-4 text-sm text-[#4b5563]">
                    <span>{selectedMembershipPlan?.name} Membership</span>
                    <span className="font-bold text-[#10141f]">{formatPrice(membershipAddOnAmount, selectedMembershipPlan?.currency)}</span>
                  </div>
                ) : null}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xl font-black text-[#10141f]">Total Pay</span>
                  <span className="text-right">
                    <span className="block text-3xl font-black text-[#6d4cff]">{paymentTotalLabel}</span>
                    {selectedPayment.note ? <span className="text-xs text-[#6d7480]">{selectedPayment.note}</span> : null}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={isSubmitting || !selectedPackage}
                  className="flex h-16 items-center justify-center gap-2 rounded-xl border-2 border-[#6d4cff] px-6 text-base font-black text-[#6d4cff] transition hover:bg-[#f6f3ff] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <ShoppingCart className="size-5" />
                  Add to Cart
                </button>
                <button type="button" onClick={handleReview} disabled={isSubmitting || !selectedPackage} className="h-16 flex-1 rounded-xl bg-[#6d4cff] text-lg font-black text-white disabled:cursor-not-allowed disabled:opacity-70">
                  {isSubmitting ? "Creating order..." : `Review & Pay ${paymentTotalLabel}`}
                </button>
              </div>
              {cartNotice ? (
                <div
                  className={`mt-4 flex items-center justify-between gap-3 rounded-lg px-4 py-3 text-sm font-bold ${
                    cartNotice.type === "error"
                      ? "border border-red-200 bg-red-50 text-red-600"
                      : "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  }`}
                >
                  <span>{cartNotice.text}</span>
                  {cartNotice.type !== "error" ? (
                    <button
                      type="button"
                      onClick={() => navigate("/cart")}
                      className="shrink-0 rounded-full bg-[#6d4cff] px-3 py-1.5 text-xs font-bold text-white"
                    >
                      View Cart
                    </button>
                  ) : null}
                </div>
              ) : null}
              <p className="mt-5 text-center text-xs text-[#6d7480]">
                By clicking Pay Now, you agree to our <span className="underline">Terms of Service</span>.
              </p>
            </div>
          </section>
        </main>
      </div>

      {checkoutError && (!isMobileLegends || activeMobileView === "buy") ? (
        <div className="fixed inset-x-0 bottom-44 z-[95] mx-auto max-w-md px-4 md:hidden">
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 shadow-lg">
            <AlertCircle className="size-4 shrink-0" />
            <span className="min-w-0">{checkoutError}</span>
          </div>
        </div>
      ) : cartNotice && (!isMobileLegends || activeMobileView === "buy") ? (
        <div className="fixed inset-x-0 bottom-44 z-[95] mx-auto max-w-md px-4 md:hidden">
          <div
            className={`flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-bold shadow-lg ${
              cartNotice.type === "error"
                ? "border border-red-200 bg-red-50 text-red-600"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <span className="min-w-0">{cartNotice.text}</span>
            {cartNotice.type !== "error" ? (
              <button
                type="button"
                onClick={() => navigate("/cart")}
                className="shrink-0 rounded-full bg-[#6d4cff] px-3 py-1.5 text-xs font-bold text-white"
              >
                View Cart
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
      {!isMobileLegends || activeMobileView === "buy" ? (
        <MobileCheckoutBar selectedPackage={selectedPackage} selectedPayment={selectedPayment} totalLabel={paymentTotalLabel} onPay={handleReview} onAddToCart={handleAddToCart} isSubmitting={isSubmitting} mobileLegends={isMobileLegends} />
      ) : null}
    </div>
  );
};

export default GamePage;
