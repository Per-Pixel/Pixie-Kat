import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  PencilLine,
  Search,
  UserPlus,
  Settings,
} from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaTwitch,
  FaTwitter,
  FaYoutube,
} from "react-icons/fa";

import { pageBackground } from "./accountShared";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { useUserOrders } from "../../hooks/useUserOrders";

const toCardOrder = (order) => {
  const fields = order.metadata?.account_fields ?? {};
  const uid    = fields.user_id || fields.userid || fields.player_id || fields.account_id || "—";
  const server = fields.zone_id || fields.server_id || fields.zoneid || "—";
  return {
    id:        "#" + order.id.slice(0, 8).toUpperCase(),
    _rawId:    order.id,
    status:    order.status.replace(/_/g, " "),
    title:     `${order.metadata?.game_name ? order.metadata.game_name + " — " : ""}${order.product_name}`,
    orderTime: new Date(order.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }),
    uidEmail:  uid,
    serverId:  server,
    value:     `${order.currency} ${Number(order.total_amount).toFixed(2)}`,
    oldValue:  "",
    pinCode:   "",
  };
};

const statusOptions = [
  { label: "All statuses", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Waiting for payment", value: "pending" },
  { label: "Refunded", value: "refunded" },
  { label: "Failed", value: "failed" },
  { label: "Processing", value: "processing" },
  { label: "Cancelled", value: "cancelled" },
  { label: "On hold", value: "on_hold" },
];

const monthRows = [
  [22, 23, 24, 25, 26, 27, 28],
  [1, 2, 3, 4, 5, 6, 7],
  [8, 9, 10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19, 20, 21],
  [22, 23, 24, 25, 26, 27, 28],
  [29, 30, 31, 1, 2, 3, 4],
];

const socialIcons = [FaFacebookF, FaYoutube, FaInstagram, FaTwitter, FaTiktok, FaTwitch];

const getPathnameSuffix = (pathname) => pathname.replace(/^\/account\/?/, "");

const ProfileHero = ({ profile }) => (
  <div className="mt-4 rounded-[18px] bg-gradient-to-r from-[#5724ff] to-[#4FB7DD] p-4 text-white shadow-[0_16px_30px_rgba(87,36,255,0.2)]">
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-full bg-white/20 text-lg font-black backdrop-blur">
          {profile.initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[1.35rem] font-extrabold leading-tight">{profile.displayName}</p>
          <p className="text-base font-semibold text-white/85">Good night</p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-white">
        <button type="button" className="rounded-md p-1.5" aria-label="Invite friend">
          <UserPlus className="size-6" />
        </button>
        <Link to="/account/edit-profile" className="rounded-md p-1.5" aria-label="Edit profile">
          <PencilLine className="size-6" />
        </Link>
        <Link to="/account/settings" className="rounded-md p-1.5" aria-label="Manage settings">
          <Settings className="size-6" />
        </Link>
      </div>
    </div>
  </div>
);

const StatsCard = ({ navigate, profile }) => (
  <div className="bg-white/88 mt-3 rounded-[18px] border border-white/70 p-4 text-slate-900 shadow-[0_16px_30px_rgba(91,79,118,0.12)] backdrop-blur-xl">
    <div className="grid grid-cols-2 gap-4 divide-x divide-slate-200">
      <div className="pr-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-amber-100 to-amber-300 text-xs font-black text-amber-900 shadow-inner">
            PKS
          </div>
          <div>
            <p className="text-sm text-slate-500">Balance:</p>
            <p className="text-[2rem] font-black leading-none tracking-tight text-slate-950">{Number(profile.walletBalance).toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Link
            to="/games/mobile-legends/add-money"
            className="rounded-full bg-gradient-to-r from-[#5724ff] to-[#4FB7DD] px-3 py-2 text-xs font-bold text-white shadow-[0_10px_18px_rgba(87,36,255,0.18)]"
          >
            Top Up
          </Link>
          <button
            type="button"
            onClick={() => navigate("/account/redeem-code?tab=redeem")}
            className="rounded-full bg-gradient-to-r from-[#5724ff] to-[#4FB7DD] px-3 py-2 text-xs font-bold text-white shadow-[0_10px_18px_rgba(87,36,255,0.18)]"
          >
            Activation Code
          </button>
        </div>
      </div>

      <div className="pl-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-emerald-100 to-emerald-300 text-lg font-black text-emerald-900 shadow-inner">
            %
          </div>
          <div>
            <p className="text-sm text-slate-500">Coupons:</p>
            <p className="text-[2rem] font-black leading-none tracking-tight text-slate-950">0</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate("/account/redeem-code?tab=redeem")}
            className="rounded-full bg-gradient-to-r from-[#5724ff] to-[#4FB7DD] px-4 py-2 text-xs font-bold text-white shadow-[0_10px_18px_rgba(87,36,255,0.18)]"
          >
            Redeem
          </button>
        </div>
      </div>
    </div>
  </div>
);

const CalendarOverlay = ({ onClose, range, setRange }) => {
  const selectDay = (value) => {
    if (value < 1 || value > 31) return;

    if (!range.start || (range.start && range.end)) {
      setRange({ start: value, end: null });
      return;
    }

    setRange({
      start: Math.min(range.start, value),
      end: Math.max(range.start, value),
    });
  };

  return (
    <div className="absolute left-2 top-10 z-30 w-[calc(100vw-2rem)] max-w-[18.8rem] rounded-[10px] bg-white p-3 text-slate-800 shadow-[0_16px_38px_rgba(15,23,42,0.25)]">
      <div className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">
        <button type="button" onClick={onClose} aria-label="Close calendar">&laquo;</button>
        <span>{new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}</span>
        <span className="w-4" />
      </div>
      <div className="grid grid-cols-7 gap-y-2 text-center text-xs font-semibold text-slate-600">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-3 space-y-1 text-sm">
        {monthRows.map((row, index) => (
          <div key={`${row.join("-")}-${index}`} className="grid grid-cols-7 gap-1">
            {row.map((day, dayIndex) => {
              const isOutside = (index === 0 && day > 21) || (index === 5 && day < 5);
              const isSelected = day === range.start || day === range.end;
              const isInRange = range.start != null && range.end != null && day > range.start && day < range.end && index > 0 && index < 5;

              return (
                <button
                  key={`${day}-${dayIndex}`}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`h-9 rounded text-center ${
                    isSelected
                      ? "bg-[#315f95] font-bold text-white"
                      : isInRange
                        ? "bg-slate-200 text-slate-700"
                        : isOutside
                          ? "text-slate-400"
                          : "text-slate-700"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-end border-t border-slate-200 pt-2">
        <button
          type="button"
          onClick={() => { setRange({ start: null, end: null }); onClose(); }}
          className="text-xs font-semibold text-[#315f95]"
        >
          Show all time
        </button>
      </div>
      <div className="absolute bottom-[-8px] left-[11.5rem] size-4 rotate-45 bg-white" />
    </div>
  );
};

const OrderCard = ({ order, compact = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-full rounded-[14px] border border-[#315f95] bg-slate-800/95 p-5 text-left text-white transition active:scale-[0.995]"
  >
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 text-sm">
        <div className="min-w-0">
          <p className="text-[#94b4d0]">Order ID:</p>
          <p className="truncate text-lg font-bold text-slate-100">{order.id}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-base">
        <span className="text-[#94b4d0]">Status:</span>
        <span className="font-semibold text-slate-100">{order.status}</span>
      </div>

      <div className="border-t border-[#315f95] pt-4">
        <div className="flex items-center gap-3 text-[0.95rem] text-slate-200">
          <span className="text-lg">PKS</span>
          <span className="truncate">{order.title}</span>
        </div>
      </div>

      <div className="border-t border-[#315f95] pt-4 text-base text-slate-100">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-[#94b4d0]">Order Time</span>
          <span className="font-semibold">{order.orderTime}</span>
        </div>
        <div className="mb-4 flex items-center gap-3">
          <span className="text-[#94b4d0]">UID/Email</span>
          <span className="font-semibold">{order.uidEmail}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#94b4d0]">Server ID</span>
          <span className="font-semibold">{order.serverId}</span>
        </div>
      </div>

      {!compact ? (
        <>
          <div className="border-t border-[#315f95] pt-4 text-base text-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-[#94b4d0]">Value</span>
              <span className="font-semibold">{order.value}</span>
              <span className="text-sm text-slate-500 line-through">{order.oldValue}</span>
            </div>
          </div>
          <div className="border-t border-[#315f95] pt-4 text-base text-slate-100">
            <span className="text-[#94b4d0]">PIN Code</span>
          </div>
        </>
      ) : null}
    </div>
  </button>
);

const MOBILE_ORDER_PAGE_SIZE = 6;

const DashboardPanel = ({ navigate }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all-orders");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [gameMenuOpen, setGameMenuOpen] = useState(false);
  const [status, setStatus] = useState("all");
  const [game, setGame] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [range, setRange] = useState({ start: null, end: null });
  const [page, setPage] = useState(1);
  const currentYearMonth = new Date().toISOString().slice(0, 7);
  const { orders: rawOrders, loading: ordersLoading, error: ordersError, refresh: refreshOrders } = useUserOrders(user?.id);

  const gameOptions = useMemo(
    () => [...new Set(rawOrders.map((order) => order.metadata?.game_name).filter(Boolean))].sort(),
    [rawOrders],
  );

  const visibleOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let from = null;
    let to = null;
    if (range.start != null) {
      const now = new Date();
      from = new Date(now.getFullYear(), now.getMonth(), range.start);
      to = new Date(now.getFullYear(), now.getMonth(), (range.end ?? range.start) + 1);
    }
    return rawOrders.filter((order) => {
      if (status !== "all" && order.status !== status) return false;
      if (game !== "all" && order.metadata?.game_name !== game) return false;
      if (from && new Date(order.created_at) < from) return false;
      if (to && new Date(order.created_at) >= to) return false;
      if (!query) return true;
      const fields = order.metadata?.account_fields ?? {};
      const searchable = [
        order.id,
        order.product_name,
        order.metadata?.game_name,
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
      return searchable.includes(query);
    });
  }, [rawOrders, searchQuery, status, game, range]);

  const totalPages = Math.max(1, Math.ceil(visibleOrders.length / MOBILE_ORDER_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageOrders = visibleOrders.slice((currentPage - 1) * MOBILE_ORDER_PAGE_SIZE, currentPage * MOBILE_ORDER_PAGE_SIZE);

  return (
    <div className="mt-4 rounded-t-[18px] bg-slate-900/90 px-3 py-4 text-white shadow-[0_18px_34px_rgba(15,23,42,0.15)]">
      <div className="rounded-[14px] bg-slate-800/95 px-4 py-5">
        <div className="flex items-center justify-center gap-12 text-lg font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("all-orders")}
            className={`border-b-2 pb-1 ${activeTab === "all-orders" ? "border-[#5724ff] text-white" : "border-transparent text-slate-400"}`}
          >
            All orders
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("likes")}
            className={`border-b-2 pb-1 ${activeTab === "likes" ? "border-[#5724ff] text-white" : "border-transparent text-slate-400"}`}
          >
            Likes
          </button>
        </div>

        {activeTab === "likes" ? (
          <div className="mt-6 rounded-[14px] border border-dashed border-[#315f95] px-4 py-10 text-center text-sm text-slate-400">
            No liked orders yet.
          </div>
        ) : (
          <div className="relative mt-5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setCalendarOpen((value) => !value)}
                className="flex h-12 w-full items-center justify-between rounded-[6px] border border-[#315f95] px-3 text-sm text-[#94b4d0]"
              >
                <span>
                  Purchase Time&nbsp;&nbsp;
                  {range.start == null
                    ? "All time"
                    : `${currentYearMonth}-${String(range.start).padStart(2, "0")} - ${currentYearMonth}-${String(range.end ?? range.start).padStart(2, "0")}`}
                </span>
                <CalendarDays className="size-4" />
              </button>
              {calendarOpen ? (
                <CalendarOverlay onClose={() => setCalendarOpen(false)} range={range} setRange={setRange} />
              ) : null}
            </div>

            <div className="mt-3 grid grid-cols-[1fr_1fr_44px] gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStatusMenuOpen((value) => !value)}
                  className="flex h-12 w-full items-center justify-between rounded-[6px] border border-[#315f95] px-3 text-left text-sm text-[#94b4d0]"
                >
                  <span>{statusOptions.find((option) => option.value === status)?.label ?? "All statuses"}</span>
                  <ChevronDown className={`size-4 transition ${statusMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {statusMenuOpen ? (
                  <div className="absolute left-0 top-[3.35rem] z-20 w-full rounded-[6px] border border-[#315f95] bg-slate-900 text-base shadow-[0_12px_24px_rgba(15,23,42,0.28)]">
                    {statusOptions.map((option, index) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setStatus(option.value);
                          setStatusMenuOpen(false);
                          setPage(1);
                        }}
                        className={`block w-full px-4 py-3 text-left ${index === 0 ? "bg-[#0f9fca]/20 text-white" : "text-[#94b4d0]"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <label className="flex h-12 items-center rounded-[6px] border border-[#315f95] px-3 text-sm text-[#94b4d0]">
                <span className="sr-only">Search order by email or UID</span>
                <input
                  type="text"
                  placeholder="UID/Email"
                  value={searchQuery}
                  onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }}
                  className="w-full bg-transparent outline-none placeholder:text-[#94b4d0]"
                />
              </label>

              <button type="button" className="flex h-12 items-center justify-center rounded-[6px] bg-[#315f95] text-slate-200" aria-label="Search orders">
                <Search className="size-5" />
              </button>
            </div>

            {gameOptions.length > 0 ? (
              <div className="relative mt-3">
                <button
                  type="button"
                  onClick={() => setGameMenuOpen((value) => !value)}
                  className="flex h-12 w-full items-center justify-between rounded-[6px] border border-[#315f95] px-3 text-left text-sm text-[#94b4d0]"
                >
                  <span className="truncate">{game === "all" ? "All games" : game}</span>
                  <ChevronDown className={`size-4 shrink-0 transition ${gameMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {gameMenuOpen ? (
                  <div className="absolute left-0 top-[3.35rem] z-20 max-h-56 w-full overflow-y-auto rounded-[6px] border border-[#315f95] bg-slate-900 text-base shadow-[0_12px_24px_rgba(15,23,42,0.28)]">
                    {[{ label: "All games", value: "all" }, ...gameOptions.map((name) => ({ label: name, value: name }))].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setGame(option.value);
                          setGameMenuOpen(false);
                          setPage(1);
                        }}
                        className={`block w-full truncate px-4 py-3 text-left ${option.value === game ? "bg-[#0f9fca]/20 text-white" : "text-[#94b4d0]"}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <p className="mt-4 text-sm leading-6 text-slate-300">
              Order times are shown in your local time zone.
            </p>

            {ordersError ? (
              <div className="mt-6 rounded-[14px] border border-red-400/40 bg-red-950/30 px-4 py-8 text-center text-sm text-red-200">
                <p>We couldn’t load your orders right now.</p>
                <button type="button" onClick={refreshOrders} className="mt-3 font-semibold underline">Try again</button>
              </div>
            ) : ordersLoading ? (
              <div className="mt-6 py-8 text-center text-sm text-slate-400">Loading orders…</div>
            ) : visibleOrders.length === 0 ? (
              <div className="mt-6 rounded-[14px] border border-dashed border-[#315f95] px-4 py-10 text-center text-sm text-slate-400">
                {rawOrders.length === 0 ? "No orders yet." : "No orders match these filters."}
              </div>
            ) : (
              <>
                <div className="mt-6 space-y-4">
                  {pageOrders.map((raw) => (
                    <OrderCard
                      key={raw.id}
                      order={toCardOrder(raw)}
                      compact
                      onClick={() => navigate(`/account/orders/${raw.id}`)}
                    />
                  ))}
                </div>
                {totalPages > 1 ? (
                  <div className="mt-5 flex items-center justify-between text-sm">
                    <button
                      type="button"
                      onClick={() => setPage((value) => Math.max(1, value - 1))}
                      disabled={currentPage === 1}
                      className="rounded-[6px] border border-[#315f95] px-4 py-2 font-semibold text-[#94b4d0] transition enabled:hover:bg-slate-700/60 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="text-[#94b4d0]">Page {currentPage} of {totalPages}</span>
                    <button
                      type="button"
                      onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-[6px] border border-[#315f95] px-4 py-2 font-semibold text-[#94b4d0] transition enabled:hover:bg-slate-700/60 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const MobilePageScaffold = ({ children }) => (
  <div className="min-h-screen px-0 py-24 text-white" style={pageBackground}>
    <div className="px-3">{children}</div>
  </div>
);

const BackHeader = ({ title, children }) => {
  const navigate = useNavigate();

  return (
    <div className="mt-3 flex items-center gap-3 rounded-[22px] border border-white/70 bg-white/85 p-3 text-slate-900 shadow-[0_14px_30px_rgba(91,79,118,0.12)] backdrop-blur-xl">
      <button type="button" onClick={() => navigate(-1)} aria-label="Go back">
        <ArrowLeft className="size-6" />
      </button>
      <div className="min-w-0 flex-1">{children ?? <p className="truncate text-base font-semibold">{title}</p>}</div>
    </div>
  );
};

const OrderDetailsScreen = () => {
  const location = useLocation();
  const { user } = useAuth();
  const orderId = location.pathname.split("/orders/")[1];
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !user?.id) { setLoading(false); return; }
    supabase
      .from("orders")
      .select("id, product_name, total_amount, currency, status, created_at, metadata")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => { setOrder(data); setLoading(false); });
  }, [orderId, user?.id]);

  return (
    <MobilePageScaffold>
      <BackHeader title="Order details" />
      <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="mt-4 rounded-t-[18px] bg-slate-900/90 px-3 py-4">
        <div className="rounded-[14px] bg-slate-800/95 px-4 py-5">
          <div className="mb-4 flex items-center justify-center gap-12 text-lg font-medium text-slate-400">
            <span className="border-b-2 border-[#5724ff] pb-1 text-white">Order Details</span>
          </div>
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-400">Loading…</div>
          ) : order ? (
            <OrderCard order={toCardOrder(order)} onClick={() => {}} />
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">Order not found.</div>
          )}
        </div>
      </motion.div>
    </MobilePageScaffold>
  );
};

const RedeemTabs = ({ activeTab, navigate }) => {
  const tabs = [
    { id: "redeem", label: "Redeem Code" },
    { id: "buy", label: "Buy Code" },
    { id: "history", label: "Code Purchase History" },
  ];

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-8 px-3 text-base font-medium text-slate-500">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => navigate(`/account/redeem-code?tab=${tab.id}`)}
            className={`border-b-2 pb-2 ${activeTab === tab.id ? "border-[#5724ff] text-slate-950" : "border-transparent"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const RedeemContent = ({ activeTab, profile }) => {
  if (activeTab === "buy") {
    return (
      <div className="rounded-[10px] border border-[#315f95] bg-slate-900/85 px-4 py-12 text-center text-sm text-slate-300">
        No buy codes available right now.
      </div>
    );
  }

  if (activeTab === "history") {
    return (
      <div className="rounded-[10px] border border-[#315f95] bg-slate-900/85 px-4 py-12 text-center text-sm text-slate-300">
        No code purchases yet.
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-5 text-white">
        <div>
          <p className="mb-3 text-sm text-slate-400">Redeem Account:</p>
          <div className="rounded-[6px] border border-[#315f95] bg-slate-900/85 px-4 py-3 font-semibold">{profile.email}</div>
        </div>

        <div>
          <p className="text-sm text-slate-400">Balance: <span className="ml-2 font-semibold text-amber-300">{Number(profile.walletBalance).toFixed(2)}</span></p>
          <button type="button" className="mt-2 text-sm font-semibold text-[#5724ff]">View all</button>
        </div>

        <div>
          <p className="mb-3 text-sm text-slate-400">Insert Activation Code:</p>
          <input
            type="text"
            className="h-12 w-full rounded-[6px] border border-[#315f95] bg-slate-950/90 px-4 outline-none"
          />
        </div>

        <button type="button" className="flex h-14 w-full items-center justify-center rounded-[4px] border border-[#7aa7ce] bg-slate-700/80 text-xl font-medium text-white">
          Redeem to my account
        </button>
      </div>
    </div>
  );
};

const RedeemCodeScreen = ({ profile }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const activeTab = searchParams.get("tab") || "redeem";

  return (
    <MobilePageScaffold>
      <BackHeader>
        <RedeemTabs activeTab={activeTab} navigate={navigate} />
      </BackHeader>

      <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="pt-6">
        <RedeemContent activeTab={activeTab} profile={profile} />

        <div className="mt-24 space-y-6 pb-10 text-white">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[2rem] font-extrabold">FAQ</h2>
            <div className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-2 text-sm font-semibold text-white">India (India)</div>
          </div>

          <div className="space-y-3 text-lg text-slate-300">
            <p>Rules</p>
            <p>Terms</p>
            <p>Privacy</p>
          </div>

          <div className="flex flex-wrap gap-4 text-slate-300">
            {socialIcons.map((Icon, index) => (
              <span key={index} className="flex size-12 items-center justify-center rounded-full bg-slate-700/70 text-xl">
                <Icon />
              </span>
            ))}
          </div>

          <p className="text-sm tracking-wide text-slate-400">© {new Date().getFullYear()} PixieKat. All rights reserved.</p>
        </div>
      </motion.div>
    </MobilePageScaffold>
  );
};

const DashboardScreen = ({ profile, onLogout }) => {
  const navigate = useNavigate();

  return (
    <MobilePageScaffold>
      <ProfileHero profile={profile} />
      <StatsCard navigate={navigate} profile={profile} />
      <DashboardPanel navigate={navigate} />
      <div className="px-3 pb-2 pt-4 text-center">
        <button type="button" onClick={onLogout} className="text-sm font-semibold text-slate-600 underline underline-offset-4">
          Logout
        </button>
      </div>
    </MobilePageScaffold>
  );
};

const MobileAccountView = ({ profile, onLogout }) => {
  const location = useLocation();
  const suffix = getPathnameSuffix(location.pathname);

  if (suffix.startsWith("redeem-code")) {
    return <RedeemCodeScreen profile={profile} />;
  }

  if (suffix.startsWith("orders/")) {
    return <OrderDetailsScreen />;
  }

  return <DashboardScreen profile={profile} onLogout={onLogout} />;
};

export default MobileAccountView;
