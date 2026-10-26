import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Search,
  RefreshCw,
  Download,
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  MoreHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  ShieldAlert,
  Gamepad2,
  FolderOpen,
  Lock,
  Zap,
  Send,
  Eye,
  CheckCheck,
  PauseCircle,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import { supabase } from '../lib/supabase';
import axios from 'axios';
import api from '../services/api';
import OrderDrawer from '../components/orders/OrderDrawer';
import ChatGptAssistantDrawer, {
  type EnrichedOrderRow,
  type OrderStatus,
  buildPixieKatOrderContext,
  formatAccountTarget,
  getOrderCustomer,
  openInChatGptWeb,
} from '../components/orders/ChatGptAssistantDrawer';
import {
  badgePop,
  DURATION,
  EASE_OUT,
  iconSwap,
  pop,
  pressScale,
  springSnappy,
  springSoft,
  staggerDelay,
} from '../lib/motion';

interface ManualOrdersProps {
  mode?: 'manual' | 'history';
}

interface CatalogProductRow {
  id: string;
  name: string;
  game_id: string;
  price: number | string;
  cost_price?: number | string | null;
  provider_product_id?: string | null;
  sku?: string | null;
  metadata?: Record<string, unknown> | null;
  game?:
    | {
        id: string;
        name: string;
        slug?: string;
        provider?: string | null;
        metadata?: Record<string, unknown> | null;
      }
    | Array<{
        id: string;
        name: string;
        slug?: string;
        provider?: string | null;
        metadata?: Record<string, unknown> | null;
      }>
    | null;
}

interface FolderCardItem {
  id: string;
  title: string;
  subtitle: string;
  orderCount: number;
  actionableCount: number;
  volume: number;
  badgeColor: string;
  iconBg: string;
  initials: string;
  customers: Array<{ name: string; email: string }>;
}

const PAGE_SIZE = 15;

const STATUS_BADGE: Record<OrderStatus, { label: string; pill: string; dot: string }> = {
  pending: {
    label: 'Pending',
    pill: 'bg-amber-50 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  processing: {
    label: 'Processing',
    pill: 'bg-violet-50 text-[#5b38eb] border-violet-200',
    dot: 'bg-[#6c49ff]',
  },
  completed: {
    label: 'Completed',
    pill: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  on_hold: {
    label: 'On Hold',
    pill: 'bg-orange-50 text-orange-800 border-orange-200',
    dot: 'bg-orange-500',
  },
  failed: {
    label: 'Failed',
    pill: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
  },
  refunded: {
    label: 'Refunded',
    pill: 'bg-purple-50 text-purple-800 border-purple-200',
    dot: 'bg-purple-500',
  },
  cancelled: {
    label: 'Cancelled',
    pill: 'bg-gray-100 text-gray-700 border-gray-200',
    dot: 'bg-gray-400',
  },
};

const ICON_PALETTES = [
  { bg: 'bg-[#2563eb]', light: 'bg-blue-50 text-blue-600' },
  { bg: 'bg-[#6c49ff]', light: 'bg-violet-50 text-[#6c49ff]' },
  { bg: 'bg-[#16a34a]', light: 'bg-emerald-50 text-emerald-600' },
  { bg: 'bg-[#e11d48]', light: 'bg-rose-50 text-rose-600' },
  { bg: 'bg-[#d97706]', light: 'bg-amber-50 text-amber-600' },
  { bg: 'bg-[#0891b2]', light: 'bg-cyan-50 text-cyan-600' },
];

const AVATAR_GRADIENTS = [
  'from-violet-600 to-indigo-600',
  'from-rose-500 to-orange-500',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-blue-600',
  'from-fuchsia-500 to-purple-600',
];

function formatRelativeTime(ts: string): string {
  const diffMs = Date.now() - new Date(ts).getTime();
  const mins = Math.max(1, Math.floor(diffMs / 60000));
  if (mins < 60) return `Placed ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Placed ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Placed ${days}d ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateShort(ts: string): string {
  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInitials(label: string): string {
  const words = label
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'PK';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function downloadOrdersCsv(orders: EnrichedOrderRow[], prefix: string) {
  const rows = [
    [
      'Order ID',
      'Mode',
      'Game',
      'Product',
      'Quantity',
      'Amount',
      'Currency',
      'Status',
      'Target Account',
      'Verified Username',
      'Customer',
      'Email',
      'Payment Method',
      'Fulfillment Note',
      'Created At',
    ],
    ...orders.map((o) => {
      const cust = getOrderCustomer(o);
      return [
        o.id,
        o.isManualOrder ? 'manual' : o.resolvedProvider || 'auto',
        o.resolvedGameName || o.metadata?.game_name || '',
        o.product_name,
        String(o.quantity),
        String(o.total_amount),
        o.currency,
        o.status,
        formatAccountTarget(o),
        o.metadata?.verified_username ?? '',
        cust.name,
        cust.email,
        o.payment_method ?? '',
        o.metadata?.manual_fulfillment_note ?? '',
        o.created_at,
      ];
    }),
  ];
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Draw-on checkmark — the stroke writes itself in, then eases out on uncheck. */
function CheckDraw({ checked }: { checked: boolean }) {
  return (
    <svg viewBox="0 0 20 20" className="w-3.5 h-3.5" fill="none" aria-hidden>
      <motion.path
        d="M4.5 10.5l3.5 3.5 7.5-8"
        stroke="currentColor"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
        transition={{ duration: DURATION.base, ease: EASE_OUT }}
      />
    </svg>
  );
}

/** Cloud Dock checkbox — draw-on check + a soft press/pop. */
function DockCheckbox({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileTap={{ scale: 0.82 }}
      className={clsx(
        'w-5 h-5 rounded-md border flex items-center justify-center transition-colors',
        checked
          ? 'bg-[#6c49ff] border-[#6c49ff] text-white shadow-xs'
          : 'border-gray-300 bg-white hover:border-[#6c49ff]'
      )}
      aria-label={label}
      aria-pressed={checked}
    >
      <motion.span
        initial={false}
        animate={{ scale: checked ? 1 : 0.55 }}
        transition={springSnappy}
        className="flex"
      >
        <CheckDraw checked={checked} />
      </motion.span>
    </motion.button>
  );
}

/** Icon-only copy button: copy glyph swaps to a check for a beat. */
function CopyTargetButton({ text, toastLabel }: { text: string; toastLabel: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  return (
    <motion.button
      type="button"
      {...pressScale}
      onClick={() => {
        navigator.clipboard.writeText(text);
        toast.success(toastLabel);
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1600);
      }}
      className="p-1.5 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-[#6c49ff] transition-colors"
      title="Copy player UID / Zone"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? 'done' : 'idle'}
          variants={iconSwap}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: DURATION.fast, ease: EASE_OUT }}
          className="flex"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

/** Labeled copy button used inside the fulfillment modal. */
function CopyUidButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  return (
    <motion.button
      type="button"
      {...pressScale}
      onClick={() => {
        navigator.clipboard.writeText(text);
        toast.success('Copied target UID');
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1600);
      }}
      className="px-2.5 py-1 rounded-lg bg-white text-[#6c49ff] font-semibold text-[11px] border border-violet-200 shrink-0 inline-flex items-center gap-1"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? 'done' : 'idle'}
          variants={iconSwap}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: DURATION.fast, ease: EASE_OUT }}
          className="inline-flex items-center gap-1"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy UID'}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

const ManualOrders: React.FC<ManualOrdersProps> = ({ mode = 'manual' }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [orders, setOrders] = useState<EnrichedOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [activeFolder, setActiveFolder] = useState<string>(
    mode === 'manual' ? 'queue' : 'all_history'
  );
  const [activeTab, setActiveTab] = useState<string>(
    mode === 'manual' ? 'needs_fulfillment' : 'all_history'
  );
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drawerOrder, setDrawerOrder] = useState<EnrichedOrderRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [breadcrumbMenuOpen, setBreadcrumbMenuOpen] = useState(false);

  const reduceMotion = useReducedMotion();
  // Row entrance stagger runs once — page/filter changes afterwards swap instantly.
  const rowsIntroduced = useRef(false);

  // Quick Fulfill Modal state
  const [fulfillModalOrders, setFulfillModalOrders] = useState<EnrichedOrderRow[]>([]);
  const [fulfillNote, setFulfillNote] = useState('');
  const [supplierOrderId, setSupplierOrderId] = useState('');
  const [fulfillTargetStatus, setFulfillTargetStatus] = useState<OrderStatus>('completed');
  const [fulfilling, setFulfilling] = useState(false);

  useEffect(() => {
    setActiveFolder(mode === 'manual' ? 'queue' : 'all_history');
    setActiveTab(mode === 'manual' ? 'needs_fulfillment' : 'all_history');
    setPage(1);
    setSelectedIds(new Set());
  }, [mode]);

  const fetchWorkspaceData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const PAGE_LIMIT = 1000;
      const rawOrders: EnrichedOrderRow[] = [];

      for (let from = 0; from < 10000; from += PAGE_LIMIT) {
        const { data, error: ordersError } = await supabase
          .from('orders')
          .select(
            `id, user_id, product_id, product_name, quantity, total_amount, unit_cost_price, unit_selling_price, currency, status, payment_method, payment_id, razorpay_order_id, metadata, created_at, updated_at, profiles:user_id (id, name, email)`
          )
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_LIMIT - 1);

        if (ordersError) throw new Error(ordersError.message);
        rawOrders.push(...((data as unknown as EnrichedOrderRow[]) ?? []));
        if (!data || data.length < PAGE_LIMIT) break;
      }

      const { data: productsData } = await supabase
        .from('products')
        .select(
          'id, name, game_id, price, cost_price, provider_product_id, sku, metadata, game:games (id, name, slug, provider, metadata)'
        )
        .limit(2000);

      const { data: gamesData } = await supabase
        .from('games')
        .select('id, name, slug, provider, metadata')
        .limit(500);

      const productById = new Map<string, CatalogProductRow>();
      for (const p of (productsData as unknown as CatalogProductRow[]) ?? []) {
        productById.set(p.id, p);
      }

      const gameById = new Map<
        string,
        { id: string; name: string; slug?: string; provider?: string | null }
      >();
      for (const g of (gamesData as Array<{
        id: string;
        name: string;
        slug?: string;
        provider?: string | null;
      }>) ?? []) {
        gameById.set(g.id, g);
      }

      const enriched = rawOrders.map((order): EnrichedOrderRow => {
        const prod = order.product_id ? productById.get(order.product_id) : undefined;
        const rawGame = Array.isArray(prod?.game) ? prod?.game[0] : prod?.game;
        const fallbackGame = order.metadata?.game_id
          ? gameById.get(order.metadata.game_id)
          : undefined;

        const gameName =
          rawGame?.name ||
          fallbackGame?.name ||
          order.metadata?.game_name ||
          (order.product_name.includes('—')
            ? order.product_name.split('—')[0].trim()
            : 'Store Credit');

        const provider =
          rawGame?.provider ||
          fallbackGame?.provider ||
          (prod?.metadata?.fulfillment_mode === 'manual' ? 'manual' : undefined) ||
          'auto';

        const metaObj = (order.metadata ?? {}) as Record<string, unknown>;
        const prodMeta = (prod?.metadata ?? {}) as Record<string, unknown>;

        const isManual =
          provider === 'manual' ||
          prodMeta.fulfillment_mode === 'manual' ||
          metaObj.fulfillment_mode === 'manual' ||
          Boolean(metaObj.manual_fulfillment_note) ||
          Boolean(metaObj.fulfilled_by === 'manual_admin') ||
          (['pending', 'processing', 'on_hold'].includes(order.status) && !metaObj.fulfill_result);

        return {
          ...order,
          resolvedGameName: gameName,
          resolvedProvider: provider,
          isManualOrder: isManual,
          supplierInfo: {
            source: String(prodMeta.pricing_source || prodMeta.source || ''),
            sourceUrl: String(prodMeta.source_url || ''),
            costInr:
              prodMeta.tangyan_price_inr != null
                ? Number(prodMeta.tangyan_price_inr)
                : prod?.cost_price != null
                ? Number(prod.cost_price)
                : order.unit_cost_price != null
                ? Number(order.unit_cost_price)
                : null,
          },
        };
      });

      setOrders(enriched);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorkspaceData();
  }, [fetchWorkspaceData]);

  // Customer order count map for the "+N" badge in the Customer column
  const customerOrderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of orders) {
      counts.set(o.user_id, (counts.get(o.user_id) ?? 0) + 1);
    }
    return counts;
  }, [orders]);

  // Folder Cards (matching "Shared Folders" in the Cloud Dock reference design)
  const folderCards: FolderCardItem[] = useMemo(() => {
    const collectCustomers = (list: EnrichedOrderRow[]) => {
      const seen = new Set<string>();
      const out: Array<{ name: string; email: string }> = [];
      for (const o of list) {
        if (!seen.has(o.user_id)) {
          seen.add(o.user_id);
          out.push(getOrderCustomer(o));
        }
      }
      return out;
    };

    const sumVolume = (list: EnrichedOrderRow[]) =>
      list.reduce((s, o) => s + Number(o.total_amount || 0), 0);

    const actionableList = orders.filter(
      (o) =>
        ['pending', 'processing', 'on_hold'].includes(o.status) &&
        (o.isManualOrder ||
          o.status === 'on_hold' ||
          Boolean(o.metadata?.provider_delivery_uncertain))
    );

    const manualGamesOrders = orders.filter((o) => o.isManualOrder);
    const flaggedOrders = orders.filter(
      (o) =>
        o.status === 'on_hold' ||
        Boolean(o.metadata?.provider_mismatch) ||
        Boolean(o.metadata?.provider_delivery_uncertain) ||
        Boolean(o.metadata?.fulfill_error)
    );

    // Group by top games (preferring manual games in manual mode)
    const byGame = new Map<string, EnrichedOrderRow[]>();
    const sourceForGames =
      mode === 'manual' && manualGamesOrders.length > 0 ? manualGamesOrders : orders;
    for (const o of sourceForGames) {
      const gName = o.resolvedGameName || 'General';
      const arr = byGame.get(gName) ?? [];
      arr.push(o);
      byGame.set(gName, arr);
    }

    const topGameEntries = Array.from(byGame.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 2);

    const cards: FolderCardItem[] =
      mode === 'manual'
        ? [
            {
              id: 'queue',
              title: 'Manual Fulfillment Queue',
              subtitle: `${actionableList.length} orders, PKS ${sumVolume(actionableList).toFixed(0)}`,
              orderCount: actionableList.length,
              actionableCount: actionableList.length,
              volume: sumVolume(actionableList),
              badgeColor: '#6c49ff',
              iconBg: 'bg-[#6c49ff]',
              initials: 'MQ',
              customers: collectCustomers(actionableList),
            },
            ...topGameEntries.map(([gName, gOrders], i) => ({
              id: `game:${gName}`,
              title: gName,
              subtitle: `${gOrders.length} orders, PKS ${sumVolume(gOrders).toFixed(0)}`,
              orderCount: gOrders.length,
              actionableCount: gOrders.filter((o) =>
                ['pending', 'processing', 'on_hold'].includes(o.status)
              ).length,
              volume: sumVolume(gOrders),
              badgeColor: i === 0 ? '#2563eb' : '#16a34a',
              iconBg: i === 0 ? 'bg-blue-600' : 'bg-emerald-600',
              initials: getInitials(gName),
              customers: collectCustomers(gOrders),
            })),
            {
              id: 'flagged',
              title: 'Flagged & Hold Review',
              subtitle: `${flaggedOrders.length} orders, PKS ${sumVolume(flaggedOrders).toFixed(0)}`,
              orderCount: flaggedOrders.length,
              actionableCount: flaggedOrders.filter((o) => o.status === 'on_hold').length,
              volume: sumVolume(flaggedOrders),
              badgeColor: '#e11d48',
              iconBg: 'bg-rose-600',
              initials: 'FH',
              customers: collectCustomers(flaggedOrders),
            },
          ]
        : [
            {
              id: 'all_history',
              title: 'Complete Order Archive',
              subtitle: `${orders.length} orders, PKS ${sumVolume(orders).toFixed(0)}`,
              orderCount: orders.length,
              actionableCount: actionableList.length,
              volume: sumVolume(orders),
              badgeColor: '#6c49ff',
              iconBg: 'bg-[#6c49ff]',
              initials: 'OA',
              customers: collectCustomers(orders),
            },
            ...topGameEntries.map(([gName, gOrders], i) => ({
              id: `game:${gName}`,
              title: gName,
              subtitle: `${gOrders.length} orders, PKS ${sumVolume(gOrders).toFixed(0)}`,
              orderCount: gOrders.length,
              actionableCount: gOrders.filter((o) => o.status === 'completed').length,
              volume: sumVolume(gOrders),
              badgeColor: i === 0 ? '#2563eb' : '#16a34a',
              iconBg: i === 0 ? 'bg-blue-600' : 'bg-emerald-600',
              initials: getInitials(gName),
              customers: collectCustomers(gOrders),
            })),
            {
              id: 'manual_only',
              title: 'Manual Fulfillment Log',
              subtitle: `${manualGamesOrders.length} orders, PKS ${sumVolume(manualGamesOrders).toFixed(0)}`,
              orderCount: manualGamesOrders.length,
              actionableCount: manualGamesOrders.length,
              volume: sumVolume(manualGamesOrders),
              badgeColor: '#d97706',
              iconBg: 'bg-amber-600',
              initials: 'MF',
              customers: collectCustomers(manualGamesOrders),
            },
          ];

    return cards;
  }, [orders, mode]);

  // Filter orders by active folder + active tab + search + status dropdown
  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();

    return orders.filter((o) => {
      // Folder filter
      if (activeFolder === 'queue') {
        const inQueue =
          (['pending', 'processing', 'on_hold'].includes(o.status) && o.isManualOrder) ||
          o.status === 'on_hold' ||
          Boolean(o.metadata?.provider_delivery_uncertain);
        // If user explicitly switched tab to completed/all, let tab win
        if (activeTab === 'needs_fulfillment' && !inQueue && orders.some((x) => x.isManualOrder)) {
          return false;
        }
      } else if (activeFolder === 'flagged') {
        const isFlagged =
          o.status === 'on_hold' ||
          Boolean(o.metadata?.provider_mismatch) ||
          Boolean(o.metadata?.provider_delivery_uncertain) ||
          Boolean(o.metadata?.fulfill_error);
        if (!isFlagged) return false;
      } else if (activeFolder === 'manual_only') {
        if (!o.isManualOrder) return false;
      } else if (activeFolder.startsWith('game:')) {
        const gName = activeFolder.slice(5);
        if ((o.resolvedGameName || 'General') !== gName) return false;
      }

      // Segmented Tab filter
      if (activeTab === 'needs_fulfillment') {
        const isActionable = ['pending', 'processing', 'on_hold'].includes(o.status);
        if (!isActionable) return false;
      } else if (activeTab === 'manual_catalog') {
        if (!o.isManualOrder) return false;
      } else if (activeTab === 'completed_manual') {
        if (o.status !== 'completed' || !o.isManualOrder) return false;
      } else if (activeTab === 'completed_all') {
        if (o.status !== 'completed') return false;
      } else if (activeTab === 'refunded_failed') {
        if (!['refunded', 'failed', 'cancelled'].includes(o.status)) return false;
      }

      // Status select override
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;

      if (!term) return true;
      const cust = getOrderCustomer(o);
      const acct = formatAccountTarget(o);
      return [
        o.id,
        o.product_name,
        o.resolvedGameName ?? '',
        cust.name,
        cust.email,
        acct,
        o.metadata?.verified_username ?? '',
        o.payment_id ?? '',
        o.razorpay_order_id ?? '',
      ].some((v) => v.toLowerCase().includes(term));
    });
  }, [orders, activeFolder, activeTab, statusFilter, search]);

  // Spotlight cards ("Recent edited" in Cloud Dock reference image)
  const spotlightOrders = useMemo(() => {
    if (mode === 'manual') {
      const actionable = orders.filter((o) =>
        ['processing', 'pending', 'on_hold'].includes(o.status)
      );
      if (actionable.length > 0) return actionable.slice(0, 3);
      const manual = orders.filter((o) => o.isManualOrder);
      if (manual.length > 0) return manual.slice(0, 3);
    }
    return orders.slice(0, 3);
  }, [orders, mode]);

  // Progress bar stats (matching "Basic Storage 50GB / 100GB" in Cloud Dock image)
  const progressStats = useMemo(() => {
    const manualPool = orders.filter((o) => o.isManualOrder);
    const pool = mode === 'manual' && manualPool.length > 0 ? manualPool : orders;
    const completed = pool.filter((o) => o.status === 'completed').length;
    const actionable = pool.filter((o) =>
      ['pending', 'processing', 'on_hold'].includes(o.status)
    ).length;
    const total = Math.max(1, completed + actionable);
    const pct = Math.min(100, Math.round((completed / total) * 100));
    return {
      completed,
      actionable,
      total: pool.length,
      pct,
    };
  }, [orders, mode]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = useMemo(
    () => filteredOrders.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredOrders, page]
  );

  useEffect(() => {
    if (!loading && paginatedOrders.length > 0) rowsIntroduced.current = true;
  }, [loading, paginatedOrders.length]);

  const selectedOrdersList = useMemo(
    () => orders.filter((o) => selectedIds.has(o.id)),
    [orders, selectedIds]
  );

  // Deep-link support (?order=<id>)
  useEffect(() => {
    const orderId = searchParams.get('order');
    if (!orderId || drawerOpen || orders.length === 0) return;
    const match = orders.find((o) => o.id === orderId);
    if (match) {
      setDrawerOrder(match);
      setDrawerOpen(true);
    }
  }, [orders, searchParams, drawerOpen]);

  const openOrderDetails = (order: EnrichedOrderRow) => {
    setDrawerOrder(order);
    setDrawerOpen(true);
    setSearchParams({ order: order.id }, { replace: true });
  };

  const closeOrderDetails = () => {
    setDrawerOpen(false);
    setDrawerOrder(null);
    if (searchParams.get('order')) {
      setSearchParams({}, { replace: true });
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectPage = () => {
    const pageIds = paginatedOrders.map((o) => o.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const openQuickFulfillModal = (
    targetOrders: EnrichedOrderRow[],
    defaultStatus: OrderStatus = 'completed'
  ) => {
    if (targetOrders.length === 0) return;
    setFulfillModalOrders(targetOrders);
    setFulfillTargetStatus(defaultStatus);
    setFulfillNote(
      targetOrders.length === 1
        ? targetOrders[0].metadata?.manual_fulfillment_note || ''
        : ''
    );
    setSupplierOrderId(
      targetOrders.length === 1 ? targetOrders[0].metadata?.supplier_order_id || '' : ''
    );
  };

  const handleConfirmManualFulfill = async () => {
    if (fulfillModalOrders.length === 0 || fulfilling) return;
    setFulfilling(true);
    const nowIso = new Date().toISOString();
    let successCount = 0;

    try {
      for (const ord of fulfillModalOrders) {
        // Service-role write via the server — direct PostgREST updates can be
        // silently dropped by the orders UPDATE policy (0 rows, no error).
        await api.post(`/admin/orders/${ord.id}/status`, {
          status: fulfillTargetStatus,
          ...(fulfillNote.trim() ? { note: fulfillNote.trim() } : {}),
          ...(supplierOrderId.trim() ? { supplierOrderId: supplierOrderId.trim() } : {}),
        });
        successCount += 1;
      }

      const updatedIds = new Set(fulfillModalOrders.map((o) => o.id));
      setOrders((prev) =>
        prev.map((o) =>
          updatedIds.has(o.id)
            ? {
                ...o,
                status: fulfillTargetStatus,
                updated_at: nowIso,
                metadata: {
                  ...(o.metadata ?? {}),
                  ...(fulfillNote.trim() ? { manual_fulfillment_note: fulfillNote.trim() } : {}),
                  ...(supplierOrderId.trim() ? { supplier_order_id: supplierOrderId.trim() } : {}),
                  ...(fulfillTargetStatus === 'completed'
                    ? { fulfilled_at: nowIso, fulfilled_by: 'manual_admin' }
                    : {}),
                },
              }
            : o
        )
      );

      toast.success(
        `Updated ${successCount} order${successCount > 1 ? 's' : ''} to ${STATUS_BADGE[fulfillTargetStatus].label}`
      );
      setFulfillModalOrders([]);
    } catch (err: unknown) {
      const axData = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string; message?: string } | undefined)
        : undefined;
      toast.error(axData?.error || axData?.message || (err instanceof Error ? err.message : 'Failed to update order status'));
    } finally {
      setFulfilling(false);
    }
  };

  const dockTargetOrder =
    selectedOrdersList[0] || paginatedOrders[0] || filteredOrders[0] || null;

  const activeFolderObj = folderCards.find((f) => f.id === activeFolder);
  const workspaceTitle = mode === 'manual' ? 'Manual Orders' : 'Order History';

  const handleQuickSendToChatGptWeb = (targetOrders?: EnrichedOrderRow[]) => {
    const context = buildPixieKatOrderContext({
      selectedOrders: targetOrders ?? selectedOrdersList,
      allVisibleOrders: filteredOrders,
      workspaceTitle,
      activeFolderLabel: activeFolderObj?.title,
      toggles: {
        includeStoreRules: true,
        includeQueueSummary: true,
        includeSelectedOrders: true,
        includeCustomerPii: true,
      },
    });
    openInChatGptWeb(
      context,
      targetOrders && targetOrders.length === 1
        ? `Analyze PixieKat Order #${targetOrders[0].id.slice(0, 8).toUpperCase()} (${targetOrders[0].product_name}) and prepare manual fulfillment instructions & customer update:`
        : `Review these ${workspaceTitle} in PixieKat and assist with fulfillment, verification, and next steps:`
    );
  };

  const tabItems =
    mode === 'manual'
      ? [
          {
            id: 'needs_fulfillment',
            label: 'Needs Fulfillment',
            count: orders.filter((o) =>
              ['pending', 'processing', 'on_hold'].includes(o.status)
            ).length,
          },
          {
            id: 'manual_catalog',
            label: 'Manual Games',
            count: orders.filter((o) => o.isManualOrder).length,
          },
          {
            id: 'completed_manual',
            label: 'Fulfilled Manual',
            count: orders.filter((o) => o.status === 'completed' && o.isManualOrder).length,
          },
          {
            id: 'all_orders',
            label: 'All Store Orders',
            count: orders.length,
          },
        ]
      : [
          {
            id: 'all_history',
            label: 'Recently Opened / All',
            count: orders.length,
          },
          {
            id: 'completed_all',
            label: 'Completed Orders',
            count: orders.filter((o) => o.status === 'completed').length,
          },
          {
            id: 'refunded_failed',
            label: 'Refunded & Failed',
            count: orders.filter((o) =>
              ['refunded', 'failed', 'cancelled'].includes(o.status)
            ).length,
          },
          {
            id: 'manual_catalog',
            label: 'Manual Fulfillment Log',
            count: orders.filter((o) => o.isManualOrder).length,
          },
        ];

  return (
    <div className="min-h-full rounded-[32px] bg-white border border-violet-100/90 shadow-[0_20px_60px_rgba(26,16,51,0.06)] p-5 sm:p-7 space-y-7">
      {/* Top Cloud Dock Progress Bar + AI Connection Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-violet-100/80">
        {/* Progress Widget (matches "Basic Storage 50GB / 100GB" in Cloud Dock reference) */}
        <div className="flex items-center gap-4 min-w-[280px] sm:min-w-[340px]">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-sky-100 to-violet-100 flex items-center justify-center shrink-0 shadow-xs">
            <Layers className="w-5 h-5 text-[#6c49ff]" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-[#5b38eb]">
                {mode === 'manual' ? 'Manual Queue Load' : 'Fulfillment Archive'}
              </span>
              <span className="font-semibold text-gray-500 tabular-nums">
                {progressStats.completed} Fulfilled / {progressStats.total} Total (
                {progressStats.actionable} Actionable)
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-[#ede9fe] overflow-hidden">
              <motion.div
                initial={false}
                animate={{ width: `${progressStats.pct}%` }}
                transition={springSoft}
                className="h-full rounded-full bg-gradient-to-r from-[#6c49ff] via-[#8b5cf6] to-[#a855f7]"
              />
            </div>
          </div>
        </div>

        {/* Right Action Strip: ChatGPT Context Connection + Refresh + Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          <motion.button
            type="button"
            {...pressScale}
            onClick={() => setAiDrawerOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white shadow-lg shadow-violet-500/25 hover:opacity-95 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, #6c49ff 0%, #8b5cf6 55%, #a855f7 100%)',
            }}
          >
            <Sparkles className="w-4 h-4" />
            <span>Connect ChatGPT</span>
            <motion.span
              key={selectedOrdersList.length}
              variants={badgePop}
              initial="initial"
              animate="animate"
              className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-semibold tabular-nums"
            >
              {selectedOrdersList.length > 0
                ? `${selectedOrdersList.length} selected`
                : 'Live Context'}
            </motion.span>
          </motion.button>

          <motion.button
            type="button"
            {...pressScale}
            onClick={() => handleQuickSendToChatGptWeb()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold bg-[#1a1033] hover:bg-[#2a1952] text-white transition-colors shadow-xs"
            title="Open chatgpt.com in a new tab with PixieKat order context pre-filled"
          >
            <ExternalLink className="w-3.5 h-3.5 text-violet-300" />
            <span>Send to ChatGPT Web</span>
          </motion.button>

          <button
            type="button"
            onClick={() => void fetchWorkspaceData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold bg-[#f4f3f9] hover:bg-violet-100/70 text-[#1a1033] transition-colors"
          >
            <RefreshCw className={clsx('w-3.5 h-3.5', loading && 'animate-spin')} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() =>
              downloadOrdersCsv(
                selectedOrdersList.length > 0 ? selectedOrdersList : filteredOrders,
                mode === 'manual' ? 'pixiekat-manual-orders' : 'pixiekat-order-history'
              )
            }
            disabled={filteredOrders.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-semibold bg-[#f4f3f9] hover:bg-violet-100/70 text-[#1a1033] transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Cloud Dock Breadcrumb Row + Search & Status Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 hover:text-gray-700 font-medium transition-colors"
          >
            Dashboard
          </button>
          <span className="text-gray-300">/</span>

          {/* Dropdown switcher for Orders sub-pages */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setBreadcrumbMenuOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-gray-500 hover:text-[#1a1033] font-medium transition-colors"
            >
              <span>Orders</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
              {breadcrumbMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: DURATION.fast, ease: EASE_OUT }}
                  className="absolute left-0 mt-2 w-48 rounded-2xl bg-[#140b29] text-white shadow-xl border border-white/10 py-1.5 z-30"
                >
                  {[
                    { label: 'Orders Overview', path: '/orders' },
                    { label: 'Order History', path: '/orders/history' },
                    { label: 'Manual Orders', path: '/orders/manual' },
                  ].map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        setBreadcrumbMenuOpen(false);
                        navigate(item.path);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/10 flex items-center justify-between"
                    >
                      <span>{item.label}</span>
                      {(mode === 'manual' && item.path === '/orders/manual') ||
                      (mode === 'history' && item.path === '/orders/history') ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />
                      ) : null}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <span className="text-gray-300">/</span>
          <span className="font-bold text-[#1a1033]">{workspaceTitle}</span>
          <motion.span
            key={filteredOrders.length}
            variants={badgePop}
            initial="initial"
            animate="animate"
            className="ml-1 px-2.5 py-0.5 rounded-full bg-[#ede9fe] text-[#5b38eb] text-xs font-bold tabular-nums"
          >
            {filteredOrders.length}
          </motion.span>
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search UID, order #, player, game..."
              className="w-full h-10 pl-10 pr-12 rounded-2xl bg-[#f4f3f9] border border-transparent focus:border-[#6c49ff] focus:bg-white text-xs text-gray-900 placeholder-gray-400 outline-none transition-[background-color,border-color]"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded-md bg-white text-[10px] font-semibold text-gray-400 border border-gray-200">
              ⌘K
            </span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'all' | OrderStatus);
              setPage(1);
            }}
            className="h-10 px-3.5 rounded-2xl bg-[#f4f3f9] border border-transparent focus:border-[#6c49ff] focus:bg-white text-xs font-semibold text-[#1a1033] outline-none capitalize"
          >
            <option value="all">All Statuses</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* SECTION 1: Spotlight Cards ("Recent edited" in Cloud Dock reference image) */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1a1033] tracking-tight">
            {mode === 'manual' ? 'Recent manual & priority orders' : 'Recent order activity'}
          </h2>
          <span className="text-xs text-gray-400 font-medium">
            Click &ldquo;See details&rdquo; to inspect or fulfill
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {spotlightOrders.map((ord, idx) => {
            const palette = ICON_PALETTES[idx % ICON_PALETTES.length];
            const acct = formatAccountTarget(ord);
            const badge = STATUS_BADGE[ord.status] ?? STATUS_BADGE.processing;

            return (
              <motion.div
                key={ord.id}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: staggerDelay(idx, 0.05, 0.15),
                  duration: DURATION.base,
                  ease: EASE_OUT,
                }}
                className="rounded-[24px] bg-[#f4f3f9] p-3.5 border border-violet-100/80 hover:border-violet-200 transition-[border-color,box-shadow] group"
              >
                {/* White inner preview sheet with centered dark "See details" pill */}
                <div className="relative rounded-[18px] bg-white p-4 shadow-xs border border-gray-100/80 h-32 flex flex-col justify-between overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={clsx(
                        'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0',
                        palette.bg
                      )}
                    >
                      {getInitials(ord.resolvedGameName || ord.product_name)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="h-3 rounded-full bg-gray-100 w-3/4 flex items-center px-2">
                        <span className="text-[10px] font-mono text-gray-600 truncate">
                          {acct}
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-gray-100 w-1/2 flex items-center px-2">
                        <span className="text-[10px] font-semibold text-[#5b38eb] truncate">
                          {ord.currency} {Number(ord.total_amount || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                        badge.pill
                      )}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Skeleton lines matching Cloud Dock document preview */}
                  <div className="space-y-1.5 pt-2">
                    <div className="h-2 rounded-full bg-gray-100 w-full" />
                    <div className="h-2 rounded-full bg-gray-100 w-4/5" />
                  </div>

                  {/* Centered dark pill button ("See details" in reference image) */}
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white/40 via-transparent to-transparent">
                    <button
                      type="button"
                      onClick={() => openOrderDetails(ord)}
                      className="px-4 py-1.5 rounded-full bg-[#1a1033] hover:bg-[#6c49ff] text-white text-xs font-semibold shadow-lg shadow-[#1a1033]/25 transition-[background-color,transform,box-shadow] transform group-hover:scale-105"
                    >
                      See details
                    </button>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3 px-1 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1a1033] truncate">
                      {ord.product_name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {formatRelativeTime(ord.created_at)} · #{ord.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {['pending', 'processing', 'on_hold'].includes(ord.status) && (
                      <button
                        type="button"
                        onClick={() => openQuickFulfillModal([ord], 'completed')}
                        className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        title="Mark Fulfilled / Completed"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedIds(new Set([ord.id]));
                        setAiDrawerOpen(true);
                      }}
                      className="p-1.5 rounded-xl hover:bg-white text-gray-500 hover:text-[#6c49ff] transition-colors"
                      title="Send order to ChatGPT Context Studio"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2: Folder Cards ("Shared Folders" in Cloud Dock reference image) */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1a1033] tracking-tight">
            {mode === 'manual' ? 'Manual Order Folders' : 'Order Archive Folders'}
          </h2>
          <span className="text-xs text-gray-400 font-medium">
            Filter workspace by queue or game folder
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {folderCards.map((folder) => {
            const isSelected = activeFolder === folder.id;

            return (
              <motion.div
                key={folder.id}
                onClick={() => {
                  setActiveFolder(folder.id);
                  if (folder.id === 'queue') setActiveTab('needs_fulfillment');
                  else if (folder.id.startsWith('game:')) setActiveTab('all_orders');
                  setPage(1);
                }}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                transition={springSnappy}
                className="cursor-pointer group select-none pt-3 relative"
              >
                {/* Folder Top Tab + Peeking Lilac Paper Sheets (Cloud Dock signature geometry) */}
                <div className="relative h-4 flex items-end">
                  {/* Left Folder Ear Tab */}
                  <div
                    className={clsx(
                      'w-28 h-4 rounded-t-2xl transition-colors z-10',
                      isSelected ? 'bg-[#2a164d]' : 'bg-[#ede9fe] group-hover:bg-violet-200/80'
                    )}
                  />
                  {/* Decorative layered paper sheets peeking from the top right */}
                  <div
                    className={clsx(
                      'absolute right-8 -top-1 w-28 h-4 rounded-t-xl transform -rotate-2 transition-transform group-hover:-translate-y-0.5',
                      isSelected ? 'bg-[#8b5cf6]/50' : 'bg-[#c4b5fd]/60'
                    )}
                  />
                  <div
                    className={clsx(
                      'absolute right-3 top-0.5 w-24 h-3.5 rounded-t-xl transform rotate-1 transition-transform group-hover:-translate-y-0.5',
                      isSelected ? 'bg-[#a78bfa]/40' : 'bg-[#ddd6fe]/80'
                    )}
                  />
                </div>

                {/* Folder Body */}
                <div
                  className={clsx(
                    'rounded-b-[24px] rounded-tr-[24px] p-5 transition-[border-color,box-shadow] relative overflow-hidden',
                    isSelected
                      ? 'text-white shadow-[0_18px_40px_rgba(43,22,77,0.28)]'
                      : 'bg-white border border-violet-100/90 text-[#1a1033] shadow-[0_10px_28px_rgba(108,73,255,0.06)] hover:border-violet-200 group-hover:shadow-[0_16px_36px_rgba(108,73,255,0.12)]'
                  )}
                  style={
                    isSelected
                      ? {
                          background:
                            'linear-gradient(145deg, #2a164d 0%, #1d0e38 55%, #120824 100%)',
                        }
                      : undefined
                  }
                >
                  {/* Folder Icon Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={clsx(
                        'w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs text-white shadow-sm',
                        folder.iconBg
                      )}
                    >
                      {folder.initials}
                    </div>
                    {folder.actionableCount > 0 && (
                      <span
                        className={clsx(
                          'px-2.5 py-0.5 rounded-full text-[10px] font-bold',
                          isSelected
                            ? 'bg-white/15 text-violet-200'
                            : 'bg-violet-50 text-[#6c49ff]'
                        )}
                      >
                        {folder.actionableCount} active
                      </span>
                    )}
                  </div>

                  <p
                    className={clsx(
                      'text-sm font-bold truncate',
                      isSelected ? 'text-white' : 'text-[#1a1033]'
                    )}
                  >
                    {folder.title}
                  </p>
                  <p
                    className={clsx(
                      'text-xs mt-0.5 truncate',
                      isSelected ? 'text-violet-200/80' : 'text-gray-400'
                    )}
                  >
                    {folder.subtitle}
                  </p>

                  {/* Customer Avatar Stack at bottom right */}
                  <div className="mt-4 flex items-center justify-end">
                    <div className="flex items-center -space-x-2">
                      {folder.customers.slice(0, 3).map((c, idx) => (
                        <div
                          key={`${c.name}-${idx}`}
                          className={clsx(
                            'w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br',
                            isSelected ? 'border-[#1d0e38]' : 'border-white',
                            AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]
                          )}
                          title={c.name}
                        >
                          {getInitials(c.name)}
                        </div>
                      ))}
                      {folder.customers.length > 3 && (
                        <motion.div
                          key={folder.customers.length - 3}
                          variants={badgePop}
                          initial="initial"
                          animate="animate"
                          className={clsx(
                            'w-7 h-7 rounded-full border-2 flex items-center justify-center text-[10px] font-bold tabular-nums',
                            isSelected
                              ? 'border-[#1d0e38] bg-white/15 text-white'
                              : 'border-white bg-[#f4f3f9] text-gray-600'
                          )}
                        >
                          +{folder.customers.length - 3}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: Segmented Pill Bar + Bulk Action Strip + Checkbox Table + Bottom Dock */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Segmented Pill Tabs (matching "Recently Opened | Shared Documents | Shared Folders") */}
          <div className="inline-flex flex-wrap items-center gap-1 p-1.5 rounded-2xl bg-[#f4f3f9] border border-violet-100/80">
            {tabItems.map((tab) => {
              const isTabActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setPage(1);
                  }}
                  className={clsx(
                    'relative inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors',
                    isTabActive
                      ? 'text-[#1a1033]'
                      : 'text-gray-500 hover:text-[#1a1033]'
                  )}
                >
                  {isTabActive && (
                    <motion.span
                      layoutId="mo-seg-thumb"
                      transition={springSnappy}
                      className="absolute inset-0 rounded-xl bg-white shadow-xs"
                    />
                  )}
                  {isTabActive && (
                    <span className="relative w-4 h-4 rounded-full bg-[#6c49ff] text-white inline-flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    </span>
                  )}
                  <span className="relative">{tab.label}</span>
                  <motion.span
                    key={tab.count}
                    variants={badgePop}
                    initial="initial"
                    animate="animate"
                    className={clsx(
                      'relative px-1.5 py-0.2 rounded-md text-[10px] tabular-nums',
                      isTabActive
                        ? 'bg-violet-50 text-[#6c49ff] font-bold'
                        : 'text-gray-400'
                    )}
                  >
                    {tab.count}
                  </motion.span>
                </button>
              );
            })}
          </div>

          {/* Bulk Selection Actions */}
          <AnimatePresence initial={false}>
            {selectedOrdersList.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: reduceMotion ? 0 : 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : 4, scale: 0.98 }}
                transition={{ duration: DURATION.fast, ease: EASE_OUT }}
                className="flex items-center gap-2"
              >
                <span className="text-xs font-semibold text-[#6c49ff] tabular-nums">
                  {selectedOrdersList.length} selected
                </span>
                <motion.button
                  type="button"
                  {...pressScale}
                  onClick={() => openQuickFulfillModal(selectedOrdersList, 'completed')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark Completed</span>
                </motion.button>
                <motion.button
                  type="button"
                  {...pressScale}
                  onClick={() => openQuickFulfillModal(selectedOrdersList, 'on_hold')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  <span>On Hold</span>
                </motion.button>
                <motion.button
                  type="button"
                  {...pressScale}
                  onClick={() => setAiDrawerOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a1033] hover:bg-[#2a1852] text-white text-xs font-semibold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-violet-300" />
                  <span>Ask ChatGPT ({selectedOrdersList.length})</span>
                </motion.button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2"
                >
                  Clear
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Cloud Dock Table Card */}
        <div className="rounded-[24px] border border-violet-100/90 bg-white overflow-hidden shadow-[0_8px_30px_rgba(26,16,51,0.04)]">
          {error ? (
            <div className="flex items-center gap-3 p-6 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          ) : loading ? (
            <div className="p-14 text-center text-gray-400">
              <RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin text-[#6c49ff]" />
              <p className="text-sm font-medium">Loading orders workspace...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-14 text-center space-y-2">
              <FolderOpen className="mx-auto h-8 w-8 text-violet-300" />
              <p className="text-sm font-bold text-[#1a1033]">
                No orders match this folder or filter
              </p>
              <p className="text-xs text-gray-400">
                Switch tabs above or click &ldquo;All Store Orders&rdquo; to inspect every order.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-violet-100/80 bg-[#faf9fe]">
                      <th className="pl-5 pr-2 py-3.5 text-left w-10">
                        <DockCheckbox
                          checked={
                            paginatedOrders.length > 0 &&
                            paginatedOrders.every((o) => selectedIds.has(o.id))
                          }
                          onToggle={toggleSelectPage}
                          label="Select all on page"
                        />
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Order / Product
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Player Target (UID / Zone)
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Customer
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Amount
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Status
                      </th>
                      <th className="px-4 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Date
                      </th>
                      <th className="px-4 py-3.5 text-right text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-violet-50">
                    {paginatedOrders.map((order, idx) => {
                      const isChecked = selectedIds.has(order.id);
                      const cust = getOrderCustomer(order);
                      const acct = formatAccountTarget(order);
                      const badge = STATUS_BADGE[order.status] ?? STATUS_BADGE.processing;
                      const palette = ICON_PALETTES[idx % ICON_PALETTES.length];
                      const custTotalOrders = customerOrderCounts.get(order.user_id) ?? 1;

                      return (
                        <motion.tr
                          key={order.id}
                          initial={
                            rowsIntroduced.current
                              ? false
                              : { opacity: 0, y: reduceMotion ? 0 : 8 }
                          }
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: staggerDelay(idx, 0.028, 0.22),
                            duration: DURATION.base,
                            ease: EASE_OUT,
                          }}
                          className={clsx(
                            'transition-colors',
                            isChecked ? 'bg-[#f6f4ff]' : 'hover:bg-[#faf9fe]'
                          )}
                        >
                          {/* Checkbox */}
                          <td className="pl-5 pr-2 py-4">
                            <DockCheckbox
                              checked={isChecked}
                              onToggle={() => toggleSelectOne(order.id)}
                              label={`Select order ${order.id.slice(0, 8)}`}
                            />
                          </td>

                          {/* Order / Product (styled like "FILE NAME" with colorful icon tile in Cloud Dock) */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={clsx(
                                  'w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0',
                                  palette.light
                                )}
                              >
                                {getInitials(order.resolvedGameName || order.product_name)}
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => openOrderDetails(order)}
                                  className="text-sm font-bold text-[#1a1033] hover:text-[#6c49ff] text-left truncate block max-w-[240px]"
                                >
                                  {order.product_name}
                                </button>
                                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                                  <span className="font-mono font-semibold text-gray-500">
                                    #{order.id.slice(0, 8).toUpperCase()}
                                  </span>
                                  <span>·</span>
                                  <span>{order.resolvedGameName}</span>
                                  <span>·</span>
                                  {order.isManualOrder ? (
                                    <span className="inline-flex items-center gap-0.5 text-[#6c49ff] font-medium">
                                      <Gamepad2 className="w-3 h-3" /> Manual
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 text-gray-500">
                                      <Zap className="w-3 h-3" /> {order.resolvedProvider}
                                    </span>
                                  )}
                                  {order.quantity > 1 && (
                                    <span className="px-1.5 py-0.2 rounded bg-violet-100 text-[#5b38eb] font-bold text-[10px]">
                                      ×{order.quantity}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Player Target (UID / Zone / Verified Username) */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="min-w-0">
                                <p className="text-xs font-mono font-semibold text-[#1a1033] truncate max-w-[200px]">
                                  {acct}
                                </p>
                                {order.metadata?.verified_username ? (
                                  <p className="text-[11px] text-emerald-600 font-medium truncate">
                                    ✓ {order.metadata.verified_username}
                                  </p>
                                ) : order.metadata?.manual_fulfillment_note ? (
                                  <p className="text-[11px] text-[#6c49ff] truncate max-w-[200px]">
                                    Note: {order.metadata.manual_fulfillment_note}
                                  </p>
                                ) : (
                                  <p className="text-[11px] text-gray-400">
                                    {order.payment_method || 'wallet'}
                                  </p>
                                )}
                              </div>
                              {acct !== 'No target UID' && (
                                <CopyTargetButton text={acct} toastLabel="Player target copied!" />
                              )}
                            </div>
                          </td>

                          {/* Customer (styled with avatar cluster like "OWNER" column in Cloud Dock) */}
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => navigate(`/users/${order.user_id}`)}
                              className="flex items-center gap-2.5 text-left group"
                            >
                              <div className="flex items-center -space-x-1.5">
                                <div
                                  className={clsx(
                                    'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-gradient-to-br border-2 border-white shadow-2xs',
                                    AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]
                                  )}
                                >
                                  {getInitials(cust.name)}
                                </div>
                                {custTotalOrders > 1 && (
                                  <motion.span
                                    key={custTotalOrders}
                                    variants={badgePop}
                                    initial="initial"
                                    animate="animate"
                                    className="px-1.5 h-6 rounded-full bg-[#f4f3f9] border border-white text-[10px] font-bold text-gray-600 flex items-center justify-center tabular-nums"
                                  >
                                    +{custTotalOrders - 1}
                                  </motion.span>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#1a1033] group-hover:text-[#6c49ff] truncate max-w-[140px]">
                                  {cust.name}
                                </p>
                                <p className="text-[11px] text-gray-400 truncate max-w-[140px]">
                                  {cust.email || order.user_id.slice(0, 8)}
                                </p>
                              </div>
                            </button>
                          </td>

                          {/* Amount & Supplier Cost */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <p className="text-xs font-bold text-[#1a1033] tabular-nums">
                              {order.currency} {Number(order.total_amount || 0).toFixed(2)}
                            </p>
                            {order.supplierInfo?.costInr != null && (
                              <p className="text-[10px] text-gray-400 tabular-nums">
                                Cost ₹{Number(order.supplierInfo.costInr).toFixed(0)}
                              </p>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <motion.span
                              key={order.status}
                              variants={pop}
                              initial="initial"
                              animate="animate"
                              className={clsx(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                                badge.pill
                              )}
                            >
                              <span className={clsx('w-1.5 h-1.5 rounded-full', badge.dot)} />
                              {badge.label}
                            </motion.span>
                          </td>

                          {/* Date */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <p className="text-xs font-medium text-gray-700">
                              {formatDateShort(order.created_at)}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {formatRelativeTime(order.created_at)}
                            </p>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4 whitespace-nowrap text-right">
                            <div className="inline-flex items-center gap-1.5">
                              {['pending', 'processing', 'on_hold'].includes(order.status) && (
                                <motion.button
                                  type="button"
                                  {...pressScale}
                                  onClick={() => openQuickFulfillModal([order], 'completed')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors"
                                  title="Mark Fulfilled"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Fulfill</span>
                                </motion.button>
                              )}
                              <motion.button
                                type="button"
                                {...pressScale}
                                onClick={() => {
                                  setSelectedIds(new Set([order.id]));
                                  setAiDrawerOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-[#6c49ff] text-xs font-semibold transition-colors"
                                title="Send order to ChatGPT"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>AI</span>
                              </motion.button>
                              <motion.button
                                type="button"
                                {...pressScale}
                                onClick={() => openOrderDetails(order)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#f4f3f9] hover:bg-gray-200/70 text-[#1a1033] text-xs font-semibold transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Details</span>
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Row */}
              <div className="flex items-center justify-between px-5 py-3 border-t border-violet-100/70 bg-[#faf9fe]">
                <p className="text-xs text-gray-500 tabular-nums">
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length}{' '}
                  orders
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-xl hover:bg-violet-100/60 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pg =
                      totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                    return (
                      <button
                        key={pg}
                        type="button"
                        onClick={() => setPage(pg)}
                        className={clsx(
                          'w-8 h-8 rounded-xl text-xs font-bold transition-colors',
                          page === pg
                            ? 'bg-[#6c49ff] text-white shadow-xs'
                            : 'hover:bg-violet-100/60 text-gray-700'
                        )}
                      >
                        {pg}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-xl hover:bg-violet-100/60 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Cloud Dock Bottom Sticky Selection / Summary Bar (matches bottom bar in image) */}
              {dockTargetOrder && (
                <motion.div
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DURATION.base, ease: EASE_OUT }}
                  className="px-5 py-3.5 border-t border-violet-100 bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-violet-100 text-[#6c49ff] flex items-center justify-center font-bold text-xs shrink-0">
                      {getInitials(
                        dockTargetOrder.resolvedGameName || dockTargetOrder.product_name
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 min-w-0">
                      <span className="font-bold text-[#1a1033] truncate">
                        {selectedOrdersList.length > 1
                          ? `${selectedOrdersList.length} Orders Selected`
                          : dockTargetOrder.product_name}
                      </span>
                      <span>·</span>
                      <span className="font-semibold text-[#5b38eb] tabular-nums">
                        {dockTargetOrder.currency}{' '}
                        {selectedOrdersList.length > 1
                          ? selectedOrdersList
                              .reduce((s, o) => s + Number(o.total_amount || 0), 0)
                              .toFixed(2)
                          : Number(dockTargetOrder.total_amount || 0).toFixed(2)}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-gray-500 truncate">
                        {selectedOrdersList.length > 1
                          ? `UIDs ready for batch`
                          : formatAccountTarget(dockTargetOrder)}
                      </span>
                      <span>·</span>
                      <span>{formatDateShort(dockTargetOrder.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <motion.button
                      type="button"
                      {...pressScale}
                      onClick={() =>
                        handleQuickSendToChatGptWeb(
                          selectedOrdersList.length > 0 ? selectedOrdersList : [dockTargetOrder]
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-[#5b38eb] text-xs font-semibold transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Context to ChatGPT</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      {...pressScale}
                      onClick={() =>
                        openQuickFulfillModal(
                          selectedOrdersList.length > 0 ? selectedOrdersList : [dockTargetOrder],
                          'completed'
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1a1033] hover:bg-[#2c1a54] text-white text-xs font-semibold transition-colors shadow-xs"
                    >
                      {dockTargetOrder.isManualOrder ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-violet-300" />
                          <span>Manual Fulfill</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 text-violet-300" />
                          <span>Update Status</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Quick Manual Fulfillment Modal */}
      <AnimatePresence>
        {fulfillModalOrders.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DURATION.fast }}
              className="fixed inset-0 z-40 bg-[#0e071d]/40 backdrop-blur-xs"
              onClick={() => setFulfillModalOrders([])}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: reduceMotion ? 0 : 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: reduceMotion ? 0 : 8 }}
              transition={springSoft}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="w-full max-w-lg rounded-[28px] bg-white border border-violet-100 shadow-2xl overflow-hidden pointer-events-auto">
                <div
                  className="px-6 py-4 text-white flex items-center justify-between"
                  style={{
                    background: 'linear-gradient(135deg, #160c2e 0%, #2b164d 100%)',
                  }}
                >
                  <div>
                    <h3 className="text-base font-bold">
                      {fulfillModalOrders.length === 1
                        ? `Manual Fulfillment · #${fulfillModalOrders[0].id.slice(0, 8).toUpperCase()}`
                        : `Bulk Update ${fulfillModalOrders.length} Orders`}
                    </h3>
                    <p className="text-xs text-violet-200/80 mt-0.5">
                      Verify player UID & record fulfillment status
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFulfillModalOrders([])}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  {/* Target summary box */}
                  <div className="rounded-2xl bg-[#f4f3f9] p-4 space-y-2 max-h-44 overflow-y-auto border border-violet-100">
                    {fulfillModalOrders.map((ord) => {
                      const acct = formatAccountTarget(ord);
                      return (
                        <div
                          key={ord.id}
                          className="flex items-center justify-between gap-2 text-xs border-b border-violet-200/50 last:border-b-0 pb-2 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-[#1a1033] truncate">
                              {ord.product_name} × {ord.quantity} ({ord.currency}{' '}
                              {Number(ord.total_amount).toFixed(2)})
                            </p>
                            <p className="font-mono text-gray-600 truncate">
                              {acct}
                              {ord.metadata?.verified_username
                                ? ` · ✓ ${ord.metadata.verified_username}`
                                : ''}
                            </p>
                          </div>
                          <CopyUidButton text={acct} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Target status selector */}
                  <div>
                    <label className="block text-xs font-bold text-[#1a1033] mb-2">
                      Set Order Status
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['completed', 'processing', 'on_hold', 'failed'] as OrderStatus[]).map(
                        (st) => (
                          <motion.button
                            key={st}
                            type="button"
                            {...pressScale}
                            onClick={() => setFulfillTargetStatus(st)}
                            className={clsx(
                              'py-2 px-3 rounded-xl text-xs font-bold border transition-colors capitalize',
                              fulfillTargetStatus === st
                                ? 'bg-[#6c49ff] text-white border-[#6c49ff] shadow-sm'
                                : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
                            )}
                          >
                            {st.replace('_', ' ')}
                          </motion.button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Supplier reference & note */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Supplier Order / Ref ID (optional)
                      </label>
                      <input
                        type="text"
                        value={supplierOrderId}
                        onChange={(e) => setSupplierOrderId(e.target.value)}
                        placeholder="e.g. TGY-99281 / In-game gift"
                        className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#6c49ff]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Staff Fulfillment Note (optional)
                      </label>
                      <input
                        type="text"
                        value={fulfillNote}
                        onChange={(e) => setFulfillNote(e.target.value)}
                        placeholder="Delivered manually to player UID"
                        className="w-full h-9 px-3 rounded-xl border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-[#6c49ff]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setFulfillModalOrders([])}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <motion.button
                      type="button"
                      {...pressScale}
                      onClick={() => void handleConfirmManualFulfill()}
                      disabled={fulfilling}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#6c49ff] hover:bg-[#5835eb] text-white shadow-md shadow-violet-500/20 disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                      {fulfilling && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                      <span className="tabular-nums">
                        Confirm {STATUS_BADGE[fulfillTargetStatus].label} (
                        {fulfillModalOrders.length})
                      </span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Order Details Drawer */}
      <OrderDrawer
        order={drawerOrder}
        isOpen={drawerOpen}
        onClose={closeOrderDetails}
        onStatusChange={(id, newStatus) => {
          setOrders((prev) =>
            prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
          );
        }}
        onOpenChatGpt={(ord) => {
          setSelectedIds(new Set([ord.id]));
          setDrawerOpen(false);
          setAiDrawerOpen(true);
        }}
      />

      {/* ChatGPT Context Assistant Drawer */}
      <ChatGptAssistantDrawer
        isOpen={aiDrawerOpen}
        onClose={() => setAiDrawerOpen(false)}
        selectedOrders={selectedOrdersList}
        allVisibleOrders={filteredOrders}
        workspaceTitle={workspaceTitle}
        activeFolderLabel={activeFolderObj?.title}
      />
    </div>
  );
};

export default ManualOrders;
