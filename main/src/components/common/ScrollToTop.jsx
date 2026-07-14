import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
