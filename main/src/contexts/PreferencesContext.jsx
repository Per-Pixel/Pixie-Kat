import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  readPreferences,
  writePreferences,
} from "../lib/preferences";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

const PreferencesContext = createContext(null);

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used within a PreferencesProvider");
  return context;
};

const pickKnownBooleans = (raw) => {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  for (const key of Object.keys(DEFAULT_PREFERENCES)) {
    if (typeof raw[key] === "boolean") out[key] = raw[key];
  }
  return out;
};

export const PreferencesProvider = ({ children }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(readPreferences);
  const prefsRef = useRef(preferences);
  const writeChain = useRef(Promise.resolve());

  const applyLocal = useCallback((next) => {
    prefsRef.current = next;
    setPreferences(next);
    writePreferences(next);
  }, []);

  const syncToAccount = useCallback(() => {
    if (!user?.id) return;
    // Serialize writes so rapid toggles can't overwrite each other out of order.
    writeChain.current = writeChain.current
      .catch(() => {})
      .then(() =>
        supabase
          .from("user_settings")
          .update({ site_preferences: prefsRef.current, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
      );
  }, [user?.id]);

  const setPreference = useCallback((key, value) => {
    if (!(key in DEFAULT_PREFERENCES)) return;
    const next = { ...prefsRef.current, [key]: Boolean(value) };
    applyLocal(next);
    syncToAccount();
  }, [applyLocal, syncToAccount]);

  // Hydrate from the account on login: remote wins when present; otherwise
  // first login uploads this device's preferences as the account baseline.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from("user_settings")
      .select("site_preferences")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const remote = pickKnownBooleans(data?.site_preferences);
        if (Object.keys(remote).length > 0) {
          applyLocal({ ...prefsRef.current, ...remote });
        } else {
          syncToAccount();
        }
      });
    return () => { cancelled = true; };
  }, [user?.id, applyLocal, syncToAccount]);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === PREFERENCES_STORAGE_KEY) applyLocal(readPreferences());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [applyLocal]);

  const value = useMemo(
    () => ({ preferences, setPreference }),
    [preferences, setPreference]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
};
