const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const poses = [
  { xPercent: -100, yPercent: 16, z: -420, scale: 0.68, rotation: -16, rotationY: 42, opacity: 0 },
  { xPercent: -82, yPercent: 12, z: -300, scale: 0.75, rotation: -13, rotationY: 36, opacity: 0.24 },
  { xPercent: -62, yPercent: 7, z: -180, scale: 0.84, rotation: -10, rotationY: 30, opacity: 0.68 },
  { xPercent: 0, yPercent: 0, z: 0, scale: 1, rotation: -5, rotationY: -7, opacity: 1 },
  { xPercent: 62, yPercent: -7, z: -180, scale: 0.84, rotation: 7, rotationY: -30, opacity: 0.68 },
  { xPercent: 82, yPercent: -12, z: -300, scale: 0.75, rotation: 11, rotationY: -36, opacity: 0.24 },
  { xPercent: 100, yPercent: -16, z: -420, scale: 0.68, rotation: 14, rotationY: -42, opacity: 0 },
];

export function getMenuScrollState(progress, count) {
  const bounded = clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
  const last = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0) - 1);
  const position = bounded * last;
  return { progress: bounded, position, activeIndex: Math.round(position) };
}

export function getMenuCardPose(offset, reduced = false) {
  const distance = Number.isFinite(offset) ? offset : 0;
  if (reduced) {
    return { xPercent: 0, yPercent: 0, z: 0, scale: 1, rotation: 0, rotationY: 0, opacity: clamp(1 - Math.abs(distance), 0, 1) };
  }
  const step = clamp(distance, -3, 3) + 3;
  const from = poses[Math.floor(step)];
  const to = poses[Math.min(6, Math.floor(step) + 1)];
  const fraction = step - Math.floor(step);
  return Object.fromEntries(
    Object.keys(from).map((key) => [key, from[key] + (to[key] - from[key]) * fraction])
  );
}

export function getMenuParallax(clientX, clientY, width, height) {
  const x = clamp((clientX - width / 2) * 0.03, -15, 15);
  const y = clamp((clientY - height / 2) * 0.025, -10, 10);
  return { x, y, rotationX: y ? -y * 0.08 : 0, rotationY: x * 0.08, rotation: x * 0.025 };
}
