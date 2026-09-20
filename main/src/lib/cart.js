// Storefront cart — device-local, persisted in localStorage.
//
// Rules:
//   • A cart line = one product + one game account (User ID / Server ID
//     fields). The same product for a different account is a separate line.
//   • Max MAX_ITEM_QUANTITY units per line.
//   • "Limited" products — passes, bundles, subscriptions detected by name,
//     or product.metadata.max_per_account / purchase_limit — are capped per
//     account: you cannot add more than the limit for the same
//     User ID + Server ID, but you can add it again for a different account.

export const CART_STORAGE_KEY = "pixiekat_cart";
export const PENDING_CHECKOUT_KEY = "pixiekat_pending_checkout";

export const MAX_ITEM_QUANTITY = 10;
export const MAX_CART_LINES = 25;
export const MAX_CART_UNITS = 50; // mirrors the server-side cap

const USER_ID_KEYS = ["user_id", "userid", "player_id", "account_id", "uid"];
const ZONE_ID_KEYS = ["zone_id", "server_id", "zoneid", "server"];

// Passes/bundles/subscriptions redeem once per game account.
const ACCOUNT_LIMITED_PATTERN = /bundle|pass|subscription|weekly|monthly|crep[uú]sculo/i;

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Per-account cap for a product, or null when the product is unlimited.
// Admins can override per product via metadata.max_per_account.
export function productAccountLimit(product) {
  const meta = isObj(product?.metadata) ? product.metadata : {};
  const explicit = Number(meta.max_per_account ?? meta.purchase_limit);
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.min(Math.floor(explicit), MAX_ITEM_QUANTITY);
  }
  const text = `${product?.name ?? ""} ${product?.amount ?? ""}`;
  return ACCOUNT_LIMITED_PATTERN.test(text) ? 1 : null;
}

const pickField = (fieldValues, keys) => {
  for (const key of keys) {
    const value = fieldValues?.[key];
    if (value != null && String(value).trim() !== "") {
      return String(value).trim().toLowerCase();
    }
  }
  return "";
};

// Identity a top-up is delivered to: "userId|serverId". Empty when the game
// has no account fields — limited products then dedupe against the whole cart.
export function accountKeyFromFields(fieldValues) {
  if (!isObj(fieldValues)) return "";
  const user = pickField(fieldValues, USER_ID_KEYS);
  const zone = pickField(fieldValues, ZONE_ID_KEYS);
  return user || zone ? `${user}|${zone}` : "";
}

export function lineQuantityCap(product) {
  return Math.min(MAX_ITEM_QUANTITY, productAccountLimit(product) ?? MAX_ITEM_QUANTITY);
}

const clampQty = (value, cap) =>
  Math.max(1, Math.min(cap, Math.trunc(Number(value) || 1)));

const newId = () =>
  `ci_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// addToCart(items, entry) → { ok, items?, merged?, capped?, error? }
// entry: { gameId, gameSlug, gameName, gameImage, product, fieldValues, fieldLabels, playerName, quantity }
export function addToCart(items, entry) {
  const product = entry?.product;
  if (!product?.id) return { ok: false, error: "Missing product." };

  const accountKey = accountKeyFromFields(entry.fieldValues);
  const limit = productAccountLimit(product);
  const cap = Math.min(MAX_ITEM_QUANTITY, limit ?? MAX_ITEM_QUANTITY);
  const qty = clampQty(entry.quantity, cap);

  const sameAccount = items.find(
    (i) => i.product?.id === product.id && i.accountKey === accountKey
  );

  if (sameAccount) {
    const room = cap - sameAccount.quantity;
    if (room <= 0) {
      return {
        ok: false,
        error:
          limit !== null
            ? `${product.name} is limited to ${limit} per account — add it for a different User ID / Server ID, or remove it from your cart first.`
            : `You can add at most ${MAX_ITEM_QUANTITY} of ${product.name} per account.`,
      };
    }
    const mergedQty = Math.min(cap, sameAccount.quantity + qty);
    const next = items.map((i) =>
      i.id === sameAccount.id
        ? { ...i, quantity: mergedQty, playerName: entry.playerName ?? i.playerName }
        : i
    );
    return {
      ok: true,
      items: next,
      merged: true,
      capped: mergedQty < sameAccount.quantity + qty,
    };
  }

  if (items.length >= MAX_CART_LINES) {
    return { ok: false, error: `Cart is full (max ${MAX_CART_LINES} items).` };
  }
  const currentUnits = items.reduce((s, i) => s + i.quantity, 0);
  if (currentUnits + qty > MAX_CART_UNITS) {
    return { ok: false, error: `Cart is full (max ${MAX_CART_UNITS} units).` };
  }

  const item = {
    id: newId(),
    gameId: entry.gameId ?? null,
    gameSlug: entry.gameSlug ?? null,
    gameName: String(entry.gameName ?? ""),
    gameImage: entry.gameImage ?? null,
    product: {
      id: product.id,
      name: String(product.name ?? ""),
      amount: product.amount ?? null,
      price: Number(product.price) || 0,
      currency: product.currency ?? "PKS",
      image_url: product.image_url ?? null,
      metadata: isObj(product.metadata) ? product.metadata : {},
    },
    fieldValues: isObj(entry.fieldValues) ? { ...entry.fieldValues } : {},
    fieldLabels: isObj(entry.fieldLabels) ? { ...entry.fieldLabels } : {},
    accountKey,
    playerName: entry.playerName ?? null,
    quantity: qty,
    addedAt: Date.now(),
  };

  return {
    ok: true,
    items: [...items, item],
    merged: false,
    capped: qty < Math.trunc(Number(entry.quantity) || 1),
  };
}

export function setLineQuantity(items, id, quantity) {
  return items.map((i) =>
    i.id === id ? { ...i, quantity: clampQty(quantity, lineQuantityCap(i.product)) } : i
  );
}

export function cartCount(items) {
  return items.reduce((s, i) => s + i.quantity, 0);
}

export function cartTotal(items) {
  return items.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
}

export function cartCurrencies(items) {
  return [...new Set(items.map((i) => String(i.product.currency || "PKS").toUpperCase()))];
}

const sanitizeItem = (i) => {
  if (!isObj(i) || !i.id || !isObj(i.product) || !i.product.id) return null;
  const price = Number(i.product.price);
  if (!Number.isFinite(price) || price < 0) return null;
  const product = {
    id: i.product.id,
    name: String(i.product.name ?? ""),
    amount: i.product.amount ?? null,
    price,
    currency: String(i.product.currency ?? "PKS"),
    image_url: i.product.image_url ?? null,
    metadata: isObj(i.product.metadata) ? i.product.metadata : {},
  };
  return {
    id: String(i.id),
    gameId: i.gameId ?? null,
    gameSlug: i.gameSlug ?? null,
    gameName: String(i.gameName ?? ""),
    gameImage: i.gameImage ?? null,
    product,
    fieldValues: isObj(i.fieldValues) ? i.fieldValues : {},
    fieldLabels: isObj(i.fieldLabels) ? i.fieldLabels : {},
    accountKey:
      typeof i.accountKey === "string" ? i.accountKey : accountKeyFromFields(i.fieldValues),
    playerName: i.playerName ?? null,
    quantity: clampQty(i.quantity, lineQuantityCap(product)),
    addedAt: Number(i.addedAt) || Date.now(),
  };
};

const getStorage = () => {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
};

export function readCart() {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const raw = storage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(sanitizeItem).filter(Boolean).slice(0, MAX_CART_LINES);
  } catch {
    return [];
  }
}

export function writeCart(items) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota / private mode */
  }
}

// ── Pending checkout (razorpay/aluu redirect resilience) ────────────────────
// When a payment opens in another window/tab, we remember the group so the
// cart page can resume confirmation + fulfillment if the user navigates away.

export function readPendingCheckout() {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(PENDING_CHECKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!isObj(parsed) || !parsed.groupId || !Array.isArray(parsed.orderIds)) return null;
    if (Date.now() - Number(parsed.startedAt || 0) > 30 * 60 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writePendingCheckout(value) {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (value == null) storage.removeItem(PENDING_CHECKOUT_KEY);
    else storage.setItem(PENDING_CHECKOUT_KEY, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}
