import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_STORAGE_KEY,
  readPreferences,
  writePreferences,
} from "../lib/preferences";

const PreferencesContext = createContext(null);

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("usePreferences must be used within a PreferencesProvider");
  return context;
};

export const PreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState(readPreferences);

  const setPreference = useCallback((key, value) => {
    if (!(key in DEFAULT_PREFERENCES)) return;
    setPreferences((prev) => {
      const next = { ...prev, [key]: Boolean(value) };
      writePreferences(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const onStorage = (event) => {
      if (event.key === PREFERENCES_STORAGE_KEY) setPreferences(readPreferences());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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
