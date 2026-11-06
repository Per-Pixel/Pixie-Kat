/**
 * Email notification pipeline.
 *
 * Orders get one email, when the outcome is known:
 *   delivered, or failed — and whether the payment was refunded.
 * A cart (orders sharing metadata.payment_group_id) waits until every
 * item has left pending / processing / on hold, then sends one receipt.
 * The trigger in migration 057 stops queueing "processing" mail. Until
 * that migration is applied, this worker skips those rows and folds a
 * settled cart into one message itself.
 *
 * Login alerts and leaderboard mail are unchanged in when they send.
 *
 * Env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, FRONTEND_URL.
 * Without SMTP_USER/SMTP_PASS the worker never starts and rows stay queued.
 */

import nodemailer from 'nodemailer';
import process from 'node:process';

const POLL_INTERVAL_MS = Number(process.env.NOTIFY_POLL_MS) || 45_000;
const BATCH_LIMIT = 20;
const MAX_ATTEMPTS = 5;
const OPEN_ORDER_STATUSES = new Set(['pending', 'processing', 'on_hold']);
const ORDER_MAIL_KINDS = new Set(['order_completed', 'order_failed', 'order_refunded']);
const FOLD_KINDS = new Set([
  'order_processing',
  'order_completed',
  'order_failed',
  'order_refunded',
  'cart_settled',
]);
const KIND_FLAGS = {
  order_processing: 'order_notifications',
  order_completed: 'order_notifications',
  order_failed: 'order_notifications',
  order_refunded: 'order_notifications',
  cart_settled: 'order_notifications',
  login_alert: 'login_alerts',
  leaderboard_winner: 'order_notifications',
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
  return process.env.SMTP_FROM || `PixieKat <${process.env.SMTP_USER}>`;
}

function storeBase() {
  return String(process.env.FRONTEND_URL || 'https://pixiekat.store').replace(/\/$/, '');
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
  const n = Number(amount);
  const text = Number.isFinite(n)
    ? n.toLocaleString('en-IN', { maximumFractionDigits: 2 })
    : String(amount ?? '');
  const symbols = { INR: '₹', PKS: '₹', USD: '$', EUR: '€', BRL: 'R$' };
  const symbol = symbols[currency];
  if (symbol) return `${symbol}${text}`;
  return currency ? `${text} ${currency}` : text;
}

function shortId(id) {
  const value = String(id || '').replace(/-/g, '');
  return value.slice(0, 8).toUpperCase();
}

function paymentLabel(method) {
  const name = String(method || '').toLowerCase();
  if (name === 'wallet') return 'Pixie Wallet';
  if (name === 'razorpay') return 'Card / UPI';
  if (name === 'aluu') return 'UPI';
  return method ? String(method) : 'Payment';
}

/** True when this order's charge was returned (wallet, Razorpay, or a later refund). */
export function orderWasRefunded(order, refundAmount = 0) {
  const amount = Number(refundAmount) || 0;
  const gatewayStatus = order?.metadata?.razorpay_refund?.status;
  if (order?.status === 'refunded') return true;
  if (amount > 0) return true;
  if (gatewayStatus === 'processed' || gatewayStatus === 'pending') return true;
  if (order?.payment_method === 'wallet' && (order.status === 'failed' || order.status === 'cancelled')) {
    return true;
  }
  return false;
}

/** A cart receipt waits until nothing in the group is still moving. */
export function isGroupSettled(orders) {
  return Array.isArray(orders)
    && orders.length > 0
    && orders.every((order) => !OPEN_ORDER_STATUSES.has(order.status));
}

export function buildCartPayload(orders, refundTotals = {}) {
  const items = orders.map((order) => {
    const ledger = Number(refundTotals[order.id] || 0);
    const refunded = orderWasRefunded(order, ledger);
    const refundAmount = refunded ? (ledger > 0 ? ledger : Number(order.total_amount) || 0) : 0;
    return {
      order_id: order.id,
      product_name: order.product_name,
      quantity: order.quantity,
      total_amount: order.total_amount,
      currency: order.currency,
      payment_method: order.payment_method,
      outcome: order.status === 'completed' ? 'done' : 'failed',
      refunded,
      refund_amount: refundAmount,
    };
  });
  const first = orders[0] || {};
  return {
    payment_group_id: first.metadata?.payment_group_id || null,
    currency: first.currency,
    payment_method: first.payment_method,
    total_amount: orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    items,
  };
}

function attachLiveOutcome(row, order, refundAmount) {
  const ledger = Number(refundAmount) || 0;
  const refunded = orderWasRefunded(order, ledger);
  return {
    ...row,
    payload: {
      ...(row.payload || {}),
      order_id: order.id,
      product_name: order.product_name,
      quantity: order.quantity,
      total_amount: order.total_amount,
      currency: order.currency,
      payment_method: order.payment_method,
      outcome: order.status === 'completed' ? 'done' : 'failed',
      refunded,
      refund_amount: refunded ? (ledger > 0 ? ledger : Number(order.total_amount) || 0) : 0,
    },
  };
}

/**
 * Decide what this outbox row should do.
 * context.order / groupOrders / refundTotals / notices come from the worker.
 * Missing order data means "send the row as queued" so a lookup hiccup
 * still delivers the mail.
 */
export function prepareDispatch(row, context = {}) {
  const order = context.order;
  if (!order?.id || !ORDER_MAIL_KINDS.has(row.kind)) {
    return { action: 'send', row };
  }

  const groupId = String(order.metadata?.payment_group_id || '').trim();
  const refundTotals = context.refundTotals || {};

  if (groupId) {
    const group = context.groupOrders;
    if (!Array.isArray(group) || group.length === 0) {
      return { action: 'send', row: attachLiveOutcome(row, order, refundTotals[order.id]) };
    }
    if (!isGroupSettled(group)) {
      return { action: 'skip', reason: 'cart still in progress' };
    }
    const skipIds = (context.notices || [])
      .filter((notice) => notice.id !== row.id && notice.status === 'pending' && FOLD_KINDS.has(notice.kind))
      .map((notice) => notice.id);
    return {
      action: 'digest',
      row: { ...row, kind: 'cart_settled', payload: buildCartPayload(group, refundTotals) },
      skipIds,
    };
  }

  if (row.kind === 'order_refunded') {
    const alreadyTold = (context.notices || []).some((notice) => (
      notice.id !== row.id
      && notice.kind === 'order_failed'
      && ['pending', 'sending', 'sent'].includes(notice.status)
    ));
    if (alreadyTold) {
      return { action: 'skip', reason: 'refund is included on the order email' };
    }
  }

  return { action: 'send', row: attachLiveOutcome(row, order, refundTotals[order.id]) };
}

function perforation() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="border-top:2px dashed #d9d4ea;font-size:0;line-height:0;height:1px;">&nbsp;</td></tr>
  </table>`;
}

function chip(text, bg, color) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="display:inline-table;margin:0 0 0 6px;">
    <tr><td bgcolor="${bg}" style="background:${bg};border-radius:999px;padding:4px 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.3px;color:${color};">${esc(text)}</td></tr>
  </table>`;
}

function ctaButton(href, label) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0 0;">
    <tr><td bgcolor="#edff66" style="background:#edff66;border-radius:999px;">
      <a href="${esc(href)}" style="display:inline-block;padding:12px 22px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#0c0a14;text-decoration:none;">${esc(label)}</a>
    </td></tr>
  </table>`;
}

/** Gmail-safe ticket: lavender page, night header, acid-yellow stub, dashed tear. */
function ticket({ preheader, kicker, title, intro, bodyHtml, footerHtml, ctaHref, ctaLabel }) {
  const cta = ctaHref ? ctaButton(ctaHref, ctaLabel || 'View your orders') : '';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#dfdff0;">
  <div style="display:none;font-size:1px;color:#dfdff0;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${esc(preheader || title)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#dfdff0" style="background:#dfdff0;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e4e1f2;">
        <tr><td bgcolor="#edff66" style="background:#edff66;height:8px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td bgcolor="#0e041d" style="background:#0e041d;padding:22px 28px 20px;">
          <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:3px;font-weight:700;color:#edff66;">PIXIEKAT</p>
          <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#c4b6ff;">${esc(kicker)}</p>
          <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.15;font-weight:400;color:#ffffff;">${esc(title)}</h1>
        </td></tr>
        <tr><td style="padding:22px 28px 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#3a3550;">${esc(intro)}</td></tr>
        <tr><td style="padding:8px 28px 0;">${perforation()}</td></tr>
        <tr><td style="padding:6px 28px 8px;">${bodyHtml}</td></tr>
        <tr><td style="padding:0 28px;">${perforation()}</td></tr>
        <tr><td style="padding:4px 28px 24px;">${cta}</td></tr>
        <tr><td bgcolor="#f6f5fb" style="background:#f6f5fb;padding:16px 28px 20px;border-top:1px solid #eceaf4;">
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#6e6884;">${footerHtml}</p>
        </td></tr>
      </table>
      <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.4px;color:#8a849c;">PixieKat · instant game top-ups</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailTable(rows) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    ${Object.entries(rows)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `<tr>
        <td style="padding:11px 0;border-bottom:1px solid #eceaf4;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6e6884;">${esc(key)}</td>
        <td align="right" style="padding:11px 0;border-bottom:1px solid #eceaf4;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#0c0a14;">${esc(value)}</td>
      </tr>`)
      .join('')}
  </table>`;
}

function refundNote(item) {
  if (!item.refunded) return 'No';
  const amount = Number(item.refund_amount);
  const money = Number.isFinite(amount) && amount > 0 ? formatAmount(amount, item.currency) : '';
  const where = String(item.payment_method || '').toLowerCase() === 'wallet'
    ? 'back in your Pixie Wallet'
    : 'back to your payment method';
  return money ? `Yes · ${money} ${where}` : `Yes · ${where}`;
}

function normalizeItem(payload, kind) {
  const outcome = payload.outcome === 'done' || payload.outcome === 'failed'
    ? payload.outcome
    : (kind === 'order_completed' ? 'done' : 'failed');
  const refunded = Boolean(payload.refunded) || kind === 'order_refunded';
  let refundAmount = Number(payload.refund_amount);
  if (refunded && !(refundAmount > 0)) refundAmount = Number(payload.total_amount) || 0;
  if (!refunded) refundAmount = 0;
  return {
    order_id: payload.order_id,
    product_name: payload.product_name || 'Top-up',
    quantity: payload.quantity,
    total_amount: payload.total_amount,
    currency: payload.currency,
    payment_method: payload.payment_method,
    outcome,
    refunded,
    refund_amount: refundAmount,
  };
}

function itemsFromRow(row) {
  const payload = row.payload || {};
  if (row.kind === 'cart_settled' && Array.isArray(payload.items) && payload.items.length) {
    return payload.items.map((item) => normalizeItem({
      ...item,
      currency: item.currency || payload.currency,
      payment_method: item.payment_method || payload.payment_method,
    }, 'cart_settled'));
  }
  return [normalizeItem(payload, row.kind)];
}

function outcomeChip(item) {
  if (item.outcome === 'done') return chip('Delivered', '#edff66', '#0c0a14');
  return chip('Failed', '#ff2f48', '#ffffff');
}

function lineItemHtml(item) {
  const qty = Number(item.quantity) > 1 ? ` × ${item.quantity}` : '';
  const id = item.order_id ? `#${shortId(item.order_id)} · ` : '';
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    <tr>
      <td valign="top" style="padding:14px 8px 4px 0;font-family:Arial,Helvetica,sans-serif;">
        <p style="margin:0;font-size:15px;font-weight:700;color:#0c0a14;">${esc(item.product_name)}${esc(qty)}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#6e6884;">${esc(`${id}${paymentLabel(item.payment_method)}`)}</p>
      </td>
      <td valign="top" align="right" style="padding:14px 0 4px;font-family:Arial,Helvetica,sans-serif;white-space:nowrap;">
        <p style="margin:0;font-size:15px;font-weight:700;color:#0c0a14;">${esc(item.total_amount !== undefined && item.total_amount !== null ? formatAmount(item.total_amount, item.currency) : '')}</p>
        <div style="margin-top:8px;">${outcomeChip(item)}</div>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="padding:2px 0 12px;border-bottom:1px solid #eceaf4;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#0c0a14;">
        Refunded: ${esc(refundNote(item))}
      </td>
    </tr>
  </table>`;
}

function receiptCopy(items, groupId) {
  const delivered = items.filter((item) => item.outcome === 'done').length;
  const failed = items.length - delivered;
  const refunded = items.filter((item) => item.refunded).length;
  const single = items.length === 1 ? items[0] : null;
  const name = single?.product_name || 'Your order';
  const id = single ? shortId(single.order_id) : shortId(groupId);

  if (single) {
    if (single.outcome === 'done' && single.refunded) {
      return {
        kicker: 'Delivered',
        title: 'Your top-up is in',
        subject: `Delivered — #${id}`,
        intro: `${name} has been delivered. Part of the payment was refunded.`,
        preheader: `${name} is delivered. ${refundNote(single)}.`,
      };
    }
    if (single.outcome === 'done') {
      return {
        kicker: 'Delivered',
        title: 'Your top-up is in',
        subject: `Delivered — #${id}`,
        intro: `${name} has been delivered.`,
        preheader: `${name} is delivered. Refunded: No.`,
      };
    }
    if (single.refunded) {
      return {
        kicker: 'Refunded',
        title: 'Your payment was returned',
        subject: `Refunded — #${id}`,
        intro: `${name} did not go through. The payment was refunded.`,
        preheader: `${name} was refunded. ${refundNote(single)}.`,
      };
    }
    return {
      kicker: 'Not completed',
      title: 'This order did not go through',
      subject: `Not completed — #${id}`,
      intro: `${name} did not go through. It was not refunded.`,
      preheader: `${name} did not go through. Refunded: No.`,
    };
  }

  const count = `${items.length} order${items.length === 1 ? '' : 's'}`;
  if (failed === 0 && refunded === 0) {
    return {
      kicker: 'Your cart',
      title: 'Your cart is in',
      subject: `Your cart is in — ${count}`,
      intro: `All ${items.length} orders in this cart were delivered. Nothing was refunded.`,
      preheader: `Your cart of ${count} is delivered. Refunded: No.`,
    };
  }
  if (delivered === 0 && refunded === items.length) {
    return {
      kicker: 'Your cart',
      title: 'Your cart was refunded',
      subject: `Your cart was refunded — ${count}`,
      intro: `None of the ${items.length} orders went through. Every payment was refunded.`,
      preheader: `Your cart of ${count} was refunded.`,
    };
  }
  if (delivered === 0) {
    return {
      kicker: 'Your cart',
      title: 'Your cart did not go through',
      subject: `Your cart did not go through — ${count}`,
      intro: `None of the ${items.length} orders went through. Refund status is on each line.`,
      preheader: `Your cart of ${count} did not go through.`,
    };
  }
  return {
    kicker: 'Your cart',
    title: 'Your cart is settled',
    subject: `Your cart is settled — ${count}`,
    intro: `${delivered} delivered, ${failed} not completed. Refund status is on each line.`,
    preheader: `Your cart of ${count} is settled. ${delivered} delivered, ${failed} not completed.`,
  };
}

function orderFooter() {
  const support = `${storeBase()}/support`;
  return `Questions about a delivery? <a href="${esc(support)}" style="color:#5724ff;text-decoration:underline;">Contact support</a> and include the order number. Order emails can be turned off in Account → Settings.`;
}

function renderReceipt(row) {
  const payload = row.payload || {};
  const items = itemsFromRow(row);
  const copy = receiptCopy(items, payload.payment_group_id);
  const lines = items.map(lineItemHtml).join('');
  const refundedTotal = items.reduce((sum, item) => sum + (item.refunded ? Number(item.refund_amount) || 0 : 0), 0);
  const currency = items.find((item) => item.currency)?.currency || payload.currency;
  const summary = items.length > 1 ? detailTable({
    'Cart total': formatAmount(payload.total_amount ?? items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0), currency),
    Refunded: refundedTotal > 0 ? formatAmount(refundedTotal, currency) : 'No',
  }) : '';
  const html = ticket({
    ...copy,
    bodyHtml: lines + summary,
    footerHtml: orderFooter(),
    ctaHref: `${storeBase()}/account?section=orders`,
    ctaLabel: 'View your orders',
  });
  const text = [
    copy.title,
    copy.intro,
    ...items.map((item) => {
      const money = item.total_amount != null ? formatAmount(item.total_amount, item.currency) : '';
      return `${item.product_name} ${money} — ${item.outcome === 'done' ? 'Delivered' : 'Failed'}. Refunded: ${refundNote(item)}`;
    }),
    `Orders: ${storeBase()}/account?section=orders`,
  ].join('\n');
  return { subject: copy.subject, html, text };
}

/** Pure: outbox row -> { subject, html, text } or null for mail we no longer send. */
export function renderNotification(row) {
  const payload = row.payload || {};
  switch (row.kind) {
    case 'order_processing':
      return null;
    case 'order_completed':
    case 'order_failed':
    case 'order_refunded':
    case 'cart_settled':
      return renderReceipt(row);
    case 'login_alert':
      return {
        subject: 'New sign-in to your PixieKat account',
        html: ticket({
          preheader: 'Your PixieKat account was just signed in.',
          kicker: 'Sign-in',
          title: 'New sign-in',
          intro: 'Your account was just signed in. If this was not you, change your password and turn on two-factor authentication.',
          bodyHtml: detailTable({
            Time: payload.at,
            'IP address': payload.ip,
            Device: payload.device,
            Browser: payload.browser,
          }),
          footerHtml: esc('You can turn these alerts off from Account → Settings → Login alerts.'),
        }),
        text: `New sign-in to your PixieKat account. IP ${payload.ip || 'unknown'}.`,
      };
    case 'leaderboard_winner': {
      const perkNames = [
        payload.frame ? `Avatar frame: ${payload.frame}` : null,
        payload.gif_avatar ? 'GIF profile picture' : null,
        Number(payload.wallet_bonus) > 0 ? `${payload.wallet_bonus} PKS wallet bonus` : null,
      ].filter(Boolean).join(', ');
      const spent = `₹${Number(payload.total_spent || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
      return {
        subject: `You placed #${payload.rank} on the ${payload.period} PixieKat leaderboard`,
        html: ticket({
          preheader: `Rank #${payload.rank} on the ${payload.period} leaderboard.`,
          kicker: payload.period || 'Leaderboard',
          title: `Rank #${payload.rank}`,
          intro: `You finished the ${payload.period} leaderboard at rank #${payload.rank} with ${spent} spent.`,
          bodyHtml: detailTable({
            Period: payload.period,
            Rank: `#${payload.rank}`,
            'Total spent': spent,
            Tier: payload.tier_label || payload.tier,
            'Perks unlocked': perkNames || undefined,
          }),
          footerHtml: esc('Perks stay active while you hold a winning rank. Check Account → Rewards & Rank for your history.'),
        }),
        text: `You placed #${payload.rank} on the ${payload.period} PixieKat leaderboard.`,
      };
    }
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

async function claimRow(supabase, id, attempts) {
  const { data: claimed } = await supabase
    .from('notification_outbox')
    .update({ status: 'sending', attempts: (attempts || 0) + 1 })
    .eq('id', id)
    .eq('status', 'pending')
    .select('id');
  return Boolean(claimed?.length);
}

async function fetchOrder(supabase, orderId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, user_id, product_name, quantity, total_amount, currency, payment_method, status, metadata')
      .eq('id', orderId)
      .maybeSingle();
    if (error || !data?.id) return null;
    return data;
  } catch (err) {
    console.error('[notify] order lookup failed:', err.message);
    return null;
  }
}

async function fetchGroupOrders(supabase, userId, groupId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, user_id, product_name, quantity, total_amount, currency, payment_method, status, metadata')
      .eq('user_id', userId)
      .eq('metadata->>payment_group_id', groupId);
    if (error || !Array.isArray(data)) return null;
    return data;
  } catch (err) {
    console.error('[notify] cart lookup failed:', err.message);
    return null;
  }
}

async function fetchRefundTotals(supabase, orderIds) {
  const totals = {};
  if (!orderIds.length) return totals;
  try {
    let query = supabase.from('wallet_transactions').select('order_id, amount').eq('type', 'refund');
    query = orderIds.length === 1 ? query.eq('order_id', orderIds[0]) : query.in('order_id', orderIds);
    const { data, error } = await query;
    if (error || !Array.isArray(data)) return totals;
    for (const tx of data) {
      totals[tx.order_id] = (totals[tx.order_id] || 0) + Number(tx.amount || 0);
    }
  } catch (err) {
    console.error('[notify] refund lookup failed:', err.message);
  }
  return totals;
}

async function fetchNotices(supabase, orderIds) {
  if (!orderIds.length) return [];
  try {
    let query = supabase.from('notification_outbox').select('id, order_id, kind, status, attempts');
    query = orderIds.length === 1 ? query.eq('order_id', orderIds[0]) : query.in('order_id', orderIds);
    const { data, error } = await query;
    if (error || !Array.isArray(data)) return [];
    return data;
  } catch (err) {
    console.error('[notify] notice lookup failed:', err.message);
    return [];
  }
}

async function foldLeftoverNotices(supabase, renderedRow, keepId) {
  if (renderedRow?.kind !== 'cart_settled') return;
  const ids = [...new Set((renderedRow.payload?.items || []).map((item) => item.order_id).filter(Boolean))];
  if (!ids.length) return;
  const notices = await fetchNotices(supabase, ids);
  for (const notice of notices) {
    if (notice.id === keepId || notice.status !== 'pending' || !FOLD_KINDS.has(notice.kind)) continue;
    if (await claimRow(supabase, notice.id, notice.attempts || 0)) {
      await markRow(supabase, notice.id, 'skipped', 'included in cart email');
    }
  }
}

async function loadDispatchContext(supabase, row) {
  const empty = { order: null, groupOrders: null, refundTotals: {}, notices: [] };
  if (!ORDER_MAIL_KINDS.has(row.kind) || !row.order_id) return empty;
  try {
    const order = await fetchOrder(supabase, row.order_id);
    if (!order) return empty;
    const groupId = String(order.metadata?.payment_group_id || '').trim();
    if (!groupId) {
      const refundTotals = await fetchRefundTotals(supabase, [order.id]);
      const notices = row.kind === 'order_refunded' ? await fetchNotices(supabase, [order.id]) : [];
      return { order, groupOrders: null, refundTotals, notices };
    }
    let groupOrders = await fetchGroupOrders(supabase, order.user_id, groupId);
    if (!Array.isArray(groupOrders)) return { order, groupOrders: null, refundTotals: {}, notices: [] };
    if (!groupOrders.some((item) => item.id === order.id)) groupOrders = [...groupOrders, order];
    else groupOrders = groupOrders.map((item) => (item.id === order.id ? { ...item, ...order } : item));
    if (!isGroupSettled(groupOrders)) return { order, groupOrders, refundTotals: {}, notices: [] };
    const ids = groupOrders.map((item) => item.id);
    return {
      order,
      groupOrders,
      refundTotals: await fetchRefundTotals(supabase, ids),
      notices: await fetchNotices(supabase, ids),
    };
  } catch (err) {
    console.error('[notify] dispatch context failed:', err.message);
    return empty;
  }
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

  const consumed = new Set();
  let sent = 0;
  for (const row of rows || []) {
    if (consumed.has(row.id)) continue;

    const context = await loadDispatchContext(supabase, row);
    const decision = prepareDispatch(row, context);
    if (!(await claimRow(supabase, row.id, row.attempts))) continue;

    if (decision.action === 'skip') {
      await markRow(supabase, row.id, 'skipped', decision.reason);
      continue;
    }

    const held = [];
    for (const id of decision.skipIds || []) {
      consumed.add(id);
      const notice = (context.notices || []).find((item) => item.id === id);
      if (await claimRow(supabase, id, notice?.attempts || 0)) held.push(id);
    }

    let delivered = false;
    try {
      const to = await resolveRecipient(supabase, { ...row, kind: decision.row.kind });
      const rendered = renderNotification(decision.row);
      if (!to || !rendered) {
        await markRow(supabase, row.id, 'skipped', decision.reason || null);
        for (const id of held) await markRow(supabase, id, 'skipped', 'included in cart email');
        continue;
      }
      await sendMail({
        from: sender(),
        to,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      await markRow(supabase, row.id, 'sent');
      for (const id of held) await markRow(supabase, id, 'skipped', 'included in cart email');
      sent += 1;
      delivered = true;
    } catch (err) {
      const dead = row.attempts + 1 >= MAX_ATTEMPTS;
      await markRow(supabase, row.id, dead ? 'failed' : 'pending', String(err.message || err).slice(0, 500));
      for (const id of held) await markRow(supabase, id, 'pending');
      console.error(`[notify] row ${row.id} ${dead ? 'failed permanently' : 'will retry'}:`, err.message);
    }
    if (delivered) {
      try {
        await foldLeftoverNotices(supabase, decision.row, row.id);
      } catch (err) {
        console.error('[notify] fold failed:', err.message);
      }
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
