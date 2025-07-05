import React from 'react';
import {
  ParallaxSection,
  TextScramble,
  SplitTextReveal,
  MagneticButton,
  ScrollProgressBar,
  RoundedCorners,
  ImageReveal,
  MouseTrailer,
  ScrollVideo,
  GradientText,
  FloatingElements,
  TextWave
} from '../index';

const AnimationShowcase = () => {
  return (
    <div className="min-h-screen">
      {/* Fixed scroll progress bar */}
      <ScrollProgressBar color="#5724ff" />
      
      {/* Hero section with mouse trailer effect */}
      <MouseTrailer size={60} color="rgba(87, 36, 255, 0.2)" blur={5}>
        <ParallaxSection
          backgroundSrc="/img/hero/cta-bg.jpg"
          speed={0.3}
          className="h-screen"
          contentClassName="flex flex-col items-center justify-center h-full px-4"
        >
          <GradientText
            tag="h1"
            colors={["#5724ff", "#a065ff", "#edff66", "#5724ff"]}
            className="text-6xl font-bold mb-6 text-center"
          >
            Animation Collection
          </GradientText>
          
          <TextWave
            text="Modern Web Animations"
            tag="h2"
            className="text-2xl mb-8 text-white"
            amplitude={15}
            frequency={0.1}
          />
          
          <SplitTextReveal
            tag="p"
            className="text-xl max-w-lg text-center text-white mb-12"
          >
            A showcase of cutting-edge animation techniques for modern web applications
            using GSAP and React.
          </SplitTextReveal>
          
          <MagneticButton
            className="bg-violet-300 text-white px-8 py-4 rounded-full font-medium text-lg"
            strength={0.5}
          >
            Explore Animations
          </MagneticButton>
        </ParallaxSection>
      </MouseTrailer>
      
      {/* Content section with rounded corners */}
      <RoundedCorners
        startRadius="0px"
        endRadius="50px 50px 0 0"
        className="bg-white py-24 px-8"
      >
        <div className="max-w-6xl mx-auto">
          <TextScramble 
            text="Interactive Components" 
            tag="h2"
            className="text-4xl font-bold mb-16 text-center"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 mb-24">
            <div>
              <ImageReveal
                src="/img/entrance.webp"
                className="w-full h-80 mb-6 rounded-lg"
                overlayColor="#5724ff"
              />
              <h3 className="text-2xl font-semibold mb-3">Image Reveal Animation</h3>
              <p className="text-gray-600">Dramatic image reveals with overlay transitions that capture attention.</p>
            </div>
            
            <div>
              <ScrollVideo
                src="videos/hero-1.mp4"
                className="w-full h-80 mb-6 rounded-lg overflow-hidden"
                options={{
                  scrub: 0.5,
                }}
              />
              <h3 className="text-2xl font-semibold mb-3">Scroll-Based Video Playback</h3>
              <p className="text-gray-600">Control video playback with scroll position for interactive storytelling.</p>
            </div>
          </div>
          
          <FloatingElements
            elements={[
              { src: "/img/circle.svg", width: 60, height: 60 },
              { src: "/img/games/valorant-card.svg", width: 40, height: 40 },
              { src: "/img/games/lol-card.svg", width: 50, height: 50 },
            ]}
            className="relative h-96 mb-16 rounded-lg bg-blue-100 flex items-center justify-center"
          >
            <div className="text-center z-10">
              <h3 className="text-3xl font-bold mb-4">Floating Elements</h3>
              <p className="max-w-md mx-auto">Add depth and playfulness with animated floating elements.</p>
            </div>
          </FloatingElements>
          
          <div className="text-center">
            <GradientText
              tag="h2"
              colors={["#5724ff", "#fa4454", "#edff66"]}
              className="text-4xl font-bold mb-8 inline-block"
            >
              Endless Possibilities
            </GradientText>
            
            <p className="text-xl max-w-2xl mx-auto mb-12">
              Combine these animation components to create unique, engaging user experiences
              that stand out in the modern web landscape.
            </p>
            
            <MagneticButton
              className="bg-black text-white px-8 py-4 rounded-full font-medium"
              strength={0.3}
            >
              Get Started
            </MagneticButton>
          </div>
        </div>
      </RoundedCorners>
    </div>
  );
};

export default AnimationShowcase;