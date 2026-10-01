/**
 * Yokcash API Console — exercises every Yokcash gateway endpoint.
 * The API key is injected server-side; this page never sees it.
 * Note: Yokcash enforces a server-IP whitelist, so calls succeed only when the
 * gateway server runs on a whitelisted IP (prod EB env).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Terminal, CheckCircle2, XCircle, Wallet, Package } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { yokcash, YcService, YcHealthResponse } from '../../services/yokcashService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CallLog {
  id: number;
  endpoint: string;
  ok: boolean;
  ms: number;
  at: string;
}

const TABS = ['health', 'services', 'status', 'order'] as const;
type Tab = (typeof TABS)[number];

const idr = (n?: number) =>
  n == null ? '—' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

// ── Sub-components ────────────────────────────────────────────────────────────

function PanelHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="mb-4">
      <code className="text-sm font-mono font-bold text-violet-700">{title}</code>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </div>
  );
}

function RunButton({ busy, label, onClick, disabled }: { busy: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {busy && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
      {busy ? 'Calling…' : label}
    </button>
  );
}

function InputField({ label, value, onChange, placeholder, mono }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${mono ? 'font-mono' : ''}`}
      />
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

const YokcashApiConsolePage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('health');
  const [log, setLog] = useState<CallLog[]>([]);
  const [busy, setBusy] = useState(false);
  const [resp, setResp] = useState<unknown>(null);

  const [health, setHealth] = useState<YcHealthResponse | null>(null);
  const [services, setServices] = useState<YcService[]>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [orderId, setOrderId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [target, setTarget] = useState('');
  const [kontak, setKontak] = useState('');
  const [idtrx, setIdtrx] = useState('');
  const [testOrdersEnabled, setTestOrdersEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    yokcash.health()
      .then(h => { setHealth(h); })
      .catch(() => setHealth({ configured: false, connected: false, message: 'Could not reach server' }));
    // test-order flag is only revealed on the order endpoints
  }, []);

  async function run(fn: () => Promise<unknown>, endpoint: string) {
    setBusy(true);
    const t0 = performance.now();
    try {
      const r = await fn();
      const ms = Math.round(performance.now() - t0);
      setResp(r);
      setLog(l => [{ id: Date.now(), endpoint, ok: true, ms, at: new Date().toLocaleTimeString() }, ...l].slice(0, 15));
      return r;
    } catch (e) {
      const ms = Math.round(performance.now() - t0);
      const msg = e instanceof Error ? e.message : String(e);
      setResp({ error: msg });
      setLog(l => [{ id: Date.now(), endpoint, ok: false, ms, at: new Date().toLocaleTimeString() }, ...l].slice(0, 15));
      toast.error(`${endpoint} failed: ${msg}`);
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function runHealth() {
    const h = (await run(() => yokcash.health(), 'health')) as YcHealthResponse;
    setHealth(h);
  }

  async function loadServices() {
    const r = (await run(() => yokcash.services(), 'services')) as { services?: YcService[] };
    const list = r?.services ?? [];
    setServices(list);
    if (!categoryFilter && list[0]?.kategori) setCategoryFilter('');
  }

  const categories = useMemo(
    () => [...new Set(services.map(s => s.kategori).filter(Boolean))].sort(),
    [services],
  );
  const visibleServices = useMemo(
    () => services.filter(s => !categoryFilter || s.kategori === categoryFilter),
    [services, categoryFilter],
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/providers')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-violet-600" />
              <h1 className="text-2xl font-bold text-gray-900">Yokcash API Console</h1>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              Exercise every Yokcash endpoint. The API key is injected server-side — calls only succeed from a whitelisted IP.
            </p>
          </div>
          {/* Live status chip */}
          {health && (
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              health.connected
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-600'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${health.connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
              {health.connected ? `Connected · ${idr(health.saldo ?? undefined)}` : (health.configured ? 'Rejected — check IP whitelist' : 'Not configured')}
            </div>
          )}
        </div>

        {/* Endpoint badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          {['GET /api/yokcash/health', 'GET /api/yokcash/services', 'GET /api/yokcash/status', 'POST /api/yokcash/order', 'POST /api/webhooks/yokcash'].map(e => (
            <span key={e} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-mono rounded-full">{e}</span>
          ))}
        </div>

        {testOrdersEnabled !== null && (
          <div className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
            testOrdersEnabled
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-gray-200 bg-gray-50 text-gray-500'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${testOrdersEnabled ? 'bg-red-500' : 'bg-gray-400'}`} />
            Test orders {testOrdersEnabled ? 'ENABLED — real charges possible!' : 'disabled (dry-run only)'}
          </div>
        )}
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        {/* ─── Left: Controls ─────────────────── */}
        <div className="space-y-4">
          {/* Tab selector */}
          <div className="flex flex-wrap gap-1.5 bg-gray-50 border border-gray-200 rounded-xl p-1.5">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-2 font-mono text-xs uppercase tracking-wide transition-colors ${
                  tab === t
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-gray-500 hover:bg-white hover:text-gray-800 hover:shadow-sm'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Panel card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">

            {/* health */}
            {tab === 'health' && (
              <>
                <PanelHeader title="GET /api/yokcash/health" desc="Live check — calls saldo() on the Yokcash account. Connected proves the API key AND the server IP whitelist both work." />
                <RunButton busy={busy} label="Check API health" onClick={runHealth} />
                {health && health.connected && health.saldo != null && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-3">
                    <div className="w-9 h-9 bg-white rounded-lg shadow-sm flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Yokcash balance</p>
                      <p className="text-lg font-bold text-gray-900">{idr(health.saldo)}</p>
                    </div>
                  </div>
                )}
                {health && !health.connected && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    {health.configured
                      ? <>Request rejected upstream. Most likely cause: this server's public IP isn't whitelisted in the Yokcash portal — the whitelist only covers the prod Elastic IP <code className="font-mono bg-red-100 px-1 rounded">35.154.145.21</code>. Response: {health.message}</>
                      : 'YOKCASH_API_KEY is not set in the server environment.'}
                  </div>
                )}
              </>
            )}

            {/* services */}
            {tab === 'services' && (
              <>
                <PanelHeader title="GET /api/yokcash/services" desc="Full service catalog with IDR price tiers (harga / gold / silver / pro). Click a service to load its id into the order form." />
                <div className="flex items-center gap-2">
                  <RunButton busy={busy} label="Fetch services" onClick={loadServices} />
                  {categories.length > 0 && (
                    <select
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    >
                      <option value="">All categories ({services.length})</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}
                </div>
                {visibleServices.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" /> {visibleServices.length} services
                    </p>
                    <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 font-mono text-xs">
                      {visibleServices.map(s => (
                        <button
                          key={s.id}
                          onClick={() => { setServiceId(s.id); toast.success(`Loaded ${s.id} into order form`); }}
                          className="w-full flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-1.5 last:border-0 hover:bg-violet-50 text-left"
                          title="Use in order form"
                        >
                          <span className="text-gray-700">{s.nama_layanan}</span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className="text-gray-400">{s.id}</span>
                            <span className={`font-semibold ${s.status === 'aktif' ? 'text-violet-700' : 'text-gray-400 line-through'}`}>{idr(s.harga)}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* status */}
            {tab === 'status' && (
              <>
                <PanelHeader title="GET /api/yokcash/status" desc="Check an order by Yokcash invoice id (the `id` returned by /order, e.g. BG172520XXXXX)." />
                <InputField label="order_id (Yokcash invoice)" value={orderId} onChange={setOrderId} placeholder="BG172520XXXXX" mono />
                <RunButton
                  busy={busy}
                  label="Check status"
                  disabled={!orderId}
                  onClick={() => run(() => yokcash.status(orderId), 'status')}
                />
              </>
            )}

            {/* order */}
            {tab === 'order' && (
              <>
                <PanelHeader title="POST /api/yokcash/order" desc="Place a real order — spends IDR balance. Requires super-admin + YOKCASH_ALLOW_TEST_ORDER=true on the server." />
                <div className="grid gap-3 sm:grid-cols-2">
                  <InputField label="service_id" value={serviceId} onChange={setServiceId} placeholder="e.g. ML86 (see services tab)" mono />
                  <InputField label="target" value={target} onChange={setTarget} placeholder="userId|zoneId or userId" mono />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InputField label="kontak (phone)" value={kontak} onChange={setKontak} placeholder="628xxxx" mono />
                  <InputField label="idtrx (optional — auto-generated)" value={idtrx} onChange={setIdtrx} placeholder="PKTEST…" mono />
                </div>
                <p className="text-xs text-gray-400">
                  Tip: pick a service in the <button className="text-violet-600 underline" onClick={() => setTab('services')}>services</button> tab to auto-fill its id. Duplicate idtrx is rejected by Yokcash — it's your idempotency key.
                </p>
                <div className="flex flex-wrap gap-2">
                  <RunButton
                    busy={busy}
                    label="Place test order"
                    disabled={!serviceId || !target || !kontak}
                    onClick={async () => {
                      const r = (await run(
                        () => yokcash.order({ service_id: serviceId, target, kontak, idtrx: idtrx || undefined }),
                        'order'
                      )) as { testOrdersEnabled?: boolean };
                      if (r?.testOrdersEnabled !== undefined) setTestOrdersEnabled(r.testOrdersEnabled);
                    }}
                  />
                  <button
                    disabled={busy || !serviceId || !target || !kontak}
                    onClick={async () => {
                      const r = (await run(
                        () => yokcash.orderDryRun({ service_id: serviceId, target, kontak, idtrx: idtrx || undefined }),
                        'order/dry-run'
                      )) as { testOrdersEnabled?: boolean };
                      if (r?.testOrdersEnabled !== undefined) setTestOrdersEnabled(r.testOrdersEnabled);
                    }}
                    className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors"
                  >
                    Dry-run preview
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── Right: Response + Log ──────────── */}
        <div className="space-y-4">
          {/* Response pane */}
          <div className="rounded-xl overflow-hidden shadow-lg" style={{background:'#1e1e1e'}}>
            <div className="flex items-center justify-between px-4 py-2.5" style={{background:'#2d2d2d'}}>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <span className="ml-3 text-xs font-mono" style={{color:'#aaa'}}>response.json</span>
              </div>
              {busy && <RefreshCw className="w-4 h-4 animate-spin" style={{color:'#a78bfa'}} />}
            </div>
            <pre className="max-h-[400px] overflow-auto p-5 font-mono text-xs leading-relaxed" style={{background:'#1e1e1e', color:'#4ec9b0'}}>
              {resp === null
                ? <span style={{color:'#666'}}>{'// Run a call to see the response'}</span>
                : JSON.stringify(resp, null, 2)}
            </pre>
          </div>

          {/* Call log */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Call Log</h3>
            {log.length === 0 ? (
              <p className="text-xs text-gray-400">No calls yet.</p>
            ) : (
              <ul className="space-y-2">
                {log.map(c => (
                  <li key={c.id} className="flex items-center gap-3 font-mono text-xs">
                    {c.ok
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                    <span className={`font-medium ${c.ok ? 'text-gray-800' : 'text-red-600'}`}>{c.endpoint}</span>
                    <span className="text-gray-400">{c.ms}ms</span>
                    <span className="ml-auto text-gray-400">{c.at}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default YokcashApiConsolePage;
