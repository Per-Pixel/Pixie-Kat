import { useMemo, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LogOut,
  Mail,
  PackageCheck,
  Phone,
  Search,
  Settings2,
  Sparkles,
  Trophy,
  UserRound,
  Wallet,
  X,
} from "lucide-react";

import { pageBackground } from "./accountShared";
import { useUserOrders } from "../../hooks/useUserOrders";
import AvatarFrame from "../../components/common/AvatarFrame";
import LeaderboardAvatar from "../../components/leaderboard/LeaderboardAvatar";
import { currentPeriod, fetchMyRankHistory, frameStyle, periodLabel, rankForPeriod } from "../../lib/leaderboard";

const sectionItems = [
  { id: "profile", label: "My Profile", icon: UserRound },
  { id: "orders", label: "My Orders", icon: PackageCheck },
  { id: "wallet", label: "My Wallet", icon: CreditCard },
  { id: "rewards", label: "Rewards", icon: Trophy },
];

const getOrderSummary = (orders) => {
  const counts = orders.reduce(
    (summary, order) => {
      const status = order.status;
      if (status === "completed") summary.completed += 1;
      else if (status === "refunded") summary.refunded += 1;
      else if (["pending", "processing", "on_hold"].includes(status)) summary.processing += 1;
      else if (["failed", "cancelled"].includes(status)) summary.rejected += 1;
      return summary;
    },
    { completed: 0, refunded: 0, processing: 0, rejected: 0 },
  );

  return [
    { label: "Completed", value: counts.completed },
    { label: "Refunded", value: counts.refunded },
    { label: "Processing", value: counts.processing },
    { label: "Rejected", value: counts.rejected },
  ];
};

const AccountSidebar = ({ currentSection, onLogout }) => (
  <aside className="rounded-[28px] border border-white/70 bg-white/80 p-4 shadow-[0_18px_50px_rgba(91,79,118,0.14)] backdrop-blur-xl">
    <nav className="space-y-2">
      {sectionItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === currentSection;

        return (
          <Link
            key={item.id}
            to={`/account?section=${item.id}`}
            className={`flex items-center gap-3 rounded-[18px] p-4 text-base font-semibold transition ${
              isActive
                ? "bg-gradient-to-r from-[#6c49ff] to-[#8b6dff] text-white shadow-[0_14px_28px_rgba(108,73,255,0.24)]"
                : "text-slate-600 hover:bg-slate-100/90"
            }`}
          >
            <Icon className="size-5" strokeWidth={2.2} />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-[18px] p-4 text-left text-base font-semibold text-red-500 transition hover:bg-red-50"
      >
        <LogOut className="size-5" strokeWidth={2.2} />
        <span>Logout</span>
      </button>
    </nav>
  </aside>
);

const MobileSectionTabs = ({ currentSection }) => (
  <div className="mb-6 flex gap-3 overflow-x-auto pb-2 lg:hidden">
    {sectionItems.map((item) => {
      const isActive = item.id === currentSection;

      return (
        <Link
          key={item.id}
          to={`/account?section=${item.id}`}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
            isActive
              ? "bg-gradient-to-r from-[#6c49ff] to-[#8b6dff] text-white shadow-[0_10px_22px_rgba(108,73,255,0.28)]"
              : "bg-white/80 text-slate-600 shadow-[0_8px_24px_rgba(91,79,118,0.08)]"
          }`}
        >
          {item.label}
        </Link>
      );
    })}
  </div>
);

const SectionCard = ({ children, className = "" }) => (
  <section className={`rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(91,79,118,0.14)] backdrop-blur-xl sm:p-6 ${className}`}>
    {children}
  </section>
);

const ProfilePanel = ({ profile }) => {
  const { user } = useAuth();
  const { orders, loading, error } = useUserOrders(user?.id);
  const orderSummary = getOrderSummary(orders);

  return (
  <div className="space-y-7">
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Account</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[2.55rem]">My Profile</h1>
    </div>

    <SectionCard>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Link to="/account/edit-profile" className="relative shrink-0 transition-opacity hover:opacity-90">
            <AvatarFrame frame={profile.avatarFrame} paddingClass="p-[5px]"
              className="shadow-[0_14px_26px_rgba(122,97,255,0.2)]">
              <div className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#7a5bff] to-[#b097ff] text-2xl font-black text-white">
                {profile.avatarUrl
                  ? <img src={profile.avatarUrl} alt={profile.displayName} className="size-full rounded-full object-cover" />
                  : profile.initials
                }
              </div>
            </AvatarFrame>
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-md">
              Update
            </span>
          </Link>

          <div>
            <h2 className="text-2xl font-bold text-slate-950">{profile.displayName}</h2>
            {profile.username && (
              <p className="mt-0.5 text-sm text-slate-400">@{profile.username}</p>
            )}
            <div className="mt-3 space-y-2 text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="size-4 text-[#6c49ff]" />
                <span className="text-base">{profile.email}</span>
                {profile.emailVerified && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">Verified</span>
                )}
              </div>
              {profile.phone ? (
                <div className="flex items-center gap-2">
                  <Phone className="size-4 text-emerald-500" />
                  <span className="text-base">{profile.phone}</span>
                </div>
              ) : (
                <p className="text-sm italic text-slate-400">No phone number on file.
                  <Link to="/account/edit-profile" className="ml-1 font-medium text-[#6c49ff] hover:underline">Add one</Link>
                </p>
              )}
            </div>
            {profile.bio && (
              <p className="mt-3 max-w-xl text-sm text-slate-500">{profile.bio}</p>
            )}
          </div>
        </div>

        <Link
          to="/account/edit-profile"
          className="inline-flex h-14 items-center justify-center rounded-full bg-gradient-to-r from-[#6c49ff] to-[#8b6dff] px-7 text-lg font-bold text-white shadow-[0_14px_28px_rgba(108,73,255,0.3)] transition hover:scale-[1.01]"
        >
          Edit Profile
        </Link>
      </div>
    </SectionCard>

    <div>
      <h3 className="text-2xl font-extrabold tracking-tight text-slate-950">My Orders</h3>
      <SectionCard className="mt-4">
        {error ? (
          <p className="text-sm text-red-600">Could not load your order summary. Please refresh and try again.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {orderSummary.map((item) => (
              <div key={item.label} className="text-center">
                <p className="text-5xl font-black tracking-tight text-[#6c49ff]">{loading ? "—" : item.value}</p>
                <p className="mt-2 text-lg text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  </div>
  );
};

const statusBadgeStyle = {
  completed:  "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending:    "bg-amber-50 text-amber-700 border-amber-200",
  processing: "bg-blue-50 text-blue-600 border-blue-200",
  failed:     "bg-red-50 text-red-600 border-red-200",
  refunded:   "bg-purple-50 text-purple-700 border-purple-200",
  cancelled:  "bg-slate-100 text-slate-600 border-slate-200",
  on_hold:    "bg-orange-50 text-orange-700 border-orange-200",
};

const getField = (meta, keys) => {
  const fields = meta?.account_fields ?? {};
  for (const k of keys) if (fields[k]) return fields[k];
  return null;
};

const ORDER_PAGE_SIZE = 8;

const PERIOD_OPTIONS = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 Days" },
  { id: "30d", label: "Month" },
  { id: "90d", label: "3 Months" },
  { id: "1y", label: "Year" },
  { id: "all", label: "Lifetime" },
];

const ORDER_STATUS_OPTIONS = [
  { id: "all", label: "All statuses" },
  { id: "completed", label: "Completed" },
  { id: "pending", label: "Waiting for payment" },
  { id: "processing", label: "Processing" },
  { id: "on_hold", label: "On hold" },
  { id: "refunded", label: "Refunded" },
  { id: "failed", label: "Failed" },
  { id: "cancelled", label: "Cancelled" },
];

const periodStart = (period) => {
  const now = new Date();
  switch (period) {
    case "today": return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "7d": return new Date(now.getTime() - 7 * 86_400_000);
    case "30d": return new Date(now.getTime() - 30 * 86_400_000);
    case "90d": return new Date(now.getTime() - 90 * 86_400_000);
    case "1y": return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    default: return null;
  }
};

const OrdersPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { orders, loading, error, refresh } = useUserOrders(user?.id);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("all");
  const [status, setStatus] = useState("all");
  const [game, setGame] = useState("all");
  const [page, setPage] = useState(1);

  const formatTs = (ts) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const gameOptions = useMemo(
    () => [...new Set(orders.map((order) => order.metadata?.game_name).filter(Boolean))].sort(),
    [orders],
  );

  const filtered = useMemo(() => {
    const start = periodStart(period);
    const term = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (status !== "all" && order.status !== status) return false;
      if (game !== "all" && order.metadata?.game_name !== game) return false;
      if (start && new Date(order.created_at) < start) return false;
      if (!term) return true;
      const fields = order.metadata?.account_fields ?? {};
      const haystack = [
        order.id,
        order.product_name,
        order.metadata?.game_name,
        order.payment_id,
        fields.user_id,
        fields.userid,
        fields.player_id,
        fields.account_id,
        fields.zone_id,
        fields.server_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [orders, query, period, status, game]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ORDER_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * ORDER_PAGE_SIZE, currentPage * ORDER_PAGE_SIZE);

  const applyFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const filtersActive = query.trim() !== "" || period !== "all" || status !== "all" || game !== "all";
  const resetFilters = () => {
    setQuery("");
    setPeriod("all");
    setStatus("all");
    setGame("all");
    setPage(1);
  };

  const selectClass =
    "h-11 rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 outline-none transition focus:border-[#8b6dff]";

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Account</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[2.55rem]">My Orders</h1>
      </div>

      <SectionCard>
        {/* Toolbar */}
        <div className="space-y-3">
          <div className="flex flex-col gap-3 md:flex-row">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <span className="sr-only">Search orders</span>
              <input
                type="text"
                value={query}
                onChange={(event) => applyFilter(setQuery)(event.target.value)}
                placeholder="Search by order ID, package, game, or player ID…"
                className="h-11 w-full rounded-full border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#8b6dff]"
              />
            </label>
            <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
              <label className="flex items-center gap-2">
                <span className="sr-only">Filter by status</span>
                <select value={status} onChange={(event) => applyFilter(setStatus)(event.target.value)} className={selectClass}>
                  {ORDER_STATUS_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>{option.label}</option>
                  ))}
                </select>
              </label>
              {gameOptions.length > 1 && (
                <label className="flex items-center gap-2">
                  <span className="sr-only">Filter by game</span>
                  <select value={game} onChange={(event) => applyFilter(setGame)(event.target.value)} className={selectClass}>
                    <option value="all">All games</option>
                    {gameOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </label>
              )}
              {filtersActive && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
                >
                  <X className="size-4" />
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => applyFilter(setPeriod)(option.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  period === option.id
                    ? "bg-gradient-to-r from-[#6c49ff] to-[#8b6dff] text-white shadow-[0_8px_18px_rgba(108,73,255,0.25)]"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="mt-5">
          {error ? (
            <div className="rounded-[22px] border border-red-200 bg-red-50 p-8 text-center">
              <p className="text-sm text-red-700">We couldn’t load your orders right now.</p>
              <button type="button" onClick={refresh} className="mt-3 text-sm font-semibold text-red-800 underline">Try again</button>
            </div>
          ) : loading ? (
            <div className="rounded-[22px] border border-slate-200 bg-white py-12 text-center text-sm text-slate-400">Loading your orders…</div>
          ) : orders.length === 0 ? (
            <div className="rounded-[22px] border border-slate-200 bg-white py-12 text-center">
              <p className="text-sm text-slate-400">No orders yet.</p>
              <Link to="/games" className="mt-3 inline-block text-sm font-semibold text-[#6c49ff] hover:underline">Browse games →</Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50/60 py-12 text-center">
              <p className="text-sm text-slate-500">No orders match these filters.</p>
              <button type="button" onClick={resetFilters} className="mt-3 text-sm font-semibold text-[#6c49ff] hover:underline">Clear filters</button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">Order ID</th>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">Item</th>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">Status</th>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">Date</th>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">User ID</th>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">Zone / Server</th>
                      <th className="whitespace-nowrap px-5 py-4 text-right font-semibold text-slate-500">Amount</th>
                      <th className="w-10 px-3 py-4"><span className="sr-only">View order</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paged.map((order) => {
                      const accountId = getField(order.metadata, ["user_id", "userid", "player_id", "account_id"]);
                      const zoneId = getField(order.metadata, ["zone_id", "server_id", "zoneid"]);
                      return (
                        <tr
                          key={order.id}
                          onClick={() => navigate(`/account/orders/${order.id}`)}
                          className="cursor-pointer transition hover:bg-[#f5f3ff]"
                        >
                          <td className="whitespace-nowrap px-5 py-4">
                            <span className="font-mono text-xs font-semibold text-slate-700">#{order.id.slice(0, 8).toUpperCase()}</span>
                          </td>
                          <td className="max-w-[180px] px-5 py-4">
                            <p className="text-xs font-medium leading-snug text-slate-900">{order.product_name}</p>
                            {order.metadata?.game_name && (
                              <p className="text-xs text-slate-400">{order.metadata.game_name}</p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusBadgeStyle[order.status] ?? "border-slate-200 bg-slate-100 text-slate-600"}`}>
                              {order.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{formatTs(order.created_at)}</td>
                          <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-600">{accountId ?? "—"}</td>
                          <td className="whitespace-nowrap px-5 py-4 font-mono text-xs text-slate-600">{zoneId ?? "—"}</td>
                          <td className="whitespace-nowrap px-5 py-4 text-right">
                            <span className="font-semibold text-slate-900">{order.currency} {Number(order.total_amount).toFixed(2)}</span>
                          </td>
                          <td className="px-3 py-4 text-slate-300">
                            <ChevronRight className="size-4" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row">
                <p className="text-xs text-slate-400">
                  Showing {(currentPage - 1) * ORDER_PAGE_SIZE + 1}–{Math.min(currentPage * ORDER_PAGE_SIZE, filtered.length)} of {filtered.length} {filtered.length === 1 ? "order" : "orders"}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex size-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition enabled:hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNumber = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => setPage(pageNumber)}
                        className={`size-8 rounded-full text-xs font-semibold transition ${
                          pageNumber === currentPage
                            ? "bg-gradient-to-r from-[#6c49ff] to-[#8b6dff] text-white shadow-[0_8px_16px_rgba(108,73,255,0.25)]"
                            : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex size-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition enabled:hover:bg-slate-50 disabled:opacity-40"
                    aria-label="Next page"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
};

const txTypeLabel = {
  credit: "Credit", debit: "Debit", purchase: "Purchase",
  refund: "Refund", referral_bonus: "Referral Bonus", reward_redemption: "Reward",
};

const WalletPanel = ({ profile }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("wallet_transactions")
      .select("id, type, amount, balance_after, reference, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setTransactions(data ?? []);
        setTxLoading(false);
      });
  }, [user?.id]);

  const formatTs = (ts) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Account</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[2.55rem]">My Wallet</h1>
      </div>

      <SectionCard>
        <div className="rounded-[24px] bg-gradient-to-r from-[#6c49ff] via-[#7b58ff] to-[#9f84ff] p-5 text-white shadow-[0_16px_30px_rgba(108,73,255,0.28)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm text-white/80">Wallet balance — Pixie Coins</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-amber-200 text-xs font-black text-amber-900">PKS</span>
                <p className="text-5xl font-black tracking-tight">{Number(profile.walletBalance).toFixed(2)}</p>
              </div>
            </div>
            <Link
              to="/games"
              className="inline-flex h-14 items-center justify-center rounded-full bg-white px-7 text-lg font-bold text-[#6c49ff] shadow-[0_12px_24px_rgba(0,0,0,0.12)] transition hover:scale-[1.01]"
            >
              + Top Up
            </Link>
          </div>
        </div>

        <div className="mt-7">
          <h2 className="mb-5 text-2xl font-extrabold tracking-tight text-slate-950">Transaction History</h2>

          {txLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
              <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Loading transactions…
            </div>
          ) : transactions.length === 0 ? (
            <div className="min-h-40 rounded-[22px] border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
              <p className="text-lg font-medium text-slate-500">No transactions yet.</p>
              <p className="mt-2 text-sm text-slate-400">Your wallet history will appear here after your first top-up.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">Type</th>
                    <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">Amount</th>
                    <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">Balance After</th>
                    <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">Reference</th>
                    <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx) => {
                    const isPos = tx.amount > 0;
                    return (
                      <tr key={tx.id} className="transition hover:bg-[#f5f3ff]">
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            isPos ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                          }`}>
                            {txTypeLabel[tx.type] ?? tx.type}
                          </span>
                        </td>
                        <td className={`whitespace-nowrap px-5 py-4 font-bold ${
                          isPos ? "text-emerald-600" : "text-red-500"
                        }`}>
                          {isPos ? "+" : ""}PKS {Math.abs(tx.amount).toFixed(2)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">PKS {Number(tx.balance_after).toFixed(2)}</td>
                        <td className="max-w-[200px] truncate px-5 py-4 text-slate-500">{tx.reference ?? "—"}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-400">{formatTs(tx.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
};

const RankTrend = ({ rank, previousRank }) => {
  const delta = rank && previousRank ? previousRank - rank : null;
  const label = delta === null ? "—" : delta > 0 ? `Up ${delta}` : delta < 0 ? `Down ${Math.abs(delta)}` : "Same";
  return (
    <span className={`font-general text-xs font-semibold ${delta > 0 ? "text-emerald-700" : delta < 0 ? "text-red-600" : "text-blue-200/60"}`}>
      {label}
    </span>
  );
};

const RankStatus = ({ finalized }) => (
  <span className={`inline-block border px-2 py-1 font-general text-[10px] font-semibold uppercase tracking-wide ${finalized ? "border-violet-300/30 bg-violet-300/10 text-violet-300" : "border-amber-600/30 bg-amber-600/10 text-amber-800"}`}>
    {finalized ? "Final" : "Provisional"}
  </span>
);

export const RewardsPanel = ({ profile }) => {
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchMyRankHistory(12)
      .then(({ history: rows }) => {
        if (!cancelled) setHistory(rows ?? []);
      })
      .catch((err) => {
        if (!cancelled) setHistoryError(err.message || "Could not load rank history.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = rankForPeriod(history, currentPeriod());
  const frame = profile?.avatarFrame ? frameStyle(profile.avatarFrame) : null;
  const hasGif = Boolean(profile?.perks?.gif_avatar);

  return (
    <div className="space-y-7">
      <div>
        <p className="font-general text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300">Account / Season</p>
        <h1 className="mt-2 font-zentry text-4xl font-black uppercase leading-none text-blue-200 sm:text-5xl">Rewards &amp; Rank</h1>
        <p className="mt-3 font-circular-web text-sm text-blue-200/70">Your current place, active perks, and month-by-month results.</p>
      </div>

      {/* Current rank + perks */}
      <section aria-labelledby="account-current-rank" className="relative overflow-hidden rounded-[24px] bg-[#0E041D] p-5 text-blue-50 sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 90% 10%, rgba(87,36,255,0.45), transparent 60%)" }} />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <h2 id="account-current-rank" className="font-general text-[10px] font-semibold uppercase tracking-[0.2em] text-yellow-300">
            Your rank / {periodLabel(currentPeriod())}
          </h2>
          <Link to="/leaderboard" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-yellow-300 px-5 py-2 font-general text-xs font-semibold uppercase text-blue-200 transition-colors hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300">
            View leaderboard <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        <div className="relative mt-7 flex flex-wrap items-center gap-5">
          <LeaderboardAvatar avatarUrl={profile?.avatarUrl} frame={profile?.avatarFrame} sizeClass="size-20 sm:size-24" fallback={<span className="font-zentry text-3xl font-black">{profile?.initials}</span>} />
          <div className="min-w-0 flex-1">
            <p className="font-general text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-100/60">Current standing</p>
            <p aria-live="polite" className="mt-1 break-words font-zentry text-4xl font-black uppercase leading-none text-blue-50 sm:text-6xl">
              {historyError ? "Unavailable" : history === null ? "Loading…" : current ? `#${current.rank}` : "Unranked this month"}
            </p>
            {current ? <p className="mt-2 font-circular-web text-sm text-blue-100/75">{current.order_count} completed order{Number(current.order_count) === 1 ? "" : "s"} this month</p> : null}
            {history !== null && !historyError && !current ? <p className="mt-2 font-circular-web text-sm text-blue-100/70">Complete an order to join this month’s board.</p> : null}
            {current?.hidden ? (
              <p className="mt-2 font-circular-web text-xs font-medium text-yellow-300">
                {current.hidden_reason === "opted_out"
                  ? "Hidden publicly — you're opted out in Settings."
                  : "Hidden publicly by the store."}
              </p>
            ) : null}
          </div>
        </div>
        <div aria-hidden="true" className="relative mt-7 flex items-center gap-3 border-t border-white/20 pt-4">
          <span className="size-2 bg-yellow-300" /><span className="h-px flex-1 bg-white/20" />
          <span className="font-general text-[10px] uppercase tracking-wider text-blue-100/60">Monthly rank rail</span>
        </div>
      </section>

      {/* Perks */}
      <SectionCard>
        <h2 className="font-zentry text-3xl font-black uppercase text-blue-200">Active perks</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className={`relative border-l-2 p-4 pl-6 ${frame ? "border-violet-300 bg-violet-300/5" : "border-blue-200/15 bg-blue-100"}`}>
            <span aria-hidden="true" className={`absolute -left-1 top-6 size-2 ${frame ? "bg-violet-300" : "bg-blue-200/20"}`} />
            <p className="font-general text-[10px] font-semibold uppercase tracking-wide text-violet-300">Avatar frame</p>
            <p className="mt-2 font-general text-base font-semibold text-blue-200">{frame ? `${frame.label} frame active` : "No frame active"}</p>
            <p className="mt-1 font-circular-web text-sm text-blue-200/65">{frame ? "Your frame is visible around your avatar." : "Finish in a monthly tier that includes one to earn a frame."}</p>
          </div>
          <div className={`relative border-l-2 p-4 pl-6 ${hasGif ? "border-violet-300 bg-violet-300/5" : "border-blue-200/15 bg-blue-100"}`}>
            <span aria-hidden="true" className={`absolute -left-1 top-6 size-2 ${hasGif ? "bg-violet-300" : "bg-blue-200/20"}`} />
            <p className="font-general text-[10px] font-semibold uppercase tracking-wide text-violet-300">GIF profile picture</p>
            <p className="mt-2 font-general text-base font-semibold text-blue-200">{hasGif ? "Unlocked" : "Locked"}</p>
            <p className="mt-1 font-circular-web text-sm text-blue-200/65">{hasGif ? "Upload a GIF in Edit Profile." : "Earn a tier that includes GIF avatars."}</p>
          </div>
        </div>
      </SectionCard>

      {/* Rank history */}
      <SectionCard>
        <h2 className="font-zentry text-3xl font-black uppercase text-blue-200">Monthly rank history</h2>
        <p className="mt-2 font-circular-web text-sm text-blue-200/65">Your orders, places, and awarded tiers by month.</p>
        {historyError ? (
          <p role="alert" className="mt-5 font-circular-web text-sm text-red-600">{historyError}</p>
        ) : history === null ? (
          <p role="status" className="mt-6 font-circular-web text-sm text-blue-200/65">Loading rank history…</p>
        ) : history.length === 0 ? (
          <div className="mt-5 border-l-2 border-violet-300 bg-blue-100 p-5">
            <p className="font-circular-web text-sm text-blue-200/75">No rank yet — complete an order this month to appear on the leaderboard.</p>
            <Link to="/games" className="mt-4 inline-flex min-h-11 items-center gap-2 font-general text-xs font-semibold uppercase text-violet-300 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300">
              Browse games <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-5 hidden overflow-x-auto border-l-2 border-violet-300 xl:block">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Your monthly rank history</caption>
                <thead className="border-b border-blue-200/10 bg-blue-100">
                  <tr className="font-general text-[10px] font-semibold uppercase tracking-wide text-blue-200/60">
                    <th scope="col" className="px-4 py-3">Month</th>
                    <th scope="col" className="px-4 py-3">Rank</th>
                    <th scope="col" className="px-4 py-3">Orders</th>
                    <th scope="col" className="px-4 py-3">Trend</th>
                    <th scope="col" className="px-4 py-3">Tier</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-200/10">
                  {history.map((row, index) => (
                    <tr key={row.period} className="transition-colors hover:bg-violet-300/5">
                      <td className="whitespace-nowrap p-4 font-general text-sm font-semibold text-blue-200">{periodLabel(row.period)}</td>
                      <td className="p-4 font-zentry text-2xl font-black text-violet-300">{row.rank ? `#${row.rank}` : "—"}</td>
                      <td className="p-4 font-circular-web text-blue-200/75">{row.order_count ?? "—"}</td>
                      <td className="p-4"><RankTrend rank={row.rank} previousRank={history[index + 1]?.rank} /></td>
                      <td className="p-4 font-circular-web text-blue-200/75">{row.tier || "—"}</td>
                      <td className="p-4"><RankStatus finalized={row.finalized} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ol className="mt-5 border-l-2 border-violet-300 xl:hidden">
              {history.map((row, index) => (
                <li key={row.period} className="relative border-b border-blue-200/10 py-5 pl-5 last:border-b-0">
                  <span aria-hidden="true" className="absolute -left-1 top-8 size-2 bg-violet-300" />
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-general text-sm font-semibold text-blue-200">{periodLabel(row.period)}</p>
                      <div className="mt-2"><RankStatus finalized={row.finalized} /></div>
                    </div>
                    <p className="font-zentry text-4xl font-black leading-none text-violet-300">{row.rank ? `#${row.rank}` : "—"}</p>
                  </div>
                  <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-blue-200/10 pt-3">
                    <div>
                      <dt className="font-general text-[10px] uppercase text-blue-200/55">Orders</dt>
                      <dd className="mt-1 font-circular-web text-sm text-blue-200">{row.order_count ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="font-general text-[10px] uppercase text-blue-200/55">Trend</dt>
                      <dd className="mt-1"><RankTrend rank={row.rank} previousRank={history[index + 1]?.rank} /></dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="font-general text-[10px] uppercase text-blue-200/55">Tier</dt>
                      <dd className="mt-1 break-words font-circular-web text-sm text-blue-200">{row.tier || "—"}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ol>
          </>
        )}
      </SectionCard>
    </div>
  );
};

const QuickActions = () => (
  <SectionCard>
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Quick actions</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">Account tools</h2>
      </div>
      <Sparkles className="hidden size-6 text-[#6c49ff] sm:block" />
    </div>

    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Link to="/account/settings" className="block rounded-[22px] border border-slate-200 bg-slate-50 p-5 transition hover:border-[#8b6dff]/40 hover:bg-white">
        <Settings2 className="size-5 text-[#6c49ff]" />
        <p className="mt-4 text-lg font-bold text-slate-900">Manage settings</p>
        <p className="mt-1 text-sm text-slate-500">Update notification, security, and display preferences.</p>
      </Link>
      <Link to="/support" className="rounded-[22px] border border-slate-200 bg-slate-50 p-5 transition hover:border-[#8b6dff]/40 hover:bg-white">
        <CheckCircle2 className="size-5 text-[#6c49ff]" />
        <p className="mt-4 text-lg font-bold text-slate-900">Contact support</p>
        <p className="mt-1 text-sm text-slate-500">Reach the support team for orders, wallet, or login help.</p>
      </Link>
      <Link to="/games" className="rounded-[22px] border border-slate-200 bg-slate-50 p-5 transition hover:border-[#8b6dff]/40 hover:bg-white">
        <Wallet className="size-5 text-[#6c49ff]" />
        <p className="mt-4 text-lg font-bold text-slate-900">Browse games</p>
        <p className="mt-1 text-sm text-slate-500">Continue exploring top-ups and game currency offers.</p>
      </Link>
    </div>
  </SectionCard>
);

const DesktopAccountView = ({ profile, onLogout }) => {
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedSection = searchParams.get("section");
  const currentSection = sectionItems.some((item) => item.id === requestedSection) ? requestedSection : "profile";

  const renderSection = () => {
    switch (currentSection) {
      case "orders":
        return <OrdersPanel />;
      case "wallet":
        return <WalletPanel profile={profile} />;
      case "rewards":
        return <RewardsPanel profile={profile} />;
      case "profile":
      default:
        return <ProfilePanel profile={profile} />;
    }
  };

  return (
    <div className="min-h-screen px-4 pb-28 pt-24 text-slate-900 sm:px-6 md:px-8 md:pt-28" style={pageBackground}>
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:gap-8"
        >
          <div className="hidden lg:block">
            <AccountSidebar currentSection={currentSection} onLogout={onLogout} />
          </div>

          <div className="min-w-0">
            <MobileSectionTabs currentSection={currentSection} />
            {renderSection()}
            <div className="mt-7">
              <QuickActions />
            </div>
            <div className="mt-6 flex justify-center lg:hidden">
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-500 shadow-[0_8px_20px_rgba(239,68,68,0.08)]"
              >
                <LogOut className="size-4" />
                Logout
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DesktopAccountView;
