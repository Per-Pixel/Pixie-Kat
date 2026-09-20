import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  accountKeyFromFields,
  addToCart,
  CART_STORAGE_KEY,
  cartCount,
  cartTotal,
  MAX_ITEM_QUANTITY,
  productAccountLimit,
  readCart,
  setLineQuantity,
  writeCart,
} from './cart';

const product = (over = {}) => ({
  id: 'prod-1',
  name: 'Diamonds 100 + 10',
  amount: '110 Diamonds',
  price: 150,
  currency: 'PKS',
  metadata: {},
  ...over,
});

const weeklyPass = product({ id: 'prod-pass', name: 'Weekly Diamonds Pass', amount: 'Weekly Pass' });

const entry = (over = {}) => ({
  gameId: 'game-1',
  gameSlug: 'mobile-legends',
  gameName: 'Mobile Legends',
  product: product(),
  fieldValues: { user_id: '12345', zone_id: '678' },
  fieldLabels: { user_id: 'User ID', zone_id: 'Zone ID' },
  playerName: 'HeroOne',
  quantity: 1,
  ...over,
});

const createStorage = () => {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
  };
};

describe('cart rules', () => {
  it('detects limited products by name and metadata override', () => {
    expect(productAccountLimit(weeklyPass)).toBe(1);
    expect(productAccountLimit(product({ name: 'Monthly Elite Bundle' }))).toBe(1);
    expect(productAccountLimit(product({ name: 'Diamonds 50' }))).toBeNull();
    expect(productAccountLimit(product({ metadata: { max_per_account: 3 } }))).toBe(3);
    expect(productAccountLimit(product({ metadata: { max_per_account: 99 } }))).toBe(MAX_ITEM_QUANTITY);
  });

  it('builds account keys from user + server fields', () => {
    expect(accountKeyFromFields({ user_id: ' 12345 ', zone_id: '678' })).toBe('12345|678');
    expect(accountKeyFromFields({ player_id: 'p1' })).toBe('p1|');
    expect(accountKeyFromFields({ email: 'a@b.c' })).toBe('');
    expect(accountKeyFromFields(null)).toBe('');
  });

  it('adds a new line per product + account', () => {
    const r = addToCart([], entry());
    expect(r.ok).toBe(true);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].quantity).toBe(1);
    expect(r.items[0].accountKey).toBe('12345|678');
  });

  it('merges quantity for the same product + same account', () => {
    const first = addToCart([], entry({ quantity: 4 }));
    const second = addToCart(first.items, entry({ quantity: 4 }));
    expect(second.ok).toBe(true);
    expect(second.merged).toBe(true);
    expect(second.items).toHaveLength(1);
    expect(second.items[0].quantity).toBe(8);
  });

  it('caps merged quantity at 10 per product + account', () => {
    const first = addToCart([], entry({ quantity: 8 }));
    const second = addToCart(first.items, entry({ quantity: 8 }));
    expect(second.ok).toBe(true);
    expect(second.capped).toBe(true);
    expect(second.items[0].quantity).toBe(10);
  });

  it('rejects adding beyond 10 for the same product + account', () => {
    const first = addToCart([], entry({ quantity: 10 }));
    const second = addToCart(first.items, entry({ quantity: 1 }));
    expect(second.ok).toBe(false);
    expect(second.error).toMatch(/at most 10/i);
  });

  it('blocks a limited product for the same account', () => {
    const first = addToCart([], entry({ product: weeklyPass }));
    const second = addToCart(first.items, entry({ product: weeklyPass }));
    expect(second.ok).toBe(false);
    expect(second.error).toMatch(/limited to 1 per account/i);
  });

  it('allows a limited product for a different user + server id', () => {
    const first = addToCart([], entry({ product: weeklyPass }));
    const second = addToCart(
      first.items,
      entry({ product: weeklyPass, fieldValues: { user_id: '999', zone_id: '111' } })
    );
    expect(second.ok).toBe(true);
    expect(second.items).toHaveLength(2);
    expect(second.items[1].quantity).toBe(1);
  });

  it('forces limited-product quantity to the per-account cap', () => {
    const r = addToCart([], entry({ product: weeklyPass, quantity: 5 }));
    expect(r.ok).toBe(true);
    expect(r.items[0].quantity).toBe(1);
    expect(r.capped).toBe(true);
  });

  it('keeps the same product for a different account as a separate line', () => {
    const first = addToCart([], entry());
    const second = addToCart(
      first.items,
      entry({ fieldValues: { user_id: '777', zone_id: '888' } })
    );
    expect(second.ok).toBe(true);
    expect(second.merged).toBe(false);
    expect(second.items).toHaveLength(2);
  });

  it('clamps manual quantity edits to the line cap', () => {
    const { items } = addToCart([], entry({ quantity: 3 }));
    const next = setLineQuantity(items, items[0].id, 99);
    expect(next[0].quantity).toBe(10);
    const pass = addToCart([], entry({ product: weeklyPass }));
    const clamped = setLineQuantity(pass.items, pass.items[0].id, 5);
    expect(clamped[0].quantity).toBe(1);
  });

  it('computes count and total across lines', () => {
    const a = addToCart([], entry({ quantity: 2 }));
    const b = addToCart(
      a.items,
      entry({ product: weeklyPass, fieldValues: { user_id: '1', zone_id: '2' } })
    );
    expect(cartCount(b.items)).toBe(3);
    expect(cartTotal(b.items)).toBe(2 * 150 + 150);
  });
});

describe('cart storage', () => {
  let originalStorage;

  beforeEach(() => {
    originalStorage = globalThis.localStorage;
    globalThis.localStorage = createStorage();
  });

  afterEach(() => {
    globalThis.localStorage = originalStorage;
  });

  it('round-trips written items', () => {
    const { items } = addToCart([], entry({ quantity: 3 }));
    writeCart(items);
    const back = readCart();
    expect(back).toHaveLength(1);
    expect(back[0].quantity).toBe(3);
    expect(back[0].product.name).toBe('Diamonds 100 + 10');
  });

  it('returns empty on corrupt JSON', () => {
    globalThis.localStorage.setItem(CART_STORAGE_KEY, '{oops');
    expect(readCart()).toEqual([]);
  });

  it('drops malformed entries and clamps quantities', () => {
    globalThis.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify([
        { id: 'x' },
        { id: 'ok', product: { id: 'p', name: 'P', price: 10 }, quantity: 500 },
      ])
    );
    const back = readCart();
    expect(back).toHaveLength(1);
    expect(back[0].quantity).toBe(10);
  });

  it('is safe when localStorage is unavailable', () => {
    delete globalThis.localStorage;
    expect(readCart()).toEqual([]);
    expect(() => writeCart([{ id: 'x' }])).not.toThrow();
  });
});
