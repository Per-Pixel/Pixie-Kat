import { useRef } from "react";
import { useAnimatedTitleReveal } from "../hooks/useAnimatedTitleReveal";

const AnimatedTitle = ({ title, containerClass = "", textColor = null }) => {
  const containerRef = useRef(null);
  
  // Use the animation hook
  useAnimatedTitleReveal(containerRef);

  const dynamicStyle = textColor ? { color: textColor } : {};

  return (
    <div ref={containerRef} className={`animated-title ${containerClass}`} style={dynamicStyle}>
      {title.split("<br />").map((line, index) => (
        <div
          key={index}
          className="flex-center max-w-full flex-wrap gap-2 px-10 md:gap-3"
        >
          {line.split(" ").map((word, idx) => (
            <span
              key={idx}
              className="animated-word"
              dangerouslySetInnerHTML={{ __html: word }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default AnimatedTitle;