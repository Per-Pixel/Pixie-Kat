import { supabase } from "../lib/supabase";

function decodeJwtPayload(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return {};
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(window.atob(normalized));
  } catch {
    return {};
  }
}

function getDeviceType(userAgent) {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|kindle|playbook|silk/.test(ua)) return "tablet";
  if (/mobi|iphone|android|phone/.test(ua)) return "mobile";
  return "desktop";
}

function getBrowser(userAgent) {
  if (/edg\//i.test(userAgent)) return "Microsoft Edge";
  if (/opr\//i.test(userAgent)) return "Opera";
  if (/chrome|crios/i.test(userAgent) && !/edg\//i.test(userAgent)) return "Chrome";
  if (/firefox|fxios/i.test(userAgent)) return "Firefox";
  if (/safari/i.test(userAgent) && !/chrome|crios|android/i.test(userAgent)) return "Safari";
  return "Unknown browser";
}

export async function recordLoginSession(session) {
  if (!session?.user?.id || typeof window === "undefined") return;

  const userAgent = window.navigator.userAgent;
  const claims = decodeJwtPayload(session.access_token);
  const sessionId = claims.session_id ?? claims.sid ?? null;
  const safeSessionId = typeof sessionId === "string" ? sessionId : session.access_token.slice(-24);
  const storageKey = `pixiekat_logged_session:${session.user.id}:${safeSessionId}`;

  if (window.localStorage.getItem(storageKey)) return;

  const now = new Date().toISOString();

  const results = await Promise.allSettled([
    supabase.from("user_login_history").insert({
      user_id: session.user.id,
      user_agent: userAgent,
      device_type: getDeviceType(userAgent),
      browser: getBrowser(userAgent),
      success: true,
      session_id: typeof sessionId === "string" ? sessionId : null,
      created_at: now,
    }),
    supabase
      .from("profiles")
      .update({ last_login_at: now, updated_at: now })
      .eq("id", session.user.id),
  ]);

  const loginInsert = results[0];
  if (loginInsert.status === "fulfilled" && !loginInsert.value.error) {
    window.localStorage.setItem(storageKey, now);
    return;
  }

  const error = loginInsert.status === "fulfilled"
    ? loginInsert.value.error
    : loginInsert.reason;
  console.warn("[sessionTelemetry] Failed to record login session:", error);
}
