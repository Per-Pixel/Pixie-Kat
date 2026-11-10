import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { usePreferences } from "../../../contexts/PreferencesContext";
import { KaguraLoader, CostFrames, useKaguraMotion } from "./KaguraMotion";
import {
  CREST_TARGET,
  DEFAULT_TRICKS,
  FAQ,
  LUCKS,
  PLAN_LINES,
  PREP_DAY,
  SHOP_DAY,
  TRAPS,
  buildDays,
  checkedStats,
  daysLeftToDraw,
  formatCount,
  initialSelection,
  rushBill,
  spreadBill,
  taskKey,
  todayIso,
  trickDeltas,
} from "./plan";
import "./kagura-legend.css";

const STORAGE_KEY = "pixiekat-kagura-legend-v1";
const ART = "/img/events/kagura";

function readLog() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    return raw && typeof raw === "object" ? raw : null;
  } catch {
    return null;
  }
}

function useLog() {
  const [log, setLog] = useState(() => {
    const saved = readLog();
    const tricks = { ...DEFAULT_TRICKS };
    if (saved?.tricks && typeof saved.tricks === "object") {
      Object.keys(tricks).forEach((id) => {
        if (typeof saved.tricks[id] === "boolean") tricks[id] = saved.tricks[id];
      });
    }
    return {
      checks: saved?.checks && typeof saved.checks === "object" ? saved.checks : {},
      tricks,
      luck: LUCKS.some((item) => item.id === saved?.luck) ? saved.luck : "plan",
      promo: typeof saved?.promo === "string" ? saved.promo : "",
      crests: typeof saved?.crests === "string" ? saved.crests : "",
      answers: saved?.answers && typeof saved.answers === "object" ? saved.answers : {},
    };
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
    } catch {
      /* ignore private mode / quota */
    }
  }, [log]);

  return [log, setLog];
}

function presentView(view, today) {
  if (view.id === "prep" || view.id === "shop") {
    return { ...view, subtitle: view.label, diamonds: 0, draws: 0, topup: 0 };
  }
  const todayView = view.id === today;
  return {
    ...view,
    kicker: todayView ? "Today" : view.big || `Day ${view.number}`,
    title: `Day ${view.number}`,
    subtitle: view.label,
  };
}

export default function KaguraLegendPage() {
  const reduced = useReducedMotion();
  const { preferences } = usePreferences();
  const [intro, setIntro] = useState(() => {
    if (reduced || !preferences.intro) return false;
    try { return sessionStorage.getItem("pixie_kagura_intro") !== "1"; } catch { return true; }
  });
  const [introOpening, setIntroOpening] = useState(false);
  const revealIntro = useCallback(() => setIntroOpening(true), []);
  const finishIntro = useCallback(() => setIntro(false), []);
  const days = useMemo(() => buildDays(), []);
  const today = useMemo(() => todayIso(), []);
  const railRef = useRef(null);
  const pageRef = useRef(null);
  const [log, setLog] = useLog();
  const [selection, setSelection] = useState(() => initialSelection(days, today));
  const [faqOpen, setFaqOpen] = useState(0);
  const [trapIndex, setTrapIndex] = useState(0);

  useKaguraMotion(pageRef, !intro, reduced);
  useEffect(() => { if (reduced || !preferences.intro) setIntro(false); }, [reduced, preferences.intro]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Kagura Legend draw plan · PixieKat";
    document.body.classList.add("kl-active");
    return () => {
      document.title = previousTitle;
      document.body.classList.remove("kl-active");
    };
  }, []);

  const views = useMemo(() => [PREP_DAY, ...days, SHOP_DAY], [days]);
  const viewIndex = Math.max(0, views.findIndex((view) => view.id === selection));
  const view = presentView(views[viewIndex], today);
  const luck = LUCKS.find((item) => item.id === log.luck) || LUCKS[1];
  const promo = Math.max(0, Math.floor(Number(log.promo) || 0));
  const bill = spreadBill({ luck: luck.rate, promo, tricks: log.tricks });
  const rush = rushBill({ luck: luck.rate, promo });
  const deltas = trickDeltas({ luck: luck.rate, promo, tricks: log.tricks });
  const stats = checkedStats(days, log.checks);
  const typedCrests = log.crests.trim() === "" ? null : Math.max(0, Math.floor(Number(log.crests) || 0));
  const crestCount = typedCrests ?? Math.round(stats.draws * luck.rate);
  const gapLine = bill.lines.find((lineItem) => lineItem.id === "gap");
  const cheapDraws = bill.draws - (gapLine?.draws || 0);
  const cheapCrests = cheapDraws * luck.rate;
  const daysLeft = daysLeftToDraw(today);
  const trap = TRAPS[trapIndex];
  const answered = TRAPS.filter((item) => log.answers[item.id]);
  const dodged = answered.filter((item) => item.options.find((option) => option.id === log.answers[item.id])?.correct).length;

  const toggleTask = (key) => {
    setLog((prev) => {
      const checks = { ...prev.checks };
      if (checks[key]) delete checks[key];
      else checks[key] = true;
      return { ...prev, checks };
    });
  };

  const toggleView = () => {
    setLog((prev) => {
      const checks = { ...prev.checks };
      const keys = view.tasks.map((item) => taskKey(view.id, item.id));
      const allOn = keys.length > 0 && keys.every((key) => checks[key]);
      keys.forEach((key) => {
        if (allOn) delete checks[key];
        else checks[key] = true;
      });
      return { ...prev, checks };
    });
  };

  const move = (step) => {
    const next = views[viewIndex + step];
    if (next) setSelection(next.id);
  };

  const doneCount = view.tasks.filter((item) => log.checks[taskKey(view.id, item.id)]).length;
  const viewComplete = view.tasks.length > 0 && doneCount === view.tasks.length;

  return (
    <div className="kl-page" ref={pageRef} data-reduced={reduced ? "true" : "false"} data-ready={intro && !introOpening ? "false" : "true"}>
      {intro && <KaguraLoader onComplete={finishIntro} onReveal={revealIntro} reduced={reduced} />}
      <div className="kl-content" inert={intro ? "" : undefined}>
      <header className="kl-nav">
        <Link to="/" className="kl-brand">
          PixieKat
        </Link>
        <nav aria-label="Draw plan">
          <a href="#plan">Plan</a>
          <a href="#crests">Crests</a>
          <a href="#bill">Bill</a>
          <a href="#routes">Routes</a>
          <a href="#traps">Traps</a>
          <a href="#faq">FAQ</a>
        </nav>
        <Link to="/games/mobile-legends" className="kl-topup">
          Top up
        </Link>
      </header>

      <div className="kl-reel" id="plan">
      <section className="kl-stage" aria-label="Kagura Legend draw plan">
        <div className="kl-scene" aria-hidden="true" />
        <div className="kl-embers" aria-hidden="true"><i /><i /><i /><i /><i /></div>

        <div className="kl-title">
          <img src={`${ART}/crest.jpg`} alt="" width={54} height={54} />
          <div>
            <span className="kl-eyebrow">The lantern journey</span><strong>Kagura Legend</strong>
            <span>Nov 6 – Dec 6 · shop skin at 1,600 Crests</span>
          </div>
        </div>

        <div className="kl-pills" aria-label="Plan summary">
          <span>
            <b>{daysLeft}</b> draw days left
          </span>
          <span>
            Plan <b>{formatCount(bill.total)}</b>
          </span>
          <span>
            Spent <b>{formatCount(stats.diamonds)}</b>
          </span>
          <span>
            Crests <b>{formatCount(crestCount)}</b> / {formatCount(CREST_TARGET)}
          </span>
          <button type="button" data-selected={selection === "shop" ? "true" : "false"} onClick={() => setSelection("shop")}>
            Dec 7–8 shop
          </button>
        </div>

        <div className="kl-journey">
          <div className="kl-journey-heading"><div><p className="kl-eyebrow">01 / Your route</p><h2>One lantern. One day.</h2></div><span>31 days → 1,600 Crests</span></div>
          <div className="kl-milestones" aria-label="Jump to a milestone">
            <button type="button" onClick={() => setSelection("prep")}>Before you start</button>
            <button type="button" onClick={() => setSelection("2026-11-13")}>Nov 13 · Supply I</button>
            <button type="button" onClick={() => setSelection("2026-11-20")}>Nov 20 · Supply II</button>
            <button type="button" onClick={() => setSelection("shop")}>Dec 7–8 · Shop</button>
          </div>
        <div className="kl-map" ref={railRef} aria-label="Draw days">
          <svg className="kl-route-line" viewBox="0 0 700 500" preserveAspectRatio="none" aria-hidden="true"><path d="M50 50 H650 Q690 50 690 100 V100 Q690 150 650 150 H50 Q10 150 10 200 V200 Q10 250 50 250 H650 Q690 250 690 300 V300 Q690 350 650 350 H50 Q10 350 10 400 V400 Q10 450 50 450 H250" /></svg>
          {days.map((day, index) => {
            const complete =
              day.tasks.length > 0 && day.tasks.every((item) => log.checks[taskKey(day.id, item.id)]);
            return (
              <button
                key={day.id}
                type="button"
                className="kl-node"
                style={{ gridColumn: Math.floor(index / 7) % 2 ? 7 - index % 7 : index % 7 + 1, gridRow: Math.floor(index / 7) + 1, "--node-delay": `${Math.min(index * 25, 600)}ms`, "--sway-delay": `${-index * .37}s` }}
                data-day={day.id}
                data-today={day.id === today ? "true" : "false"}
                data-selected={selection === day.id ? "true" : "false"}
                data-done={complete ? "true" : "false"}
                data-big={day.big ? "true" : "false"}
                aria-pressed={selection === day.id}
                aria-current={day.id === today ? "date" : undefined}
                aria-label={`${day.label}${day.big ? `, ${day.big}` : ""}${day.id === today ? ", today" : ""}`}
                onClick={() => setSelection(day.id)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
                  event.preventDefault();
                  const nextIndex = index + (event.key === "ArrowRight" ? 1 : -1);
                  const next = days[nextIndex];
                  if (!next) return;
                  setSelection(next.id);
                  event.currentTarget.parentElement?.querySelector(`[data-day="${next.id}"]`)?.focus();
                }}
              >
                <span className="kl-lantern-art" aria-hidden="true"><img src={`${ART}/lantern.png`} alt="" /></span>
                <span>{complete ? "✓" : day.number}</span>
                <small>{day.id === today ? "Today" : day.shortLabel}</small>
              </button>
            );
          })}
        </div>

        <div className="kl-map-legend"><span>◉ Selected</span><span>✓ Completed</span><span>Tap a lantern to open its checklist</span></div>
        </div>
        <article className="kl-card" aria-live="polite">
          <p className="kl-kicker">{view.kicker}</p>
          <div key={view.id} className="kl-card-heading">
            <h1>{view.title}</h1>
            <p>{view.subtitle}</p>
          </div>
          <div className="kl-chips">
            {view.draws ? (
              <span>
                <b>{view.draws}</b> draws
              </span>
            ) : null}
            {view.diamonds ? (
              <span>
                <b>{formatCount(view.diamonds)}</b> today
              </span>
            ) : null}
            {view.topup ? (
              <span>
                <b>{formatCount(view.topup)}</b> to recharge
              </span>
            ) : null}
            <span>
              <b>{formatCount(stats.diamonds)}</b> spent
            </span>
          </div>
          <ul className="kl-tasks">
            {view.tasks.map((item) => {
              const key = taskKey(view.id, item.id);
              return (
                <li key={key} data-done={log.checks[key] ? "true" : "false"} data-watch={item.watch ? "true" : "false"}>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(log.checks[key])}
                      onChange={() => toggleTask(key)}
                    />
                    <span>{item.text}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {view.topup ? (
            <Link to="/games/mobile-legends" className="kl-inline-link">
              Top up on PixieKat
            </Link>
          ) : null}
          <div className="kl-progress">
            <span>
              {doneCount} of {view.tasks.length}
            </span>
            <div>
              <span style={{ width: `${view.tasks.length ? (doneCount / view.tasks.length) * 100 : 0}%` }} />
            </div>
          </div>
          <button type="button" className="kl-mark" data-complete={viewComplete ? "true" : "false"} onClick={toggleView}>
            {viewComplete ? "Day done" : "Mark day done"}
          </button>
          <div className="kl-card-nav">
            <button type="button" onClick={() => move(-1)} disabled={viewIndex === 0}>
              {viewIndex > 0 ? views[viewIndex - 1].shortLabel || "Back" : "Back"}
            </button>
            <a href="#traps">Traps</a>
            <button type="button" onClick={() => move(1)} disabled={viewIndex === views.length - 1}>
              {viewIndex < views.length - 1 ? views[viewIndex + 1].shortLabel || "Next" : "Next"}
            </button>
          </div>
        </article>
      </section>
      </div>

      <main className="kl-sheet">
        <section id="crests" className="kl-block" aria-labelledby="crests-title">
          <p className="kl-eyebrow">Crests</p>
          <h2 id="crests-title">Will you reach 1,600 Crests?</h2>
          <p className="kl-lead">
            Each draw pays a different number of Crests. Pick a rate for the plan, or type the Crests already on your account.
          </p>
          <div className="kl-crest-meter">
            <img src={`${ART}/crest.jpg`} alt="" width="64" height="64" />
            <div><p className="kl-eyebrow">Your progress to the shop</p><strong>{formatCount(crestCount)} <small>/ 1,600</small></strong>
            <div className="kl-crest-track" role="progressbar" aria-label="Crests toward shop skin" aria-valuemin={0} aria-valuemax={CREST_TARGET} aria-valuenow={Math.min(crestCount, CREST_TARGET)}><span style={{ width: `${Math.min(100, crestCount / CREST_TARGET * 100)}%` }} /></div></div>
          </div>
          <div className="kl-luck" role="radiogroup" aria-label="Crests per draw">
            {LUCKS.map((item) => (
              <label key={item.id} data-checked={log.luck === item.id ? "true" : "false"}>
                <input
                  type="radio"
                  name="kagura-luck"
                  value={item.id}
                  checked={log.luck === item.id}
                  onChange={() => setLog((prev) => ({ ...prev, luck: item.id }))}
                />
                <b>{item.rate}</b>
                <strong>{item.name}</strong>
                <span>{item.detail}</span>
              </label>
            ))}
          </div>
          <div className="kl-result">
            <p>
              {cheapCrests >= CREST_TARGET
                ? `At ${luck.rate} a draw, the cheap steps already clear the shop.`
                : `At ${luck.rate} a draw, the cheap steps land on ${formatCount(cheapCrests)} Crests. That is ${formatCount(CREST_TARGET - cheapCrests)} short, so the plan adds ${gapLine?.draws || 0} full-price draws.`}
            </p>
            <strong>{formatCount(bill.total)} Diamonds</strong>
            <span>Whole event at this rate. Full-price pressing would be {formatCount(bill.naive)}.</span>
          </div>
          <label className="kl-field">
            <span>Crests you have now</span>
            <input
              inputMode="numeric"
              value={log.crests}
              placeholder="Leave blank to use checked steps"
              onChange={(event) => setLog((prev) => ({ ...prev, crests: event.target.value.replace(/[^\d]/g, "") }))}
            />
          </label>
          <p className="kl-note">
            {typedCrests == null
              ? `Checked steps stand in for ${formatCount(stats.draws)} draws, about ${formatCount(Math.round(stats.draws * luck.rate))} Crests at this rate.`
              : `${formatCount(Math.max(0, CREST_TARGET - typedCrests))} Crests still to go. At ${luck.rate} a draw that is ${Math.ceil(Math.max(0, CREST_TARGET - typedCrests) / luck.rate)} more draws, or ${formatCount(Math.ceil(Math.max(0, CREST_TARGET - typedCrests) / luck.rate) * 100)} Diamonds if every one is full price.`}
          </p>
        </section>

        <section id="bill" className="kl-block" aria-labelledby="bill-title">
          <p className="kl-eyebrow">Bill</p>
          <h2 id="bill-title">
            {formatCount(bill.naive)} → {formatCount(bill.total)}
          </h2>
          <p className="kl-lead">
            Pressing draw at 100 Diamonds until the shop opens is the higher number. Leave a step on to keep it off the bill. Tap it to put that cost back.
          </p>
          <CostFrames bill={bill} luck={luck} />
          <div className="kl-bill-layout" id="bill-controls">
            <div className="kl-lines">
              {bill.lines.map((lineItem) => (
                <p key={lineItem.id}>
                  <span>
                    {lineItem.label}
                    <small>{lineItem.draws} draws</small>
                  </span>
                  <b>{formatCount(lineItem.diamonds)}</b>
                </p>
              ))}
              {bill.promoUsed ? (
                <p>
                  <span>
                    Promo Diamonds cover
                    <small>Spent instead of Diamonds</small>
                  </span>
                  <b>−{formatCount(bill.promoUsed)}</b>
                </p>
              ) : null}
              <label className="kl-field">
                <span>Promo Diamonds you will spend</span>
                <input
                  inputMode="numeric"
                  value={log.promo}
                  placeholder="0"
                  onChange={(event) => setLog((prev) => ({ ...prev, promo: event.target.value.replace(/[^\d]/g, "") }))}
                />
              </label>
            </div>
            <div className="kl-tricks">
              {deltas.map((trick) => (
                <button
                  key={trick.id}
                  type="button"
                  data-on={trick.on ? "true" : "false"}
                  aria-pressed={trick.on}
                  onClick={() =>
                    setLog((prev) => ({
                      ...prev,
                      tricks: { ...prev.tricks, [trick.id]: !prev.tricks[trick.id] },
                    }))
                  }
                >
                  <span>
                    <strong>{trick.label}</strong>
                    <small>{trick.detail}</small>
                  </span>
                  <b>{trick.delta === 0 ? "0" : trick.on ? `−${formatCount(trick.delta)}` : `+${formatCount(Math.abs(trick.delta))}`}</b>
                </button>
              ))}
              <button
                type="button"
                className="kl-restore"
                onClick={() => setLog((prev) => ({ ...prev, tricks: { ...DEFAULT_TRICKS } }))}
              >
                Use every step
              </button>
            </div>
          </div>
        </section>

        <section id="routes" className="kl-block" aria-labelledby="routes-title">
          <p className="kl-eyebrow">Two ways to the same skin</p>
          <h2 id="routes-title">
            {rush.total === bill.total
              ? "These two routes meet."
              : rush.total > bill.total
                ? `${formatCount(rush.total - bill.total)} Diamonds apart.`
                : `The early finish is ${formatCount(bill.total - rush.total)} less with these steps off.`}
          </h2>
          <p className="kl-lead">
            Both routes are aiming at the shop skin. The early one stops before Premium Supply. The patient one uses the steps you leave on.
          </p>
          <div className="kl-routes">
            <article data-hot="true"><svg className="kl-comparison-path" viewBox="0 0 240 40" aria-hidden="true"><path d="M5 32 C65 32 65 8 120 8 S180 32 235 8" /></svg>
              <p>This plan</p>
              <strong>{formatCount(bill.total)}</strong>
              <span>{bill.draws} draws at {luck.rate} Crests</span>
              <ul>
                {bill.lines.map((lineItem) => (
                  <li key={lineItem.id}>
                    {lineItem.label}
                    <b>{formatCount(lineItem.diamonds)}</b>
                  </li>
                ))}
              </ul>
            </article>
            <article><svg className="kl-comparison-path" viewBox="0 0 240 40" aria-hidden="true"><path d="M5 32 C65 32 65 8 120 8 S180 32 235 8" /></svg>
              <p>Finish before Nov 13</p>
              <strong>{formatCount(rush.total)}</strong>
              <span>{rush.draws} draws, without supply tokens</span>
              <ul>
                {rush.lines.map((lineItem) => (
                  <li key={lineItem.id}>
                    {lineItem.label}
                    <b>{formatCount(lineItem.diamonds)}</b>
                  </li>
                ))}
              </ul>
            </article>
          </div>
          <p className="kl-note">
            Stop when you can pay the shop. Recharges are separate: 800 across the eight 100-Diamond days, plus 500 at each supply phase. Those Diamonds stay on the account and can pay for draws.
          </p>
          <Link to="/games/mobile-legends" className="kl-topup kl-topup-inline">
            Top up Diamonds
          </Link>
        </section>

        <section id="traps" className="kl-block" aria-labelledby="traps-title">
          <p className="kl-eyebrow">Traps</p>
          <h2 id="traps-title">Eight taps that spend Diamonds</h2>
          <p className="kl-lead">Get them wrong here. Each one is a button you will see in the event.</p>
          <div className="kl-trap-layout">
            <article className="kl-trap">
              <p>
                Trap {trapIndex + 1} of {TRAPS.length}
              </p>
              <h3>{trap.prompt}</h3>
              <div className="kl-options">
                {trap.options.map((option) => {
                  const chosen = log.answers[trap.id];
                  const revealed = Boolean(chosen);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={revealed}
                      data-correct={revealed && option.correct ? "true" : "false"}
                      data-wrong={revealed && chosen === option.id && !option.correct ? "true" : "false"}
                      onClick={() =>
                        setLog((prev) => ({
                          ...prev,
                          answers: { ...prev.answers, [trap.id]: option.id },
                        }))
                      }
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {log.answers[trap.id] ? (
                <p className="kl-note">
                  {trap.options.find((option) => option.id === log.answers[trap.id])?.note}
                </p>
              ) : null}
              <div className="kl-card-nav">
                <button type="button" onClick={() => setTrapIndex((index) => Math.max(0, index - 1))} disabled={trapIndex === 0}>
                  Previous
                </button>
                <span>
                  {dodged} dodged · {answered.length - dodged} trapped · {TRAPS.length - answered.length} left
                </span>
                <button
                  type="button"
                  onClick={() => setTrapIndex((index) => Math.min(TRAPS.length - 1, index + 1))}
                  disabled={trapIndex === TRAPS.length - 1}
                >
                  Next
                </button>
              </div>
            </article>
            <ol className="kl-trap-list">
              {TRAPS.map((item, index) => (
                <li key={item.id}>
                  <button type="button" data-open={index === trapIndex ? "true" : "false"} onClick={() => setTrapIndex(index)}>
                    {log.answers[item.id] ? (item.options.find((option) => option.id === log.answers[item.id])?.correct ? "Dodged" : "Trapped") : "Hidden"}
                    <span>Trap {index + 1}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="faq" className="kl-block" aria-labelledby="faq-title">
          <p className="kl-eyebrow">Before you spend</p>
          <h2 id="faq-title">Questions this plan keeps getting</h2>
          <div className="kl-faq">
            {FAQ.map((item, index) => {
              const open = faqOpen === index;
              return (
                <article key={item.q}>
                  <button type="button" aria-expanded={open} onClick={() => setFaqOpen(open ? -1 : index)}>
                    {item.q}
                  </button>
                  {open ? <p>{item.a}</p> : null}
                </article>
              );
            })}
          </div>
          <h3>The plan in 8 lines</h3>
          <ol className="kl-lines-list">
            {PLAN_LINES.map((item) => (
              <li key={item.when}>
                <b>{item.when}</b>
                <span>{item.text}</span>
              </li>
            ))}
          </ol>
          <p className="kl-note">
            Preview prices behind the math: 100 a single, 1,000 for 10×, 50 for the first daily single, 500 for the first 10×, Mega bundles at 10 and 49, 6 tokens from eight 100 recharges, and 18 tokens from each Premium Supply phase. Crests per draw are the rate you pick. If the live event disagrees, follow the game.
          </p>
          <button
            type="button"
            className="kl-restore"
            onClick={() => setLog((prev) => ({ ...prev, checks: {} }))}
          >
            Reset checked steps
          </button>
        </section>
      </main>

      <footer className="kl-footer">
        <div>
          <strong>PixieKat</strong>
          <p>Diamonds for the days this plan asks you to recharge.</p>
        </div>
        <div className="kl-footer-links">
          <Link to="/games/mobile-legends">Mobile Legends</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/">Home</Link>
        </div>
        <p>Mobile Legends: Bang Bang and its characters belong to their owners. PixieKat is an independent top-up. This plan is an estimate.</p>
      </footer>
      </div>
    </div>
  );
}
