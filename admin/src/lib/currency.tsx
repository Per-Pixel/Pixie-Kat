import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AdminCurrency = 'PKS' | 'INR';

const STORAGE_KEY = 'pixiekat_admin_currency';
const EVENT_NAME = 'pixiekat-admin-currency-change';

export function readStoredCurrency(): AdminCurrency {
  if (typeof window === 'undefined') return 'PKS';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === 'INR' ? 'INR' : 'PKS';
  } catch {
    return 'PKS';
  }
}

export function formatAdminMoney(
  value: number | string | null | undefined,
  currency: AdminCurrency = readStoredCurrency(),
  options?: { compact?: boolean; decimals?: number }
): string {
  const num = Number(value ?? 0);
  const safe = Number.isFinite(num) ? num : 0;
  const decimals = options?.decimals ?? 2;
  const formatted = safe.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  if (currency === 'INR') {
    return options?.compact ? `₹${formatted}` : `INR ${formatted}`;
  }
  return `PKS ${formatted}`;
}

interface CurrencyContextValue {
  currency: AdminCurrency;
  setCurrency: (next: AdminCurrency) => void;
  toggleCurrency: () => void;
  formatMoney: (value: number | string | null | undefined, options?: { compact?: boolean; decimals?: number }) => string;
  symbol: string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<AdminCurrency>(() => readStoredCurrency());

  const setCurrency = useCallback((next: AdminCurrency) => {
    setCurrencyState(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore storage errors
      }
      window.dispatchEvent(new CustomEvent<AdminCurrency>(EVENT_NAME, { detail: next }));
    }
  }, []);

  const toggleCurrency = useCallback(() => {
    setCurrency(currency === 'PKS' ? 'INR' : 'PKS');
  }, [currency, setCurrency]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onCustom = (e: Event) => {
      const detail = (e as CustomEvent<AdminCurrency>).detail;
      if (detail === 'PKS' || detail === 'INR') setCurrencyState(detail);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'PKS' || e.newValue === 'INR')) {
        setCurrencyState(e.newValue);
      }
    };
    window.addEventListener(EVENT_NAME, onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(EVENT_NAME, onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const formatMoney = useCallback(
    (value: number | string | null | undefined, options?: { compact?: boolean; decimals?: number }) =>
      formatAdminMoney(value, currency, options),
    [currency]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency,
      toggleCurrency,
      formatMoney,
      symbol: currency === 'INR' ? '₹' : 'PKS',
    }),
    [currency, setCurrency, toggleCurrency, formatMoney]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export function useAdminCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (ctx) return ctx;
  const fallbackCurrency = readStoredCurrency();
  return {
    currency: fallbackCurrency,
    setCurrency: () => {},
    toggleCurrency: () => {},
    formatMoney: (v, opts) => formatAdminMoney(v, fallbackCurrency, opts),
    symbol: fallbackCurrency === 'INR' ? '₹' : 'PKS',
  };
}
