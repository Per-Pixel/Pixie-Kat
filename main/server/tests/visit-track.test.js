import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cleanPath, cleanVisitorKey, deviceFromUserAgent, isPublicIp, lookupPlace, placeFromGeo } from '../visit-track.js';

describe('deviceFromUserAgent', () => {
  it('names common phones and computers', () => {
    assert.equal(deviceFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'iPhone');
    assert.equal(deviceFromUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 7)'), 'Android');
    assert.equal(deviceFromUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'), 'iPad');
    assert.equal(deviceFromUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'Windows');
    assert.equal(deviceFromUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), 'Mac');
  });
});

describe('visitor and place', () => {
  it('keeps a site path and a random visitor id', () => {
    assert.equal(cleanPath('/games/mobile-legends?fbclid=abc'), '/games/mobile-legends');
    assert.equal(cleanVisitorKey('9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'), '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d');
    assert.equal(cleanVisitorKey('not-an-id'), null);
  });

  it('labels a region and skips private addresses', () => {
    assert.equal(placeFromGeo({ success: true, region: 'Maharashtra', country: 'India' }), 'Maharashtra, India');
    assert.equal(isPublicIp('127.0.0.1'), false);
    assert.equal(isPublicIp('49.36.1.2'), true);
  });

  it('does not store a failed lookup as a place', async () => {
    const place = await lookupPlace('49.36.1.2', async () => ({ json: async () => ({ success: false }) }));
    assert.equal(place, 'Unknown');
  });
});
