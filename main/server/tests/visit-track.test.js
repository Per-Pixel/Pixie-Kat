import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyVisit, cleanPath, referrerHost } from '../visit-track.js';

describe('classifyVisit', () => {
  it('counts a Meta link click that carries fbclid', () => {
    assert.equal(classifyVisit({ utmSource: '', referrerHost: '', hasFbclid: true }), 'meta');
  });

  it('counts instagram and facebook referrers as meta', () => {
    assert.equal(classifyVisit({ utmSource: '', referrerHost: 'l.facebook.com', hasFbclid: false }), 'meta');
    assert.equal(classifyVisit({ utmSource: 'ig', referrerHost: '', hasFbclid: false }), 'meta');
  });

  it('leaves a normal visit as direct', () => {
    assert.equal(classifyVisit({ utmSource: '', referrerHost: '', hasFbclid: false }), 'direct');
  });
});

describe('visit fields', () => {
  it('keeps only the referrer host and a site path', () => {
    assert.equal(referrerHost('https://l.facebook.com/l.php?u=https://pixiekat.com'), 'l.facebook.com');
    assert.equal(cleanPath('/games/mobile-legends?fbclid=abc'), '/games/mobile-legends');
  });
});
