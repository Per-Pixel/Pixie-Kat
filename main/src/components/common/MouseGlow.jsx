import { useRef, useEffect, useCallback } from 'react';

/**
 * MouseGlow — Premium multi-layered mouse-tracking glow effect.
 *
 * Renders as a wrapper: mouse events are captured on the outer container
 * which also holds the children, so z-index stacking never blocks input.
 *
 * HOW IT WORKS
 * 1. `mousemove` on the wrapper stores the *target* position in a ref
 *    (no React state ⇒ zero re-renders).
 * 2. A persistent `requestAnimationFrame` loop lerps the *current*
 *    position toward the target every frame → butter-smooth 60fps.
 * 3. Two radial-gradient layers (purple + pink) are composited with
 *    different sizes, colours, and blur radii for a rich, diffused light.
 *
 * @param {React.ReactNode} children  content rendered inside the wrapper
 * @param {number}  intensity         0–1, controls opacity & blur
 * @param {boolean} spotlight         adds mix-blend-mode: screen
 * @param {string}  className         classes for the wrapper div
 */
const MouseGlow = ({
  children,
  intensity = 0.7,
  spotlight = false,
  className = '',
}) => {
  const containerRef = useRef(null);
  const glowPrimaryRef = useRef(null);
  const glowSecondaryRef = useRef(null);

  // Mutable animation state — avoids React re-renders entirely
  const target = useRef({ x: 0, y: 0 });
  const current = useRef({ x: 0, y: 0 });
  const animFrameId = useRef(null);
  const isHovering = useRef(false);
  const currentOpacity = useRef(0);

  // ── Lerp helper ──────────────────────────────────────────────
  const lerp = (a, b, t) => a + (b - a) * t;

  // ── Animation loop ───────────────────────────────────────────
  const animate = useCallback(() => {
    const EASE = 0.09;          // position smoothing
    const OPACITY_EASE = 0.06;  // fade smoothing

    // Interpolate position toward target
    current.current.x = lerp(current.current.x, target.current.x, EASE);
    current.current.y = lerp(current.current.y, target.current.y, EASE);

    // Interpolate opacity (fade in on hover, fade out on leave)
    const targetOpacity = isHovering.current ? intensity : 0;
    currentOpacity.current = lerp(currentOpacity.current, targetOpacity, OPACITY_EASE);

    const x = current.current.x;
    const y = current.current.y;
    const op = currentOpacity.current;

    // ── Primary glow (large, purple-violet) ────────────────────
    if (glowPrimaryRef.current) {
      glowPrimaryRef.current.style.background =
        `radial-gradient(600px circle at ${x}px ${y}px, rgba(139,92,246,${0.22 * op}), rgba(109,40,217,${0.10 * op}) 40%, transparent 70%)`;
      glowPrimaryRef.current.style.opacity = String(op);
    }

    // ── Secondary glow (smaller, pink-magenta, offset) ─────────
    if (glowSecondaryRef.current) {
      glowSecondaryRef.current.style.background =
        `radial-gradient(420px circle at ${x + 30}px ${y + 20}px, rgba(236,72,153,${0.16 * op}), rgba(168,85,247,${0.07 * op}) 45%, transparent 70%)`;
      glowSecondaryRef.current.style.opacity = String(op);
    }

    animFrameId.current = requestAnimationFrame(animate);
  }, [intensity]);

  // ── Mouse handlers (update refs only — no React state) ──────
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    target.current.x = e.clientX - rect.left;
    target.current.y = e.clientY - rect.top;
  }, []);

  const handleMouseEnter = useCallback((e) => {
    isHovering.current = true;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Snap to entry point so glow doesn't slide in from (0,0)
      current.current.x = x;
      current.current.y = y;
      target.current.x = x;
      target.current.y = y;
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false;
  }, []);

  // ── Start / stop the RAF loop ───────────────────────────────
  useEffect(() => {
    animFrameId.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [animate]);

  const blurPrimary = Math.round(60 + (1 - intensity) * 40);
  const blurSecondary = Math.round(40 + (1 - intensity) * 30);
  const blendStyle = spotlight ? { mixBlendMode: 'screen' } : {};

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={className}
      style={{ position: 'relative' }}
    >
      {/* Primary glow layer — behind content */}
      <div
        ref={glowPrimaryRef}
        className="mouse-glow-layer"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0,
          filter: `blur(${blurPrimary}px)`,
          zIndex: 0,
          borderRadius: 'inherit',
          ...blendStyle,
        }}
      />

      {/* Secondary glow layer */}
      <div
        ref={glowSecondaryRef}
        className="mouse-glow-layer"
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0,
          filter: `blur(${blurSecondary}px)`,
          zIndex: 0,
          borderRadius: 'inherit',
          ...blendStyle,
        }}
      />

      {/* Actual content — always above glow */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};

export default MouseGlow;
