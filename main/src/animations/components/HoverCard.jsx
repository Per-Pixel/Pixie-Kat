import React, { useRef, useState } from "react";
import gsap from "gsap";

const HoverCard = ({
  title,
  description,
  image,
  className = "",
  cardClassName = "",
  imageClassName = "",
  contentClassName = "",
  isComingSoon = false,
}) => {
  const cardRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    
    const card = cardRef.current;
    const rect = card.getBoundingClientRect();
    
    // Calculate mouse position relative to card
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Calculate rotation based on mouse position
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 10;
    const rotateY = (centerX - x) / 10;
    
    // Apply the transform
    gsap.to(card, {
      rotationX: rotateX,
      rotationY: rotateY,
      transformPerspective: 1000,
      duration: 0.5,
      ease: "power2.out",
    });
  };

  const handleMouseEnter = () => {
    setIsHovering(true);
    
    gsap.to(cardRef.current, {
      scale: 1.05,
      boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
      duration: 0.5,
      ease: "power2.out",
    });
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    
    gsap.to(cardRef.current, {
      rotationX: 0,
      rotationY: 0,
      scale: 1,
      boxShadow: "0 5px 15px rgba(0, 0, 0, 0.1)",
      duration: 0.5,
      ease: "power2.out",
    });
  };

  return (
    <div
      ref={cardRef}
      className={`relative overflow-hidden rounded-lg bg-white shadow-lg transition-all duration-300 ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className={`relative h-full w-full ${cardClassName}`}>
        {/* Image or video */}
        <div className={`h-3/5 overflow-hidden ${imageClassName}`}>
          {typeof image === "string" && image.endsWith(".mp4") ? (
            <video
              src={image}
              autoPlay
              loop
              muted
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={image}
              alt={title}
              className="h-full w-full object-cover"
            />
          )}
        </div>
        
        {/* Content */}
        <div className={`p-6 ${contentClassName}`} style={{ transform: "translateZ(20px)" }}>
          <h3 className="bento-title mb-2">{title}</h3>
          <p className="text-gray-700">{description}</p>
          
          {isComingSoon && (
            <div className="mt-4 inline-block rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-800">
              Coming Soon
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HoverCard;
