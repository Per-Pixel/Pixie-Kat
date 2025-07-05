import { useVideoFrameClipPath } from "../hooks/useVideoFrameClipPath";

const VideoFrame = ({ 
  id = "video-frame", 
  videoSrc = "/videos/hero-1.mp4", 
  options = {} 
}) => {
  // Use the video frame clip path animation
  useVideoFrameClipPath(`#${id}`, options);

  return (
    <div className="h-screen w-screen">
      <div id={id} className="mx-auto h-3/4 w-3/4 overflow-hidden">
        <video
          src={videoSrc}
          autoPlay
          muted
          loop
          className="h-full w-full object-cover"
        />
      </div>
    </div>
  );
};

export default VideoFrame;