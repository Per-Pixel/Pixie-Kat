import React from "react";
import SplitTextImageReveal from "../components/SplitTextImageReveal";

const DiscoverSection = ({
  text = "Discover\nthe\nworld's\nlargest\nshared\nadventure",
  backgroundImage = "",
  backgroundColor = "#5724ff",
  className = "",
  textClassName = "",
  description = "A new dimension of play that rewards your gaming journey across platforms."
}) => {
  return (
    <section className={`py-32 ${className}`}>
      <div className="max-w-4xl mx-auto px-4">
        <SplitTextImageReveal
          text={text}
          backgroundImage={backgroundImage}
          backgroundColor={backgroundColor}
          tag="h2"
          className={`text-6xl font-bold leading-tight ${textClassName}`}
          lineHeight={1.1}
          staggerDelay={0.15}
          options={{
            start: "top 80%",
            end: "+=600",
            scrub: 0.3,
          }}
        />
        
        {description && (
          <p className="mt-8 text-xl text-gray-400 relative z-10">
            {description}
          </p>
        )}
      </div>
    </section>
  );
};

export default DiscoverSection;