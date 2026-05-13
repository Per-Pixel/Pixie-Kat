import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
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

const orderRecords = [
  {
    id: "S260324132852478MVAA",
    status: "Success",
    title: "furniturelegends BR 275 Diamond c",
    orderTime: "2026-03-24 13:28:53",
    uidEmail: "1620060514",
    serverId: "16820",
    value: "BRL 18.75",
    oldValue: "BRL 19.75",
  },
  {
    id: "S260324132852478MVAB",
    status: "Success",
    title: "furniturelegends BR 140 Diamond c",
    orderTime: "2026-03-23 22:11:09",
    uidEmail: "1620060514",
    serverId: "16820",
    value: "BRL 9.45",
    oldValue: "BRL 10.20",
  },
  {
    id: "S260324132852478MVAC",
    status: "Waiting for Payment",
    title: "furniturelegends Weekly Pass",
    orderTime: "2026-03-22 09:42:18",
    uidEmail: "lonelykoala@gmail.com",
    serverId: "16820",
    value: "BRL 5.99",
    oldValue: "BRL 6.50",
  },
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
          <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#e8dcff] via-white to-[#9a82ff] p-[5px] shadow-[0_14px_26px_rgba(122,97,255,0.2)]">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#7a5bff] to-[#b097ff] text-2xl font-black text-white">
              {profile.initials}
            </div>
            <span className="absolute -bottom-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-md">
              Update
            </span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-950">{profile.displayName}</h2>
            <div className="mt-3 space-y-2 text-slate-600">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#6c49ff]" />
                <span className="text-base">{profile.email}</span>
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Primary saved number</p>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-500" />
                <span className="text-base">{profile.phone}</span>
              </div>
            </div>
            <p className="mt-4 max-w-xl text-sm text-slate-500">
              Profile picture will use a default image if no photo is set. Your account details are available after login and follow the wallet dashboard styling from the provided references.
            </p>
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

const OrdersPanel = () => (
  <div className="space-y-7">
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Account</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[2.55rem]">My Orders</h1>
    </div>

    <SectionCard>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex flex-wrap gap-3">
          {orderFilters.map((filter) => (
            <FilterPill key={filter.label} {...filter} />
          ))}
        </div>

        <input
          type="text"
          placeholder="Search by Order ID"
          className="h-12 w-full rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-[#8b6dff] xl:w-64"
        />
      </div>

      {/* Orders Table */}
      <div className="mt-7 overflow-x-auto rounded-[22px] border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">Order ID</th>
              <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">Item</th>
              <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">Status</th>
              <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">Date</th>
              <th className="whitespace-nowrap px-5 py-4 font-semibold text-slate-500">UID / Email</th>
              <th className="whitespace-nowrap px-5 py-4 text-right font-semibold text-slate-500">Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orderRecords.map((order) => (
              <tr
                key={order.id}
                className="transition hover:bg-[#f5f3ff] cursor-pointer"
              >
                <td className="whitespace-nowrap px-5 py-4">
                  <span className="font-mono text-xs font-semibold text-slate-700">{order.id.slice(0, 16)}…</span>
                </td>
                <td className="px-5 py-4">
                  <span className="font-medium text-slate-900">{order.title}</span>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-500">{order.orderTime}</td>
                <td className="whitespace-nowrap px-5 py-4 text-slate-600">{order.uidEmail}</td>
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  <span className="font-semibold text-slate-900">{order.value}</span>
                  <span className="ml-2 text-xs text-slate-400 line-through">{order.oldValue}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex justify-end">
        <div className="inline-flex items-center gap-4 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-500">
          <span>&lsaquo;</span>
          <span className="rounded-full bg-slate-100 px-4 py-1 font-semibold text-slate-600">Page 1 / 1</span>
          <span>&rsaquo;</span>
        </div>
      </div>
    </SectionCard>
  </div>
);

const WalletPanel = ({ profile }) => (
  <div className="space-y-7">
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Account</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-[2.55rem]">My Wallet</h1>
    </div>

    <SectionCard>
      <div className="rounded-[24px] bg-gradient-to-r from-[#6c49ff] via-[#7b58ff] to-[#9f84ff] p-5 text-white shadow-[0_16px_30px_rgba(108,73,255,0.28)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-white/80">Wallet balance - Pixie Coins</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-xs font-black text-amber-900">
                PKS
              </span>
              <p className="text-5xl font-black tracking-tight">{profile.walletBalance}</p>
            </div>
          </div>

          <Link
            to="/games/mobile-legends/add-money"
            className="inline-flex h-14 items-center justify-center rounded-full bg-white px-7 text-lg font-bold text-[#6c49ff] shadow-[0_12px_24px_rgba(0,0,0,0.12)] transition hover:scale-[1.01]"
          >
            + Add wallet balance
          </Link>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">Wallet transactions</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {walletFilters.map((filter) => (
              <FilterPill key={filter.label} {...filter} />
            ))}
          </div>
        </div>

        <input
          type="text"
          placeholder="Search by Order ID"
          className="h-12 w-full rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition focus:border-[#8b6dff] xl:mt-10 xl:w-64"
        />
      </div>

      <div className="mt-7 min-h-40 rounded-[22px] border border-dashed border-slate-200 bg-slate-50/80 p-6">
        <p className="text-2xl font-medium text-slate-500">No transactions found.</p>
        <p className="mt-10 text-sm text-slate-400">No wallet transactions to display</p>
      </div>

      <div className="mt-6 flex justify-end">
        <div className="inline-flex items-center gap-4 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-500">
          <span>&lsaquo;</span>
          <span className="rounded-full bg-slate-100 px-4 py-1 font-semibold text-slate-600">Page 1 / 1</span>
          <span>&rsaquo;</span>
        </div>
      </div>
    </SectionCard>
  </div>
);

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
