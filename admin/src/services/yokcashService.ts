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
