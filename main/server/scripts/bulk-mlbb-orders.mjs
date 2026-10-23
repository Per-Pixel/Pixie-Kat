/**
 * One-off bulk MLBB fulfilment for the 2026-10-23 manual batch.
 *
 * Modes:
 *   node scripts/bulk-mlbb-orders.mjs --verify   read-only: nickname/region
 *                                              lookup + SmileCoin getrole
 *   node scripts/bulk-mlbb-orders.mjs --points   Smile Points balance only
 *   node scripts/bulk-mlbb-orders.mjs --fire     real createorder calls —
 *                                              spends Smile Points
 *
 * SKU map (product 'mobilelegends', BR catalog):
 *   16642 = Weekly Diamond Pass (Passe Semanal de Diamante)  $8.00
 *   22590 = 55 Diamond                                        $4.00
 *   22592 = 275 Diamond                                       $19.75
 * Packs that don't exist as a SKU are expanded into unit combos.
 */
import 'dotenv/config';
import { callSmileCoin } from '../smilecoin.js';

const WDP = '16642';
const D55 = '22590';
const D275 = '22592';

const ORDERS = [
  { uid: '875316562',  zone: '12468', items: [WDP, WDP, WDP] },          // 3xWDP
  { uid: '2098717015', zone: '39126', items: [WDP, WDP, WDP] },          // 3xWDP
  { uid: '959731351',  zone: '12828', items: [WDP, WDP, WDP] },          // 3xWDP
  { uid: '1252303371', zone: '15075', items: [WDP, WDP, D55] },          // 2xWDP + 55
  { uid: '1534241991', zone: '16448', items: [WDP, WDP, D55] },          // 2xWDP + 55
  { uid: '141369337',  zone: '2704',  items: [WDP, WDP, WDP, WDP, D55, D55] }, // 4xWDP + 110
  { uid: '1583406741', zone: '16649', items: [D275] },                   // 275
  { uid: '1236419807', zone: '15011', items: [WDP] },                    // 1xWDP
  { uid: '1185789053', zone: '13808', items: [WDP, WDP, WDP] },          // 3xWDP
  { uid: '1478830448', zone: '16181', items: [WDP] },                    // 1xWDP
  { uid: '1327061231', zone: '15469', items: [WDP, WDP, WDP] },          // 3xWDP
  { uid: '1071243702', zone: '13304', items: [WDP, WDP, D55] },          // 2xWDP + 55
  { uid: '1811885795', zone: '18747', items: [WDP] },                    // 1xWDP
  { uid: '1912992793', zone: '39003', items: [WDP, WDP, D55] },          // 2xWDP + 55
  { uid: '240734674',  zone: '9251',  items: [WDP, WDP, WDP] },          // 3xWDP
  { uid: '852133207',  zone: '4296',  items: [WDP, WDP, D55] },          // 2xWDP + 55
  { uid: '1517862218', zone: '16616', items: [WDP, WDP, D55] },          // 2xWDP + 55
  { uid: '868876314',  zone: '12475', items: [WDP, WDP, WDP] },          // 3xWDP
  { uid: '274458200',  zone: '9439',  items: [WDP, WDP] },               // 2xWDP
  { uid: '1529212873', zone: '16415', items: [WDP] },                    // 1xWDP
  { uid: '1168451066', zone: '13742', items: [WDP, WDP, WDP] },          // 3xWDP
  { uid: '1251523231', zone: '15067', items: [WDP, WDP, WDP] },          // 3xWDP
  { uid: '727705055',  zone: '8912',  items: [WDP, WDP, WDP] },          // 3xWDP
  { uid: '1984889735', zone: '39058', items: [D275] },                   // 275
  { uid: '139566315',  zone: '2711',  items: [WDP, WDP] },               // 2xWDP
  { uid: '1173964793', zone: '13759', items: [WDP] },                    // 1xWDP
];

const PRICE = { [WDP]: 8.0, [D55]: 4.0, [D275]: 19.75 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function freeLookup(uid, zone) {
  try {
    const r = await fetch(
      `https://api.isan.eu.org/nickname/ml?id=${uid}&server=${zone}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    const j = await r.json().catch(() => null);
    if (j?.success) return { ok: true, name: j.name, country: j.country };
    return { ok: false, err: j?.message || `http ${r.status}` };
  } catch (e) {
    return { ok: false, err: e.message };
  }
}

async function roleCheck(uid, zone, productid) {
  try {
    const b = await callSmileCoin('getrole', {
      userid: uid, zoneid: zone, product: 'mobilelegends', productid,
    });
    const ok = Number(b.status) === 200 || b.ok === true;
    const name = b?.data?.username || b?.username || b?.data?.role_name || null;
    return { ok, name, status: b?.status, msg: b?.message || b?.msg };
  } catch (e) {
    return { ok: false, err: e.message };
  }
}

const mode = process.argv[2] || '--verify';

if (mode === '--points') {
  const b = await callSmileCoin('querypoints', { product: 'mobilelegends' });
  console.log('points:', JSON.stringify(b?.data ?? b).slice(0, 300));
  process.exit(0);
}

if (mode === '--verify') {
  let est = 0;
  for (const o of ORDERS) est += o.items.reduce((s, p) => s + PRICE[p], 0);
  console.log(`orders=${ORDERS.length} units=${ORDERS.reduce((s, o) => s + o.items.length, 0)} est=$${est.toFixed(2)}\n`);
  const CONC = 6;
  for (let i = 0; i < ORDERS.length; i += CONC) {
    const batch = ORDERS.slice(i, i + CONC);
    const out = await Promise.all(batch.map(async (o) => {
      const [nick, role] = await Promise.all([
        freeLookup(o.uid, o.zone),
        roleCheck(o.uid, o.zone, o.items[0]),
      ]);
      return { o, nick, role };
    }));
    for (const { o, nick, role } of out) {
      const verdict = role.ok && nick.ok ? 'GO' : 'SKIP';
      console.log(
        `${verdict.padEnd(4)} ${o.uid} (${o.zone}) x${o.items.length}` +
        ` | nick=${nick.ok ? `${nick.name} [${nick.country ?? '?'}]` : `FAIL:${nick.err}`}` +
        ` | role=${role.ok ? 'ok' : `FAIL:${role.msg || role.err || role.status}`}`,
      );
    }
  }
  process.exit(0);
}

if (mode === '--fire') {
  for (const o of ORDERS) {
    for (const [n, pid] of o.items.entries()) {
      try {
        const b = await callSmileCoin('createorder', {
          userid: o.uid, zoneid: o.zone, product: 'mobilelegends', productid: pid,
        });
        console.log(`${o.uid} (${o.zone}) #${n + 1} pid=${pid} → status=${b?.status} ${b?.message || b?.msg || ''} ${b?.data?.orderid ? 'order=' + b.data.orderid : ''}`);
      } catch (e) {
        console.log(`${o.uid} (${o.zone}) #${n + 1} pid=${pid} → THREW ${e.message}`);
      }
      await sleep(1200);
    }
  }
  process.exit(0);
}

console.error(`unknown mode ${mode}`);
process.exit(1);
