import { useEffect, useState } from "react";

export const useTextScramble = (finalText, options = {}) => {
  const [displayText, setDisplayText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  
  const defaults = {
    speed: 50,
    scrambleChars: "!<>-_\\/[]{}—=+*^?#_~",
    delay: 0,
  };
  
  const settings = { ...defaults, ...options };

  const animate = () => {
    setIsAnimating(true);
    
    let iteration = 0;
    const maxIterations = finalText.length * 4;
    let timer = null;
    
    const updateText = () => {
      if (iteration >= maxIterations) {
        setDisplayText(finalText);
        setIsAnimating(false);
        return;
      }
      
      const progress = Math.min(iteration / maxIterations, 1);
      const charactersToReveal = Math.floor(finalText.length * progress);
      
      let result = "";
      for (let i = 0; i < finalText.length; i++) {
        if (i < charactersToReveal) {
          result += finalText[i];
        } else if (finalText[i] === " ") {
          result += " ";
        } else {
          result += settings.scrambleChars[Math.floor(Math.random() * settings.scrambleChars.length)];
        }
      }
      
      setDisplayText(result);
      iteration++;
      timer = setTimeout(updateText, settings.speed);
    };
    
    setTimeout(() => {
      updateText();
    }, settings.delay);
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  };

  return { displayText, animate, isAnimating };
};