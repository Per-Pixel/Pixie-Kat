import { supabase } from "./supabase";

export const DEFAULT_HOW_IT_WORKS = {
  headings: {
    title_before: "How it ",
    title_highlight: "works?",
    subtitle:
      "Top up your favorite games instantly, securely, and at the best prices — from start to finish.",
    features_title_before: "Why choose ",
    features_title_highlight: "PixieKat",
    features_title_after: "?",
  },
  banner: {
    title_before: "What is ",
    title_highlight: "PixieKat",
    title_after: "?",
    body:
      "PixieKat is your trusted, instant game top-up platform. We deliver in-game credits, diamonds, and currency directly to your account — no login required, no delays. Just fast and secure top-ups every single time.",
    video_title_before: "How ",
    video_title_highlight: "PixieKat",
    video_title_after: " works",
  },
  video_url: "",
  cta: {
    title: "Ready to top up?",
    body:
      "Join thousands of gamers who trust PixieKat for fast, secure top-ups every time.",
    primary_label: "Browse Games",
    secondary_label: "View Pricing",
  },
  prefooter_cta: {
    title_line1: "Stop waiting.",
    title_line2: "Start playing.",
    body:
      "Top up your favorite game in under 5 minutes — no account sharing, no delays, just instant delivery straight to your account.",
    button_label: "Top Up Now",
  },
  steps: [
    {
      id: 1,
      title: "Pick Your Game",
      icon: "🎮",
      description: "Browse 50+ supported titles and select the game you want to top up.",
      details: [
        "MLBB, PUBG, Free Fire & more",
        "New titles added every week",
        "All officially supported games",
        "Search or filter by category",
      ],
      image: "🎯",
    },
    {
      id: 2,
      title: "Choose Package",
      icon: "💎",
      description:
        "Select a top-up amount — from starter packs to premium bundles at the best prices.",
      details: [
        "Flexible denomination options",
        "Bonus rewards on select packages",
        "Member-exclusive discounts",
        "Zero hidden fees, always",
      ],
      image: "💰",
    },
    {
      id: 3,
      title: "Enter Game Details",
      icon: "📝",
      description: "Type in your Game ID and server. We guide you every step of the way.",
      details: [
        "Enter your Game ID / User ID",
        "Select server if required",
        "We help you locate your ID",
        "Details verified before processing",
      ],
      image: "🔍",
    },
    {
      id: 4,
      title: "Secure Checkout",
      icon: "💳",
      description:
        "Pay using your preferred method. Every transaction is SSL-encrypted and safe.",
      details: [
        "UPI, Cards, Net Banking & Wallets",
        "SSL-encrypted checkout",
        "Instant payment confirmation",
        "No data stored after purchase",
      ],
      image: "🔒",
    },
    {
      id: 5,
      title: "Instant Delivery",
      icon: "⚡",
      description:
        "Credits land in your game account within minutes. No waiting, no hassle.",
      details: [
        "Average delivery: 2–5 minutes",
        "Real-time order tracking",
        "24/7 support if needed",
        "99.9% successful delivery rate",
      ],
      image: "🎉",
    },
  ],
  features: [
    {
      icon: "⚡",
      title: "Instant Delivery",
      description: "Most orders fulfilled within 2–5 minutes, guaranteed.",
    },
    {
      icon: "🛡️",
      title: "100% Secure",
      description: "Bank-grade SSL encryption on every single transaction.",
    },
    {
      icon: "💰",
      title: "Best Prices",
      description: "Competitive rates and exclusive member-only deals.",
    },
    {
      icon: "🎯",
      title: "99.9% Success Rate",
      description: "Industry-leading delivery success across all games.",
    },
    {
      icon: "📱",
      title: "24/7 Support",
      description: "Real humans ready to help you around the clock.",
    },
    {
      icon: "🎁",
      title: "Bonus Rewards",
      description: "Earn extra credits and gifts with every purchase.",
    },
  ],
  stats: [
    { value: "5,000+", label: "Happy Gamers" },
    { value: "50+", label: "Games Supported" },
    { value: "99.9%", label: "Success Rate" },
    { value: "~2 Min", label: "Avg. Delivery" },
  ],
};

export const DEFAULT_FAQ = {
  headings: {
    title_before: "Frequently Asked ",
    title_highlight: "Questions",
    subtitle:
      "Find answers to common questions about PixieKat's services, payments, and support",
  },
  categories: [
    {
      title: "Payment & Billing",
      icon: "💳",
      questions: [
        {
          question: "What payment methods do you accept?",
          answer:
            "We accept all major payment methods including UPI (PhonePe, Google Pay, Paytm), Credit/Debit Cards (Visa, Mastercard, RuPay), Net Banking, and Digital Wallets. All payments are processed securely through our certified payment partners.",
        },
        {
          question: "Is my payment information secure?",
          answer:
            "Absolutely! We use industry-standard SSL encryption and PCI DSS compliant payment gateways. We never store your card details on our servers. All transactions are processed through secure, encrypted channels.",
        },
        {
          question: "Can I get a refund if I made a wrong purchase?",
          answer:
            "Refunds are processed on a case-by-case basis. If the top-up was not delivered to your game account within 24 hours, we offer a full refund. For wrong purchases, please contact our support team within 2 hours of purchase for assistance.",
        },
        {
          question: "Do you charge any additional fees?",
          answer:
            "No hidden charges! The price you see is the final price you pay. However, your bank or payment provider may charge transaction fees, which are beyond our control.",
        },
      ],
    },
    {
      title: "Delivery & Processing",
      icon: "⚡",
      questions: [
        {
          question: "How long does delivery take?",
          answer:
            "Most top-ups are delivered instantly within 2-5 minutes. During peak hours or maintenance periods, it may take up to 30 minutes. We guarantee delivery within 24 hours or provide a full refund.",
        },
        {
          question: "What information do I need to provide?",
          answer:
            "You only need your Game ID/User ID and Server (if applicable). Make sure to double-check these details before confirming your purchase, as incorrect information may delay delivery.",
        },
        {
          question: "Can I track my order status?",
          answer:
            "Yes! After purchase, you'll receive an order confirmation with a tracking ID. You can check your order status in real-time through our website or by contacting our support team.",
        },
        {
          question: "What if I don't receive my top-up?",
          answer:
            "If you don't receive your top-up within the expected timeframe, please contact our 24/7 support team with your order ID. We'll investigate and resolve the issue immediately or provide a full refund.",
        },
      ],
    },
    {
      title: "Account & Membership",
      icon: "👤",
      questions: [
        {
          question: "Do I need to create an account to make a purchase?",
          answer:
            "While you can make guest purchases, creating an account gives you access to order history, faster checkout, exclusive member deals, and our loyalty rewards program.",
        },
        {
          question: "What are the benefits of premium membership?",
          answer:
            "Premium members get extra bonuses on all purchases (5-15% depending on tier), priority customer support, exclusive deals, early access to new games, and higher monthly top-up limits.",
        },
        {
          question: "How do I upgrade my membership?",
          answer:
            "You can upgrade your membership anytime from your account dashboard. Choose your preferred plan and payment cycle. Upgrades take effect immediately, and you'll start enjoying the benefits right away.",
        },
        {
          question: "Can I cancel my membership?",
          answer:
            "Yes, you can cancel your membership anytime. Your benefits will remain active until the end of your current billing cycle. No cancellation fees apply.",
        },
      ],
    },
    {
      title: "Games & Support",
      icon: "🎮",
      questions: [
        {
          question: "Which games do you support?",
          answer:
            "We support all major mobile games including Mobile Legends: Bang Bang, PUBG Mobile, Free Fire, Genshin Impact, Call of Duty Mobile, Clash of Clans, and many more. New games are added regularly.",
        },
        {
          question: "Do you offer customer support?",
          answer:
            "Yes! We provide 24/7 customer support through WhatsApp, Instagram, and our website chat. Premium members get priority support with faster response times.",
        },
        {
          question: "Is PixieKat safe and legitimate?",
          answer:
            "Absolutely! We're a registered business with over 5000+ successful orders. We're authorized resellers for all supported games and maintain the highest security standards for all transactions.",
        },
        {
          question: "How do you offer better prices than competitors?",
          answer:
            "We maintain direct partnerships with game publishers and buy in bulk, allowing us to offer competitive prices. Our efficient operations and lower overhead costs enable us to pass savings to our customers.",
        },
      ],
    },
  ],
  banner: {
    title_before: "Still have ",
    title_highlight: "questions?",
    body:
      "Our support team is available 24/7 to help you with any questions or concerns. Whether it's about payments, deliveries, or your account — we're here for you.",
  },
  prefooter_cta: {
    title_line1: "Get answers.",
    title_line2: "Play faster.",
    body:
      "Browse our FAQ or reach out anytime — our team is ready to help you top up without any hassle.",
    button_label: "Browse Games",
  },
  contact_support_path: "/support/get-support",
};

export const DEFAULT_CONTACT = {
  support_email: "support@pixiekat.com",
  support_phone: "",
  business_email: "business@pixiekat.com",
  whatsapp: "",
  phone_display: "",
  phone_hours: "Mon–Sat, 10am–7pm IST",
  hours_primary: "Mon – Sat: 10am – 7pm",
  hours_secondary: "Sunday: Closed",
  office_lines: [
    "Pixiekat HQ",
    "123 Gaming Street, Tech Park",
    "Bangalore, Karnataka 560001",
    "India",
  ],
  map_embed_url: "",
  whatsapp_message: "Hi PixieKat support!",
};

export const DEFAULT_PRODUCTS_PAGE = {
  slides: [
    {
      id: 1,
      title: "PIXIEKAT STORE",
      subtitle: "Official Gaming Platform",
      description:
        "PIXIEKAT STORE is a practical solution for every game lover to buy game vouchers without having to go to a physical store.",
      cta: "WWW.PIXIEKATSTORE.COM",
      bgGradient: "from-blue-700 via-violet-700 to-indigo-900",
      image: "/img/hero/game-hero-card.gif",
    },
    {
      id: 2,
      title: "MOBILE LEGENDS",
      subtitle: "Top Up Diamonds",
      description:
        "Get instant diamonds for Mobile Legends. Fast, secure, and reliable top-up service with 24/7 support.",
      cta: "TOP UP NOW",
      bgGradient: "from-indigo-700 via-fuchsia-700 to-violet-900",
      image: "/img/hero/game-mlbb-card.webp",
    },
    {
      id: 3,
      title: "PUBG GLOBAL",
      subtitle: "UC Coins Available",
      description:
        "Purchase UC coins for PUBG Mobile Global. Instant delivery and competitive prices guaranteed.",
      cta: "BUY UC COINS",
      bgGradient: "from-orange-600 via-rose-700 to-red-900",
      image: "/img/hero/game-pubg-card.webp",
    },
    {
      id: 4,
      title: "GENSHIN IMPACT",
      subtitle: "Genesis Crystals",
      description:
        "Top up Genesis Crystals for Genshin Impact. Safe transactions with instant delivery to your account.",
      cta: "GET CRYSTALS",
      bgGradient: "from-cyan-700 via-sky-700 to-indigo-900",
      image: "/img/hero/game-genshin-card.webp",
    },
  ],
};

export const DEFAULT_APPEARANCE = {
  favicon_url: "",
  icon_url: "",
  logo_url: "/img/logo.png",
  header_brand_text: "PixieKat",
  tab_title_active: "PixieKat",
  tab_title_inactive: "Come back to PixieKat!",
  music_url: "/audio/loop.mp3",
  music_playback_rate: 1,
  music_volume: 0.5,
};

export function mergeProductsPageSettings(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PRODUCTS_PAGE };
  const slides = Array.isArray(raw.slides) && raw.slides.length > 0
    ? raw.slides.map((s, i) => ({
        id: typeof s?.id === "number" ? s.id : i + 1,
        title: s?.title || "",
        subtitle: s?.subtitle || "",
        description: s?.description || "",
        cta: s?.cta || "",
        bgGradient: s?.bgGradient || "from-blue-700 via-violet-700 to-indigo-900",
        image: s?.image || "",
      }))
    : DEFAULT_PRODUCTS_PAGE.slides;
  return { slides };
}

export function mergeAppearanceSettings(raw) {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_APPEARANCE };
  const rate = Number(raw.music_playback_rate);
  const volume = Number(raw.music_volume);
  return {
    ...DEFAULT_APPEARANCE,
    ...raw,
    music_playback_rate: Number.isFinite(rate) ? Math.min(2, Math.max(0.5, rate)) : 1,
    music_volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 0.5,
  };
}

export async function fetchProductsPageSettings() {
  const raw = await fetchJsonSetting("products_page_settings", {});
  return mergeProductsPageSettings(raw);
}

export async function fetchAppearanceSettings() {
  const raw = await fetchJsonSetting("appearance_settings", {});
  return mergeAppearanceSettings(raw);
}

export function buildWhatsAppUrl(whatsapp, message = DEFAULT_CONTACT.whatsapp_message) {
  const digits = String(whatsapp || "").replace(/\D/g, "");
  if (!digits) return "/support/contact-us";
  const text = encodeURIComponent(message || "");
  return `https://wa.me/${digits}${text ? `?text=${text}` : ""}`;
}

export function mergeContactSettings(row) {
  const cs = row?.contact_settings && typeof row.contact_settings === "object"
    ? row.contact_settings
    : {};
  const officeLines = Array.isArray(cs.office_lines)
    ? cs.office_lines
    : typeof cs.office_lines === "string"
      ? cs.office_lines.split("\n").map((line) => line.trim()).filter(Boolean)
      : DEFAULT_CONTACT.office_lines;

  return {
    ...DEFAULT_CONTACT,
    ...cs,
    support_email: row?.support_email || cs.support_email || DEFAULT_CONTACT.support_email,
    support_phone: row?.support_phone || cs.support_phone || DEFAULT_CONTACT.support_phone,
    phone_display:
      cs.phone_display ||
      row?.support_phone ||
      DEFAULT_CONTACT.phone_display,
    whatsapp: cs.whatsapp || String(row?.support_phone || "").replace(/\D/g, "") || "",
    office_lines: officeLines.length ? officeLines : DEFAULT_CONTACT.office_lines,
  };
}

export async function fetchContactSettings() {
  const { data, error } = await supabase
    .from("store_settings")
    .select("support_email, support_phone, contact_settings")
    .maybeSingle();

  if (error) {
    console.error("Failed to load contact settings:", error.message);
    return { ...DEFAULT_CONTACT };
  }

  return mergeContactSettings(data);
}

export async function fetchJsonSetting(column, fallback) {
  const { data, error } = await supabase
    .from("store_settings")
    .select(column)
    .maybeSingle();

  if (error) {
    console.error(`Failed to load ${column}:`, error.message);
    return fallback;
  }

  const value = data?.[column];
  if (value && typeof value === "object" && Object.keys(value).length > 0) {
    return { ...fallback, ...value };
  }

  return fallback;
}
