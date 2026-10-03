/**
 * Yokcash Store — Mobile Legends
 *
 * A storefront-style product page that exercises the real Yokcash purchase
 * path end to end, using the MLBB catalog:
 *   1. Player   — public POST /api/verify-player (nickname + region lookup)
 *   2. Product  — GET /api/yokcash/services filtered to MLBB (IDR prices)
 *   3. Purchase — POST /api/yokcash/order + GET /api/yokcash/status polling
 *
 * All calls go through ycFetch (services/yokcashService.ts): in dev they're
 * proxied to the prod API Gateway because Yokcash's IP whitelist only covers
 * the prod EB env — a localhost server can't reach them at all.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, RefreshCw, Store, CheckCircle2, XCircle,
  UserRound, Gamepad2, ShoppingCart, BadgeCheck, Package,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  yokcashProd, verifyPlayer, isMlbbService,
  YcService, YcHealthResponse, YcVerifyPlayerResponse, YcOrderResponse,
} from '../../services/yokcashService';

const idr = (n?: number | null) =>
  n == null ? '—' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const STATUS_STYLE: Record<string, string> = {
  success:    'text-emerald-600',
  pending:    'text-amber-600',
  processing: 'text-blue-600',
  cancel:     'text-red-500',
  refund:     'text-red-500',
};

const YokcashStorePage: React.FC = () => {
  const navigate = useNavigate();

  // ── provider health ──
  const [health, setHealth] = useState<YcHealthResponse | null>(null);

  // ── step 1: player ──
  const [userId, setUserId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [player, setPlayer] = useState<YcVerifyPlayerResponse | null>(null);
  const verifyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── step 2: catalog ──
  const [services, setServices] = useState<YcService[]>([]);
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<YcService | null>(null);

  // ── step 3: purchase ──
  const [kontak, setKontak] = useState('628888');
  const [manualServiceId, setManualServiceId] = useState('');
  const [ordering, setOrdering] = useState(false);
  const [testOrdersEnabled, setTestOrdersEnabled] = useState<boolean | null>(null);
  const [orderResult, setOrderResult] = useState<YcOrderResponse | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<{ status?: string; keterangan?: string } | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    yokcashProd.health()
      .then(setHealth)
      .catch(() => setHealth({ configured: false, connected: false, message: 'Could not reach API' }));
    loadCatalog();
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, []);

  // ── player verification (debounced) ──
  useEffect(() => {
    setPlayer(null);
    if (!userId.trim() || !zoneId.trim()) return;
    if (verifyTimer.current) clearTimeout(verifyTimer.current);
    verifyTimer.current = setTimeout(async () => {
      setVerifying(true);
      try {
        const r = await verifyPlayer({ user_id: userId.trim(), zone_id: zoneId.trim() });
        setPlayer(r);
      } catch (e) {
        setPlayer({ success: false, message: e instanceof Error ? e.message : 'Verification request failed' });
      } finally {
        setVerifying(false);
      }
    }, 700);
    return () => { if (verifyTimer.current) clearTimeout(verifyTimer.current); };
  }, [userId, zoneId]);

  const nickname = player?.username ?? player?.region?.nickname ?? null;

  async function loadCatalog() {
    setCatalogBusy(true);
    setCatalogError(null);
    try {
      const r = await yokcashProd.services();
      setServices(r.services ?? []);
      if (!r.ok) setCatalogError(r.msg || 'Yokcash returned an empty catalog (upstream may be down)');
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : 'Catalog request failed');
    } finally {
      setCatalogBusy(false);
    }
  }

  const mlbbServices = useMemo(() => {
    const mlbb = services.filter(isMlbbService);
    const q = search.trim().toLowerCase();
    const filtered = q ? mlbb.filter(s => `${s.nama_layanan} ${s.id}`.toLowerCase().includes(q)) : mlbb;
    return filtered.slice().sort((a, b) => (a.harga ?? 0) - (b.harga ?? 0));
  }, [services, search]);

  // Manual service_id lets the order step run even when the catalog endpoint
  // is unreachable (Yokcash upstream down) — codes like ML86 are known anyway.
  const effectiveServiceId = manualServiceId.trim() || selected?.id || '';
  const effectiveName = manualServiceId.trim()
    ? `${manualServiceId.trim()} (manual)`
    : selected?.nama_layanan ?? '';
  const canOrder = Boolean(effectiveServiceId && userId.trim() && zoneId.trim() && kontak.trim());
  const target = `${userId.trim()}|${zoneId.trim()}`;

  async function placeOrder(real: boolean) {
    if (!effectiveServiceId) return;
    setOrdering(true);
    setOrderError(null);
    setOrderResult(null);
    try {
      const fn = real ? yokcashProd.order : yokcashProd.orderDryRun;
      const r = await fn({ service_id: effectiveServiceId, target, kontak: kontak.trim() });
      setOrderResult(r);
      if (r.testOrdersEnabled !== undefined) setTestOrdersEnabled(r.testOrdersEnabled);
      const inv = r.data?.id;
      if (real && inv) {
        setInvoice(inv);
        startStatusPoll(inv);
      }
      if (!real) toast.success('Dry-run OK — payload accepted by the gateway');
      else if (r.ok) toast.success(`Order placed — invoice ${inv ?? '?'}`);
      else toast.error(r.msg || r.error || 'Yokcash rejected the order');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Order request failed';
      setOrderError(msg);
      toast.error(msg);
    } finally {
      setOrdering(false);
    }
  }

  function startStatusPoll(inv: string) {
    if (pollTimer.current) clearInterval(pollTimer.current);
    setOrderStatus(null);
    pollTimer.current = setInterval(async () => {
      try {
        const r = await yokcashProd.status(inv);
        if (r.data) {
          setOrderStatus(r.data);
          if (['success', 'cancel', 'refund'].includes(String(r.data.status))) {
            if (pollTimer.current) clearInterval(pollTimer.current);
          }
        }
      } catch { /* keep polling — transient */ }
    }, 4000);
  }

  const stepRing = (done: boolean, active: boolean) =>
    `flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
      done ? 'bg-emerald-500 text-white' : active ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-400'
    }`;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => navigate('/providers/yokcash')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Back to API console">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-48">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-violet-600" />
              <h1 className="text-2xl font-bold text-gray-900">Yokcash Store — Mobile Legends</h1>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              End-to-end purchase test: verify a player, pick a denomination, place an order — all through the whitelisted prod gateway.
            </p>
          </div>
          {health && (
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              health.connected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-600'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${health.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {health.connected ? `Yokcash connected · ${idr(health.saldo)}` : 'Yokcash upstream rejected/down'}
            </div>
          )}
          {testOrdersEnabled !== null && (
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              testOrdersEnabled ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-gray-50 text-gray-500'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${testOrdersEnabled ? 'bg-red-500' : 'bg-gray-400'}`} />
              Test orders {testOrdersEnabled ? 'ENABLED — real charges' : 'disabled (dry-run only)'}
            </div>
          )}
        </div>
        {health && !health.connected && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Yokcash upstream is not answering right now (whole yokcash.com infrastructure has been 523ing behind Cloudflare).
            Catalog and orders will fail until their side recovers — the page will light up green as soon as it does.
            {health.message ? <span className="block mt-1 font-mono">Last message: {String(health.message).slice(0, 160)}</span> : null}
          </div>
        )}
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-3">
        {/* ── Step 1: Player ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className={stepRing(Boolean(nickname), true)}>{nickname ? <BadgeCheck className="w-4 h-4" /> : '1'}</span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><UserRound className="w-4 h-4 text-violet-600" /> Player</h2>
              <p className="text-xs text-gray-500">MLBB User ID + Zone ID, verified via /api/verify-player</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">User ID</label>
              <input value={userId} onChange={e => setUserId(e.target.value)} placeholder="e.g. 189676589"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Zone ID</label>
              <input value={zoneId} onChange={e => setZoneId(e.target.value)} placeholder="e.g. 2985"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400" />
            </div>
          </div>
          {(userId.trim() && zoneId.trim()) && (
            <div className={`rounded-lg border p-3 text-sm ${
              verifying ? 'border-gray-200 bg-gray-50 text-gray-500'
              : nickname ? 'border-emerald-200 bg-emerald-50'
              : 'border-red-200 bg-red-50'
            }`}>
              {verifying ? (
                <span className="flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying player…</span>
              ) : nickname ? (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-800">{nickname}</p>
                    <p className="text-xs text-emerald-600">
                      {player?.username ? `verified via ${player.source ?? 'provider'}` : 'nickname via region lookup'}
                      {player?.region?.country ? ` · ${player.region.country}` : ''}
                    </p>
                  </div>
                </div>
              ) : (
                <span className="flex items-center gap-2 text-red-700"><XCircle className="w-4 h-4 shrink-0" /> {player?.message ?? 'Player not found'}</span>
              )}
            </div>
          )}
          <p className="text-xs text-gray-400">Yokcash has no nickname endpoint — verification uses the storefront's own chain (SmileCoin getrole + free Codashop region lookup).</p>
        </div>

        {/* ── Step 2: Product ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className={stepRing(Boolean(selected), true)}>{selected ? <BadgeCheck className="w-4 h-4" /> : '2'}</span>
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><Gamepad2 className="w-4 h-4 text-violet-600" /> Product</h2>
              <p className="text-xs text-gray-500">MLBB services from the live Yokcash catalog (IDR cost)</p>
            </div>
            <button onClick={loadCatalog} disabled={catalogBusy}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-40" title="Reload catalog">
              <RefreshCw className={`w-4 h-4 ${catalogBusy ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search denominations…"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
          {catalogError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{catalogError}</div>
          )}
          {catalogBusy ? (
            <div className="flex items-center gap-2 text-sm text-gray-400 py-8 justify-center"><RefreshCw className="w-4 h-4 animate-spin" /> Loading catalog…</div>
          ) : mlbbServices.length === 0 ? (
            <div className="text-sm text-gray-400 py-8 text-center">
              <Package className="w-6 h-6 mx-auto mb-2 text-gray-300" />
              {services.length === 0 ? 'No catalog loaded' : `No MLBB matches in ${services.length} services`}
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
              {mlbbServices.map(s => (
                <button key={s.id} onClick={() => setSelected(s)}
                  className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors ${
                    selected?.id === s.id ? 'bg-violet-50' : 'hover:bg-gray-50'
                  }`}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.nama_layanan}</p>
                    <p className="text-xs text-gray-400 font-mono">{s.id}{s.kategori ? ` · ${s.kategori}` : ''}</p>
                  </div>
                  <span className={`text-sm font-semibold shrink-0 ${s.status === 'aktif' ? 'text-violet-700' : 'text-gray-300 line-through'}`}>
                    {idr(s.harga)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Step 3: Purchase ── */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className={stepRing(Boolean(invoice), true)}>{invoice ? <BadgeCheck className="w-4 h-4" /> : '3'}</span>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5"><ShoppingCart className="w-4 h-4 text-violet-600" /> Purchase</h2>
              <p className="text-xs text-gray-500">POST /api/yokcash/order — real spend when enabled, dry-run otherwise</p>
            </div>
          </div>

          {/* summary */}
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs space-y-1 font-mono">
            <div className="flex justify-between"><span className="text-gray-400">service_id</span><span className="text-gray-700">{effectiveServiceId || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">product</span><span className="text-gray-700 truncate ml-3">{effectiveName || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">target</span><span className="text-gray-700">{userId && zoneId ? target : '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">player</span><span className="text-gray-700">{nickname ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">cost</span><span className="text-violet-700 font-semibold">{selected ? idr(selected.harga) : '—'}</span></div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">service_id override <span className="text-gray-400">(optional — fills when catalog is down)</span></label>
            <input value={manualServiceId} onChange={e => setManualServiceId(e.target.value)} placeholder="e.g. ML86"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">kontak (buyer phone, 62xxx)</label>
            <input value={kontak} onChange={e => setKontak(e.target.value)} placeholder="628888"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400" />
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => placeOrder(true)} disabled={ordering || !canOrder}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {ordering && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Place order
            </button>
            <button onClick={() => placeOrder(false)} disabled={ordering || !canOrder}
              className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
              Dry run
            </button>
          </div>

          {orderError && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{orderError}</div>}

          {orderResult && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Response</p>
              <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap break-all">{JSON.stringify(orderResult, null, 2)}</pre>
            </div>
          )}

          {invoice && (
            <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 space-y-1">
              <p className="text-xs font-semibold text-violet-700">Yokcash invoice <span className="font-mono">{invoice}</span></p>
              <p className="text-sm">
                Status:{' '}
                <span className={`font-semibold ${STATUS_STYLE[String(orderStatus?.status)] ?? 'text-gray-500'}`}>
                  {orderStatus?.status ?? 'polling…'}
                </span>
                {orderStatus?.keterangan ? <span className="text-xs text-gray-500"> — {orderStatus.keterangan}</span> : null}
              </p>
            </div>
          )}

          {health?.connected === false && (
            <p className="text-xs text-gray-400">Orders will fail while Yokcash upstream is down — use Dry run to verify the gateway path meanwhile.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default YokcashStorePage;
