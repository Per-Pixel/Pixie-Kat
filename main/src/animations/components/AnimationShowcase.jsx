import AnimatedTitle from "./AnimatedTitle";
import ClipPathExpand from "./ClipPathExpand";
import VideoFrame from "./VideoFrame";
import HoverEffect3D from "./HoverEffect3D";
import VideoTransition from "./VideoTransition";

const AnimationShowcase = () => {
  return (
    <div className="min-h-screen w-screen">
      <section className="py-20 text-center">
        <h1 className="mb-10 text-4xl font-bold">GSAP Animation Components</h1>
        <p className="mx-auto mb-20 max-w-2xl">
          A collection of reusable scroll and interaction animations built with GSAP
        </p>
        
        <div className="mb-32">
          <h2 className="mb-10 text-2xl font-bold">Animated Title Reveal</h2>
          <AnimatedTitle 
            title="Anim<b>a</b>ted Text <br /> with Sc<b>r</b>oll Reveal" 
            containerClass="mt-5 text-center" 
          />
        </div>
        
        <div className="mb-32">
          <h2 className="mb-10 text-2xl font-bold">Clip Path Expansion</h2>
          <ClipPathExpand />
        </div>
        
        <div className="mb-32">
          <h2 className="mb-10 text-2xl font-bold">Video Frame Animation</h2>
          <VideoFrame />
        </div>
        
        <div className="mb-32">
          <h2 className="mb-10 text-2xl font-bold">3D Hover Effect</h2>
          <HoverEffect3D />
        </div>
        
        <div className="mb-32">
          <h2 className="mb-10 text-2xl font-bold">Video Transition</h2>
          <VideoTransition />
        </div>
      </section>
    </div>
  );
};

export default AnimationShowcase;