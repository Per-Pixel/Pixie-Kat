import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ScrollTrigger } from "gsap/all";
import { ArrowRight, Trophy } from "lucide-react";

import LeaderboardAvatar from "../../../components/leaderboard/LeaderboardAvatar";
import { currentPeriod, fetchLeaderboard, periodLabel } from "../../../lib/leaderboard";
import { fetchJsonSetting } from "../../../lib/storeContent";

/**
 * Homepage teaser — top N players of the live monthly leaderboard.
 * Renders nothing while disabled or when there are no standings yet,
 * so a fresh store doesn't ship an empty section.
 */
const Leaderboard = () => {
  const [settings, setSettings] = useState(null);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchJsonSetting("leaderboard_settings", {})
      .then((s) => {
        if (cancelled || s?.enabled === false) return null;
        setSettings(s);
        return fetchLeaderboard(null, Number(s?.teaser_count) || 5);
      })
      .then((data) => {
        if (!cancelled && data?.enabled !== false) setRows(data?.rows ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!settings || rows.length === 0) return undefined;
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => cancelAnimationFrame(frame);
  }, [settings, rows.length]);

  if (!settings || rows.length === 0) return null;

  const leader = rows[0];

  return (
    <section className="bg-blue-50 px-2 py-14 sm:px-4 sm:py-16 md:px-6 md:py-20">
      <div className="relative mx-auto max-w-7xl overflow-hidden bg-[#0E041D] text-blue-50" style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%)" }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 5% 20%, rgba(87,36,255,0.45), transparent 60%)" }} />
        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="min-w-0 p-6 sm:p-9 lg:p-12">
            <div className="flex items-center gap-3 font-general text-[10px] font-semibold uppercase tracking-[0.18em] text-yellow-300">
              <Trophy aria-hidden="true" className="size-5" />
              Monthly rank / {periodLabel(currentPeriod())}
            </div>
            <h2 className="special-font mt-7 font-zentry text-5xl font-black uppercase leading-[0.88] sm:text-6xl lg:text-7xl">
              The climb<br /><span className="text-yellow-300">is on.</span>
            </h2>
            <p className="mt-5 max-w-sm font-circular-web text-sm leading-relaxed text-blue-100/75">
              The most completed orders this month set the pace. See where the whole board stands.
            </p>
            <Link to="/leaderboard" className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-yellow-300 px-6 py-3 font-general text-xs font-semibold uppercase text-blue-200 transition-colors hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300">
              View leaderboard <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>

          <div className="min-w-0 border-t border-white/15 p-6 sm:p-9 lg:border-l lg:border-t-0 lg:p-12">
            <p className="font-general text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-100/60">This month’s leaders</p>
            <div className="mt-5 border-l-2 border-yellow-300">
              <div className="relative flex items-center gap-4 border-b border-white/15 bg-violet-300/20 p-4 sm:p-5">
                <span aria-hidden="true" className="absolute -left-1 top-1/2 size-2 -translate-y-1/2 bg-yellow-300" />
                <LeaderboardAvatar avatarUrl={leader.avatar_url} frame={leader.avatar_frame} sizeClass="size-14 sm:size-16" />
                <div className="min-w-0 flex-1">
                  <p className="font-general text-[10px] font-semibold uppercase tracking-wider text-yellow-300">First place</p>
                  <p className="mt-1 break-words font-general text-base font-semibold text-blue-50 sm:text-lg">{leader.display_name || "Player"}</p>
                  <p className="mt-1 font-circular-web text-xs text-blue-100/70">{leader.order_count} completed orders</p>
                </div>
                <span className="shrink-0 font-zentry text-5xl font-black leading-none text-yellow-300 sm:text-6xl">#1</span>
              </div>
              {rows.length > 1 ? (
                <ol start={2} className="divide-y divide-white/10">
                  {rows.slice(1).map((row) => (
                    <li key={row.rank} value={row.rank} className="relative flex items-center gap-3 px-4 py-3 sm:px-5">
                      <span aria-hidden="true" className="absolute -left-1 top-1/2 size-2 -translate-y-1/2 bg-violet-300" />
                      <span className="w-8 shrink-0 font-zentry text-2xl font-black text-blue-100/75">#{row.rank}</span>
                      <LeaderboardAvatar avatarUrl={row.avatar_url} frame={row.avatar_frame} sizeClass="size-8" />
                      <span className="min-w-0 flex-1 break-words font-general text-sm font-medium text-blue-50">{row.display_name || "Player"}</span>
                      <span className="shrink-0 text-right font-circular-web text-sm font-semibold text-blue-50">
                        {row.order_count}<span className="block text-[10px] font-normal text-blue-100/60">orders</span>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Leaderboard;
