/** Aluu popup checkout: cross-tab return signaling + focus original tab on cancel. */

export const ALUU_RETURN_MESSAGE = "pixiekat-aluu-return";
const ALUU_BC_CHANNEL = "pixiekat-aluu-return";
const ALUU_LS_KEY = "pixiekat-aluu-return";
const ALUU_PAYMENT_WINDOW_NAME = "pixiekat_aluu_payment";

export const ALUU_PAYMENT_DISMISSED =
  "Payment was not completed. You can try again when you're ready — nothing was charged.";

export const ALUU_PAYMENT_WAITING =
  "Waiting for UPI payment confirmation… Complete payment in the opened window.";

/** After the customer scans a shared QR and pays in GPay/PhonePe, the payment tab is often closed. */
export const ALUU_PAYMENT_QR_WAITING =
  "Complete payment in your UPI app — we'll confirm automatically. You can close the payment window after scanning the QR.";

function matchesReturnPayload(data, { orderId, groupId } = {}) {
  if (!data || data.type !== ALUU_RETURN_MESSAGE) return false;
  if (groupId && data.groupId && data.groupId !== groupId) return false;
  if (orderId && data.orderId && data.orderId !== orderId) return false;
  if (groupId) return data.groupId === groupId;
  if (orderId) return data.orderId === orderId;
  return Boolean(data.orderId || data.groupId);
}

function buildReturnPayload(payload) {
  return { type: ALUU_RETURN_MESSAGE, at: Date.now(), ...payload };
}

/** Prefer named popup so opener + return signaling work across pay.aluu.in redirects. */
export function openAluuPaymentWindow(paymentUrl) {
  const features = "popup=yes,width=520,height=720,noopener=no,noreferrer=no";
  const win = window.open(paymentUrl, ALUU_PAYMENT_WINDOW_NAME, features);
  return win;
}

/** Called from /payments/aluu/return after Aluu redirect. */
export function signalAluuReturn(payload) {
  const message = buildReturnPayload(payload);

  if (window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage(message, window.location.origin);
      window.opener.focus();
    } catch {
      /* ignore */
    }
    window.close();
  }

  try {
    localStorage.setItem(ALUU_LS_KEY, JSON.stringify(message));
  } catch {
    /* private mode */
  }

  try {
    const bc = new BroadcastChannel(ALUU_BC_CHANNEL);
    bc.postMessage(message);
    bc.close();
  } catch {
    /* unsupported */
  }

  return window.opener && !window.opener.closed ? "opener" : "standalone";
}

function listenForAluuReturn(handler, match) {
  const onMessage = (event) => {
    if (event.origin !== window.location.origin && event.origin !== "") return;
    if (!matchesReturnPayload(event.data, match)) return;
    handler(event.data);
  };

  const onStorage = (event) => {
    if (event.key !== ALUU_LS_KEY || !event.newValue) return;
    try {
      const data = JSON.parse(event.newValue);
      if (!matchesReturnPayload(data, match)) return;
      handler(data);
    } catch {
      /* ignore */
    }
  };

  let bc;
  try {
    bc = new BroadcastChannel(ALUU_BC_CHANNEL);
    bc.onmessage = (event) => {
      if (!matchesReturnPayload(event.data, match)) return;
      handler(event.data);
    };
  } catch {
    bc = null;
  }

  window.addEventListener("message", onMessage);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener("message", onMessage);
    window.removeEventListener("storage", onStorage);
    if (bc) bc.close();
  };
}

/**
 * While polling Aluu status, detect popup close or redirect back from Aluu.
 * onInterrupt(reason) — call setState to clear "waiting" UI immediately.
 */
export function trackAluuPaymentWindow(paymentWindow, { orderId, groupId, onInterrupt } = {}) {
  const match = { orderId, groupId };
  let fired = false;
  const fire = (reason) => {
    if (fired) return;
    fired = true;
    try {
      window.focus();
    } catch {
      /* ignore */
    }
    onInterrupt?.(reason);
  };

  const removeListener = listenForAluuReturn(() => fire("return"), match);

  const closeInterval = window.setInterval(() => {
    if (paymentWindow?.closed) fire("closed");
  }, 400);

  return () => {
    removeListener();
    window.clearInterval(closeInterval);
  };
}

/** Sleep in small slices so return/close is picked up quickly. */
export async function sleepUntilInterrupt(ms, isInterrupted) {
  const step = 250;
  let elapsed = 0;
  while (elapsed < ms) {
    if (isInterrupted()) return true;
    await new Promise((r) => setTimeout(r, Math.min(step, ms - elapsed)));
    elapsed += step;
  }
  return isInterrupted();
}

/** @deprecated use signalAluuReturn */
export function notifyAluuOpener(payload) {
  return signalAluuReturn(payload) === "opener" ? "opener" : "standalone";
}

export function listenForAluuReturnLegacy(handler) {
  return listenForAluuReturn(handler, {});
}
