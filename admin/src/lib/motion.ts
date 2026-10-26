import type { Easing, Transition, Variants } from 'framer-motion';

/**
 * Shared motion language for the admin panel.
 *
 * This is an Operate surface: every animation exists to acknowledge an
 * action, explain a state change, or preserve spatial continuity.
 * Keep routine motion under ~250ms, ease-out, and interruptible.
 */

export const EASE_OUT: Easing = [0.23, 1, 0.32, 1];
export const EASE_IN_OUT: Easing = [0.77, 0, 0.175, 1];
export const EASE_DRAWER: Easing = [0.32, 0.72, 0, 1];

export const DURATION = {
  press: 0.12,
  fast: 0.16,
  base: 0.22,
  overlay: 0.32,
} as const;

export const springSnappy: Transition = { type: 'spring', stiffness: 420, damping: 32 };
export const springSoft: Transition = { type: 'spring', duration: 0.4, bounce: 0 };
export const springDrawer: Transition = { type: 'spring', stiffness: 300, damping: 30 };

/** Standard enter/exit: fade + small rise. Exits stay subtler than enters. */
export const fadeUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

export const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Scale-aware pop for badges, menus, popovers — never enters from scale(0). */
export const pop: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
};

/** Parent stagger — keep lists ≤ ~8 visible items, steps of 20–35ms. */
export const staggerParent: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

/** Tactile press feedback — spread onto any pressable motion component. */
export const pressScale = { whileTap: { scale: 0.97 } } as const;

/** Icon swap (e.g. copy → check): scale 0.25→1 with a blur bridge. */
export const iconSwap: Variants = {
  initial: { opacity: 0, scale: 0.25, filter: 'blur(4px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 0.25, filter: 'blur(4px)' },
};

/** Height reveal for expanding regions (accordions, submenus). */
export const expandCollapse: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
};

/** Value-change pop for badges/counters — key the element by its value. */
export const badgePop: Variants = {
  initial: { opacity: 0, scale: 0.6, y: 4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.6, y: -4 },
};

/** Per-item delay helper for manual staggers — capped so long lists stay snappy. */
export const staggerDelay = (index: number, step = 0.03, cap = 0.24): number =>
  Math.min(index * step, cap);
