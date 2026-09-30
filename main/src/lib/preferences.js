export const PREFERENCES_STORAGE_KEY = "pixie_preferences";

export const DEFAULT_PREFERENCES = {
  music: true,
  intro: true,
  reducedMotion: false,
};

const KNOWN_KEYS = Object.keys(DEFAULT_PREFERENCES);

const sanitize = (raw) => {
  const prefs = { ...DEFAULT_PREFERENCES };
  if (!raw || typeof raw !== "object") return prefs;
  for (const key of KNOWN_KEYS) {
    if (typeof raw[key] === "boolean") prefs[key] = raw[key];
  }
  return prefs;
};

const getStorage = () => {
  try {
    return typeof localStorage !== "undefined" ? localStorage : null;
  } catch {
    return null;
  }
};

export function readPreferences() {
  const storage = getStorage();
  if (!storage) return { ...DEFAULT_PREFERENCES };
  try {
    const raw = storage.getItem(PREFERENCES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    return sanitize(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

export function writePreferences(preferences) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(sanitize(preferences)));
  } catch {
    /* ignore quota / private mode */
  }
}
