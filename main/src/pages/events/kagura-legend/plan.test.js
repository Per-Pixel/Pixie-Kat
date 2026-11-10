import { describe, expect, it } from "vitest";
import {
  DRAW_END,
  DRAW_START,
  buildDays,
  daysLeftToDraw,
  formatDay,
  rushBill,
  spreadBill,
} from "./plan";

describe("kagura legend plan", () => {
  it("builds the draw calendar from Nov 6 through Dec 6", () => {
    const days = buildDays();
    expect(days).toHaveLength(31);
    expect(days[0].id).toBe(DRAW_START);
    expect(days[0].label).toBe("Fri, Nov 6");
    expect(days[4].label).toBe("Tue, Nov 10");
    expect(days.at(-1).id).toBe(DRAW_END);
    expect(formatDay(DRAW_END)).toBe("Sun, Dec 6");
  });

  it("prices day 1 at 109 and the checklist at the cheap steps", () => {
    const days = buildDays();
    expect(days[0].diamonds).toBe(109);
    expect(days.reduce((sum, day) => sum + day.diamonds, 0)).toBe(2109);
    expect(days.reduce((sum, day) => sum + day.draws, 0)).toBe(85);
  });

  it("closes 1,600 Crests at the plan rate for 6,009 Diamonds", () => {
    const bill = spreadBill({ luck: 13, promo: 0 });
    const crests = bill.lines.reduce((sum, line) => sum + line.draws * 13, 0);
    expect(crests).toBeGreaterThanOrEqual(1600);
    expect(bill.draws).toBe(124);
    expect(bill.total).toBe(6009);
    expect(bill.naive).toBe(12400);
  });

  it("gets cheaper when the Crest rate is higher", () => {
    expect(spreadBill({ luck: 15 }).total).toBe(4309);
    expect(spreadBill({ luck: 11 }).total).toBe(8209);
  });

  it("charges more to finish before the supply phases", () => {
    const spread = spreadBill({ luck: 13 });
    const rush = rushBill({ luck: 13 });
    expect(rush.total).toBe(11409);
    expect(rush.total - spread.total).toBe(5400);
  });

  it("lets promo diamonds replace diamonds, not add draws", () => {
    const base = spreadBill({ luck: 13, promo: 0 });
    const withPromo = spreadBill({ luck: 13, promo: 200 });
    expect(withPromo.promoUsed).toBe(200);
    expect(withPromo.total).toBe(base.total - 200);
    expect(withPromo.draws).toBe(base.draws);
  });

  it("counts the draw days still ahead", () => {
    expect(daysLeftToDraw("2026-11-10")).toBe(27);
    expect(daysLeftToDraw("2026-12-06")).toBe(1);
    expect(daysLeftToDraw("2026-12-09")).toBe(0);
  });
});
