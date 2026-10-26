import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  X,
  Sparkles,
  Send,
  KeyRound,
  ExternalLink,
  Copy,
  Check,
  Database,
  Layers,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Trash2,
  Bot,
  User,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import api from '../../services/api';
import {
  DURATION,
  EASE_OUT,
  expandCollapse,
  fade,
  fadeUp,
  iconSwap,
  pop,
  pressScale,
  springDrawer,
  staggerItem,
  staggerParent,
} from '../../lib/motion';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'refunded'
  | 'cancelled'
  | 'on_hold';

export interface EnrichedOrderRow {
  id: string;
  user_id: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  total_amount: number | string;
  unit_cost_price?: number | string | null;
  unit_selling_price?: number | string | null;
  currency: string;
  status: OrderStatus;
  payment_method?: string | null;
  payment_id?: string | null;
  razorpay_order_id?: string | null;
  metadata?: {
    account_fields?: Record<string, string>;
    game_id?: string;
    game_name?: string;
    game_slug?: string;
    verified_username?: string;
    contact?: { email?: string; whatsapp?: string };
    fulfill_error?: string;
    provider_delivery_uncertain?: string;
    manual_fulfillment_note?: string;
    fulfilled_at?: string;
    fulfilled_by?: string;
    supplier_order_id?: string;
    provider_mismatch?: {
      expected_provider_price: number | null;
      actual_provider_price: number;
      product_name?: string;
      provider_order_id?: string;
      refund_amount?: number;
      refund_currency?: string;
      refund_status?: 'completed' | 'failed' | 'skipped_no_expected_price';
      refund_error?: string;
    };
  } | null;
  created_at: string;
  updated_at: string;
  profiles?: Array<{ id: string; name: string; email: string }> | { id?: string; name: string; email: string } | null;
  // Enriched fields from catalog join
  resolvedGameName?: string;
  resolvedProvider?: string;
  isManualOrder?: boolean;
  supplierInfo?: {
    source?: string;
    sourceUrl?: string;
    costInr?: number | null;
  };
}

export interface ContextToggles {
  includeStoreRules: boolean;
  includeQueueSummary: boolean;
  includeSelectedOrders: boolean;
  includeCustomerPii: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatGptAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedOrders: EnrichedOrderRow[];
  allVisibleOrders: EnrichedOrderRow[];
  workspaceTitle: string;
  activeFolderLabel?: string;
}

const STORAGE_KEY_API = 'pixiekat_admin_openai_key';
const STORAGE_KEY_MODEL = 'pixiekat_admin_openai_model';
const STORAGE_KEY_HISTORY = 'pixiekat_admin_ai_chat_history_v1';

export function getOrderCustomer(order: EnrichedOrderRow): { name: string; email: string } {
  const p = order.profiles;
  if (Array.isArray(p)) {
    return {
      name: p[0]?.name || 'Unknown Customer',
      email: p[0]?.email || order.metadata?.contact?.email || '',
    };
  }
  if (p && typeof p === 'object') {
    return {
      name: p.name || 'Unknown Customer',
      email: p.email || order.metadata?.contact?.email || '',
    };
  }
  return {
    name: 'Unknown Customer',
    email: order.metadata?.contact?.email || '',
  };
}

export function formatAccountTarget(order: EnrichedOrderRow): string {
  const fields = order.metadata?.account_fields ?? {};
  const entries = Object.entries(fields).filter(([, v]) => v != null && String(v).trim() !== '');
  if (entries.length === 0) return 'No target UID';
  return entries.map(([k, v]) => `${k}: ${v}`).join(' · ');
}

export function buildPixieKatOrderContext({
  selectedOrders,
  allVisibleOrders,
  workspaceTitle,
  activeFolderLabel,
  toggles,
}: {
  selectedOrders: EnrichedOrderRow[];
  allVisibleOrders: EnrichedOrderRow[];
  workspaceTitle: string;
  activeFolderLabel?: string;
  toggles: ContextToggles;
}): string {
  const sections: string[] = [];

  if (toggles.includeStoreRules) {
    sections.push(
      [
        '## PixieKat Store & Operations Context',
        '- Platform: PixieKat Gaming Credits Storefront & Admin Operations',
        '- Currency: PKS / INR (1 PKS = ₹1 INR)',
        '- Fulfillment Modes:',
        '  * manual: Games/packs fulfilled manually by staff (e.g., BGMI Not Instant, Genshin Impact USA, Hayabusa Starlight, or custom packs). Orders stay in `processing` after payment until staff deliver credits to the player UID/Server and mark the order `completed`.',
        '  * Automated providers: Yokcash (IDR/PH/BR/GLOBAL SKUs), SmileCoin (Smile Points), SmileOne (USD). If an automated order encounters a balance/region/award issue or payment review, it may land in `on_hold`, `processing`, or carry `provider_mismatch` / `provider_delivery_uncertain` metadata.',
      ].join('\n')
    );
  }

  if (toggles.includeQueueSummary) {
    const pendingCount = allVisibleOrders.filter((o) => o.status === 'pending').length;
    const processingCount = allVisibleOrders.filter((o) => o.status === 'processing').length;
    const onHoldCount = allVisibleOrders.filter((o) => o.status === 'on_hold').length;
    const completedCount = allVisibleOrders.filter((o) => o.status === 'completed').length;
    const failedOrRefunded = allVisibleOrders.filter((o) =>
      ['failed', 'refunded', 'cancelled'].includes(o.status)
    ).length;
    const totalVolume = allVisibleOrders.reduce((s, o) => s + Number(o.total_amount || 0), 0);

    const byGame = new Map<string, { count: number; actionable: number; volume: number }>();
    for (const o of allVisibleOrders) {
      const g = o.resolvedGameName || o.metadata?.game_name || 'Other Games';
      const cur = byGame.get(g) ?? { count: 0, actionable: 0, volume: 0 };
      cur.count += 1;
      if (['pending', 'processing', 'on_hold'].includes(o.status)) cur.actionable += 1;
      cur.volume += Number(o.total_amount || 0);
      byGame.set(g, cur);
    }

    const gameLines = Array.from(byGame.entries())
      .sort((a, b) => b[1].actionable - a[1].actionable || b[1].count - a[1].count)
      .slice(0, 12)
      .map(
        ([game, info]) =>
          `  * ${game}: ${info.count} orders (${info.actionable} awaiting action) · Volume PKS ${info.volume.toFixed(2)}`
      );

    sections.push(
      [
        `## Live Workspace Summary (${workspaceTitle}${activeFolderLabel ? ` — Folder: ${activeFolderLabel}` : ''})`,
        `- Visible Orders: ${allVisibleOrders.length} (Total Volume: PKS ${totalVolume.toFixed(2)})`,
        `- Queue Breakdown: ${processingCount} processing, ${pendingCount} pending, ${onHoldCount} on_hold, ${completedCount} completed, ${failedOrRefunded} failed/refunded/cancelled`,
        ...(gameLines.length > 0 ? ['- Breakdown by Game:', ...gameLines] : []),
      ].join('\n')
    );
  }

  if (toggles.includeSelectedOrders) {
    const targetList =
      selectedOrders.length > 0 ? selectedOrders : allVisibleOrders.slice(0, 15);
    const label =
      selectedOrders.length > 0
        ? `## Selected Orders (${selectedOrders.length} explicitly selected by admin)`
        : `## Top Orders in Current View (showing ${targetList.length} of ${allVisibleOrders.length})`;

    const orderBlocks = targetList.map((o, idx) => {
      const cust = getOrderCustomer(o);
      const acct = formatAccountTarget(o);
      const lines = [
        `${idx + 1}. Order #${o.id.slice(0, 8).toUpperCase()} (id: ${o.id})`,
        `   - Game & Product: [${o.resolvedGameName || o.metadata?.game_name || 'Game'}] ${o.product_name} × ${o.quantity}`,
        `   - Fulfillment Mode: ${o.isManualOrder ? 'MANUAL' : `AUTO (${o.resolvedProvider || 'provider'})`} | Status: ${o.status.toUpperCase()}`,
        `   - Amount: ${o.currency} ${Number(o.total_amount || 0).toFixed(2)}${o.unit_cost_price != null ? ` (Unit Cost: ${Number(o.unit_cost_price).toFixed(2)})` : ''} | Payment: ${o.payment_method || 'wallet'}${o.payment_id ? ` (${o.payment_id})` : ''}`,
        `   - Placed: ${new Date(o.created_at).toISOString()}`,
      ];

      if (toggles.includeCustomerPii) {
        lines.push(
          `   - Target Account: ${acct}${o.metadata?.verified_username ? ` (Verified Name: ${o.metadata.verified_username})` : ''}`,
          `   - Customer: ${cust.name}${cust.email ? ` <${cust.email}>` : ''}${o.metadata?.contact?.whatsapp ? ` | WhatsApp: ${o.metadata.contact.whatsapp}` : ''}`
        );
      } else {
        lines.push(`   - Target Account: [Redacted by toggle]`);
      }

      if (o.metadata?.fulfill_error) {
        lines.push(`   - Fulfill Error: ${o.metadata.fulfill_error}`);
      }
      if (o.metadata?.provider_delivery_uncertain) {
        lines.push(`   - Delivery Warning: ${o.metadata.provider_delivery_uncertain}`);
      }
      if (o.metadata?.provider_mismatch) {
        const mm = o.metadata.provider_mismatch;
        lines.push(
          `   - Price Mismatch: expected ${mm.expected_provider_price}, actual ${mm.actual_provider_price}, refund ${mm.refund_amount} (${mm.refund_status})`
        );
      }
      if (o.metadata?.manual_fulfillment_note) {
        lines.push(`   - Staff Fulfillment Note: ${o.metadata.manual_fulfillment_note}`);
      }
      return lines.join('\n');
    });

    sections.push([label, ...orderBlocks].join('\n\n'));
  }

  return sections.join('\n\n');
}

export function openInChatGptWeb(contextText: string, userPrompt: string) {
  const fullPrompt = [
    userPrompt.trim() ||
      'Review these PixieKat orders and help me with manual fulfillment and next actions.',
    '',
    '--- PIXIEKAT ORDER & STORE CONTEXT ---',
    contextText,
  ].join('\n');

  navigator.clipboard?.writeText(fullPrompt).catch(() => {});

  // Keep URL query within safe browser limits while copying full context to clipboard
  const maxUrlChars = 6500;
  const urlPayload =
    fullPrompt.length > maxUrlChars
      ? `${fullPrompt.slice(0, maxUrlChars)}\n\n[Full context copied to your clipboard — press Ctrl+V if truncated]`
      : fullPrompt;

  const url = `https://chatgpt.com/?q=${encodeURIComponent(urlPayload)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  toast.success('Opened ChatGPT with PixieKat context (also copied to clipboard)');
}

const QUICK_PROMPTS = [
  {
    label: 'Supplier Batch Sheet',
    prompt:
      'Format all pending/processing manual orders into a clean supplier fulfillment sheet grouped by game, showing Order #, Product, Quantity, Player UID, Zone/Server, and Verified Username.',
  },
  {
    label: 'Audit & Prioritize Queue',
    prompt:
      'Analyze the current manual orders queue. Highlight the oldest waiting orders, high-value orders, any duplicate player UIDs, or orders with errors/on-hold flags that need immediate attention.',
  },
  {
    label: 'Draft Customer Updates',
    prompt:
      'Draft concise, friendly WhatsApp and email status messages for the selected order(s) — both a "Your manual top-up is being processed" update and a "Your credits have been delivered!" confirmation.',
  },
  {
    label: 'Profit & Cost Check',
    prompt:
      'Calculate the total revenue, estimated supplier cost, and net margin for the selected/visible orders, and flag any order where margin looks thin or mismatched.',
  },
];

const ChatGptAssistantDrawer: React.FC<ChatGptAssistantDrawerProps> = ({
  isOpen,
  onClose,
  selectedOrders,
  allVisibleOrders,
  workspaceTitle,
  activeFolderLabel,
}) => {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(STORAGE_KEY_API) || '');
  const [model, setModel] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY_MODEL) || 'gpt-4o-mini'
  );
  const [serverKeyConfigured, setServerKeyConfigured] = useState(false);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [showContextPreview, setShowContextPreview] = useState(false);
  const [copiedContext, setCopiedContext] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const reduceMotion = useReducedMotion();

  const [toggles, setToggles] = useState<ContextToggles>({
    includeStoreRules: true,
    includeQueueSummary: true,
    includeSelectedOrders: true,
    includeCustomerPii: true,
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore parse errors
    }
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Connected to **PixieKat Order Context**. I can see your live manual fulfillment queue, selected orders, player UIDs, and store rules.\n\nAsk me anything below, pick a quick action, or click **Open in ChatGPT Web** to launch `chatgpt.com` pre-loaded with this context.',
        timestamp: new Date().toISOString(),
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  // Messages present when the drawer mounts stay settled — only new ones animate in.
  const settledMessageIds = useRef<Set<string> | null>(null);
  if (settledMessageIds.current === null) {
    settledMessageIds.current = new Set(messages.map((m) => m.id));
  }

  useEffect(() => {
    if (!isOpen) return;
    api
      .get('/admin/ai/status')
      .then((res) => {
        if (res.data?.serverKeyConfigured) {
          setServerKeyConfigured(true);
        }
      })
      .catch(() => {
        // Server endpoint may not be deployed yet — local API key & ChatGPT Web still work
      });
  }, [isOpen]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(messages.slice(-30)));
    } catch {
      // ignore storage quota errors
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const contextPayload = useMemo(
    () =>
      buildPixieKatOrderContext({
        selectedOrders,
        allVisibleOrders,
        workspaceTitle,
        activeFolderLabel,
        toggles,
      }),
    [selectedOrders, allVisibleOrders, workspaceTitle, activeFolderLabel, toggles]
  );

  const isConnected = Boolean(apiKey.trim() || serverKeyConfigured);

  const handleSaveKey = (newKey: string, newModel: string) => {
    const trimmed = newKey.trim();
    setApiKey(trimmed);
    setModel(newModel);
    if (trimmed) {
      localStorage.setItem(STORAGE_KEY_API, trimmed);
    } else {
      localStorage.removeItem(STORAGE_KEY_API);
    }
    localStorage.setItem(STORAGE_KEY_MODEL, newModel);
    setShowKeyConfig(false);
    toast.success(trimmed ? 'ChatGPT API key saved locally' : 'Cleared saved API key');
  };

  const handleCopyContext = () => {
    navigator.clipboard.writeText(contextPayload);
    setCopiedContext(true);
    toast.success('PixieKat order context copied to clipboard');
    setTimeout(() => setCopiedContext(false), 2000);
  };

  const sendPrompt = async (promptText: string) => {
    const text = promptText.trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput('');
    setSending(true);

    try {
      const chatHistoryPayload = nextMessages
        .filter((m) => m.id !== 'welcome')
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      let replyText = '';

      try {
        // First try backend proxy (/api/admin/ai/chat)
        const res = await api.post('/admin/ai/chat', {
          messages: chatHistoryPayload,
          contextPrompt: contextPayload,
          apiKey: apiKey.trim() || undefined,
          model,
        });
        replyText = res.data?.reply || '';
      } catch (proxyErr: unknown) {
        // Fallback: if admin provided an API key in browser, call OpenAI directly
        if (!apiKey.trim()) {
          throw proxyErr;
        }
        const systemContent = [
          'You are the PixieKat Admin Operations & Manual Orders Assistant.',
          'PixieKat is an instant & manual gaming credits storefront (currencies: PKS and INR, 1 PKS = 1 INR).',
          'Help the admin inspect manual orders, format supplier batch sheets, draft customer messages, and audit order issues.',
          contextPayload ? `\n--- LIVE PIXIEKAT CONTEXT ---\n${contextPayload}` : '',
        ].join('\n');

        const directRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey.trim()}`,
          },
          body: JSON.stringify({
            model,
            temperature: 0.3,
            messages: [{ role: 'system', content: systemContent }, ...chatHistoryPayload],
          }),
        });
        const directData = await directRes.json().catch(() => ({}));
        if (!directRes.ok) {
          throw new Error(
            directData?.error?.message || `OpenAI API error (HTTP ${directRes.status})`
          );
        }
        replyText = directData?.choices?.[0]?.message?.content || '';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: replyText || 'No response returned.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err: unknown) {
      const errMessage =
        err instanceof Error
          ? err.message
          : 'Could not reach OpenAI API. Connect an API key or use "Open in ChatGPT Web".';
      setMessages((prev) => [
        ...prev,
        {
          id: `e_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Connection notice:** ${errMessage}\n\nYou can click **Connect API Key** above to add your OpenAI key, or click **Send to ChatGPT Web** below to open this exact prompt + context directly on \`chatgpt.com\`.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={fade}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: DURATION.fast }}
            className="fixed inset-0 z-40 bg-[#0e071d]/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.aside
            initial={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: '100%' }}
            transition={reduceMotion ? { duration: DURATION.fast } : springDrawer}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col border-l border-violet-100"
          >
            {/* Cloud Dock Dark Violet Header */}
            <div
              className="px-6 py-4 text-white flex items-center justify-between"
              style={{
                background: 'linear-gradient(135deg, #160c2e 0%, #27154a 60%, #3b1d70 100%)',
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6c49ff] to-[#a855f7] flex items-center justify-center shadow-lg shadow-violet-900/50">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold tracking-tight">ChatGPT Context Studio</h2>
                    <span
                      className={clsx(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                        isConnected
                          ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                          : 'bg-violet-400/20 text-violet-200 border border-violet-300/30'
                      )}
                    >
                      <span
                        className={clsx(
                          'w-1.5 h-1.5 rounded-full',
                          isConnected ? 'bg-emerald-400' : 'bg-violet-300'
                        )}
                      />
                      {isConnected ? `API Ready (${model})` : 'Web Bridge + Context Ready'}
                    </span>
                  </div>
                  <p className="text-xs text-violet-200/80 mt-0.5">
                    {selectedOrders.length > 0
                      ? `${selectedOrders.length} selected order${selectedOrders.length > 1 ? 's' : ''} attached to context`
                      : `Live snapshot of ${allVisibleOrders.length} orders in ${workspaceTitle}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowKeyConfig((v) => !v)}
                  className={clsx(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border',
                    showKeyConfig
                      ? 'bg-white text-[#160c2e] border-white'
                      : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
                  )}
                  title="Configure OpenAI API Key"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{apiKey ? 'API Key' : 'Connect Key'}</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-violet-200 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Collapsible API Key Config Panel */}
            <AnimatePresence>
              {showKeyConfig && (
                <motion.div
                  variants={expandCollapse}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: DURATION.base, ease: EASE_OUT }}
                  className="overflow-hidden border-b border-violet-100 bg-[#f6f4fc]"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-[#1a1033]">
                          Direct OpenAI / ChatGPT API Connection
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Enter an OpenAI API key for live in-drawer responses, or leave blank to use{' '}
                          <strong>Send to ChatGPT Web</strong> with your browser login.
                        </p>
                      </div>
                      {serverKeyConfigured && (
                        <motion.span
                          variants={pop}
                          initial="initial"
                          animate="animate"
                          className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-semibold"
                        >
                          Server Key Active
                        </motion.span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          OpenAI API Key
                        </label>
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="sk-proj-..."
                          className="w-full h-9 px-3 rounded-xl border border-violet-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#6c49ff]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                          Model
                        </label>
                        <select
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-xl border border-violet-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#6c49ff]"
                        >
                          <option value="gpt-4o-mini">gpt-4o-mini (Fast)</option>
                          <option value="gpt-4o">gpt-4o (Deep Analysis)</option>
                          <option value="o3-mini">o3-mini (Reasoning)</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      {apiKey && (
                        <button
                          type="button"
                          onClick={() => handleSaveKey('', model)}
                          className="px-3 py-1.5 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Disconnect Key
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSaveKey(apiKey, model)}
                        className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#6c49ff] text-white hover:bg-[#5b38eb] shadow-sm"
                      >
                        Save Connection
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Context Control Bar */}
            <div className="px-5 py-3 bg-[#f8f7fc] border-b border-violet-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Attached PixieKat Context
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyContext}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6c49ff] hover:text-[#5835eb]"
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={copiedContext ? 'done' : 'idle'}
                        variants={iconSwap}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={{ duration: DURATION.fast, ease: EASE_OUT }}
                        className="flex"
                      >
                        {copiedContext ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </motion.span>
                    </AnimatePresence>
                    {copiedContext ? 'Copied!' : 'Copy Context'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowContextPreview((v) => !v)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600 hover:text-gray-900"
                  >
                    <span>{showContextPreview ? 'Hide Payload' : 'Inspect Payload'}</span>
                    {showContextPreview ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              <motion.div
                variants={staggerParent}
                initial="initial"
                animate="animate"
                className="flex flex-wrap gap-1.5"
              >
                {[
                  {
                    key: 'includeStoreRules' as const,
                    label: 'Store & Provider Rules',
                    icon: ShieldCheck,
                  },
                  {
                    key: 'includeQueueSummary' as const,
                    label: `Queue Summary (${allVisibleOrders.length})`,
                    icon: Layers,
                  },
                  {
                    key: 'includeSelectedOrders' as const,
                    label:
                      selectedOrders.length > 0
                        ? `Selected Orders (${selectedOrders.length})`
                        : `Top Orders (${Math.min(15, allVisibleOrders.length)})`,
                    icon: Database,
                  },
                  {
                    key: 'includeCustomerPii' as const,
                    label: 'Player UIDs & Contact',
                    icon: UserCheck,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = toggles[item.key];
                  return (
                    <motion.button
                      key={item.key}
                      type="button"
                      variants={staggerItem}
                      transition={{ duration: DURATION.base, ease: EASE_OUT }}
                      {...pressScale}
                      onClick={() =>
                        setToggles((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                      }
                      className={clsx(
                        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-colors border',
                        active
                          ? 'bg-[#6c49ff]/10 text-[#4c28d9] border-[#6c49ff]/30 shadow-2xs'
                          : 'bg-white text-gray-400 border-gray-200 hover:text-gray-600'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </motion.button>
                  );
                })}
              </motion.div>

              <AnimatePresence>
                {showContextPreview && (
                  <motion.div
                    variants={expandCollapse}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: DURATION.base, ease: EASE_OUT }}
                    className="overflow-hidden"
                  >
                    <pre className="mt-1 p-3 rounded-xl bg-[#140b29] text-violet-100 text-[11px] font-mono max-h-44 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {contextPayload || 'No context toggles enabled.'}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Prompt Pills */}
            <motion.div
              variants={staggerParent}
              initial="initial"
              animate="animate"
              className="px-5 py-2.5 border-b border-gray-100 bg-white flex items-center gap-1.5 overflow-x-auto"
            >
              {QUICK_PROMPTS.map((qp) => (
                <motion.button
                  key={qp.label}
                  type="button"
                  variants={staggerItem}
                  transition={{ duration: DURATION.base, ease: EASE_OUT }}
                  {...pressScale}
                  onClick={() => {
                    if (isConnected) {
                      void sendPrompt(qp.prompt);
                    } else {
                      setInput(qp.prompt);
                    }
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-full bg-[#f4f3f9] hover:bg-violet-100/80 text-[#23153c] text-xs font-medium transition-colors border border-violet-100"
                >
                  ✨ {qp.label}
                </motion.button>
              ))}
            </motion.div>

            {/* Chat Transcript */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 bg-gradient-to-b from-white to-[#faf9fe]">
              {messages.map((m) => {
                const isUser = m.role === 'user';
                return (
                  <motion.div
                    key={m.id}
                    initial={
                      settledMessageIds.current?.has(m.id) || reduceMotion
                        ? false
                        : { opacity: 0, y: 10 }
                    }
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: DURATION.base, ease: EASE_OUT }}
                    className={clsx('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#6c49ff] to-[#9333ea] flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={clsx(
                        'max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed',
                        isUser
                          ? 'bg-[#1a1033] text-white rounded-br-sm shadow-sm'
                          : 'bg-[#f4f3f9] text-gray-800 border border-violet-100/80 rounded-bl-sm'
                      )}
                    >
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      {!isUser && m.id !== 'welcome' && (
                        <div className="mt-2 pt-2 border-t border-violet-200/50 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(m.content);
                              toast.success('Response copied');
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-[#6c49ff]"
                          >
                            <Copy className="w-3 h-3" /> Copy
                          </button>
                        </div>
                      )}
                    </div>
                    {isUser && (
                      <div className="w-7 h-7 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-4 h-4 text-[#6c49ff]" />
                      </div>
                    )}
                  </motion.div>
                );
              })}

              <AnimatePresence>
                {sending && (
                  <motion.div
                    variants={fadeUp}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: DURATION.fast, ease: EASE_OUT }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#6c49ff] to-[#9333ea] flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="rounded-2xl bg-[#f4f3f9] border border-violet-100 px-4 py-2.5 text-xs text-gray-600 inline-flex items-center gap-1.5">
                      Analyzing PixieKat order context
                      <span className="inline-flex items-center gap-1" aria-hidden>
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            animate={{ opacity: [0.25, 1, 0.25] }}
                            transition={{
                              duration: 1.1,
                              repeat: Infinity,
                              delay: i * 0.18,
                              ease: 'easeInOut',
                            }}
                            className="w-1 h-1 rounded-full bg-[#6c49ff]"
                          />
                        ))}
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* Composer & Web Bridge Footer */}
            <div className="p-4 border-t border-violet-100 bg-white space-y-2.5">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void sendPrompt(input);
                    }
                  }}
                  rows={2}
                  placeholder="Ask ChatGPT about selected orders, UIDs, supplier batching, or customer replies..."
                  className="flex-1 rounded-2xl border border-violet-200 bg-[#f8f7fc] px-3.5 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6c49ff] resize-none"
                />
                <motion.button
                  type="button"
                  {...pressScale}
                  onClick={() => void sendPrompt(input)}
                  disabled={sending || !input.trim()}
                  className="h-10 px-4 rounded-2xl bg-gradient-to-r from-[#6c49ff] to-[#8b5cf6] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-md shadow-violet-500/20 hover:opacity-95 disabled:opacity-40 transition-opacity"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ask AI</span>
                </motion.button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMessages([
                      {
                        id: 'welcome',
                        role: 'assistant',
                        content:
                          'Chat history cleared. Current PixieKat order context is still attached and ready.',
                        timestamp: new Date().toISOString(),
                      },
                    ]);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600"
                >
                  <Trash2 className="w-3 h-3" /> Clear chat
                </button>

                <button
                  type="button"
                  onClick={() => openInChatGptWeb(contextPayload, input)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1a1033] hover:bg-[#28184d] text-white text-xs font-semibold transition-colors shadow-sm"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-violet-300" />
                  <span>Send Context to ChatGPT Web (chatgpt.com)</span>
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatGptAssistantDrawer;
