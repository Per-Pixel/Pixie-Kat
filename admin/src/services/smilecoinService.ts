/**
 * Smilecoin (smile.one) API client for the Pixie-Kat admin panel.
 *
 * Routes are served by the Pixie-Kat main server (main/server/index.js) which
 * signs all requests server-side — the merchant key never reaches the browser.
 * Uses the existing `api` axios instance so the admin JWT is attached automatically.
 *
 * Server routes (all behind requireAdmin):
 *   GET  /api/smilecoin/health
 *   GET  /api/smilecoin/products
 *   GET  /api/smilecoin/productlist?product=mobilelegends
 *   GET  /api/smilecoin/servers?product=ragnarokm
 *   GET  /api/smilecoin/points
 *   POST /api/smilecoin/rolecheck  { userid, zoneid, product, productid }
 *   POST /api/smilecoin/order      { userid, zoneid, product, productid }
 *   POST /api/smilecoin/order/dry-run
 */

import api from './api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SmHealthResponse {
  ok: boolean;
  time: number;
  testOrders: boolean;
}

export interface SmCatalogProduct {
  name: string;
  [k: string]: unknown;
}

export interface SmSku {
  id: string;
  spu: string;
  price: string | number;
  [k: string]: unknown;
}

export interface SmProductListResponse {
  ok: boolean;
  product?: string;
  status?: number;
  data?: { product?: SmSku[] };
  productList?: SmSku[];
  list?: SmSku[];
  [k: string]: unknown;
}

export interface SmServersResponse {
  ok: boolean;
  status?: number;
  server_list?: { server_name: string; server_id: string }[];
  [k: string]: unknown;
}

export interface SmPointsResponse {
  ok: boolean;
  status?: number;
  smile_points?: string | number;
  points?: string | number;
  balance?: string | number;
  [k: string]: unknown;
}

export interface SmRoleCheckResponse {
  ok: boolean;
  status?: number;
  username?: string;
  zone?: number;
  message?: string;
  [k: string]: unknown;
}

export interface SmOrderResponse {
  ok: boolean;
  status?: number;
  message?: string;
  order_id?: string;
  dryRun?: boolean;
  wouldSend?: Record<string, unknown>;
  testOrdersEnabled?: boolean;
  error?: string;
  [k: string]: unknown;
}

// ── Curated game catalog ─────────────────────────────────────────────────────

export interface SmGameCatalogEntry {
  slug: string;
  name: string;
  emoji: string;
  region: string;
}

export const SM_CATALOG: SmGameCatalogEntry[] = [
  { slug: 'mobilelegends',     name: 'Mobile Legends',   emoji: '🗡️', region: 'Global' },
  { slug: 'hok',               name: 'Honor of Kings',   emoji: '👑', region: 'Global' },
  { slug: 'freefirediamantes', name: 'Free Fire',        emoji: '🔥', region: 'Brazil / LATAM' },
  { slug: 'pubgmobile',        name: 'PUBG Mobile',      emoji: '🎯', region: 'Global' },
  { slug: 'bigo',              name: 'Bigo Live',        emoji: '💎', region: 'Global' },
  { slug: 'hago',              name: 'Hago',             emoji: '🎮', region: 'Global' },
  { slug: 'ragnarokm',         name: 'Ragnarok M',       emoji: '⚔️', region: 'Global' },
  { slug: 'honkai',            name: 'Honkai Star Rail',  emoji: '🌟', region: 'Global' },
  { slug: 'loveanddeepspace',  name: 'Love and Deepspace',emoji: '💖', region: 'Global' },
  { slug: 'supersus',          name: 'Super Sus',        emoji: '🚀', region: 'Global' },
];

// ── API ──────────────────────────────────────────────────────────────────────
// Uses the existing `api` axios instance — baseURL http://localhost:3001/api,
// with Supabase JWT auto-attached. All routes hit /smilecoin/* on the main server.

export const smilecoin = {
  health: async (): Promise<SmHealthResponse> => {
    const { data } = await api.get<SmHealthResponse>('/smilecoin/health');
    return data;
  },

  products: async (): Promise<SmCatalogProduct[]> => {
    const { data } = await api.get<{ ok: boolean; products: unknown }>('/smilecoin/products');
    const raw = data.products;
    if (Array.isArray(raw)) {
      return raw.map((p, i) =>
        typeof p === 'string' ? { name: p } : { name: String((p as Record<string, unknown>)?.name ?? i), ...(p as object) }
      );
    }
    return [];
  },

  productlist: async (product: string): Promise<SmProductListResponse> => {
    const { data } = await api.get<SmProductListResponse>(
      `/smilecoin/productlist?product=${encodeURIComponent(product)}`
    );
    return data;
  },

  servers: async (product: string): Promise<SmServersResponse> => {
    const { data } = await api.get<SmServersResponse>(
      `/smilecoin/servers?product=${encodeURIComponent(product)}`
    );
    return data;
  },

  points: async (): Promise<SmPointsResponse> => {
    const { data } = await api.get<SmPointsResponse>('/smilecoin/points');
    return data;
  },

  rolecheck: async (params: { userid: string; zoneid: string; product: string; productid: string }): Promise<SmRoleCheckResponse> => {
    const { data } = await api.post<SmRoleCheckResponse>('/smilecoin/rolecheck', params);
    return data;
  },

  order: async (params: { userid: string; zoneid: string; product: string; productid: string }): Promise<SmOrderResponse> => {
    const { data } = await api.post<SmOrderResponse>('/smilecoin/order', params);
    return data;
  },

  orderDryRun: async (params: { userid: string; zoneid: string; product: string; productid: string }): Promise<SmOrderResponse> => {
    const { data } = await api.post<SmOrderResponse>('/smilecoin/order/dry-run', params);
    return data;
  },
};

/** Extract the SKU array from a productlist response (handles multiple response shapes). */
export function extractSmSkus(res: SmProductListResponse): SmSku[] {
  const data = res.data;
  if (data && typeof data === 'object') {
    const inner = data.product;
    if (Array.isArray(inner)) return inner;
  }
  for (const k of ['productList', 'list', 'skus', 'product'] as const) {
    const v = (res as Record<string, unknown>)[k];
    if (Array.isArray(v)) return v as SmSku[];
  }
  return [];
}
