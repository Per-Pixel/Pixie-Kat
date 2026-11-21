/**
 * Scroll-linked clip-path, box-shadow, and width/height tweens stay smooth on
 * iOS and drop frames on Android. Touch Android keeps the motion, on cheaper
 * properties. Desktop and iOS stay on the full path.
 */

export function classifyMotion({
  userAgent = "",
  finePointer = false,
  wide = false,
  deviceMemory,
  cores,
  saveData = false,
} = {}) {
  const android = /Android/i.test(userAgent);
  const touchAndroid = android && !(finePointer && wide);
  const memory = typeof deviceMemory === "number" ? deviceMemory : undefined;
  const cpu = typeof cores === "number" ? cores : undefined;
  const lowCores = cpu != null && cpu > 0 && cpu <= 4;
  const constrained = Boolean(saveData || touchAndroid);
  // deviceMemory is a power-of-two bucket: 4 covers most mid-range phones,
  // 8 is the flagship cap. Missing memory with a known CPU is not treated as old.
  const lowEnd = Boolean(
    saveData ||
      (touchAndroid &&
        ((memory != null && memory <= 4) ||
          (memory == null && lowCores) ||
          (memory == null && cpu == null))),
  );

  return { constrained, lowEnd };
}

let profile;

export function readMotionEnvironment(win = globalThis.window) {
  if (!win) {
    return { userAgent: "", finePointer: false, wide: false, saveData: false };
  }

  const nav = win.navigator ?? {};
  const match = (query) => Boolean(win.matchMedia?.(query)?.matches);

  return {
    userAgent: nav.userAgent || "",
    finePointer: match("(hover: hover) and (pointer: fine)"),
    wide: match("(min-width: 1024px)"),
    deviceMemory: nav.deviceMemory,
    cores: nav.hardwareConcurrency,
    saveData: Boolean(nav.connection?.saveData),
  };
}

export function getMotionProfile() {
  if (!profile) profile = classifyMotion(readMotionEnvironment());
  return profile;
}

export function isConstrainedMotion() {
  return getMotionProfile().constrained;
}

export function isLowEndMotion() {
  return getMotionProfile().lowEnd;
}
