import { api } from './api';

export interface SmileOneStatus {
  configured:  boolean;
  connected:   boolean;
  usd_balance?: number | null;
  message:     string;
}

export interface ScProduct {
  name:            string;
  type:            'topup' | 'voucher';
  subType?:        number;
  apiGame:         string;
  isMultiPurchase: boolean;
  params?:         Record<string, string>;
}

export interface ScSku {
  sku:          string;
  code?:        string;        // raw field name returned by SmileCode API
  description:  string;        // normalised: code || description || sku
  price:        number;
  disprice?:    number;
  currency:     string;
  pid:          string;
  inventory?:   number;
}

export interface ScServer {
  id:   string;
  name: string;
}

function rethrow(err: any, fallback: string): never {
  const msg: string = err.response?.data?.message || err.message || fallback;
  throw new Error(msg);
}

export async function fetchSmileOneStatus(): Promise<SmileOneStatus> {
  const { data } = await api.get<SmileOneStatus>('/smileone/status');
  return data;
}

export async function fetchProductList(): Promise<ScProduct[]> {
  try {
    const { data } = await api.get<{ success: boolean; productList: ScProduct[]; message?: string }>(
      '/smileone/product-list',
    );
    if (!data.success) throw new Error(data.message || 'Failed to fetch product list');
    return data.productList ?? [];
  } catch (err: any) {
    rethrow(err, 'Failed to fetch product list from SmileCode');
  }
}

export async function fetchSkuList(
  apiGame: string,
): Promise<{ skuList: ScSku[]; serverList: ScServer[]; isMultiPurchase: boolean }> {
  try {
    const { data } = await api.get<{
      success: boolean;
      skuList: ScSku[];
      serverList: ScServer[];
      isMultiPurchase: boolean;
      message?: string;
    }>('/smileone/sku-list', { params: { apiGame } });
    if (!data.success) throw new Error(data.message || 'Failed to fetch SKU list');
    return {
      skuList:         data.skuList         ?? [],
      serverList:      data.serverList      ?? [],
      isMultiPurchase: data.isMultiPurchase ?? true,
    };
  } catch (err: any) {
    rethrow(err, 'Failed to fetch SKU list from SmileCode');
  }
}
