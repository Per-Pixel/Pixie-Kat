import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:5173/event/jjk-cheaper?preview=1", {
  waitUntil: "networkidle",
  timeout: 60000,
});
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const el = document.querySelector("#jjk-phase-story");
  if (el) el.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(900);
await page.screenshot({
  path: "d:/Dev Domain/~Projects/Pixie-Kat/.tmp-jjk-shots/layout-story.png",
});
await page.evaluate(() => {
  const el = document.querySelector("#jjk-route-planner");
  if (el) el.scrollIntoView({ block: "start" });
});
await page.waitForTimeout(900);
await page.screenshot({
  path: "d:/Dev Domain/~Projects/Pixie-Kat/.tmp-jjk-shots/layout-route.png",
});
await browser.close();
console.log("ok");
