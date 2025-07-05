import React, { useState } from 'react';
import SlideTextButton from "../animations/components/SlideTextButton";
import { TiLocationArrow } from "react-icons/ti";

const FlipCard = ({ 
  frontVideo = "videos/feature-2.mp4", 
  backVideo = "videos/feature-3.mp4", 
  title = "Popular Games", 
  description = "Explore our collection of top games",
  buttonText = "View All Games" 
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      className="card-container relative h-full w-full overflow-hidden rounded-lg border-2 border-black transition-all duration-400"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        borderRadius: isHovered ? '15px' : '10px',
      }}
    >
      {/* First content */}
      <div 
        className="first-content absolute inset-0 flex flex-col justify-start p-5 transition-all duration-400"
        style={{
          opacity: isHovered ? 0 : 1,
          height: isHovered ? '0%' : '100%',
        }}
      >
        <video
          src={frontVideo}
          autoPlay
          loop
          muted
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="relative z-10">
          <h3 className="mb-2 text-2xl font-bold text-white">{title}</h3>
          <p className="text-sm text-white">{description}</p>
        </div>
      </div>
      
      {/* Second content */}
      <div 
        className="second-content absolute inset-0 flex flex-col items-center justify-center p-5 transition-all duration-400"
        style={{
          opacity: isHovered ? 1 : 0,
          height: isHovered ? '100%' : '0%',
          transform: isHovered ? 'rotate(0deg)' : 'rotate(90deg) scale(-1)',
        }}
      >
        <video
          src={backVideo}
          autoPlay
          loop
          muted
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="relative z-10 flex flex-col items-center">
          <SlideTextButton
            title={buttonText}
            leftIcon={<TiLocationArrow />}
            containerClass="bg-blue-50 text-sm py-2 px-6 text-black flex-center gap-1"
            onClick={() => console.log("View all games clicked")}
          />
        </div>
      </div>
    </div>
  );
};

export default FlipCard;
