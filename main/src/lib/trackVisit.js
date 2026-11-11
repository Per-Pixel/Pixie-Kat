import { API_BASE } from "./apiBase";

const SESSION_KEY = "pixiekat_visit_logged";
const VISITOR_KEY = "pixiekat_visitor";
let sent = false;

function visitorKey() {
  try {
    const existing = localStorage.getItem(VISITOR_KEY);
    if (existing && /^[0-9a-f-]{36}$/i.test(existing)) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** One landing per browser tab. The visitor id stays so repeat visits count as one person. */
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
  const body = {
    path: window.location.pathname,
    visitor_key: visitorKey(),
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
