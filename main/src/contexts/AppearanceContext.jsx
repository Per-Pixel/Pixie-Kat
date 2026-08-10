import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_APPEARANCE,
  fetchAppearanceSettings,
} from "../lib/storeContent";

const AppearanceContext = createContext(DEFAULT_APPEARANCE);

function ensureLink(rel, href, attrs = {}) {
  if (!href) return;
  let link = document.querySelector(`link[data-appearance-rel="${rel}"]`);
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("data-appearance-rel", rel);
    link.rel = rel;
    document.head.appendChild(link);
  }
  link.href = href;
  Object.entries(attrs).forEach(([key, value]) => {
    if (value != null) link.setAttribute(key, value);
  });
}

export function AppearanceProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_APPEARANCE);

  useEffect(() => {
    let cancelled = false;
    fetchAppearanceSettings().then((data) => {
      if (!cancelled) setSettings(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const active = settings.tab_title_active || DEFAULT_APPEARANCE.tab_title_active;
    const inactive = settings.tab_title_inactive || DEFAULT_APPEARANCE.tab_title_inactive;

    document.title = document.hidden ? inactive : active;

    const onVisibility = () => {
      document.title = document.hidden ? inactive : active;
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [settings.tab_title_active, settings.tab_title_inactive]);

  useEffect(() => {
    if (settings.favicon_url) {
      ensureLink("icon", settings.favicon_url);
    }
    if (settings.icon_url) {
      ensureLink("apple-touch-icon", settings.icon_url);
    }
  }, [settings.favicon_url, settings.icon_url]);

  const value = useMemo(() => settings, [settings]);

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  return useContext(AppearanceContext);
}
