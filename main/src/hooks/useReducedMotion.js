import { useState, useEffect } from "react";
import { usePreferences } from "../contexts/PreferencesContext";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Returns true when the user prefers reduced motion, either via the
 * OS/browser setting or the site's own Reduce Motion preference.
 * Updates reactively if the preference changes at runtime.
 */
export function useReducedMotion() {
  const { preferences } = usePreferences();
  const [prefersReduced, setPrefersReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(QUERY).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handler = (e) => setPrefersReduced(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return prefersReduced || preferences.reducedMotion;
}
