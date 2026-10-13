/**
 * Yokcash (yokcash.com) API client for the Pixie-Kat admin panel.
 *
 * Routes are served by the Pixie-Kat main server (main/server/index.js) which
 * injects the API key server-side — it never reaches the browser.
 * Uses the existing `api` axios instance so the admin JWT is attached automatically.
 *
 * Server routes (all behind requireAdmin unless noted):
 *   GET  /api/yokcash/health            live check — real /saldo call (proves key + IP whitelist)
 *   GET  /api/yokcash/services          full catalog (prices in IDR)
 *   GET  /api/yokcash/status?order_id=  order status by Yokcash invoice id
 *   POST /api/yokcash/order             real order — requireSuperAdmin + YOKCASH_ALLOW_TEST_ORDER
 *   POST /api/yokcash/order/dry-run     payload preview, never sent
 */

import api from './api';
import { supabase } from '../lib/supabase';

// ── Prod-routed fetch ─────────────────────────────────────────────────────────
// Yokcash enforces a server-IP whitelist: only the prod EB env can call it.
// In dev we therefore route through a vite proxy ('/yc-api' → prod API Gateway);
// in production the admin app already shares origin with '/api' → the same
// gateway. VITE_YC_API_BASE overrides both when needed.
const YC_BASE =
  (import.meta.env.VITE_YC_API_BASE as string | undefined) ??
  (import.meta.env.DEV ? '/yc-api' : '/api');

async function ycFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${YC_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (body && (body.error || body.message)) || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface YcHealthResponse {
  configured: boolean;
  connected: boolean;
  saldo?: number | null;
  currency?: string;
  message?: string;
}

export interface YcService {
  id: string;
  nama_layanan: string;
  kategori: string;
  harga: number;
  harga_gold?: number;
  harga_silver?: number;
  harga_pro?: number;
  status: string;
}

export interface YcServicesResponse {
  ok: boolean;
  msg?: string;
  services: YcService[];
}

export interface YcStatusResponse {
  ok: boolean;
  msg?: string;
  data?: {
    id: string;
    keterangan?: string;
    status?: 'pending' | 'processing' | 'success' | 'cancel' | 'refund' | string;
  } | null;
}

export interface YcOrderParams {
  service_id: string;
  target: string;
  kontak: string;
  idtrx?: string;
  callback?: string;
}

export interface YcOrderResponse {
  ok: boolean;
  dryRun?: boolean;
  msg?: string;
  error?: string;
  data?: {
    id?: string;
    service_name?: string;
    service_id?: string;
    target?: string;
    kontak?: string;
    keterangan?: string;
    status?: string;
  } | null;
  wouldSend?: Record<string, unknown>;
  testOrdersEnabled?: boolean;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const yokcash = {
  health: async (): Promise<YcHealthResponse> => {
    const { data } = await api.get<YcHealthResponse>('/yokcash/health');
    return data;
  },

  services: async (): Promise<YcServicesResponse> => {
    const { data } = await api.get<YcServicesResponse>('/yokcash/services');
    return data;
  },

  status: async (orderId: string): Promise<YcStatusResponse> => {
    const { data } = await api.get<YcStatusResponse>(
      `/yokcash/status?order_id=${encodeURIComponent(orderId)}`
    );
    return data;
  },

  order: async (params: YcOrderParams): Promise<YcOrderResponse> => {
    const { data } = await api.post<YcOrderResponse>('/yokcash/order', params);
    return data;
  },

  orderDryRun: async (params: YcOrderParams): Promise<YcOrderResponse> => {
    const { data } = await api.post<YcOrderResponse>('/yokcash/order/dry-run', params);
    return data;
  },
};

// ── Prod-routed variants (store test page) ────────────────────────────────────
// Same server routes as above, but always aimed at the whitelisted prod API —
// see ycFetch. Used by YokcashStorePage so the page works in local dev where
// VITE_API_BASE_URL points at a non-whitelisted localhost:3001.

export const yokcashProd = {
  health: (): Promise<YcHealthResponse> => ycFetch('/yokcash/health'),
  services: (): Promise<YcServicesResponse> => ycFetch('/yokcash/services'),
  status: (orderId: string): Promise<YcStatusResponse> =>
    ycFetch(`/yokcash/status?order_id=${encodeURIComponent(orderId)}`),
  order: (params: YcOrderParams): Promise<YcOrderResponse> =>
    ycFetch('/yokcash/order', { method: 'POST', body: JSON.stringify(params) }),
  orderDryRun: (params: YcOrderParams): Promise<YcOrderResponse> =>
    ycFetch('/yokcash/order/dry-run', { method: 'POST', body: JSON.stringify(params) }),
};

// POST /api/verify-player — the public storefront route. No auth needed; sent
// through ycFetch so the store test page exercises the same prod hop.
export interface YcVerifyPlayerResponse {
  success: boolean;
  username?: string;
  source?: string;
  message?: string;
  region?: { country: string; nickname: string | null } | null;
}

export function verifyPlayer(params: {
  user_id: string;
  zone_id?: string;
}): Promise<YcVerifyPlayerResponse> {
  return ycFetch('/verify-player', {
    method: 'POST',
    body: JSON.stringify({
      user_id: params.user_id,
      zone_id: params.zone_id,
      api_game: 'mobilelegends',
      product: 'mobilelegends',
      product_id: '1',
      smile_coin_product: 'mobilelegends',
    }),
  });
}

// Filter a Yokcash service catalog down to Mobile Legends entries.
// Yokcash has no game-code field, so we match category/name text.
export function isMlbbService(s: YcService): boolean {
  return /mobile.?legend|\bmlbb\b|ml\s?diamond/i.test(`${s.kategori ?? ''} ${s.nama_layanan ?? ''}`);
}
