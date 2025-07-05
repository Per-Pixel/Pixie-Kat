import { useRef, useState } from "react";
import { useVideoTransition } from "../hooks/useVideoTransition";

const VideoTransition = ({ 
  videos = ["/videos/hero-0.mp4", "/videos/hero-1.mp4", "/videos/hero-2.mp4"],
  className = ""
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const nextVdRef = useRef(null);
  
  // Use the video transition animation
  useVideoTransition(nextVdRef, { shouldAnimate: currentIndex > 0 });

  const handleClick = () => {
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  };

  return (
    <div className={`relative mx-auto my-20 h-96 w-96 overflow-hidden rounded-lg ${className}`}>
      <video
        id="current-video"
        src={videos[currentIndex]}
        autoPlay
        muted
        loop
        className="absolute h-full w-full object-cover"
      />
      
      <video
        id="next-video"
        ref={nextVdRef}
        src={videos[(currentIndex + 1) % videos.length]}
        muted
        loop
        className="absolute h-0 w-0 scale-0 object-cover"
        style={{ visibility: "hidden" }}
      />
      
      <button
        onClick={handleClick}
        className="absolute bottom-4 right-4 rounded-full bg-white px-4 py-2 font-bold text-violet-800"
      >
        Next Video
      </button>
    </div>
  );
};

export default VideoTransition;