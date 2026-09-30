import clsx from "clsx";

import { frameStyle } from "../../lib/leaderboard";

/**
 * Wraps avatar content in the user's earned leaderboard frame ring.
 * No frame -> renders children unchanged (with optional className).
 *
 * sizeClass controls the outer ring thickness via padding.
 */
const AvatarFrame = ({ frame, children, className = "", paddingClass = "p-[3px]" }) => {
  if (!frame) {
    return <div className={className}>{children}</div>;
  }
  const style = frameStyle(frame);
  return (
    <div
      className={clsx("inline-flex rounded-full", paddingClass, style.ring, className)}
      title={`${style.label} frame`}
    >
      {children}
    </div>
  );
};

export default AvatarFrame;
