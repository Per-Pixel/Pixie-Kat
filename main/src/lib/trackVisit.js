import { API_BASE } from "./apiBase";

const SESSION_KEY = "pixiekat_visit_logged";
let sent = false;

/** One landing per browser tab. Meta adds fbclid on ad link clicks. */
export function trackLandingOnce() {
  if (sent) return;
  try {
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      sent = true;
      return;
    }
  } catch {
    return;
  }

  sent = true;
  const params = new URLSearchParams(window.location.search);
  const body = {
    path: window.location.pathname,
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
    referrer: document.referrer,
    has_fbclid: params.has("fbclid"),
  };

  fetch(`${API_BASE}/track-visit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  })
    .then((response) => {
      if (!response.ok) {
        sent = false;
        return;
      }
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* private mode */
      }
    })
    .catch(() => {
      sent = false;
    });
}
