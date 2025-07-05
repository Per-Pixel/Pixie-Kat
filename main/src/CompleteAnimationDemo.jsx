import React from 'react';
import {
  ClipPathExpand,
  NavHoverEffect,
  HoverCard,
  SplitTextClipReveal,
  HeroScrollEffect,
  ScrollProgressBar,
  MagneticButton,
  TextWave,
  GradientText
} from './animations';

// Import our new components
import HoverTextButton from './animations/components/HoverTextButton';
import SlideTextButton from './animations/components/SlideTextButton';
import MetagameLayerSection from './animations/sections/MetagameLayerSection';
import DiscoverSection from './animations/sections/DiscoverSection';

// Import icons if needed
import { TiLocationArrow } from 'react-icons/ti';

const CompleteAnimationDemo = () => {
  return (
    <div className="min-h-screen">
      {/* Scroll Progress Bar */}
      <ScrollProgressBar color="#5724ff" />
      
      {/* Navigation with Hover Effect */}
      <nav className="fixed top-0 left-0 z-50 w-full bg-black/80 backdrop-blur-md p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-white text-2xl font-bold">AnimationDemo</div>
          <div className="flex items-center gap-6">
            <NavHoverEffect className="text-white">Home</NavHoverEffect>
            <NavHoverEffect className="text-white">About</NavHoverEffect>
            <NavHoverEffect className="text-white">Features</NavHoverEffect>
            <NavHoverEffect className="text-white">Contact</NavHoverEffect>
            <HoverTextButton
              title="Get Started"
              leftIcon={<TiLocationArrow />}
              containerClass="ml-4 bg-violet-300 text-white"
            />
          </div>
        </div>
      </nav>
      
      {/* Hero Section with Scroll Effect */}
      <HeroScrollEffect
        videoSrc="videos/hero-1.mp4"
        className="h-screen"
      >
        <div className="absolute left-0 top-0 z-40 size-full">
          <div className="mt-24 px-5 sm:px-10">
            <h1 className="special-font hero-heading text-blue-100">
              redefi<b>n</b>e
            </h1>

            <p className="mb-5 max-w-64 font-robert-regular text-blue-100">
              Enter the Metagame Layer <br /> Unleash the Play Economy
            </p>

            <HoverTextButton
              title="Watch Trailer"
              leftIcon={<TiLocationArrow />}
              containerClass="bg-yellow-300 text-black"
            />
          </div>
        </div>
      </HeroScrollEffect>
      
      {/* Discover Section with Image Clip Reveal */}
      <DiscoverSection 
        text="Discover\nthe\nworld's\nlargest\nshared\nadventure"
        backgroundColor="#5724ff"
        className="bg-black text-white"
        textClassName="text-white"
        description="A new dimension of play that rewards your gaming journey across platforms."
      />
      
      {/* Metagame Layer Section with Hover Cards */}
      <MetagameLayerSection 
        title="Into the Metagame Layer"
        cards={[
          {
            title: <>radia<b>n</b>t</>,
            description: "A cross-platform metagame app, turning your activities across Web2 and Web3 games into a rewarding adventure.",
            image: "videos/feature-1.mp4",
            isComingSoon: true
          },
          {
            title: <>zig<b>m</b>a</>,
            description: "An anime and gaming-inspired NFT collection - the IP foundation of the Zentry universe.",
            image: "videos/feature-2.mp4",
            isComingSoon: true
          },
          {
            title: <>az<b>u</b>l</>,
            description: "A cross-world AI Agent - elevating your gameplay to be more fun and productive.",
            image: "videos/feature-3.mp4",
            isComingSoon: true
          }
        ]}
      />
      
      {/* Clip Path Expand Section */}
      <section className="bg-black py-16">
        <div className="text-center text-white mb-8">
          <h2 className="text-3xl font-bold mb-2">Clip Path Expansion</h2>
          <p className="text-gray-400">Scroll down to see the effect</p>
        </div>
        
        <ClipPathExpand
          backgroundColor="bg-violet-300"
          initialSize="64"
          options={{
            start: "top center",
            end: "+=600 center",
            scrub: 0.3
          }}
        >
          <div className="flex h-full w-full flex-col items-center justify-center text-white">
            <h3 className="text-4xl font-bold mb-4">Immersive Content</h3>
            <p className="max-w-md text-center text-xl">
              Create dramatic reveals with expanding clip paths that capture attention
              and create memorable experiences.
            </p>
          </div>
        </ClipPathExpand>
      </section>
      
      {/* Gradient Text Section */}
      <section className="py-32 bg-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <GradientText
            tag="h2"
            colors={["#5724ff", "#a065ff", "#edff66", "#5724ff"]}
            className="text-5xl font-bold mb-8"
          >
            Modern Animation Collection
          </GradientText>
          
          <p className="text-xl text-gray-700 mb-12">
            A comprehensive library of animation components for creating engaging web experiences.
            Easily integrate these effects into your React projects.
          </p>
          
          <HoverTextButton
            title="Explore More"
            containerClass="bg-black text-white px-8 py-4 text-lg"
          />
        </div>
      </section>
      
      {/* Button Animations Section */}
      <section className="py-16 bg-gray-100">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-8">Button Animations</h2>
          <p className="text-xl text-gray-700 mb-12">
            Compare different button animation styles
          </p>
          
          <div className="flex flex-wrap justify-center gap-6">
            <SlideTextButton
              title="Slide Text Button"
              leftIcon={<TiLocationArrow />}
              containerClass="bg-yellow-300 text-black"
            />
            
            <HoverTextButton
              title="Hover Text Button"
              leftIcon={<TiLocationArrow />}
              containerClass="bg-violet-300 text-white"
            />
            
            <MagneticButton
              className="bg-blue-500 text-white px-7 py-3 rounded-full"
            >
              Magnetic Button
            </MagneticButton>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CompleteAnimationDemo;


