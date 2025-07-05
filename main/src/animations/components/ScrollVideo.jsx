import { useRef } from "react";
import { useScrollBasedVideo } from "../hooks/useScrollBasedVideo";

const ScrollVideo = ({
  src,
  className = "",
  videoClassName = "",
  options = {},
}) => {
  const videoRef = useRef(null);
  
  // Use the scroll-based video playback
  useScrollBasedVideo(videoRef, options);
  
  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        src={src}
        muted
        playsInline
        className={`w-full h-full object-cover ${videoClassName}`}
      />
    </div>
  );
};

export default ScrollVideo;