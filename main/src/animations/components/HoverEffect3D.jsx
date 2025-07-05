import { useRef } from "react";
import { use3DHoverEffect } from "../hooks/use3DHoverEffect";

const HoverEffect3D = ({ 
  children, 
  className = "",
  contentClassName = ""
}) => {
  const sectionRef = useRef(null);
  const contentRef = useRef(null);
  
  // Use the 3D hover effect
  const { handleMouseMove, handleMouseLeave } = use3DHoverEffect(sectionRef, contentRef);

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative mx-auto my-20 h-80 w-80 overflow-hidden rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 ${className}`}
      style={{ perspective: "500px" }}
    >
      <div
        ref={contentRef}
        className={`flex h-full w-full flex-col items-center justify-center origin-center p-8 text-white ${contentClassName}`}
        style={{ transformStyle: "preserve-3d" }}
      >
        {children || (
          <>
            <h2 className="mb-4 text-2xl font-bold">3D Hover Effect</h2>
            <p className="text-center">
              Move your mouse over this card to see the 3D effect in action.
            </p>
          </>
        )}
      </div>
    </section>
  );
};

export default HoverEffect3D;