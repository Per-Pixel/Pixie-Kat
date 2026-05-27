import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  role: 'user' | 'admin' | 'reseller' | 'support';
  status: 'active' | 'inactive' | 'suspended' | 'banned';
  timezone: string;
  language: string;
  wallet_balance: number;
  referral_code?: string | null;
  email_verified: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  marketing_emails: boolean;
  order_notifications: boolean;
  login_alerts: boolean;
}

export interface User2FAConfig {
  is_enabled: boolean;
  method: string;
  enabled_at?: string | null;
  disabled_at?: string | null;
  disabled_by?: string | null;
}

export interface UserKYC {
  tier: 'unverified' | 'basic' | 'verified' | 'premium';
  identity_status: string;
  address_status: string;
  phone_status: string;
  verified_at?: string | null;
  notes?: string | null;
}

export interface UserDetailData {
  profile: UserProfile;
  settings: UserSettings | null;
  twoFactor: User2FAConfig | null;
  kyc: UserKYC | null;
}

export function useUserDetail(userId: string | undefined) {
  const [data, setData] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const [profileRes, settingsRes, twoFaRes, kycRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('user_settings').select('*').eq('user_id', userId).single(),
        supabase.from('user_2fa_config').select('*').eq('user_id', userId).single(),
        supabase.from('user_kyc').select('*').eq('user_id', userId).single(),
      ]);

      if (profileRes.error || !profileRes.data) {
        setError(profileRes.error?.message ?? 'User not found');
        setData(null);
        return;
      }

      setData({
        profile: profileRes.data as UserProfile,
        settings: (settingsRes.data as UserSettings) ?? null,
        twoFactor: (twoFaRes.data as User2FAConfig) ?? null,
        kyc: (kycRes.data as UserKYC) ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
