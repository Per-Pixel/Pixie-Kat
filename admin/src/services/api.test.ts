import { describe, it, expect } from 'vitest';
import { getApiBaseUrl } from './api';

describe('getApiBaseUrl', () => {
  it('returns the configured VITE_API_BASE_URL when set', () => {
    const env = { VITE_API_BASE_URL: 'https://api.pixiekat.com/api' };
    expect(getApiBaseUrl(env)).toBe('https://api.pixiekat.com/api');
  });

  it('falls back to localhost in development', () => {
    const env = {};
    expect(getApiBaseUrl(env)).toBe('http://localhost:3001/api');
  });

  it('throws in production when VITE_API_BASE_URL is missing', () => {
    const env = { PROD: true };
    expect(() => getApiBaseUrl(env)).toThrow('Missing VITE_API_BASE_URL in production');
  });
});
