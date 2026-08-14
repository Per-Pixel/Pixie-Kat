import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  UserCheck,
  XCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (amount, currency = "PKS") =>
  `${currency} ${Number(amount).toFixed(2)}`;

let _nextId = 1;
const uid = () => String(_nextId++);

const USER_ID_KEYS  = ["user_id", "userid", "player_id", "account_id"];
const ZONE_ID_KEYS  = ["zone_id", "server_id", "zoneid"];

// ─── sub-components ─────────────────────────────────────────────────────────

function StatusBadge({ status, completed, total, actual, mixed, manual, failed }) {
  if (status === "processing")
    return (
      <span className="flex items-center gap-1 text-xs text-blue-600">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {total > 1 ? `${completed}/${total}…` : "Processing…"}
      </span>
    );
  if (status === "done")
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600" title="All units delivered as ordered">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {total > 1 ? `${total}/${total} done` : "Done — actual order"}
      </span>
    );
  if (status === "partial")
    return (
      <span className="flex items-center gap-1 text-xs text-amber-600" title={`Actual: ${actual ?? completed}, Mixed: ${mixed ?? 0}, Manual: ${manual ?? 0}, Failed: ${failed ?? 0}`}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        {completed}/{total} done
        {(mixed > 0 || manual > 0) && ` (${mixed > 0 ? `${mixed} mixed` : ""}${mixed > 0 && manual > 0 ? ", " : ""}${manual > 0 ? `${manual} manual` : ""})`}
      </span>
    );
  if (status === "manual")
    return (
      <span className="flex items-center gap-1 text-xs text-slate-600" title="Order placed; manual fulfillment required">
        <Loader2 className="h-3.5 w-3.5" />
        {total > 1 ? `${manual}/${total} manual` : "Manual fulfillment"}
      </span>
    );
  if (status === "failed")
    return (
      <span className="flex items-center gap-1 text-xs text-red-500">
        <XCircle className="h-3.5 w-3.5" /> Failed
      </span>
    );
  return null;
}

// ─── main page ───────────────────────────────────────────────────────────────

export default function BatchOrderPage() {
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth();

  // ── game catalog ──
  const [games, setGames]             = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // ── current selection ──
  const [selectedGameId, setSelectedGameId]     = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [fieldValues, setFieldValues]           = useState({});
  const [quantity, setQuantity]                 = useState(1);

  // ── player verification ──
  const [playerName, setPlayerName]   = useState(null);
  const [verifying, setVerifying]     = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const verifyTimer                   = useRef(null);

  // ── cart ──
  const [cart, setCart] = useState([]);

  // ── processing ──
  const [processing, setProcessing] = useState(false);
  const [results, setResults]       = useState({});
  const [done, setDone]             = useState(false);

  // ── pre-order verification ──
  const [preCheck, setPreCheck]   = useState(null);
  const [preCheckLoading, setPreCheckLoading] = useState(false);

  // ── wallet balance (live) ──
  const [walletBalance, setWalletBalance] = useState(null);

  useEffect(() => {
    if (profile) setWalletBalance(Number(profile.wallet_balance ?? 0));
  }, [profile]);

  useEffect(() => {
    setPreCheck(null);
  }, [cart]);

  // ── fetch all active games with their fields + products ──
  useEffect(() => {
    supabase
      .from("games")
      .select("id, name, slug, provider_game_code, metadata, status, game_fields(*), products(*)")
      .eq("status", "active")
      .then(({ data }) => {
        const list = (data ?? []).map((g) => ({
          ...g,
          game_fields: (g.game_fields ?? []).sort((a, b) => a.sort_order - b.sort_order),
          products:    (g.products ?? [])
            .filter((p) => p.status === "active")
            .sort((a, b) => a.sort_order - b.sort_order),
        }));
        setGames(list);
        setCatalogLoading(false);
      });
  }, []);

  // ── player verification (debounced) ──
  const selectedGame    = games.find((g) => g.id === selectedGameId) ?? null;
  const selectedProduct = selectedGame?.products.find((p) => p.id === selectedProductId) ?? null;

  useEffect(() => {
    if (!selectedGame?.provider_game_code) return;

    const userIdKey  = selectedGame.game_fields.find((f) => USER_ID_KEYS.includes(f.field_key))?.field_key;
    const zoneIdKey  = selectedGame.game_fields.find((f) => ZONE_ID_KEYS.includes(f.field_key))?.field_key;
    const userId     = String(fieldValues[userIdKey] ?? "").trim();
    const zoneId     = String(fieldValues[zoneIdKey] ?? "").trim();

    setPlayerName(null);
    setVerifyError("");

    if (!userId) return;
    if (zoneIdKey && !zoneId) return;

    clearTimeout(verifyTimer.current);
    verifyTimer.current = setTimeout(async () => {
      setVerifying(true);
      try {
        const res  = await fetch("/api/verify-player", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            user_id:            userId,
            zone_id:            zoneId || undefined,
            api_game:           selectedGame.provider_game_code,
            product:            selectedGame.provider_game_code,
            product_id:         "1",
            smile_coin_product: selectedGame.metadata?.smile_coin_product || undefined,
          }),
        });
        const json = await res.json();
        if (json.success && json.username) {
          setPlayerName(json.username);
        } else {
          setVerifyError(json.message || "Player not found. Check ID" + (zoneIdKey ? " and Zone." : "."));
        }
      } catch {
        setVerifyError("Could not reach server — make sure backend is running.");
      } finally {
        setVerifying(false);
      }
    }, 800);

    return () => clearTimeout(verifyTimer.current);
  }, [fieldValues, selectedGame?.provider_game_code, selectedGame?.game_fields]);

  // ── access guard ──
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f4ff]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;

  // ── derived ──
  const cartTotal = cart.reduce((s, i) => s + Number(i.product.price) * i.quantity, 0);
  const totalOrders = cart.reduce((s, i) => s + i.quantity, 0);
  const canAfford = walletBalance !== null && walletBalance >= cartTotal && cartTotal > 0;
  const preCheckOk = !preCheck || preCheck.can_proceed;
  const canProceed = canAfford && preCheckOk;

  // ── handlers ──
  // ── default product per game (from game metadata set in admin) ──
  const getDefaultProduct = (game) => {
    const defaultId = game?.metadata?.default_product_id;
    if (!defaultId) return null;
    return game?.products?.find((p) => p.id === defaultId)?.id ?? null;
  };

  const handleGameChange = (gameId) => {
    setSelectedGameId(gameId);
    setFieldValues({});
    setPlayerName(null);
    setVerifyError("");
    setQuantity(1);
    // Auto-select default product if set in metadata, otherwise first product
    const game = games.find((g) => g.id === gameId);
    const defaultPid = getDefaultProduct(game);
    if (defaultPid) {
      setSelectedProductId(defaultPid);
    } else if (game?.products?.length > 0) {
      setSelectedProductId(game.products[0].id);
    } else {
      setSelectedProductId("");
    }
  };

  const handleAddToCart = () => {
    if (!selectedGame || !selectedProduct) return;
    const missingField = selectedGame.game_fields.find(
      (f) => (f.is_required || f.required) && !fieldValues[f.field_key]?.trim()
    );
    if (missingField) {
      alert(`Please fill in: ${missingField.label}`);
      return;
    }
    setCart((prev) => [
      ...prev,
      {
        localId:    uid(),
        game:       selectedGame,
        product:    selectedProduct,
        fieldValues: { ...fieldValues },
        quantity,
        playerName: playerName ?? null,
      },
    ]);
    setFieldValues({});
    setSelectedProductId("");
    setPlayerName(null);
    setVerifyError("");
    setQuantity(1);
  };

  const handleRemove = (localId) => {
    setCart((prev) => prev.filter((i) => i.localId !== localId));
  };

  const runPreCheck = async () => {
    if (cart.length === 0) return null;
    setPreCheckLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const items = cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity }));
      const res = await fetch("/api/batch-validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items }),
      });
      const body = await res.json();
      // Keep failed responses — discarding them left `preCheck` null, which made
      // the error banner unreachable and the batch fail silently.
      setPreCheck(body);
      return body;
    } catch (err) {
      console.error("[batch-order] pre-check failed:", err.message);
      const body = { ok: false, error: "Could not reach the verification server. Please try again." };
      setPreCheck(body);
      return body;
    } finally {
      setPreCheckLoading(false);
    }
  };

  const handleProcessAll = async () => {
    if (processing || cart.length === 0) return;

    // Run pre-order verification (wallet + merchant points) first.
    const pre = await runPreCheck();
    if (!pre || !pre.ok || !pre.can_proceed) {
      setProcessing(false);
      return;
    }

    setProcessing(true);
    setDone(false);
    setResults({});

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    let runningBalance = walletBalance;

    for (const item of cart) {
      const qty = item.quantity;
      let completed = 0;
      let failed    = 0;
      let manual    = 0;
      let actual    = 0;
      let mixed     = 0;
      const errors  = [];
      const mismatches = [];

      setResults((prev) => ({
        ...prev,
        [item.localId]: { status: "processing", completed: 0, total: qty, error: null },
      }));

      for (let i = 0; i < qty; i++) {
        let orderId = null;
        try {
          const orderMeta = {
            game_id:       item.game.id,
            game_slug:     item.game.slug,
            game_name:     item.game.name,
            account_fields: item.fieldValues,
            ...(item.playerName ? { player_name: item.playerName } : {}),
          };

          const placeRes = await fetch("/api/place-order", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              product_id: item.product.id,
              product_name: item.product.name,
              total_amount: Number(item.product.price),
              currency: item.product.currency ?? "PKS",
              metadata: orderMeta,
            }),
          });
          const placeData = await placeRes.json();
          if (!placeRes.ok || !placeData.ok) throw new Error(placeData.error || "Order failed");
          orderId = placeData.orderId;

          runningBalance -= Number(item.product.price);
          setWalletBalance(runningBalance);

          const res  = await fetch("/api/fulfill-order", {
            method:  "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body:    JSON.stringify({ orderId }),
          });
          const body = await res.json();

          if (res.status === 500) {
            runningBalance += Number(item.product.price);
            setWalletBalance(runningBalance);
            failed++;
            errors.push(body.error || "Delivery failed — refunded");
          } else if (body.ok === false) {
            if (body.provisioned === false) {
              manual++;
              errors.push(body.error || "Manual fulfillment");
            } else {
              runningBalance += Number(item.product.price);
              setWalletBalance(runningBalance);
              failed++;
              errors.push(body.error || "Delivery failed — refunded");
            }
          } else {
            completed++;
            if (body.mismatch) {
              mixed++;
              mismatches.push(body.mismatch);
              if (body.mismatch.refund_amount > 0) {
                runningBalance += Number(body.mismatch.refund_amount);
                setWalletBalance(runningBalance);
              }
            } else {
              actual++;
            }
          }
        } catch (err) {
          failed++;
          errors.push(err.message);
          if (orderId) {
            // place-order succeeded but fulfill call failed at network layer.
            // The wallet was already deducted and the real refund will be reflected
            // when we refresh the profile after the batch completes.
          }
        }

        setResults((prev) => ({
          ...prev,
          [item.localId]: {
            status:
              failed > 0 && completed === 0 && manual === 0
                ? "failed"
                : failed > 0 || manual > 0 || mixed > 0
                ? "partial"
                : "processing",
            completed,
            total:     qty,
            actual,
            mixed,
            manual,
            failed,
            error:     errors[errors.length - 1] ?? null,
            mismatches: mismatches.length > 0 ? [...mismatches] : null,
          },
        }));
      }

      setResults((prev) => ({
        ...prev,
        [item.localId]: {
          status:
            failed === qty
              ? "failed"
              : manual === qty
              ? "manual"
              : failed > 0 || manual > 0 || mixed > 0
              ? "partial"
              : "done",
          completed,
          total:     qty,
          actual,
          mixed,
          manual,
          failed,
          error:     errors.length > 0 ? errors[0] : null,
          mismatches: mismatches.length > 0 ? [...mismatches] : null,
        },
      }));
    }

    await refreshProfile();
    setProcessing(false);
    setDone(true);
  };

  const handleReset = () => {
    setCart([]);
    setResults({});
    setDone(false);
  };

  // ─── render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f4ff] px-4 pt-24 pb-16 text-[#10141f]">
      <div className="mx-auto max-w-5xl">
        {/* header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">Batch Orders</h1>
            <p className="mt-1 text-sm text-[#6d7480]">
              Queue multiple top-ups and process them in one go.
            </p>
          </div>
          {walletBalance !== null && (
            <div className="rounded-xl bg-white px-4 py-2 text-right shadow-sm">
              <p className="text-xs text-[#6d7480]">Wallet Balance</p>
              <p className="text-lg font-bold text-violet-600">{fmt(walletBalance)}</p>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* ── left: add item form ──────────────────────────────────── */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold">Add Item to Cart</h2>

            {catalogLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading games…
              </div>
            ) : (
              <div className="space-y-4">
                {/* game selector */}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#6d7480]">Game</label>
                  <select
                    className="w-full rounded-lg border border-[#e2e6ee] bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
                    value={selectedGameId}
                    onChange={(e) => handleGameChange(e.target.value)}
                  >
                    <option value="">— Select a game —</option>
                    {games.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                {/* account fields + inline verification */}
                {selectedGame && selectedGame.game_fields.map((field) => (
                  <div key={field.id}>
                    <label className="mb-1 block text-xs font-semibold text-[#6d7480]">
                      {field.label}
                      {(field.is_required || field.required) && (
                        <span className="ml-0.5 text-red-400">*</span>
                      )}
                    </label>
                    <input
                      type="text"
                      placeholder={field.placeholder ?? ""}
                      className="w-full rounded-lg border border-[#e2e6ee] px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
                      value={fieldValues[field.field_key] ?? ""}
                      onChange={(e) =>
                        setFieldValues((prev) => ({ ...prev, [field.field_key]: e.target.value }))
                      }
                    />
                  </div>
                ))}

                {/* verification status */}
                {selectedGame?.provider_game_code && (
                  <div className="flex h-8 items-center gap-2">
                    {verifying && (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                        <span className="text-xs text-slate-400">Verifying player…</span>
                      </>
                    )}
                    {!verifying && playerName && (
                      <>
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs font-semibold text-emerald-600">{playerName}</span>
                      </>
                    )}
                    {!verifying && !playerName && verifyError && (
                      <>
                        <XCircle className="h-4 w-4 text-red-400" />
                        <span className="text-xs text-red-500">{verifyError}</span>
                      </>
                    )}
                  </div>
                )}

                {/* package selector */}
                {selectedGame && selectedGame.products.length > 0 && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#6d7480]">
                      Package
                    </label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {selectedGame.products.map((p) => {
                        const isDefault = getDefaultProduct(selectedGame) === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedProductId(p.id)}
                            className={`rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                              selectedProductId === p.id
                                ? "border-violet-500 bg-violet-50 text-violet-700"
                                : "border-[#e2e6ee] hover:border-violet-300"
                            }`}
                          >
                            <div className="font-semibold">{p.name}</div>
                            <div className="text-xs text-[#6d7480]">{fmt(p.price, p.currency)}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* quantity + add button row */}
                {selectedGame && (
                  <div className="flex items-center gap-3">
                    {/* quantity stepper */}
                    <div className="flex items-center rounded-xl border border-[#e2e6ee] bg-[#f9f8ff]">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-l-xl text-slate-500 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-30"
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center text-sm font-bold">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                        className="flex h-10 w-10 items-center justify-center rounded-r-xl text-slate-500 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-30"
                        disabled={quantity >= 20}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    {/* price preview */}
                    {selectedProduct && (
                      <span className="text-sm font-semibold text-violet-600">
                        = {fmt(Number(selectedProduct.price) * quantity, selectedProduct.currency)}
                      </span>
                    )}

                    {/* add button */}
                    <button
                      type="button"
                      disabled={!selectedProduct}
                      onClick={handleAddToCart}
                      className="ml-auto flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-40 hover:bg-violet-700"
                    >
                      <Plus className="h-4 w-4" /> Add to Cart
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── right: cart ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-violet-600" />
                <h2 className="text-base font-bold">
                  Cart{" "}
                  {cart.length > 0 && (
                    <span className="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs text-violet-700">
                      {totalOrders} order{totalOrders !== 1 ? "s" : ""}
                    </span>
                  )}
                </h2>
              </div>

              {cart.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-400">No items yet. Add some above.</p>
              ) : (
                <div className="space-y-2">
                  {cart.map((item) => {
                    const res         = results[item.localId];
                    const isProcessed = !!res;
                    return (
                      <div
                        key={item.localId}
                        className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm ${
                          res?.status === "done" && res?.mismatches?.length ? "border-amber-300 bg-amber-50" :
                          res?.status === "done"    ? "border-emerald-200 bg-emerald-50" :
                          res?.status === "partial" ? "border-amber-200 bg-amber-50"    :
                          res?.status === "failed"  ? "border-red-200 bg-red-50"        :
                          res?.status === "manual"  ? "border-slate-200 bg-slate-50"    :
                          "border-[#e2e6ee]"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold">{item.game.name}</span>
                            <span className="text-[#6d7480]">—</span>
                            <span>{item.product.name}</span>
                            {item.quantity > 1 && (
                              <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-xs font-bold text-violet-700">
                                ×{item.quantity}
                              </span>
                            )}
                          </div>
                          {item.playerName && (
                            <div className="mt-0.5 flex items-center gap-1 text-xs text-emerald-600">
                              <UserCheck className="h-3 w-3" /> {item.playerName}
                            </div>
                          )}
                          <div className="mt-0.5 text-xs text-[#6d7480]">
                            {Object.entries(item.fieldValues).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="text-xs font-semibold text-violet-600">
                              {fmt(Number(item.product.price) * item.quantity, item.product.currency)}
                            </span>
                            {res && (
                              <StatusBadge
                                status={res.status}
                                completed={res.completed}
                                total={res.total}
                                actual={res.actual}
                                mixed={res.mixed}
                                manual={res.manual}
                                failed={res.failed}
                              />
                            )}
                          </div>
                          {res?.error && (
                            <p className="mt-0.5 text-xs text-red-500">{res.error}</p>
                          )}
                          {res?.mismatches?.length > 0 && (
                            <div className="mt-1 flex items-start gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-800">
                              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                              <span>
                                Provider price mismatch on {res.mismatches.length} order{res.mismatches.length > 1 ? "s" : ""}
                                {` — expected ${res.mismatches[0].expected_provider_price}, got ${res.mismatches[0].actual_provider_price}. `}
                                The provider may have substituted a different product.
                              </span>
                            </div>
                          )}
                        </div>
                        {!isProcessed && (
                          <button
                            type="button"
                            onClick={() => handleRemove(item.localId)}
                            className="mt-0.5 shrink-0 text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* totals */}
              {cart.length > 0 && (
                <div className="mt-4 border-t pt-4 space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6d7480]">Total ({totalOrders} orders)</span>
                    <span className="font-bold">{fmt(cartTotal)}</span>
                  </div>
                  {walletBalance !== null && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#6d7480]">After deduction</span>
                        <span className={`font-bold ${canAfford ? "text-emerald-600" : "text-red-500"}`}>
                          {fmt(Math.max(0, walletBalance - cartTotal))}
                        </span>
                      </div>
                      {!canAfford && (
                        <p className="text-right text-xs text-red-500">
                          Need {fmt(cartTotal - walletBalance)} more
                        </p>
                      )}
                    </>
                  )}
                  {preCheck?.ok === false && (
                    <p className="text-xs text-red-500">{preCheck.error || "Cannot process this batch."}</p>
                  )}
                  {preCheck?.ok && preCheck.can_proceed === false && canAfford
                    && !preCheck.items?.some((it) => it.points_ok === false) && (
                    <p className="text-xs text-red-500">
                      Cannot process this batch right now. Please try again shortly.
                    </p>
                  )}
                  {preCheck?.ok && preCheck.items && (
                    <div className="space-y-0.5">
                      {preCheck.items.map((it, idx) =>
                        it.points_ok === false ? (
                          <p key={idx} className="text-xs text-red-500">
                            {it.product_name}: {it.error || "Provider points insufficient"}
                          </p>
                        ) : it.points_ok === true ? (
                          <p key={idx} className="text-xs text-emerald-600">
                            {it.product_name}: Provider points OK
                          </p>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* process / reset */}
            {!done ? (
              <button
                type="button"
                disabled={!canProceed || processing || preCheckLoading || cart.length === 0}
                onClick={handleProcessAll}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-40 hover:bg-emerald-700"
              >
                {preCheckLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</>
                ) : processing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Processing…</>
                ) : (
                  <><CheckCircle2 className="h-4 w-4" /> Process {totalOrders} Order{totalOrders !== 1 ? "s" : ""}</>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReset}
                className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-bold text-white hover:bg-slate-700"
              >
                Clear &amp; Start New Batch
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
