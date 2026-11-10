export const CREST_TARGET = 1600;
export const DRAW_START = "2026-11-06";
export const DRAW_END = "2026-12-06";
export const SHOP_END = "2026-12-08";
export const FULL_PRICE = 100;

export const LUCKS = [
  {
    id: "low",
    rate: 11,
    name: "Low",
    detail: "A thin run. Use this if the first draws look poor.",
  },
  {
    id: "plan",
    rate: 13,
    name: "Plan",
    detail: "The working rate for every total on this page, until you type your own Crests.",
  },
  {
    id: "high",
    rate: 15,
    name: "High",
    detail: "A kinder run. Still a guess. The shop does not promise a rate.",
  },
];

export const TRICK_LIST = [
  {
    id: "recharge",
    label: "Daily recharge tokens",
    detail: "Recharge 100 on 8 different days from Nov 6 to Nov 14. The preview pays 6 tokens.",
    count: 6,
    costEach: 0,
  },
  {
    id: "supply1",
    label: "Premium Supply, phase 1",
    detail: "Nov 13–17. Recharge 500 and spend 500, then claim 18 tokens.",
    count: 18,
    costEach: 0,
  },
  {
    id: "supply2",
    label: "Premium Supply, phase 2",
    detail: "Nov 20–24. The same recharge and spend, then 18 more tokens.",
    count: 18,
    costEach: 0,
  },
  {
    id: "mega",
    label: "Mega bundles",
    detail: "Two tokens, once in the event: one for 10 Diamonds and one for 49.",
    bundle: [10, 49],
  },
  {
    id: "daily",
    label: "Half-price daily draw",
    detail: "The first single draw each day is 50 Diamonds instead of 100.",
    count: 31,
    costEach: 50,
  },
  {
    id: "first10",
    label: "First 10× at half price",
    detail: "The first 10× bundle is 500 Diamonds instead of 1,000. Once.",
    count: 10,
    costEach: 50,
  },
];

export const DEFAULT_TRICKS = Object.fromEntries(TRICK_LIST.map((trick) => [trick.id, true]));

const RECHARGE_DATES = [
  "2026-11-06",
  "2026-11-07",
  "2026-11-08",
  "2026-11-09",
  "2026-11-10",
  "2026-11-11",
  "2026-11-12",
  "2026-11-14",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const WAYPOINTS = [
  [14, 68],
  [88, 68],
  [88, 48],
  [14, 48],
  [14, 28],
  [88, 28],
  [88, 10],
  [14, 10],
];

function task(id, text, extra = {}) {
  return { id, text, diamonds: 0, draws: 0, topup: 0, watch: false, ...extra };
}

export function addDays(iso, days) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

export function formatDay(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return `${WEEKDAYS[date.getUTCDay()]}, ${MONTHS[month - 1]} ${day}`;
}

export function shortDay(iso) {
  const [, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}`;
}

export function todayIso(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function daysLeftToDraw(today = todayIso()) {
  if (today > DRAW_END) return 0;
  if (today < DRAW_START) return 31;
  const start = Date.parse(`${today}T00:00:00Z`);
  const end = Date.parse(`${DRAW_END}T00:00:00Z`);
  return Math.round((end - start) / 86400000) + 1;
}

export function formatCount(value) {
  return Math.round(Number(value) || 0).toLocaleString("en-US");
}

export function taskKey(dayId, taskId) {
  return `${dayId}:${taskId}`;
}

function tasksFor(iso) {
  const tasks = [];
  const rechargeIndex = RECHARGE_DATES.indexOf(iso);

  if (iso === "2026-11-06") {
    tasks.push(
      task("mega-10", "Buy the 10 Diamond Mega bundle and use that token.", { diamonds: 10, draws: 1 }),
      task("mega-49", "Buy the 49 Diamond Mega bundle and use that token.", { diamonds: 49, draws: 1 })
    );
  }

  if (rechargeIndex >= 0) {
    tasks.push(
      task(
        "recharge",
        `Recharge 100 Diamonds today (${rechargeIndex + 1} of 8). It counts toward the 6 recharge tokens.`,
        { topup: 100 }
      )
    );
  }

  if (iso === "2026-11-13") {
    tasks.push(
      task(
        "supply-open",
        "Recharge 500 to open Premium Supply phase 1. Spend 500 on draws before Nov 17, and stop when the spend task clears.",
        { topup: 500 }
      )
    );
  }

  if (iso === "2026-11-20") {
    tasks.push(
      task(
        "supply-open-2",
        "Recharge 500 to open Premium Supply phase 2. The half-price 10× below can cover the spend task if the game counts it.",
        { topup: 500 }
      )
    );
  }

  tasks.push(
    task("daily", "Take the first single draw for 50 Diamonds. Pay with Diamonds, not a token.", {
      diamonds: 50,
      draws: 1,
    })
  );

  if (iso === "2026-11-10") {
    tasks.push(
      task(
        "deadline",
        "Mega bundles and the main Promo Diamond tasks end today. Catch-up for promo tasks runs Nov 11–17.",
        { watch: true }
      )
    );
  }

  if (iso === "2026-11-14") {
    tasks.push(
      task("recharge-tokens", "Claim the 6 recharge tokens and use them on draws other than the daily.", {
        draws: 6,
      })
    );
  }

  if (iso === "2026-11-17") {
    tasks.push(
      task(
        "supply-tokens",
        "Claim the 18 phase 1 tokens and use them. If the spend task is still short, buy draws until it clears, then stop.",
        { draws: 18, watch: true }
      )
    );
  }

  if (iso === "2026-11-20") {
    tasks.push(
      task("first-10", "Buy the first 10× for 500 Diamonds. This discount happens once.", {
        diamonds: 500,
        draws: 10,
      })
    );
  }

  if (iso === "2026-11-24") {
    tasks.push(
      task(
        "supply-tokens-2",
        "Claim the 18 phase 2 tokens and use them. If the spend task is still short, buy draws until it clears, then stop.",
        { draws: 18, watch: true }
      )
    );
  }

  if (iso === "2026-12-06") {
    tasks.push(
      task(
        "last-draw",
        "Last day to draw. Buy full-price draws only if you are still short of 1,600 Crests, and stop the moment the shop can clear.",
        { watch: true }
      )
    );
  }

  return tasks;
}

const BIG_DAYS = {
  "2026-11-06": "Open",
  "2026-11-13": "Supply",
  "2026-11-20": "Supply",
  "2026-12-06": "Last day",
};

export function buildDays() {
  return Array.from({ length: 31 }, (_, index) => {
    const iso = addDays(DRAW_START, index);
    const tasks = tasksFor(iso);
    return {
      id: iso,
      iso,
      number: index + 1,
      label: formatDay(iso),
      shortLabel: shortDay(iso),
      big: BIG_DAYS[iso] || "",
      tasks,
      diamonds: tasks.reduce((sum, item) => sum + item.diamonds, 0),
      draws: tasks.reduce((sum, item) => sum + item.draws, 0),
      topup: tasks.reduce((sum, item) => sum + item.topup, 0),
    };
  });
}

export const PREP_DAY = {
  id: "prep",
  kicker: "Before Nov 6",
  title: "Get ready",
  label: "Before the first draw",
  shortLabel: "Ready",
  tasks: [
    task("promo", "Finish the Promo Diamond tasks. They end Nov 10. Catch-up runs Nov 11–17."),
    task(
      "wallet",
      "Day 1 is 109 Diamonds if you buy both Mega bundles and the half-price draw. Keep a 100 recharge ready the same day."
    ),
    task("traps", "Read the traps on this page once. They are real buttons on the event screen.", { watch: true }),
  ],
};

export const SHOP_DAY = {
  id: "shop",
  kicker: "Dec 7–8",
  title: "Open the shop",
  label: "Exchange window",
  shortLabel: "Shop",
  tasks: [
    task("exchange", "Swap 1,600 Crests for the Legend skin. The shop closes Dec 8."),
    task("leftover", "Spend or lose whatever is left. Crests do not stay after the shop closes.", { watch: true }),
  ],
};

export function initialSelection(days, today = todayIso()) {
  if (today < DRAW_START) return PREP_DAY.id;
  if (today > DRAW_END) return SHOP_DAY.id;
  return days.find((day) => day.id === today)?.id || PREP_DAY.id;
}

export function pathPoints(count = 31) {
  const segments = [];
  let total = 0;
  for (let index = 1; index < WAYPOINTS.length; index += 1) {
    const from = WAYPOINTS[index - 1];
    const to = WAYPOINTS[index];
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    segments.push({ from, to, length, start: total });
    total += length;
  }

  return Array.from({ length: count }, (_, index) => {
    const distance = count === 1 ? 0 : (total * index) / (count - 1);
    const segment =
      segments.find((item, itemIndex) => distance <= item.start + item.length || itemIndex === segments.length - 1) ||
      segments[0];
    const t = segment.length === 0 ? 0 : (distance - segment.start) / segment.length;
    return {
      x: segment.from[0] + (segment.to[0] - segment.from[0]) * t,
      y: segment.from[1] + (segment.to[1] - segment.from[1]) * t,
    };
  });
}

export function pathLine() {
  return `M ${WAYPOINTS.map((point) => point.join(" ")).join(" L ")}`;
}

function normalizeLuck(rate) {
  const value = Number(rate);
  if (!Number.isFinite(value) || value <= 0) return 13;
  return value;
}

function takeDraws(state, count, costEach) {
  if (count <= 0 || state.need <= 0) return 0;
  const draws = Math.min(count, Math.ceil(state.need / state.luck));
  state.need -= draws * state.luck;
  state.draws += draws;
  state.cost += draws * costEach;
  return draws;
}

export function buildBill({ luck = 13, promo = 0, enabled, counts = {} }) {
  const rate = normalizeLuck(luck);
  const state = { need: CREST_TARGET, draws: 0, cost: 0, luck: rate };
  const lines = [];

  TRICK_LIST.forEach((trick) => {
    if (!enabled.has(trick.id)) return;

    if (trick.bundle) {
      let draws = 0;
      let diamonds = 0;
      trick.bundle.forEach((price) => {
        const got = takeDraws(state, 1, price);
        if (!got) return;
        draws += got;
        diamonds += price;
      });
      if (draws) lines.push({ id: trick.id, label: trick.label, draws, diamonds });
      return;
    }

    const count = trick.id === "daily" ? (counts.daily ?? trick.count) : trick.count;
    const drawsBefore = state.draws;
    const costBefore = state.cost;
    takeDraws(state, count, trick.costEach);
    const draws = state.draws - drawsBefore;
    if (draws) {
      lines.push({
        id: trick.id,
        label: trick.label,
        draws,
        diamonds: state.cost - costBefore,
      });
    }
  });

  const drawsBefore = state.draws;
  const costBefore = state.cost;
  takeDraws(state, 100000, FULL_PRICE);
  const gapDraws = state.draws - drawsBefore;
  if (gapDraws) {
    lines.push({
      id: "gap",
      label: "Full price, only while short",
      draws: gapDraws,
      diamonds: state.cost - costBefore,
    });
  }

  const promoUsed = Math.min(Math.max(0, Math.floor(Number(promo) || 0)), state.cost);
  const naiveDraws = Math.ceil(CREST_TARGET / rate);
  const naive = naiveDraws * FULL_PRICE;
  const total = state.cost - promoUsed;

  return {
    lines,
    draws: state.draws,
    total,
    naive,
    saved: naive - total,
    promoUsed,
    luck: rate,
    naiveDraws,
  };
}

export function spreadBill({ luck = 13, promo = 0, tricks = DEFAULT_TRICKS } = {}) {
  return buildBill({
    luck,
    promo,
    enabled: new Set(TRICK_LIST.filter((trick) => tricks[trick.id] !== false).map((trick) => trick.id)),
    counts: { daily: 31 },
  });
}

export function rushBill({ luck = 13, promo = 0 } = {}) {
  return buildBill({
    luck,
    promo,
    enabled: new Set(["mega", "daily", "first10"]),
    counts: { daily: 7 },
  });
}

export function trickDeltas({ luck = 13, promo = 0, tricks = DEFAULT_TRICKS } = {}) {
  const base = spreadBill({ luck, promo, tricks });
  return TRICK_LIST.map((trick) => {
    const next = { ...tricks, [trick.id]: !tricks[trick.id] };
    const alt = spreadBill({ luck, promo, tricks: next });
    return {
      ...trick,
      on: tricks[trick.id] !== false,
      delta: alt.total - base.total,
    };
  });
}

export const TRAPS = [
  {
    id: "daily-token",
    prompt: "Today’s half-price draw is ready, and your bag still has tokens. What do you pay with?",
    options: [
      {
        id: "token",
        label: "A token. A free daily is better than a 50 Diamond daily.",
        correct: false,
        note: "A token does not get the half-price button. It replaces a draw that would have cost 100.",
      },
      {
        id: "diamonds",
        label: "50 Diamonds. Keep the token for a draw with no discount.",
        correct: true,
        note: "Pay the daily with Diamonds. Spend tokens on any other draw.",
      },
      {
        id: "skip",
        label: "Skip it. The discount waits until tomorrow.",
        correct: false,
        note: "The half-price single is once a day. A skipped day is gone.",
      },
    ],
  },
  {
    id: "shop",
    prompt: "You can afford another 10×, and you already have 1,600 Crests. What now?",
    options: [
      {
        id: "more",
        label: "Keep drawing. More Crests can only help.",
        correct: false,
        note: "The skin is in the shop. Extra Crests after 1,600 do not make it cheaper.",
      },
      {
        id: "shop",
        label: "Stop and exchange 1,600 Crests for the skin.",
        correct: true,
        note: "The plan ends at the shop price. Draws after that are optional spending.",
      },
      {
        id: "wait",
        label: "Wait for a draw to drop the skin by itself.",
        correct: false,
        note: "This plan buys the skin from the shop. It does not wait on a draw drop.",
      },
    ],
  },
  {
    id: "early",
    prompt: "You want the skin before Nov 13, ahead of both Premium Supply phases. What does that change?",
    options: [
      {
        id: "same",
        label: "Nothing. The early route uses the same free tokens.",
        correct: false,
        note: "The 6 recharge tokens need a day as late as Nov 14, and both supply phases open later.",
      },
      {
        id: "cheaper",
        label: "It is cheaper, because you finish while discounts are new.",
        correct: false,
        note: "Finishing early skips the free tokens. The discounts you miss cost more than you save.",
      },
      {
        id: "tokens",
        label: "You miss most of the free tokens, so the same skin costs more.",
        correct: true,
        note: "An early finish and a patient finish claim the same skin. The patient one spends the tokens.",
      },
    ],
  },
  {
    id: "ten",
    prompt: "The first 10× is 500 Diamonds, and later 10× bundles are 1,000. How many times do you buy the 500 bundle?",
    options: [
      {
        id: "daily",
        label: "Every day. The button stays at 500.",
        correct: false,
        note: "The half-price 10× is once in the event. The next one is full price.",
      },
      {
        id: "once",
        label: "Once. This plan uses it on Nov 20, inside phase 2.",
        correct: true,
        note: "Buying it earlier is fine. Buying it twice is where the extra 500 goes.",
      },
      {
        id: "never",
        label: "Never. Ten single draws are always cheaper.",
        correct: false,
        note: "Ten singles at full price are 1,000. The first 10× is 500.",
      },
    ],
  },
  {
    id: "boxes",
    prompt: "A small Crest box is on the event page, next to the draw button. Do you open it?",
    options: [
      {
        id: "open",
        label: "Yes. Small boxes are how you finish a short Crest gap.",
        correct: false,
        note: "Small boxes are a separate purchase. This plan does not use them to close the gap.",
      },
      {
        id: "skip",
        label: "No. Close a Crest gap with draws you already planned, then stop at 1,600.",
        correct: true,
        note: "If you are short on the last days, buy ordinary draws until the shop opens. Then stop.",
      },
      {
        id: "all",
        label: "Open every box on the page. They all share one price.",
        correct: false,
        note: "Every extra button is its own price. Read it before you tap.",
      },
    ],
  },
  {
    id: "recharge-double",
    prompt: "You already recharged 100 today and the daily-recharge task moved. A second 100 pack is on sale.",
    options: [
      {
        id: "again",
        label: "Buy it. Two recharges today count as two days.",
        correct: false,
        note: "The task wants different days. A second pack today does not finish tomorrow’s day.",
      },
      {
        id: "stop",
        label: "Leave it. One counted recharge is enough for today.",
        correct: true,
        note: "Come back on another day for the next 100. Eight different days pay the 6 tokens.",
      },
      {
        id: "weekly",
        label: "It never counts unless you buy the largest pack.",
        correct: false,
        note: "The preview task counts a 100 recharge. Confirm the live task before you buy past it.",
      },
    ],
  },
  {
    id: "promo",
    prompt: "Promo Diamond tasks are still open, and you were about to buy a full-price 10×.",
    options: [
      {
        id: "buy",
        label: "Buy the 10× now. Promo Diamonds are a bonus on the side.",
        correct: false,
        note: "Promo tasks can pay for draws you would otherwise buy with Diamonds. Finish them first.",
      },
      {
        id: "tasks",
        label: "Do the open promo tasks first, then decide if you still need the 10×.",
        correct: true,
        note: "The main promo tasks end Nov 10. Catch-up runs Nov 11–17.",
      },
      {
        id: "ignore",
        label: "Ignore them. Promo Diamonds cannot be spent on this event.",
        correct: false,
        note: "If the event drawer accepts Promo Diamonds, they replace Diamonds one for one on this plan.",
      },
    ],
  },
  {
    id: "shop-close",
    prompt: "It is Dec 7. You have the Crests, and the draw button is still lit. What is the deadline that matters?",
    options: [
      {
        id: "draws",
        label: "Dec 6 was the last day for anything. The Crests are already gone.",
        correct: false,
        note: "Draws end Dec 6. The shop still takes Crests through Dec 8.",
      },
      {
        id: "shop",
        label: "Exchange before the shop closes on Dec 8. Draws are already over.",
        correct: true,
        note: "Leftover Crests do not carry out of the shop.",
      },
      {
        id: "none",
        label: "There is no deadline. The shop stays on your account.",
        correct: false,
        note: "The exchange window in this plan is Dec 7–8.",
      },
    ],
  },
];

export const PLAN_LINES = [
  { when: "Before Nov 6", text: "Finish promo tasks, and keep 109 Diamonds plus a 100 recharge for day 1." },
  { when: "Nov 6", text: "Buy both Mega bundles, take the half-price daily, and recharge 100." },
  { when: "Nov 6–14", text: "Recharge 100 on eight different days, then use the 6 tokens." },
  { when: "Every draw day", text: "Take the 50 Diamond daily with Diamonds, not with a token." },
  { when: "Nov 13–17", text: "Open phase 1 with a 500 recharge, clear its spend task, and use 18 tokens." },
  { when: "Nov 20–24", text: "Open phase 2, buy the one half-price 10×, and use the next 18 tokens." },
  { when: "Dec 6", text: "Last day to draw. Pay full price only for Crests you still lack." },
  { when: "Dec 8", text: "Last day to exchange 1,600 Crests. After that, leftovers are gone." },
];

export const FAQ = [
  {
    q: "How many Diamonds does this plan cost?",
    a: "It depends on the Crest rate and which steps you leave on. At 13 Crests a draw, with every step on and no Promo Diamonds, the bill is the total in the Bill section. A better rate removes full-price draws. A worse rate adds them. The figure is a plan, not a drop rate.",
  },
  {
    q: "Where does the skin come from?",
    a: "From the event shop, for 1,600 Crests. This page does not treat the skin as a direct draw reward. Stop when the shop can clear.",
  },
  {
    q: "When does the event run?",
    a: "Draws in this plan run Nov 6 through Dec 6, 2026. The shop stays open through Dec 8. Dates follow server time. If your event screen shows another day, follow the game.",
  },
  {
    q: "Why not finish in the first week?",
    a: "Both Premium Supply phases, and the last recharge day, sit after Nov 12. Finishing before they open skips most of the free tokens and buys the same skin with full-price draws.",
  },
  {
    q: "Do tokens get the daily half-price?",
    a: "No. Pay the daily single with 50 Diamonds. Use tokens on draws that have no discount.",
  },
  {
    q: "Are these prices final?",
    a: "They are the preview prices this plan is built on: 100 a draw, 1,000 for 10×, 50 for the first daily single, 500 for the first 10×, Mega bundles at 10 and 49, and 18 tokens from each supply phase. Check the live event page before you spend. The game wins if a number changed.",
  },
];

export function checkedStats(days, checks) {
  return days.reduce(
    (stats, day) => {
      day.tasks.forEach((item) => {
        if (!checks[taskKey(day.id, item.id)]) return;
        stats.diamonds += item.diamonds;
        stats.draws += item.draws;
        stats.topup += item.topup;
      });
      return stats;
    },
    { diamonds: 0, draws: 0, topup: 0 }
  );
}
