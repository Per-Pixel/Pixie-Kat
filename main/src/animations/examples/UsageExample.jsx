import React from 'react';
import {
  AnimatedTitle,
  ClipPathExpand,
  VideoFrame,
  HoverEffect3D,
  VideoTransition
} from '../index';

// Import the animation styles
import '../styles/animations.css';

const UsageExample = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <h1 className="mb-12 text-center text-4xl font-bold">Animation Components Demo</h1>
        
        {/* Section 1: Animated Title */}
        <section className="mb-24">
          <h2 className="mb-8 text-center text-2xl font-semibold">Animated Title</h2>
          <div className="rounded-lg bg-white p-8 shadow-lg">
            <AnimatedTitle 
              title="Welcome to <b>GSAP</b> <br /> Animation Components" 
              containerClass="text-center text-3xl font-bold" 
            />
          </div>
        </section>
        
        {/* Section 2: Clip Path Expand */}
        <section className="mb-24">
          <h2 className="mb-8 text-center text-2xl font-semibold">Clip Path Expand</h2>
          <div className="h-screen">
            <ClipPathExpand 
              id="demo-clip" 
              options={{
                start: "top center",
                end: "+=400 center",
                scrub: 0.3
              }}
              className="bg-blue-500"
            >
              <div className="flex h-full w-full flex-col items-center justify-center text-white">
                <h3 className="text-2xl font-bold">Expanding Content</h3>
                <p className="mt-2">Scroll to see the animation</p>
              </div>
            </ClipPathExpand>
          </div>
        </section>
        
        {/* Section 3: Video Frame */}
        <section className="mb-24">
          <h2 className="mb-8 text-center text-2xl font-semibold">Video Frame Animation</h2>
          <VideoFrame 
            id="demo-video" 
            videoSrc="/videos/hero-1.mp4" 
            options={{
              start: "top bottom",
              end: "center center"
            }}
          />
        </section>
        
        {/* Section 4: 3D Hover Effect */}
        <section className="mb-24">
          <h2 className="mb-8 text-center text-2xl font-semibold">3D Hover Effect</h2>
          <div className="flex justify-center">
            <HoverEffect3D 
              className="bg-gradient-to-r from-purple-500 to-indigo-600"
              contentClassName="text-white"
            >
              <h3 className="mb-4 text-2xl font-bold">Interactive Card</h3>
              <p className="text-center">
                Hover over this card to see the 3D effect
              </p>
              <button className="mt-6 rounded-full bg-white px-6 py-2 font-semibold text-purple-600 transition hover:bg-gray-100">
                Learn More
              </button>
            </HoverEffect3D>
          </div>
        </section>
        
        {/* Section 5: Video Transition */}
        <section className="mb-24">
          <h2 className="mb-8 text-center text-2xl font-semibold">Video Transition</h2>
          <div className="flex justify-center">
            <VideoTransition 
              videos={[
                "/videos/hero-0.mp4",
                "/videos/hero-1.mp4",
                "/videos/hero-2.mp4"
              ]}
              className="h-[500px] w-[800px]"
            />
          </div>
        </section>
      </div>
    </div>
  );
};

export default UsageExample;