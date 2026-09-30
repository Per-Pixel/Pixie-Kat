import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Crown, RefreshCw, Trophy } from "lucide-react";
import { TiLocationArrow } from "react-icons/ti";

import { useAuth } from "../../contexts/AuthContext";
import Button from "../../components/common/Button";
import PageWrapper from "../../components/common/PageWrapper";
import LeaderboardAvatar from "../../components/leaderboard/LeaderboardAvatar";
import {
  currentPeriod,
  fetchLeaderboard,
  fetchMyRankHistory,
  frameStyle,
  periodLabel,
  rankForPeriod,
} from "../../lib/leaderboard";
import { fetchJsonSetting } from "../../lib/storeContent";

const orderLabel = (count) => `${count} completed order${Number(count) === 1 ? "" : "s"}`;

const formatSpent = (amount) => {
  const value = Number(amount);
  return amount == null || !Number.isFinite(value) ? "—" : value.toFixed(2);
};

const StageCompetitor = ({ row, prominent, finalized, showAmounts }) => (
  <article className={`relative flex min-w-0 flex-col justify-end border-t border-white/15 px-4 py-5 sm:px-7 md:min-h-[220px] md:border-l md:border-t-0 md:py-6 md:first:border-l-0 ${prominent ? "order-first bg-violet-300/25 md:order-none" : "bg-white/[0.02]"}`}>
    <span aria-hidden="true" className="pointer-events-none absolute right-2 top-2 font-zentry text-[7rem] leading-none text-white/[0.05] sm:text-[9rem]">
      {String(row.rank).padStart(2, "0")}
    </span>
    <div className="relative z-10">
      <p className={`flex items-center gap-2 font-general text-[10px] font-semibold uppercase tracking-[0.22em] ${prominent ? "text-yellow-300" : "text-blue-100/60"}`}>
        {prominent ? <Crown aria-hidden="true" className="size-4" /> : null}
        {finalized ? "Final place" : "Current place"}
      </p>
      <div className="mt-2 flex items-end justify-between gap-2">
        <LeaderboardAvatar avatarUrl={row.avatar_url} frame={row.avatar_frame} sizeClass={prominent ? "size-16 sm:size-24" : "size-14 sm:size-16"} />
        <span className={`font-zentry font-black leading-none ${prominent ? "text-7xl text-yellow-300 sm:text-8xl" : "text-6xl text-blue-50 sm:text-7xl"}`}>
          #{row.rank}
        </span>
      </div>
      <h3 className="mt-2 break-words font-general text-lg font-semibold leading-tight text-blue-50 sm:text-xl">
        {row.display_name || "Player"}
      </h3>
      <p className="mt-1 font-circular-web text-sm text-blue-100/70">{orderLabel(row.order_count)}</p>
      {finalized && row.tier ? (
        <p className="mt-3 font-general text-[10px] font-semibold uppercase tracking-wider text-yellow-300">{row.tier} tier</p>
      ) : null}
      {showAmounts ? (
        <p className="mt-2 font-circular-web text-xs text-blue-100/60">Spent {formatSpent(row.total_spent)}</p>
      ) : null}
    </div>
  </article>
);

const RankTicket = ({ userId, authLoading }) => {
  const [rank, setRank] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;
    setStatus("loading");
    fetchMyRankHistory(1)
      .then(({ history }) => {
        if (cancelled) return;
        setRank(rankForPeriod(history, currentPeriod()));
        setStatus("success");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <aside aria-label="Your monthly rank" className="relative border-l-2 border-violet-300 bg-blue-100 p-4 pl-7 sm:p-5 sm:pl-9">
      <span aria-hidden="true" className="absolute -left-1 top-7 size-2.5 bg-violet-300" />
      <p className="font-general text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300">
        Your rank · current month
      </p>
      <div aria-live="polite" className="mt-2">
        {authLoading || (userId && status === "loading") ? (
          <p className="font-circular-web text-sm text-blue-200/70">Loading your rank…</p>
        ) : !userId ? (
          <>
            <p className="font-zentry text-2xl font-black uppercase leading-none text-blue-200 sm:text-4xl">Your place awaits</p>
            <Link to="/login" state={{ from: { pathname: "/leaderboard" } }} className="mt-2 inline-flex items-center gap-1 font-general text-xs font-semibold uppercase text-violet-300 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300">
              Sign in to see your rank <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </>
        ) : status === "error" ? (
          <p className="font-circular-web text-sm text-blue-200/70">Could not load your rank right now.</p>
        ) : rank ? (
          <>
            <p className="font-zentry text-6xl font-black leading-none text-blue-200">#{rank.rank}</p>
            <p className="mt-1 font-circular-web text-sm text-blue-200/75">{orderLabel(rank.order_count)} this month</p>
            {rank.hidden ? (
              <p className="mt-2 font-circular-web text-xs font-medium text-violet-300">Private rank · hidden from public standings</p>
            ) : null}
          </>
        ) : (
          <>
            <p className="font-zentry text-4xl font-black uppercase leading-none text-blue-200">Not ranked yet</p>
            <p className="mt-2 font-circular-web text-sm text-blue-200/70">A completed order gets you on the board.</p>
          </>
        )}
      </div>
      {userId && status !== "loading" ? (
        <Link to="/account?section=rewards" className="mt-4 inline-flex items-center gap-1 font-general text-xs font-semibold uppercase text-violet-300 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300">
          View rank history <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      ) : null}
    </aside>
  );
};

const StandingsRows = ({ rows, showAmounts, label }) => (
  <>
    <div className="hidden border-l-2 border-violet-300 md:block">
      <table className="w-full text-left">
        <caption className="sr-only">{label} standings after the top three</caption>
        <thead className="border-b border-blue-200/10 bg-blue-100">
          <tr className="font-general text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200/60">
            <th scope="col" className="w-24 px-5 py-4">Place</th>
            <th scope="col" className="px-5 py-4">Player</th>
            <th scope="col" className="px-5 py-4 text-right">Completed orders</th>
            {showAmounts ? <th scope="col" className="px-5 py-4 text-right">Spent</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-200/10">
          {rows.map((row) => (
            <tr key={row.rank} className="transition-colors hover:bg-violet-300/5">
              <td className="px-5 py-4 font-zentry text-3xl font-black text-violet-300">#{row.rank}</td>
              <td className="px-5 py-4">
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  <LeaderboardAvatar avatarUrl={row.avatar_url} frame={row.avatar_frame} sizeClass="size-9" />
                  <span className="min-w-0 break-words font-general text-sm font-semibold text-blue-200">{row.display_name || "Player"}</span>
                  {row.tier ? <span className="shrink-0 bg-violet-300/10 px-2 py-1 font-general text-[10px] font-semibold uppercase text-violet-300">{row.tier}</span> : null}
                </div>
              </td>
              <td className="px-5 py-4 text-right font-circular-web text-sm font-semibold text-blue-200">{row.order_count}</td>
              {showAmounts ? <td className="px-5 py-4 text-right font-circular-web text-sm text-blue-200/70">{formatSpent(row.total_spent)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <ol start={rows[0]?.rank} className="border-l-2 border-violet-300 md:hidden">
      {rows.map((row) => (
        <li key={row.rank} value={row.rank} className="relative flex items-start gap-3 border-b border-blue-200/10 py-4 pl-4 last:border-b-0">
          <span aria-hidden="true" className="absolute -left-1 top-8 size-2 bg-violet-300" />
          <div className="flex shrink-0 flex-col items-center gap-1">
            <span className="font-zentry text-2xl font-black leading-none text-violet-300">#{row.rank}</span>
            <LeaderboardAvatar avatarUrl={row.avatar_url} frame={row.avatar_frame} sizeClass="size-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="break-words font-general text-sm font-semibold leading-snug text-blue-200">{row.display_name || "Player"}</p>
            {row.tier ? <p className="mt-1 font-general text-[10px] font-semibold uppercase text-violet-300">{row.tier} tier</p> : null}
            {showAmounts ? <p className="mt-1 font-circular-web text-xs text-blue-200/65">Spent {formatSpent(row.total_spent)}</p> : null}
          </div>
          <p className="shrink-0 text-right font-circular-web text-lg font-semibold leading-none text-blue-200">
            {row.order_count}<span className="mt-1 block text-[10px] font-normal text-blue-200/60">orders</span>
          </p>
        </li>
      ))}
    </ol>
  </>
);

const RewardBand = ({ tier }) => (
  <li className="relative border-b border-blue-200/10 py-5 pl-7 last:border-b-0 sm:pl-9">
    <span aria-hidden="true" className="absolute -left-1 top-8 size-2.5 bg-violet-300" />
    <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1">
      <h3 className="font-zentry text-3xl font-black uppercase text-blue-200 sm:text-4xl">{tier.label}</h3>
      <p className="font-general text-xs font-semibold uppercase tracking-wide text-violet-300">
        Rank #{tier.min_rank}{tier.max_rank !== tier.min_rank ? `–#${tier.max_rank}` : ""}
      </p>
    </div>
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-circular-web text-sm text-blue-200/75">
      {tier.frame ? <li>{frameStyle(tier.frame).label} avatar frame</li> : null}
      {tier.gif_avatar ? <li>GIF profile picture</li> : null}
      {Number(tier.wallet_bonus) > 0 ? <li>{Number(tier.wallet_bonus).toLocaleString("en-IN")} PKS wallet bonus</li> : null}
    </ul>
  </li>
);

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [period, setPeriod] = useState(null); // null = live current month
  const [board, setBoard] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [requestKey, setRequestKey] = useState(0);

  useEffect(() => {
    fetchJsonSetting("leaderboard_settings", {}).then(setSettings);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchLeaderboard(period, 50)
      .then((data) => {
        if (!cancelled) setBoard(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load leaderboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period, requestKey]);

  const month = currentPeriod();
  const selectedPeriod = period ?? month;
  const selectedLabel = periodLabel(selectedPeriod);
  const archivePeriods = Array.isArray(board?.periods) ? board.periods.filter((p) => p !== month) : [];
  const boardPending = loading || (!!board?.period && board.period !== selectedPeriod);
  const ready = !boardPending && !error && board?.enabled !== false && board?.period === selectedPeriod;
  const rows = ready && Array.isArray(board.rows) ? board.rows : [];
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const stageRows = top3.length === 3 ? [top3[1], top3[0], top3[2]] : top3;
  const columns = top3.length === 3 ? "md:grid-cols-3" : top3.length === 2 ? "md:grid-cols-2" : "md:grid-cols-1";
  const stageWidth = top3.length === 1 ? "mx-auto max-w-3xl" : top3.length === 2 ? "mx-auto max-w-5xl" : "";
  const tiers = Array.isArray(settings?.tiers) ? settings.tiers : [];
  const status = error ? "Unavailable" : boardPending ? "Loading" : board?.enabled === false ? "Paused" : board?.finalized ? "Final" : "In progress";

  return (
    <PageWrapper>
      <div className="bg-blue-50 pb-28 text-blue-200 md:pb-24">
        <header className="mx-auto max-w-7xl px-4 py-6 md:px-10 md:pb-7 md:pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <p className="font-general text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-200/65">PixieKat / Monthly rank</p>
              <span role="status" aria-live="polite" className="border border-violet-300/30 px-3 py-2 font-general text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300">{status}</span>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              {/* Period selector */}
              {archivePeriods.length > 0 ? (
                <label htmlFor="leaderboard-period" className="font-general text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200/70">Season</label>
              ) : (
                <span className="font-general text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200/70">Season</span>
              )}
              {archivePeriods.length > 0 ? (
                <select
                  id="leaderboard-period"
                  value={period ?? ""}
                  onChange={(event) => setPeriod(event.target.value || null)}
                  className="min-h-11 min-w-0 max-w-full border border-blue-200/20 bg-blue-100 px-3 font-general text-sm font-semibold text-blue-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
                >
                  <option value="">{periodLabel(month)} · Current</option>
                  {archivePeriods.map((archive) => <option key={archive} value={archive}>{periodLabel(archive)}</option>)}
                </select>
              ) : (
                <span id="leaderboard-period" className="font-general text-sm font-semibold">{selectedLabel}</span>
              )}
            </div>
          </div>
          <div className="mt-6 grid items-end gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.5fr)] lg:gap-8">
            <div>
              <h1 className="special-font font-zentry text-5xl font-black uppercase leading-[0.9] sm:text-7xl md:text-8xl lg:text-[6rem]">
                <span className="sm:hidden">The </span><span className="hidden sm:inline">The monthly </span><span className="text-violet-300 sm:block">climb.</span>
              </h1>
              <p className="mt-4 max-w-xl font-circular-web text-base leading-relaxed text-blue-200/75">
                Completed orders set each month’s rank. Final standings decide the listed rewards.
              </p>
              <Button title="Browse games" rightIcon={<TiLocationArrow aria-hidden="true" />} containerClass="mt-4 flex-center gap-2 bg-yellow-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300" onClick={() => navigate("/games")} />
            </div>
            <RankTicket key={isAuthenticated ? user?.id : "guest"} userId={isAuthenticated ? user?.id : null} authLoading={authLoading} />
          </div>
        </header>

        <section aria-label={`${selectedLabel} top players`} className="relative mx-2 max-w-7xl overflow-hidden bg-[#0E041D] px-5 py-6 text-blue-50 sm:mx-4 sm:p-8 md:mx-6 md:px-10 xl:mx-auto" style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 24px), calc(100% - 24px) 100%, 0 100%)" }}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(87,36,255,0.45), transparent 65%)" }} />
          <div className="relative z-10 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-general text-[10px] font-semibold uppercase tracking-[0.22em] text-yellow-300">{selectedLabel} / {status}</p>
              <h2 className="mt-2 font-zentry text-2xl font-black uppercase text-blue-50 sm:text-4xl">Top of the board</h2>
            </div>
            {ready && rows.length > 0 ? <p className="hidden font-circular-web text-sm text-blue-100/70 sm:block">Most completed orders this period</p> : null}
          </div>

          {/* Podium */}
          {error ? (
            <div className="relative z-10 flex min-h-64 flex-col items-start justify-center gap-4">
              <p className="font-circular-web text-base text-blue-50">Standings could not be loaded. Try again.</p>
              <button type="button" onClick={() => setRequestKey((key) => key + 1)} className="inline-flex min-h-11 items-center gap-2 border border-yellow-300 px-4 font-general text-xs font-semibold uppercase text-yellow-300 hover:bg-yellow-300 hover:text-blue-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300">
                <RefreshCw aria-hidden="true" className="size-4" /> Retry standings
              </button>
            </div>
          ) : boardPending ? (
            <p role="status" className="relative z-10 flex min-h-64 items-center font-circular-web text-base text-blue-100/70">Loading standings for {selectedLabel}…</p>
          ) : board?.enabled === false ? (
            <div className="relative z-10 flex min-h-64 flex-col items-start justify-center gap-3">
              <Trophy aria-hidden="true" className="size-9 text-yellow-300" />
              <p className="font-zentry text-3xl font-black uppercase text-blue-50">The leaderboard is paused</p>
              <p className="font-circular-web text-sm text-blue-100/70">Standings are not available right now.</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="relative z-10 flex min-h-64 flex-col items-start justify-center gap-4">
              <Trophy aria-hidden="true" className="size-9 text-yellow-300" />
              <p className="font-zentry text-3xl font-black uppercase text-blue-50">{board.finalized ? "No final standings" : "The board is open"}</p>
              <p className="font-circular-web text-sm text-blue-100/70">{board.finalized ? `No completed orders were recorded in ${selectedLabel}.` : "No completed orders in this period yet."}</p>
              <Link to="/games" className="inline-flex min-h-11 items-center gap-2 font-general text-xs font-semibold uppercase text-yellow-300 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-300">
                Browse games <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className={`relative z-10 mt-4 grid grid-cols-1 border-b border-white/15 sm:mt-7 ${columns} ${stageWidth}`}>
                {stageRows.map((row) => (
                  <StageCompetitor key={row.rank} row={row} prominent={row.rank === 1} finalized={board.finalized} showAmounts={board.show_amounts} />
                ))}
              </div>
              <div aria-hidden="true" className={`relative z-10 grid grid-cols-1 gap-1 border-b border-white/20 py-3 ${columns} ${stageWidth}`}>
                {stageRows.map((row) => (
                  <div key={row.rank} className={`flex items-center gap-2 px-4 sm:px-7 ${row.rank === 1 ? "order-first md:order-none" : ""}`}>
                    <span className={`size-2 shrink-0 ${row.rank === 1 ? "bg-yellow-300" : "bg-violet-300"}`} />
                    <span className="h-px flex-1 bg-white/20" />
                    <span className="font-general text-[10px] text-blue-100/60">{String(row.rank).padStart(2, "0")}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <div className="mx-auto max-w-7xl px-4 md:px-10">
          {/* Remaining rows */}
          {ready && rest.length > 0 ? (
            <section className="mt-16" aria-labelledby="standings-title">
              <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-general text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">The rank rail</p>
                  <h2 id="standings-title" className="mt-2 font-zentry text-4xl font-black uppercase sm:text-5xl">The standings</h2>
                </div>
                <p className="font-circular-web text-sm text-blue-200/65">Top {rows.length} players shown</p>
              </div>
              <StandingsRows rows={rest} showAmounts={board.show_amounts} label={selectedLabel} />
            </section>
          ) : null}

          {/* Rewards explainer */}
          {board?.enabled !== false && settings?.enabled !== false && tiers.length > 0 ? (
            <section className="mt-16 border-t border-blue-200/15 pt-10" aria-labelledby="rewards-title">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="font-general text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">Where the climb leads</p>
                  <h2 id="rewards-title" className="mt-2 font-zentry text-4xl font-black uppercase sm:text-5xl">Monthly rewards</h2>
                </div>
                <p className="max-w-md font-circular-web text-sm leading-relaxed text-blue-200/70">
                  {ready && board.finalized
                    ? "These are the current reward tiers. Final badges above show what was awarded for the selected month."
                    : "Finish in a reward tier at month-end to unlock its listed perks for the following month."}
                </p>
              </div>
              <ol className="mt-7 border-l-2 border-violet-300">
                {tiers.map((tier) => <RewardBand key={tier.id} tier={tier} />)}
              </ol>
              <Link to="/account?section=rewards" className="mt-6 inline-flex min-h-11 items-center gap-2 font-general text-xs font-semibold uppercase text-violet-300 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300">
                View your rewards <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </section>
          ) : null}
        </div>
      </div>
    </PageWrapper>
  );
};

export default LeaderboardPage;
