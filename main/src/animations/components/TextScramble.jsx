import React, { useRef, useEffect, useState } from "react";

const TextScramble = ({
  text,
  tag = "div",
  className = "",
  speed = 50,
  scrambleChars = "!<>-_\\/[]{}—=+*^?#_~",
}) => {
  const containerRef = useRef(null);
  const [displayText, setDisplayText] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    let frame = 0;
    let frameRequest;
    let queue = [];
    let resolve = null;
    
    const scramble = () => {
      let output = "";
      let complete = 0;
      
      for (let i = 0, n = queue.length; i < n; i++) {
        let { from, to, start, end, char } = queue[i];
        
        if (frame >= end) {
          complete++;
          output += to;
        } else if (frame >= start) {
          if (!char || Math.random() < 0.28) {
            char = scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
            queue[i].char = char;
          }
          output += char;
        } else {
          output += from;
        }
      }
      
      setDisplayText(output);
      
      if (complete === queue.length) {
        setIsAnimating(false);
        if (resolve) resolve();
        return;
      }
      
      frameRequest = requestAnimationFrame(scramble);
      frame++;
    };
    
    const setText = (newText) => {
      const oldText = container.innerText;
      const length = Math.max(oldText.length, newText.length);
      const promise = new Promise((res) => (resolve = res));
      
      queue = [];
      frame = 0;
      
      for (let i = 0; i < length; i++) {
        const from = oldText[i] || "";
        const to = newText[i] || "";
        const start = Math.floor(Math.random() * 40);
        const end = start + Math.floor(Math.random() * 40);
        queue.push({ from, to, start, end });
      }
      
      setIsAnimating(true);
      cancelAnimationFrame(frameRequest);
      frameRequest = requestAnimationFrame(scramble);
      
      return promise;
    };
    
    // Start the animation
    setText(text);
    
    // Clean up
    return () => {
      cancelAnimationFrame(frameRequest);
    };
  }, [text, scrambleChars]);
  
  const Tag = tag;
  
  return (
    <Tag 
      ref={containerRef} 
      className={`text-scramble ${isAnimating ? 'animating' : ''} ${className}`}
    >
      {displayText}
    </Tag>
  );
};

export default TextScramble;
