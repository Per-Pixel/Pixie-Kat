/**
 * Standalone Smile One API test script.
 * Run with: node smileone-test.js
 * Does NOT require Supabase credentials.
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const DOMAIN = 'https://www.smile.one';
const REGION = process.env.SMILEONE_REGION || 'ph';

const CREDS = {
  email: process.env.SMILEONE_EMAIL,
  uid:   process.env.SMILEONE_UID,
  key:   process.env.SMILEONE_KEY,
};

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function buildSign(params, apiKey) {
  const sortedKeys = Object.keys(params).sort();
  let str = '';
  for (const k of sortedKeys) {
    str += `${k}=${params[k]}&`;
  }
  str += apiKey;
  return md5(md5(str));
}

async function callSmileOne(path, extraParams = {}) {
  const params = {
    ...extraParams,
    time:  Math.floor(Date.now() / 1000).toString(),
    email: CREDS.email,
    uid:   CREDS.uid,
  };
  params.sign = buildSign(params, CREDS.key);

  const url  = `${DOMAIN}/${REGION}${path}`;
  const body = new URLSearchParams(params).toString();

  console.log(`\n→ POST ${url}`);
  console.log('  Params (before sign):', { ...params, sign: params.sign.slice(0, 8) + '...' });

  const res  = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal:  AbortSignal.timeout(15_000),
  });

  const text = await res.text();
  console.log(`  HTTP ${res.status}`);

  try {
    return JSON.parse(text);
  } catch {
    console.log('  Raw response:', text.slice(0, 300));
    return null;
  }
}

async function run() {
  console.log('=== Smile One API Test ===');
  console.log(`Credentials: email=${CREDS.email}, uid=${CREDS.uid}, key=${CREDS.key?.slice(0,8)}...`);
  console.log(`Region: ${REGION}`);

  if (!CREDS.email || !CREDS.uid || !CREDS.key) {
    console.error('\n✗ Missing credentials. Check SMILEONE_EMAIL / SMILEONE_UID / SMILEONE_KEY in .env');
    process.exit(1);
  }

  // Test 1: Get Mobile Legends product list
  console.log('\n[1] Get product list (mobilelegends)');
  const products = await callSmileOne('/smilecoin/api/productlist', { product: 'mobilelegends' });
  console.log('  Response:', JSON.stringify(products, null, 2));

  // Test 2: Role query — uses a dummy MLBB user (replace with a real one to verify)
  // Replace TEST_USER_ID and TEST_ZONE_ID with a real Mobile Legends account
  const TEST_USER_ID = '12345678';
  const TEST_ZONE_ID = '1234';
  const TEST_PRODUCT_ID = '1'; // product ID from the product list above

  console.log(`\n[2] Role query (userid=${TEST_USER_ID}, zoneid=${TEST_ZONE_ID})`);
  const role = await callSmileOne('/smilecoin/api/getrole', {
    product:   'mobilelegends',
    productid: TEST_PRODUCT_ID,
    userid:    TEST_USER_ID,
    zoneid:    TEST_ZONE_ID,
  });
  console.log('  Response:', JSON.stringify(role, null, 2));

  console.log('\n=== Test complete ===');
}

run().catch(err => {
  console.error('\n✗ Fatal error:', err.message);
  process.exit(1);
});
