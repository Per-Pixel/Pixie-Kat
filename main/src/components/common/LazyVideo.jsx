import { useEffect, useRef } from "react";

// Decorative autoplay video that defers its download until the element
// scrolls near the viewport — same idea as the footer reveal: media work
// happens on approach, not on mount. Pauses when it leaves so offscreen
// tiles stop decoding. Use like <video>; `src` is assigned lazily.
const LazyVideo = ({ src, rootMargin = "400px", ...props }) => {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return undefined;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (el.dataset.src !== src) {
            el.dataset.src = src;
            el.src = src;
          }
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { rootMargin }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [src, rootMargin]);

  return (
    <video
      ref={ref}
      autoPlay
      loop
      muted
      playsInline
      webkit-playsinline="true"
      controls={false}
      controlsList="nodownload noplaybackrate nofullscreen"
      disablePictureInPicture
      preload="none"
      {...props}
    />
  );
};

export default LazyVideo;
