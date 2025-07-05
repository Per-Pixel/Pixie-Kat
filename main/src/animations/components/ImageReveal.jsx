import { useRef } from "react";
import { useImageReveal } from "../hooks/useImageReveal";

const ImageReveal = ({
  src,
  alt = "Image",
  overlayColor = "#5724ff",
  className = "",
  imgClassName = "",
  duration = 1.2,
}) => {
  const imageRef = useRef(null);
  const overlayRef = useRef(null);
  
  // Use the image reveal animation
  useImageReveal(imageRef, overlayRef, {
    duration,
  });
  
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        ref={overlayRef}
        className="absolute inset-0 z-10"
        style={{ backgroundColor: overlayColor }}
      />
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        className={`w-full h-full object-cover ${imgClassName}`}
      />
    </div>
  );
};

export default ImageReveal;