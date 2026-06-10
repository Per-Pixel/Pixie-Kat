import { supabase } from '../lib/supabase';

export interface ReportProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  wallet_balance: number | string;
  created_at: string;
}

export interface ReportOrder {
  id: string;
  user_id: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  total_amount: number | string;
  currency: string;
  status: string;
  payment_method?: string | null;
  created_at: string;
  profiles?: { name: string; email: string } | null;
}

export interface ReportProduct {
  id: string;
  game_id: string;
  name: string;
  price: number | string;
  currency: string;
  stock?: number | null;
  status: string;
  is_popular: boolean;
  game?: { name: string; category?: string | null } | null;
}

export interface ReportWalletTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number | string;
  created_at: string;
}

export interface ReportReferral {
  id: string;
  referrer_id: string;
  referred_id: string;
  status: string;
  commission: number | string;
  created_at: string;
}

export interface ReportActivity {
  id: string;
  user_id: string;
  actor_id?: string | null;
  action: string;
  description?: string | null;
  ip_address?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface AdminReportData {
  profiles: ReportProfile[];
  orders: ReportOrder[];
  products: ReportProduct[];
  walletTransactions: ReportWalletTransaction[];
  referrals: ReportReferral[];
  activities: ReportActivity[];
  pendingKyc: number;
}

function throwIfError(error: { message: string } | null, source: string) {
  if (error) throw new Error(`${source}: ${error.message}`);
}

export async function getAdminReportData(): Promise<AdminReportData> {
  const [
    profilesResult,
    ordersResult,
    productsResult,
    walletResult,
    referralsResult,
    activitiesResult,
    kycResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, email, role, status, wallet_balance, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('orders')
      .select('id, user_id, product_id, product_name, quantity, total_amount, currency, status, payment_method, created_at, profiles:user_id(name, email)')
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase
      .from('products')
      .select('id, game_id, name, price, currency, stock, status, is_popular, game:games(name, category)')
      .order('created_at', { ascending: false }),
    supabase
      .from('wallet_transactions')
      .select('id, user_id, type, amount, created_at')
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase
      .from('referrals')
      .select('id, referrer_id, referred_id, status, commission, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('user_activity_log')
      .select('id, user_id, actor_id, action, description, ip_address, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('user_kyc')
      .select('*', { count: 'exact', head: true })
      .or('identity_status.eq.pending,address_status.eq.pending,phone_status.eq.pending'),
  ]);

  throwIfError(profilesResult.error, 'Profiles');
  throwIfError(ordersResult.error, 'Orders');
  throwIfError(productsResult.error, 'Products');
  throwIfError(walletResult.error, 'Wallet transactions');
  throwIfError(referralsResult.error, 'Referrals');
  throwIfError(activitiesResult.error, 'Activity');
  throwIfError(kycResult.error, 'KYC');

  return {
    profiles: (profilesResult.data ?? []) as ReportProfile[],
    orders: (ordersResult.data ?? []) as unknown as ReportOrder[],
    products: (productsResult.data ?? []) as unknown as ReportProduct[],
    walletTransactions: (walletResult.data ?? []) as ReportWalletTransaction[],
    referrals: (referralsResult.data ?? []) as ReportReferral[],
    activities: (activitiesResult.data ?? []) as ReportActivity[],
    pendingKyc: kycResult.count ?? 0,
  };
}

