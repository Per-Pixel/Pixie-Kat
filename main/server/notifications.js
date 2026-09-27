/**
 * Email notification pipeline.
 *
 * DB trigger `enqueue_order_notification` (migration 040) writes a row into
 * notification_outbox on every meaningful orders.status transition, and
 * /api/auth/login-session enqueues login_alert rows. startWorker() drains the
 * outbox over SMTP, honouring each user's user_settings toggles.
 *
 * Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
 * Without SMTP_USER/SMTP_PASS the worker never starts and rows stay queued.
 */

import nodemailer from 'nodemailer';
import process from 'node:process';

const POLL_INTERVAL_MS = Number(process.env.NOTIFY_POLL_MS) || 45_000;
const BATCH_LIMIT = 20;
const MAX_ATTEMPTS = 5;
const KIND_FLAGS = {
  order_processing: 'order_notifications',
  order_completed: 'order_notifications',
  order_failed: 'order_notifications',
  order_refunded: 'order_notifications',
  login_alert: 'login_alerts',
};

export function isMailerConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter;
function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

function sender() {
  return process.env.SMTP_FROM || `Pixie-Kat <${process.env.SMTP_USER}>`;
}

/** Pure: does this user's settings allow this notification kind? Missing row = defaults on. */
export function isKindEnabled(settings, kind) {
  if (settings && settings.email_notifications === false) return false;
  const flag = KIND_FLAGS[kind];
  if (!flag) return true;
  return !settings || settings[flag] !== false;
}

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatAmount(amount, currency) {
  return currency === 'INR' ? `₹${amount}` : `${amount} ${currency}`;
}

function page(title, intro, rows, footer) {
  const rowHtml = Object.entries(rows)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) =>
      `<tr><td style="padding:8px 0;color:#9c9cb8;font-size:13px">${esc(k)}</td>` +
      `<td style="padding:8px 0;color:#fff;font-size:13px;text-align:right">${esc(v)}</td></tr>`)
    .join('');
  return `<div style="background:#0a0a0a;padding:32px 16px;font-family:Inter,Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#12121e;border:1px solid #26263a;border-radius:16px;padding:28px">
    <p style="color:#DFDFF0;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px">Pixie-Kat</p>
    <h1 style="color:#fff;font-size:20px;margin:0 0 8px">${esc(title)}</h1>
    <p style="color:#9c9cb8;font-size:14px;line-height:1.5;margin:0 0 20px">${esc(intro)}</p>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #26263a">${rowHtml}</table>
    <p style="color:#5c5c75;font-size:12px;margin:20px 0 0">${esc(footer)}</p>
  </div>
</div>`;
}

/** Pure: outbox row -> { subject, html } or null for unknown kinds. */
export function renderNotification(row) {
  const p = row.payload || {};
  const shortId = String(p.order_id || '').slice(0, 8).toUpperCase();
  const orderRows = {
    Order: `#${shortId}`,
    Item: p.product_name,
    Qty: p.quantity,
    Total: p.total_amount !== undefined ? formatAmount(p.total_amount, p.currency) : undefined,
    'Paid via': p.payment_method,
  };
  switch (row.kind) {
    case 'order_processing':
      return {
        subject: `Payment received — order #${shortId} is being processed`,
        html: page('Payment received', 'We got your payment and your order is now being fulfilled. You will get another email when it is delivered.', orderRows, 'You can manage email notifications from Account → Settings.'),
      };
    case 'order_completed':
      return {
        subject: `Order delivered — #${shortId}`,
        html: page('Order delivered', 'Your order has been completed. Enjoy!', orderRows, 'Something wrong? Reply via the support page and we will take a look.'),
      };
    case 'order_failed':
      return {
        subject: `Order could not be completed — #${shortId}`,
        html: page('Order failed', 'Your order could not be completed. If your account was charged, the amount is refunded automatically.', orderRows, 'Need help? Open a ticket on the support page with your order number.'),
      };
    case 'order_refunded':
      return {
        subject: `Refund processed — order #${shortId}`,
        html: page('Refund processed', 'Your order was refunded. Wallet payments return to your Pixie Wallet instantly; card/UPI refunds depend on your bank.', orderRows, 'Refund timing for external payments is set by your bank or UPI provider.'),
      };
    case 'login_alert':
      return {
        subject: 'New sign-in to your Pixie-Kat account',
        html: page('New sign-in detected', 'Your account was just signed in. If this was not you, change your password immediately and enable two-factor authentication.', {
          Time: p.at,
          'IP address': p.ip,
          Device: p.device,
          Browser: p.browser,
        }, 'You can turn these alerts off from Account → Settings → Login alerts.'),
      };
    default:
      return null;
  }
}

/** Enqueue a notification row directly (for kinds not produced by the orders trigger). */
export async function enqueue(supabase, { user_id, kind, payload = {} }) {
  return supabase.from('notification_outbox').insert({ user_id, kind, payload });
}

async function resolveRecipient(supabase, row) {
  const { data: { user }, error } = await supabase.auth.admin.getUserById(row.user_id);
  if (error || !user?.email) return null;
  const { data: settings } = await supabase
    .from('user_settings')
    .select('email_notifications, order_notifications, login_alerts')
    .eq('user_id', row.user_id)
    .maybeSingle();
  return isKindEnabled(settings, row.kind) ? user.email : null;
}

async function markRow(supabase, id, status, lastError = null) {
  await supabase
    .from('notification_outbox')
    .update({ status, last_error: lastError, processed_at: new Date().toISOString() })
    .eq('id', id);
}

export async function processPending(supabase, sendMail) {
  const { data: rows, error } = await supabase
    .from('notification_outbox')
    .select('id, user_id, order_id, kind, payload, attempts')
    .eq('status', 'pending')
    .order('id', { ascending: true })
    .limit(BATCH_LIMIT);
  if (error) {
    console.error('[notify] outbox fetch failed:', error.message);
    return 0;
  }

  let sent = 0;
  for (const row of rows || []) {
    // Claim the row so a second worker can't send the same email.
    const { data: claimed } = await supabase
      .from('notification_outbox')
      .update({ status: 'sending', attempts: row.attempts + 1 })
      .eq('id', row.id)
      .eq('status', 'pending')
      .select('id');
    if (!claimed?.length) continue;

    try {
      const to = await resolveRecipient(supabase, row);
      const rendered = renderNotification(row);
      if (!to || !rendered) {
        await markRow(supabase, row.id, 'skipped');
        continue;
      }
      await sendMail({ from: sender(), to, subject: rendered.subject, html: rendered.html });
      await markRow(supabase, row.id, 'sent');
      sent += 1;
    } catch (err) {
      const dead = row.attempts + 1 >= MAX_ATTEMPTS;
      await markRow(supabase, row.id, dead ? 'failed' : 'pending', String(err.message || err).slice(0, 500));
      console.error(`[notify] row ${row.id} ${dead ? 'failed permanently' : 'will retry'}:`, err.message);
    }
  }
  return sent;
}

export function startWorker(supabase) {
  const send = (msg) => getTransporter().sendMail(msg);
  const tick = () => processPending(supabase, send).catch((e) => console.error('[notify] worker error:', e));
  const timer = setInterval(tick, POLL_INTERVAL_MS);
  timer.unref?.();
  tick();
  console.log(`[notify] outbox worker started (every ${POLL_INTERVAL_MS / 1000}s)`);
  return () => clearInterval(timer);
}
