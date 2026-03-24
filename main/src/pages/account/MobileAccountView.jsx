import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  Download,
  Headset,
  PencilLine,
  Search,
  UserPlus,
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
    pinCode: "",
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
    pinCode: "",
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
    pinCode: "",
  },
];

const statusOptions = [
  "Status",
  "Success",
  "Waiting for Payment",
  "Refund",
  "Chargeback",
  "In processing",
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

const FloatingButtons = () => (
  <div className="pointer-events-none fixed right-3 top-[68%] z-30 flex -translate-y-1/2 flex-col gap-3">
    <button
      type="button"
      className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-md bg-[#5724ff] text-white shadow-[0_12px_20px_rgba(87,36,255,0.28)]"
      aria-label="Support"
    >
      <Headset className="h-6 w-6" />
    </button>
    <button
      type="button"
      className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-md bg-[#5724ff] text-white shadow-[0_12px_20px_rgba(87,36,255,0.28)]"
      aria-label="Download"
    >
      <Download className="h-6 w-6" />
    </button>
  </div>
);

const ProfileHero = ({ profile }) => (
  <div className="mt-4 rounded-[18px] bg-gradient-to-r from-[#5724ff] to-[#4FB7DD] px-4 py-4 text-white shadow-[0_16px_30px_rgba(87,36,255,0.2)]">
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-lg font-black backdrop-blur">
          {profile.initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[1.35rem] font-extrabold leading-tight">{profile.displayName}</p>
          <p className="text-base font-semibold text-white/85">Good night</p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-white">
        <button type="button" className="rounded-md p-1.5" aria-label="Invite friend">
          <UserPlus className="h-6 w-6" />
        </button>
        <button type="button" className="rounded-md p-1.5" aria-label="Edit profile">
          <PencilLine className="h-6 w-6" />
        </button>
      </div>
    </div>
  </div>
);

const StatsCard = ({ navigate }) => (
  <div className="mt-3 rounded-[18px] border border-white/70 bg-white/88 px-4 py-4 text-slate-900 shadow-[0_16px_30px_rgba(91,79,118,0.12)] backdrop-blur-xl">
    <div className="grid grid-cols-2 gap-4 divide-x divide-slate-200">
      <div className="pr-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-amber-100 to-amber-300 text-xs font-black text-amber-900 shadow-inner">
            PKS
          </div>
          <div>
            <p className="text-sm text-slate-500">Saldo:</p>
            <p className="text-[2rem] font-black leading-none tracking-tight text-slate-950">58132.6</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Link
            to="/games/mobile-legends/add-money"
            className="rounded-full bg-gradient-to-r from-[#5724ff] to-[#4FB7DD] px-3 py-2 text-xs font-bold text-white shadow-[0_10px_18px_rgba(87,36,255,0.18)]"
          >
            Recarregar
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
          <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-gradient-to-br from-emerald-100 to-emerald-300 text-lg font-black text-emerald-900 shadow-inner">
            %
          </div>
          <div>
            <p className="text-sm text-slate-500">Cupom:</p>
            <p className="text-[2rem] font-black leading-none tracking-tight text-slate-950">0</p>
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate("/account/redeem-code?tab=redeem")}
            className="rounded-full bg-gradient-to-r from-[#5724ff] to-[#4FB7DD] px-4 py-2 text-xs font-bold text-white shadow-[0_10px_18px_rgba(87,36,255,0.18)]"
          >
            Usar
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
    <div className="absolute left-2 top-10 z-30 w-[18.8rem] rounded-[10px] bg-white p-3 text-slate-800 shadow-[0_16px_38px_rgba(15,23,42,0.25)]">
      <div className="mb-3 flex items-center justify-between px-1 text-sm font-semibold">
        <button type="button" onClick={onClose} aria-label="Close calendar">&laquo;</button>
        <span>March 2026</span>
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
              const isInRange = range.start && range.end && day > range.start && day < range.end && index > 0 && index < 5;

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
      <div className="absolute bottom-[-8px] left-[11.5rem] h-4 w-4 rotate-45 bg-white" />
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

const DashboardPanel = ({ navigate }) => {
  const [activeTab, setActiveTab] = useState("all-orders");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [status, setStatus] = useState("Status");
  const [range, setRange] = useState({ start: 17, end: 24 });

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
                <span>Purchase Time&nbsp;&nbsp; {`2026-03-${String(range.start).padStart(2, "0")}`} &nbsp; - &nbsp; {`2026-03-${String(range.end ?? range.start).padStart(2, "0")}`}</span>
                <CalendarDays className="h-4 w-4" />
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
                  <span>{status}</span>
                  <ChevronDown className={`h-4 w-4 transition ${statusMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {statusMenuOpen ? (
                  <div className="absolute left-0 top-[3.35rem] z-20 w-full rounded-[6px] border border-[#315f95] bg-slate-900 text-base shadow-[0_12px_24px_rgba(15,23,42,0.28)]">
                    {statusOptions.map((option, index) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setStatus(option);
                          setStatusMenuOpen(false);
                        }}
                        className={`block w-full px-4 py-3 text-left ${index === 0 ? "bg-[#0f9fca]/20 text-white" : "text-[#94b4d0]"}`}
                      >
                        {option}
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
                  className="w-full bg-transparent outline-none placeholder:text-[#94b4d0]"
                />
              </label>

              <button type="button" className="flex h-12 items-center justify-center rounded-[6px] bg-[#315f95] text-slate-200" aria-label="Search orders">
                <Search className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-300">
              Note: Order Time is displayed in UTC-3, please be aware that the time show may differ from your local time zone.
            </p>

            <div className="mt-6 max-h-[28rem] space-y-4 overflow-y-auto pr-1 [scrollbar-color:#64748b_transparent] [scrollbar-width:thin]">
              {orderRecords.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  compact
                  onClick={() => navigate(`/account/orders/${order.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MobilePageScaffold = ({ children }) => (
  <div className="min-h-screen px-0 pb-24 pt-24 text-white" style={pageBackground}>
    <div className="px-3">{children}</div>
    <FloatingButtons />
  </div>
);

const BackHeader = ({ title, children }) => {
  const navigate = useNavigate();

  return (
    <div className="mt-3 flex items-center gap-3 rounded-[22px] border border-white/70 bg-white/85 px-3 py-3 text-slate-900 shadow-[0_14px_30px_rgba(91,79,118,0.12)] backdrop-blur-xl">
      <button type="button" onClick={() => navigate(-1)} aria-label="Go back">
        <ArrowLeft className="h-6 w-6" />
      </button>
      <div className="min-w-0 flex-1">{children ?? <p className="truncate text-base font-semibold">{title}</p>}</div>
    </div>
  );
};

const OrderDetailsScreen = () => (
  <MobilePageScaffold>
    <BackHeader title="Order details" />
    <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="mt-4 rounded-t-[18px] bg-slate-900/90 px-3 py-4">
      <div className="rounded-[14px] bg-slate-800/95 px-4 py-5">
        <div className="mb-4 flex items-center justify-center gap-12 text-lg font-medium text-slate-400">
          <span className="border-b-2 border-[#5724ff] pb-1 text-white">All orders</span>
          <span>Likes</span>
        </div>
        <OrderCard order={orderRecords[0]} onClick={() => {}} />
      </div>
    </motion.div>
  </MobilePageScaffold>
);

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
          <p className="text-sm text-slate-400">Balance: <span className="font-semibold text-white">India (India)</span> <span className="ml-2 font-semibold text-amber-300">58132.6</span></p>
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
              <span key={index} className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-700/70 text-xl">
                <Icon />
              </span>
            ))}
          </div>

          <p className="text-sm tracking-wide text-slate-400">COPYRIGHT @ 2024 PIXIEKAT</p>
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
      <StatsCard navigate={navigate} />
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
