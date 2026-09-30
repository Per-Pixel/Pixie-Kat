// Shared API base URL for storefront fetches.
//
// In dev, VITE_API_BASE_URL usually points at http://localhost:3001/api.
// That breaks when the page is opened on another device (a phone on the LAN,
// a tunnel URL, …) because "localhost" resolves on THAT device. When the
// page's own host is non-loopback but the configured API base is loopback,
// fall back to the same-origin "/api" path — the Vite dev proxy forwards it
// to the backend, and no extra firewall port is needed.

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const resolveApiBase = () => {
  const raw = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
  if (!import.meta.env.DEV || typeof window === "undefined") return raw;
  try {
    const apiHost = new URL(raw, window.location.origin).hostname;
    const pageHost = window.location.hostname;
    if (LOOPBACK_HOSTS.has(apiHost) && !LOOPBACK_HOSTS.has(pageHost)) return "/api";
  } catch {
    /* non-URL value — use as-is */
  }
  return raw;
};

export const API_BASE = resolveApiBase();
