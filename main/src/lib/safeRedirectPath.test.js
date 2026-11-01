import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './safeRedirectPath';

describe('safeRedirectPath', () => {
  it('keeps ordinary app paths', () => {
    expect(safeRedirectPath('/cart')).toBe('/cart');
    expect(safeRedirectPath('/account/orders/abc')).toBe('/account/orders/abc');
    expect(safeRedirectPath('/leaderboard')).toBe('/leaderboard');
  });

  it('defaults when the value is missing or not a path', () => {
    expect(safeRedirectPath(undefined)).toBe('/');
    expect(safeRedirectPath(null)).toBe('/');
    expect(safeRedirectPath('')).toBe('/');
    expect(safeRedirectPath('account')).toBe('/');
  });

  it('rejects off-site and protocol destinations', () => {
    expect(safeRedirectPath('//evil.com')).toBe('/');
    expect(safeRedirectPath('https://evil.com')).toBe('/');
    expect(safeRedirectPath('/\\evil.com')).toBe('/');
    expect(safeRedirectPath('/redirect?next=https://evil.com')).toBe('/');
  });
});
