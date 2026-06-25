/**
 * SmileCoin API Console — admin port of ZCodeProject's ApiTest.tsx.
 * Exercises every Smilecoin gateway endpoint. Secrets stay on the gateway server.
 */
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Terminal, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  smilecoin, extractSmSkus, SM_CATALOG, SmSku,
} from '../../services/smilecoinService';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CallLog {
  id: number;
  endpoint: string;
  ok: boolean;
  ms: number;
  at: string;
}

const TABS = ['health', 'products', 'productlist', 'servers', 'points', 'rolecheck', 'order'] as const;
type Tab = (typeof TABS)[number];

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

const SmileCoinApiConsolePage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('health');
  const [log, setLog] = useState<CallLog[]>([]);
  const [busy, setBusy] = useState(false);
  const [resp, setResp] = useState<unknown>(null);

  const [product, setProduct] = useState(SM_CATALOG[0].slug);
  const [skuId, setSkuId] = useState('');
  const [skus, setSkus] = useState<SmSku[]>([]);
  const [userid, setUserid] = useState('');
  const [zoneid, setZoneid] = useState('');
  const [testOrdersEnabled, setTestOrdersEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    smilecoin.health()
      .then(h => setTestOrdersEnabled(h.testOrders))
      .catch(() => setTestOrdersEnabled(null));
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

  async function loadSkus(slug: string) {
    setProduct(slug);
    setSkus([]);
    setSkuId('');
    const r = (await run(() => smilecoin.productlist(slug), 'productlist')) as Record<string, unknown>;
    const list = extractSmSkus(r as Parameters<typeof extractSmSkus>[0]);
    setSkus(list);
    if (list[0]) setSkuId(String(list[0].id));
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/providers/smile-coin')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-violet-600" />
              <h1 className="text-2xl font-bold text-gray-900">Smilecoin API Console</h1>
            </div>
            <p className="text-gray-500 text-sm mt-0.5">
              Exercise every gateway endpoint. Responses are real — secrets are signed server-side and never reach this page.
            </p>
          </div>
        </div>

        {/* Endpoint badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          {['GET /api/health', 'GET /api/products', 'GET /api/productlist', 'GET /api/servers', 'GET /api/points', 'POST /api/rolecheck', 'POST /api/order'].map(e => (
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
                <PanelHeader title="GET /api/health" desc="Liveness check on the local gateway. Also reports whether test orders are enabled." />
                <RunButton busy={busy} label="Run health check" onClick={() => run(() => smilecoin.health(), 'health')} />
              </>
            )}

            {/* products */}
            {tab === 'products' && (
              <>
                <PanelHeader title="GET /api/products" desc="Returns the full catalog of product names available on the merchant account." />
                <RunButton busy={busy} label="Fetch products" onClick={() => run(() => smilecoin.products(), 'products')} />
              </>
            )}

            {/* productlist */}
            {tab === 'productlist' && (
              <>
                <PanelHeader title="GET /api/productlist" desc="SKUs (id / spu / price) for one product." />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">product</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    value={product}
                    onChange={e => loadSkus(e.target.value)}
                  >
                    {SM_CATALOG.map(p => (
                      <option key={p.slug} value={p.slug}>{p.emoji} {p.name} ({p.slug})</option>
                    ))}
                  </select>
                </div>
                <RunButton busy={busy} label="Fetch SKUs" onClick={() => loadSkus(product)} />
                {skus.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Found {skus.length} SKUs</p>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 font-mono text-xs">
                      {skus.map(s => (
                        <div key={s.id} className="flex justify-between gap-2 border-b border-gray-100 px-3 py-1.5 last:border-0">
                          <span className="text-gray-500">{s.id}</span>
                          <span className="text-violet-700 font-semibold">${parseFloat(String(s.price)).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* servers */}
            {tab === 'servers' && (
              <>
                <PanelHeader title="GET /api/servers" desc="Server / zone list for products that support it (e.g. ragnarokm)." />
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">product</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    value={product}
                    onChange={e => setProduct(e.target.value)}
                  >
                    {SM_CATALOG.map(p => <option key={p.slug} value={p.slug}>{p.emoji} {p.name}</option>)}
                  </select>
                </div>
                <RunButton busy={busy} label="Fetch servers" onClick={() => run(() => smilecoin.servers(product), 'servers')} />
              </>
            )}

            {/* points */}
            {tab === 'points' && (
              <>
                <PanelHeader title="GET /api/points" desc="Smile points balance on the merchant account." />
                <RunButton busy={busy} label="Fetch balance" onClick={() => run(() => smilecoin.points(), 'points')} />
              </>
            )}

            {/* rolecheck */}
            {tab === 'rolecheck' && (
              <>
                <PanelHeader title="POST /api/rolecheck" desc="Verify a game User ID + Zone ID exists before placing an order." />
                <div className="grid gap-3 sm:grid-cols-2">
                  <InputField label="userid" value={userid} onChange={setUserid} placeholder="e.g. 2560958" />
                  <InputField label="zoneid" value={zoneid} onChange={setZoneid} placeholder={userid || 'same as userid'} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">product</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      value={product}
                      onChange={e => setProduct(e.target.value)}
                    >
                      {SM_CATALOG.map(p => <option key={p.slug} value={p.slug}>{p.slug}</option>)}
                    </select>
                  </div>
                  <InputField label="productid (SKU)" value={skuId} onChange={setSkuId} placeholder="load SKUs first" mono />
                </div>
                <p className="text-xs text-gray-400">
                  Tip: switch to the <button className="text-violet-600 underline" onClick={() => setTab('productlist')}>productlist</button> tab first to load a valid SKU id.
                </p>
                <RunButton
                  busy={busy}
                  label="Run role check"
                  disabled={!userid || !skuId}
                  onClick={() => run(
                    () => smilecoin.rolecheck({ userid, zoneid: zoneid || userid, product, productid: skuId }),
                    'rolecheck'
                  )}
                />
              </>
            )}

            {/* order */}
            {tab === 'order' && (
              <>
                <PanelHeader title="POST /api/order" desc="Place a real order via createorder. Gated server-side by SC_ALLOW_TEST_ORDER." />
                {testOrdersEnabled === false && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                    ⚠ Test orders are disabled. Set <code className="font-mono bg-amber-100 px-1 rounded">SC_ALLOW_TEST_ORDER=true</code> in <code className="font-mono bg-amber-100 px-1 rounded">.env</code> to enable. Dry-run below still works.
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <InputField label="userid" value={userid} onChange={setUserid} />
                  <InputField label="zoneid" value={zoneid} onChange={setZoneid} placeholder={userid || 'same as userid'} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">product</label>
                    <select
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      value={product}
                      onChange={e => setProduct(e.target.value)}
                    >
                      {SM_CATALOG.map(p => <option key={p.slug} value={p.slug}>{p.slug}</option>)}
                    </select>
                  </div>
                  <InputField label="productid (SKU)" value={skuId} onChange={setSkuId} placeholder="load SKUs first" mono />
                </div>
                <div className="flex flex-wrap gap-2">
                  <RunButton
                    busy={busy}
                    label="Place test order"
                    disabled={!userid || !skuId}
                    onClick={() => run(
                      () => smilecoin.order({ userid, zoneid: zoneid || userid, product, productid: skuId }),
                      'order'
                    )}
                  />
                  <button
                    disabled={busy || !userid || !skuId}
                    onClick={() => run(
                      () => smilecoin.orderDryRun({ userid, zoneid: zoneid || userid, product, productid: skuId }),
                      'order/dry-run'
                    )}
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

export default SmileCoinApiConsolePage;
