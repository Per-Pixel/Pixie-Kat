import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    // "instant" overrides the global `scroll-behavior: smooth` — a smooth
    // scroll here animates over the whole page and can be interrupted by
    // lazy content reflow, leaving the new route stranded mid-scroll.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
