import type { Session } from '@supabase/supabase-js';

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const [, payload] = token.split('.');
    if (!payload) return {};
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(normalized)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function recordLoginSession(session: Session | null) {
  if (!session?.user?.id || typeof window === 'undefined') return;

  const claims = decodeJwtPayload(session.access_token);
  const sessionId = claims.session_id ?? claims.sid ?? 'active';
  const storageKey = `pixiekat_admin_logged_session:${session.user.id}:${sessionId}`;

  if (window.localStorage.getItem(storageKey)) return;

  try {
    const rawBase = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';
    const fallback = import.meta.env.PROD
      ? ''
      : 'http://localhost:3001/api';
    const baseUrl = (rawBase || fallback).replace(/\/$/, '');
    if (!baseUrl) {
      console.warn('[sessionTelemetry] Missing VITE_API_BASE_URL; skipping login telemetry.');
      return;
    }
    const response = await fetch(`${baseUrl}/auth/login-session`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    window.localStorage.setItem(storageKey, new Date().toISOString());
  } catch (error) {
    console.warn('[sessionTelemetry] Failed to record login session:', error);
  }
}
