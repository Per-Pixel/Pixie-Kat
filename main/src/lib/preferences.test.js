import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  readPreferences,
  writePreferences,
} from './preferences';

const createStorage = () => {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
  };
};

describe('site preferences storage', () => {
  let originalStorage;

  beforeEach(() => {
    originalStorage = globalThis.localStorage;
    globalThis.localStorage = createStorage();
  });

  afterEach(() => {
    globalThis.localStorage = originalStorage;
  });

  it('returns defaults when nothing is stored', () => {
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('round-trips written preferences', () => {
    writePreferences({ music: false, intro: false, reducedMotion: true });
    expect(readPreferences()).toEqual({ music: false, intro: false, reducedMotion: true });
  });

  it('keeps defaults for keys missing from stored data', () => {
    globalThis.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ music: false }));
    expect(readPreferences()).toEqual({ ...DEFAULT_PREFERENCES, music: false });
  });

  it('ignores non-boolean and unknown stored keys', () => {
    globalThis.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ music: 'yes', reducedMotion: true, bogus: 1 })
    );
    expect(readPreferences()).toEqual({ ...DEFAULT_PREFERENCES, reducedMotion: true });
  });

  it('falls back to defaults on corrupt JSON', () => {
    globalThis.localStorage.setItem(PREFERENCES_STORAGE_KEY, '{not json');
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
  });

  it('falls back to defaults when localStorage is unavailable', () => {
    delete globalThis.localStorage;
    expect(readPreferences()).toEqual(DEFAULT_PREFERENCES);
    expect(() => writePreferences({ music: false })).not.toThrow();
  });
});
