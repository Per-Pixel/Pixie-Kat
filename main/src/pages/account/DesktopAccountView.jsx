import { useMemo, useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  LogOut,
  Mail,
  PackageCheck,
  Phone,
  Settings2,
  Sparkles,
  Trophy,
  UserRound,
  Wallet,
} from "lucide-react";

import { pageBackground } from "./accountShared";

const sectionItems = [
  { id: "profile", label: "My Profile", icon: UserRound },
  { id: "orders", label: "My Orders", icon: PackageCheck },
  { id: "wallet", label: "My Wallet", icon: CreditCard },
  { id: "rewards", label: "Rewards", icon: Trophy },
];

const orderSummary = [
  { label: "Completed", value: 2 },
  { label: "Refunded", value: 0 },
  { label: "Processing", value: 1 },
  { label: "Rejected", value: 0 },
];

const orderFilters = [
  { label: "All", count: 3, active: true },
  { label: "Processing" },
  { label: "Payment Approved" },
  { label: "Completed" },
  { label: "Refunded" },
  { label: "Rejected" },
  { label: "Cancelled" },
  { label: "On-Hold" },
];

const walletFilters = [
  { label: "All", count: 0, active: true },
  { label: "Credits", count: 0 },
  { label: "Debits", count: 0 },
  { label: "Admin", count: 0 },
];

const StatusBadge = ({ status }) => {
  const styles = {
    "Success": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Waiting for Payment": "bg-amber-50 text-amber-700 border-amber-200",
    "Refund": "bg-red-50 text-red-600 border-red-200",
    "In processing": "bg-blue-50 text-blue-600 border-blue-200",
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles[status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
      {status}
    </span>
  );
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
            className={`flex items-center gap-3 rounded-[18px] px-4 py-4 text-base font-semibold transition ${
              isActive
                ? "bg-gradient-to-r from-[#6c49ff] to-[#8b6dff] text-white shadow-[0_14px_28px_rgba(108,73,255,0.24)]"
                : "text-slate-600 hover:bg-slate-100/90"
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={2.2} />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-[18px] px-4 py-4 text-left text-base font-semibold text-red-500 transition hover:bg-red-50"
      >
        <LogOut className="h-5 w-5" strokeWidth={2.2} />
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

const FilterPill = ({ label, count, active }) => (
  <button
    type="button"
    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
      active
        ? "bg-[#6c49ff] text-white shadow-[0_10px_20px_rgba(108,73,255,0.25)]"
        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    }`}
  >
    <span>{label}</span>
    {typeof count === "number" ? (
      <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-500"}`}>
        {count}
      </span>
    ) : null}
  </button>
);

const SectionCard = ({ children, className = "" }) => (
  <section className={`rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_18px_50px_rgba(91,79,118,0.14)] backdrop-blur-xl sm:p-6 ${className}`}>
    {children}
  </section>
);

const ProfilePanel = ({ profile }) => (
  <div className="space-y-7">
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Account</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[2.55rem]">My Profile</h1>
    </div>

    <SectionCard>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Link to="/account/edit-profile" className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e8dcff] via-white to-[#9a82ff] p-[5px] shadow-[0_14px_26px_rgba(122,97,255,0.2)] hover:opacity-90 transition-opacity">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#7a5bff] to-[#b097ff] text-2xl font-black text-white overflow-hidden">
              {profile.avatarUrl
                ? <img src={profile.avatarUrl} alt={profile.displayName} className="h-full w-full object-cover rounded-full" />
                : profile.initials
              }
            </div>
            <span className="absolute -bottom-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-md">
              Update
            </span>
          </Link>

          <div>
            <h2 className="text-2xl font-bold text-slate-950">{profile.displayName}</h2>
            {profile.username && (
              <p className="text-sm text-slate-400 mt-0.5">@{profile.username}</p>
            )}
            <div className="mt-3 space-y-2 text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#6c49ff]" />
                <span className="text-base">{profile.email}</span>
                {profile.emailVerified && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">Verified</span>
                )}
              </div>
              {profile.phone ? (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-500" />
                  <span className="text-base">{profile.phone}</span>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">No phone number on file.
                  <Link to="/account/edit-profile" className="ml-1 text-[#6c49ff] font-medium hover:underline">Add one</Link>
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
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {orderSummary.map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-5xl font-black tracking-tight text-[#6c49ff]">{item.value}</p>
              <p className="mt-2 text-lg text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  </div>
);

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

const OrdersPanel = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    supabase
      .from("orders")
      .select("id, product_name, total_amount, currency, status, created_at, metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { setOrders(data ?? []); setLoading(false); });
  }, [user?.id]);

  const formatTs = (ts) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Account</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[2.55rem]">My Orders</h1>
      </div>

      <SectionCard>
        <div className="overflow-x-auto rounded-[22px] border border-slate-200 bg-white">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading your orders…</div>
          ) : orders.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-400 text-sm">No orders yet.</p>
              <Link to="/games" className="mt-3 inline-block text-sm font-semibold text-[#6c49ff] hover:underline">Browse games →</Link>
            </div>
          ) : (
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => {
                  const accountId = getField(order.metadata, ["user_id", "userid", "player_id", "account_id"]);
                  const zoneId = getField(order.metadata, ["zone_id", "server_id", "zoneid"]);
                  return (
                    <tr key={order.id} className="transition hover:bg-[#f5f3ff] cursor-pointer">
                      <td className="whitespace-nowrap px-5 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-700">#{order.id.slice(0, 8).toUpperCase()}</span>
                      </td>
                      <td className="px-5 py-4 max-w-[180px]">
                        <p className="font-medium text-slate-900 text-xs leading-snug">{order.product_name}</p>
                        {order.metadata?.game_name && (
                          <p className="text-xs text-slate-400">{order.metadata.game_name}</p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusBadgeStyle[order.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {order.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-500">{formatTs(order.created_at)}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-mono text-slate-600">{accountId ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-mono text-slate-600">{zoneId ?? "—"}</td>
                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        <span className="font-semibold text-slate-900">{order.currency} {Number(order.total_amount).toFixed(2)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-xs font-black text-amber-900">PKS</span>
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
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 mb-5">Transaction History</h2>

          {txLoading ? (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
                      <tr key={tx.id} className="hover:bg-[#f5f3ff] transition">
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
                        <td className="px-5 py-4 text-slate-500 max-w-[200px] truncate">{tx.reference ?? "—"}</td>
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

const RewardsPanel = () => (
  <div className="space-y-7">
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Account</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[2.55rem]">My Rewards</h1>
    </div>

    <SectionCard>
      <div className="rounded-[22px] bg-slate-100/95 px-6 py-14 text-center text-slate-500">
        <p className="mx-auto max-w-2xl text-lg">
          No rewards yet. Keep playing to unlock your first reward.
        </p>
      </div>
    </SectionCard>
  </div>
);

const QuickActions = () => (
  <SectionCard>
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Quick actions</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">Account tools</h2>
      </div>
      <Sparkles className="hidden h-6 w-6 text-[#6c49ff] sm:block" />
    </div>

    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Link to="/account/settings" className="rounded-[22px] border border-slate-200 bg-slate-50 p-5 block transition hover:border-[#8b6dff]/40 hover:bg-white">
        <Settings2 className="h-5 w-5 text-[#6c49ff]" />
        <p className="mt-4 text-lg font-bold text-slate-900">Manage settings</p>
        <p className="mt-1 text-sm text-slate-500">Update notification, security, and display preferences.</p>
      </Link>
      <Link to="/support" className="rounded-[22px] border border-slate-200 bg-slate-50 p-5 transition hover:border-[#8b6dff]/40 hover:bg-white">
        <CheckCircle2 className="h-5 w-5 text-[#6c49ff]" />
        <p className="mt-4 text-lg font-bold text-slate-900">Contact support</p>
        <p className="mt-1 text-sm text-slate-500">Reach the support team for orders, wallet, or login help.</p>
      </Link>
      <Link to="/games" className="rounded-[22px] border border-slate-200 bg-slate-50 p-5 transition hover:border-[#8b6dff]/40 hover:bg-white">
        <Wallet className="h-5 w-5 text-[#6c49ff]" />
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
        return <RewardsPanel />;
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
                <LogOut className="h-4 w-4" />
                Logout
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DesktopAccountView;
