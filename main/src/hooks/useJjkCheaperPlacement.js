import { useEffect, useState } from "react";
import {
  fetchJjkCheaperSettings,
  isJjkCheaperPublished,
  JJK_CHEAPER_PATH,
} from "../lib/eventJjkCheaper";

/**
 * Returns placement promo data only when the event is published
 * and the requested placement flag is enabled.
 */
export function useJjkCheaperPlacement(slot) {
  const [promo, setPromo] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchJjkCheaperSettings().then((settings) => {
      if (cancelled) return;
      if (!isJjkCheaperPublished(settings)) {
        setPromo(null);
        return;
      }
      const placement = settings.placement || {};
      if (!placement[slot]) {
        setPromo(null);
        return;
      }
      setPromo({
        title: placement.promo_title || "Jujutsu Kaisen - Cheaper Guide",
        image: placement.promo_image || "/img/games/mobile-legends.webp",
        link: JJK_CHEAPER_PATH,
        flag: "NEW",
      });
    });
    return () => {
      cancelled = true;
    };
  }, [slot]);

  return promo;
}
