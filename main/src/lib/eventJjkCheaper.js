import { fetchJsonSetting } from "./storeContent";

export const JJK_CHEAPER_COLUMN = "event_jjk_cheaper_settings";
export const JJK_CHEAPER_PATH = "/event/jjk-cheaper";

export const DEFAULT_JJK_CHEAPER = {
  status: "draft",
  slug: "jjk-cheaper",
  seo: {
    title: "MLBB x Jujutsu Kaisen Cheaper Route Guide | PixieKat",
    description:
      "PixieKat cheaper-route guide for the MLBB x Jujutsu Kaisen event — phases, draws, and spend ceiling.",
  },
  visibleSections: {
    nav: true,
    hero: true,
    showcase: true,
    story: true,
    route: true,
    breakdown: true,
    faq: true,
    cta: true,
  },
  placement: {
    homepage_banner: false,
    games_page: false,
    navbar: false,
    direct_url_only: true,
    promo_title: "Jujutsu Kaisen - Cheaper Guide",
    promo_image: "/img/games/mobile-legends.webp",
  },
  nav: {
    file_code: "PK / FILE 081",
    archive_label: "Cursed Archive",
    store_label: "Exit archive →",
    links: [
      { id: "jjk-event-guide", label: "Cover", href: "#jjk-event-guide" },
      { id: "jjk-phase-story", label: "Phase Story", href: "#jjk-phase-story" },
      { id: "jjk-route-planner", label: "Mission Log", href: "#jjk-route-planner" },
      { id: "jjk-costs", label: "Cost File", href: "#jjk-costs" },
      { id: "jjk-faq", label: "Warning", href: "#jjk-faq" },
    ],
  },
  hero: {
    collab_mark: "MLBB × JUJUTSU KAISEN",
    eyebrow: "PixieKat mission archive / classified route",
    title_line1: "Cursed",
    title_line2: "Jujutsu Kaisen",
    summary: "121 draws. Maximum 2,100D.",
    primary_cta: "Open mission log",
    primary_href: "#jjk-route-planner",
    secondary_cta: "Recharge",
    secondary_href: "/games",
    date_range_label: "August 7 - September 5, 2026",
    start_iso: "2026-08-07",
    end_iso: "2026-09-05",
    window_label: "Operation window",
  },
  skins: [
    {
      id: "yuji",
      hero: "Yin",
      sorcerer: "Yuji Itadori",
      accent: "#ff3b5c",
      portrait: "",
      thumbnail: "",
      imagePosition: "50% 36%",
    },
    {
      id: "gojo",
      hero: "Xavier",
      sorcerer: "Satoru Gojo",
      accent: "#3ec6ee",
      portrait: "",
      thumbnail: "",
      imagePosition: "50% 34%",
    },
    {
      id: "megumi",
      hero: "Julian",
      sorcerer: "Megumi Fushiguro",
      accent: "#7a4cff",
      portrait: "",
      thumbnail: "",
      imagePosition: "50% 36%",
    },
    {
      id: "nobara",
      hero: "Melissa",
      sorcerer: "Nobara Kugisaki",
      accent: "#ef3340",
      portrait: "",
      thumbnail: "",
      imagePosition: "50% 32%",
    },
  ],
  stats: [
    { label: "Daily draw", value: "25D", helper: "50% off the regular 50D single draw" },
    { label: "10× draw", value: "450D", helper: "Three planned bundles across the full route" },
    { label: "Route draws", value: "121", helper: "Ceiling for the cheaper path" },
    { label: "Max spend", value: "2,100D", helper: "Stop earlier if the skin drops" },
  ],
  phases: [
    {
      id: "preparation",
      label: "Phase 01 / Preparation",
      title: "Open the barrier",
      dateLabel: "Aug 7-17",
      summary: "Stack the Weekly Passes. Use only the discounted singles. Save the burst.",
      checkpoint: "13 draws ready",
      cumulativeDraws: 13,
      targetId: "yuji",
    },
    {
      id: "premium-supply-one",
      label: "Phase 02 / Premium Supply I",
      title: "Release the first domain",
      dateLabel: "Aug 18",
      summary: "Daily draw, discounted 10x, then every Phase 1 token. One clean burst.",
      checkpoint: "54 draws secured",
      cumulativeDraws: 54,
      targetId: "gojo",
    },
    {
      id: "black-flash",
      label: "Phase 03 / Black Flash",
      title: "Hold the cursed energy",
      dateLabel: "Aug 19-24",
      summary: "Return to daily singles. Complete the second recharge without overspending.",
      checkpoint: "60 draw milestone",
      cumulativeDraws: 60,
      targetId: "megumi",
    },
    {
      id: "premium-supply-two",
      label: "Phase 04 / Premium Supply II",
      title: "Strike the second burst",
      dateLabel: "Aug 25",
      summary: "Use the second discounted 10x and all 29 Phase 2 tokens in one move.",
      checkpoint: "100 draws reached",
      cumulativeDraws: 100,
      targetId: "nobara",
    },
    {
      id: "final-domain",
      label: "Phase 05 / Final Domain",
      title: "Finish only if needed",
      dateLabel: "Aug 26-Sep 5",
      summary: "Ten daily singles. Use the last 10x only if the skin has not dropped.",
      checkpoint: "121 draw ceiling",
      cumulativeDraws: 121,
      targetId: "yuji",
    },
  ],
  routeSteps: [
    {
      id: "aug-07-setup",
      dateLabel: "Aug 7",
      title: "Open the Domain",
      kicker: "Start with passes",
      action:
        "Recharge 3 Weekly Diamond Passes, claim 2 Cursed Charm Tokens from Recharge Rebate, use both tokens, then take the discounted daily draw.",
      diamonds: "25D draw",
      tokens: "2 rebate tokens",
      recharge: "3 Weekly Passes",
      cumulativeDraws: 3,
    },
    {
      id: "aug-08-13-daily",
      dateLabel: "Aug 8-13",
      title: "Daily Technique",
      kicker: "No extra draws",
      action:
        "Use only the first discounted single draw each day. Enter Premium Supply Phase 1 at 9 total draws.",
      diamonds: "6 × 25D",
      tokens: "",
      recharge: "",
      cumulativeDraws: 9,
    },
    {
      id: "aug-14-phase-one",
      dateLabel: "Aug 14",
      title: "Phase 1 Recharge",
      kicker: "Prepare the burst",
      action:
        "Recharge 4 Weekly Diamond Passes, complete the recharge tasks, and take the discounted daily draw.",
      diamonds: "25D",
      tokens: "Hold Phase 1 tokens",
      recharge: "4 Weekly Passes",
      cumulativeDraws: 10,
    },
    {
      id: "aug-18-phase-one-burst",
      dateLabel: "Aug 18",
      title: "Phase 1: Domain Burst",
      kicker: "First major push",
      action:
        "Take the daily draw, use one discounted 10x, finish the spend tasks, then claim and use all 29 Phase 1 tokens plus the 20-draw milestone token.",
      diamonds: "25D + 450D",
      tokens: "29 supply + 1 milestone",
      recharge: "",
      cumulativeDraws: 54,
    },
    {
      id: "aug-25-phase-two-burst",
      dateLabel: "Aug 25",
      title: "Phase 2: Black Flash",
      kicker: "Second major push",
      action:
        "Take the daily draw, use one discounted 10x, complete the spend tasks, then claim and use all 29 Phase 2 tokens.",
      diamonds: "25D + 450D",
      tokens: "29 supply tokens",
      recharge: "",
      cumulativeDraws: 100,
    },
    {
      id: "sep-05-finish",
      dateLabel: "Sep 5",
      title: "Unlimited Void Finish",
      kicker: "Stop if the skin drops",
      action:
        "Recharge 500 Diamonds, take the final discounted daily draw, then use the last discounted 10x only if you still need Crests.",
      diamonds: "500D + 25D + 450D",
      tokens: "",
      recharge: "500 Diamonds",
      cumulativeDraws: 121,
    },
  ],
  breakdown: {
    heading: "Cost File",
    equation_label: "Cheaper route ceiling",
    equation: "Daily singles + 3× discounted 10x + planned recharges",
    total_label: "Maximum spend",
    total_value: "2,100D",
    rules: [
      { label: "First draw each day", helper: "50% off the regular 50D single draw" },
      { label: "Discounted 10x", helper: "Three planned bundles across the full route" },
      {
        label: "Skin exchange target",
        helper: "Crests are drop-dependent, not guaranteed by 121 draws",
      },
    ],
    milestones: [
      { draws: 10, reward: "1 permanent collaboration reward", includedInRoute: true },
      { draws: 20, reward: "1 Cursed Charm Token", includedInRoute: true },
      { draws: 60, reward: "1 Magic Wheel Potion", includedInRoute: true },
      { draws: 130, reward: "10 Cursed Charm Tokens", includedInRoute: false },
      { draws: 160, reward: "100 JJK Crests", includedInRoute: false },
      { draws: 190, reward: "180 JJK Crests", includedInRoute: false },
    ],
    safety_title: "Stop rule",
    safety_body:
      "If the collaboration skin drops before the ceiling, stop spending. This guide is a spend ceiling, not a guarantee.",
  },
  faq: {
    heading: "Warning / FAQ",
    items: [
      {
        q: "Is 121 draws a guarantee?",
        a: "No. Crests and skin exchange rates are drop-dependent. 121 is the planned cheaper ceiling.",
      },
      {
        q: "Should I buy extra draws early?",
        a: "No. Save burst spending for Premium Supply windows and discounted 10x slots only.",
      },
      {
        q: "When should I top up on PixieKat?",
        a: "Before each recharge / Premium Supply checkpoint so diamonds are ready for the planned burst.",
      },
    ],
  },
  cta: {
    heading: "Ready to run the route?",
    body: "Top up diamonds on PixieKat before each phase burst so the cheaper path stays on schedule.",
    button_label: "Top up MLBB diamonds",
    button_href: "/games",
  },
};

function asObject(value, fallback = {}) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
}

function asArray(value, fallback = []) {
  return Array.isArray(value) && value.length ? value : fallback;
}

export function mergeJjkCheaperSettings(raw) {
  const source = asObject(raw);
  return {
    ...DEFAULT_JJK_CHEAPER,
    ...source,
    seo: { ...DEFAULT_JJK_CHEAPER.seo, ...asObject(source.seo) },
    visibleSections: {
      ...DEFAULT_JJK_CHEAPER.visibleSections,
      ...asObject(source.visibleSections),
    },
    placement: {
      ...DEFAULT_JJK_CHEAPER.placement,
      ...asObject(source.placement),
    },
    nav: {
      ...DEFAULT_JJK_CHEAPER.nav,
      ...asObject(source.nav),
      links: asArray(source.nav?.links, DEFAULT_JJK_CHEAPER.nav.links),
    },
    hero: { ...DEFAULT_JJK_CHEAPER.hero, ...asObject(source.hero) },
    skins: asArray(source.skins, DEFAULT_JJK_CHEAPER.skins),
    stats: asArray(source.stats, DEFAULT_JJK_CHEAPER.stats),
    phases: asArray(source.phases, DEFAULT_JJK_CHEAPER.phases),
    routeSteps: asArray(source.routeSteps, DEFAULT_JJK_CHEAPER.routeSteps),
    breakdown: {
      ...DEFAULT_JJK_CHEAPER.breakdown,
      ...asObject(source.breakdown),
      rules: asArray(source.breakdown?.rules, DEFAULT_JJK_CHEAPER.breakdown.rules),
      milestones: asArray(
        source.breakdown?.milestones,
        DEFAULT_JJK_CHEAPER.breakdown.milestones
      ),
    },
    faq: {
      ...DEFAULT_JJK_CHEAPER.faq,
      ...asObject(source.faq),
      items: asArray(source.faq?.items, DEFAULT_JJK_CHEAPER.faq.items),
    },
    cta: { ...DEFAULT_JJK_CHEAPER.cta, ...asObject(source.cta) },
  };
}

export function isJjkCheaperPublished(settings) {
  return settings?.status === "published";
}

export function sectionVisible(settings, key) {
  return settings?.visibleSections?.[key] !== false;
}

export async function fetchJjkCheaperSettings() {
  const raw = await fetchJsonSetting(JJK_CHEAPER_COLUMN, DEFAULT_JJK_CHEAPER);
  return mergeJjkCheaperSettings(raw);
}
