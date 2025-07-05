import React from 'react';
import {
  ParallaxSection,
  TextScramble,
  SplitTextReveal,
  MagneticButton,
  ScrollProgressBar,
  RoundedCorners
} from '../index';

const AdvancedExample = () => {
  return (
    <div className="min-h-screen">
      {/* Fixed scroll progress bar */}
      <ScrollProgressBar color="#5d3fd3" />
      
      {/* Hero section with parallax */}
      <ParallaxSection
        backgroundSrc="/images/hero-bg.jpg"
        speed={0.3}
        className="h-screen"
        contentClassName="flex items-center justify-center h-full"
      >
        <div className="text-center text-white">
          <TextScramble 
            text="Interactive Animations" 
            tag="h1"
            className="text-5xl font-bold mb-4"
          />
          
          <SplitTextReveal
            tag="p"
            className="text-xl max-w-lg mx-auto"
          >
            Scroll down to explore our collection of modern web animations
            powered by GSAP and React.
          </SplitTextReveal>
          
          <div className="mt-8">
            <MagneticButton
              className="bg-violet-600 text-white px-8 py-3 rounded-full font-medium"
              strength={0.3}
            >
              Get Started
            </MagneticButton>
          </div>
        </div>
      </ParallaxSection>
      
      {/* Content section with rounded corners */}
      <RoundedCorners
        startRadius="0px"
        endRadius="50px 50px 0 0"
        className="bg-white py-24 px-8"
      >
        <div className="max-w-4xl mx-auto">
          <SplitTextReveal
            tag="h2"
            className="text-4xl font-bold mb-12 text-center"
          >
            Modern Animation Components
          </SplitTextReveal>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-100 p-6 rounded-lg">
              <h3 className="text-2xl font-semibold mb-3">Parallax Scrolling</h3>
              <p>Create depth with elements that move at different speeds during scroll.</p>
            </div>
            
            <div className="bg-gray-100 p-6 rounded-lg">
              <h3 className="text-2xl font-semibold mb-3">Text Scramble</h3>
              <p>Add cyberpunk-style text animations with randomized character transitions.</p>
            </div>
            
            <div className="bg-gray-100 p-6 rounded-lg">
              <h3 className="text-2xl font-semibold mb-3">Magnetic Elements</h3>
              <p>Interactive elements that are attracted to the user's cursor.</p>
            </div>
            
            <div className="bg-gray-100 p-6 rounded-lg">
              <h3 className="text-2xl font-semibold mb-3">Split Text Reveal</h3>
              <p>Reveal text character by character with staggered animations.</p>
            </div>
          </div>
        </div>
      </RoundedCorners>
    </div>
  );
};

export default AdvancedExample;
