import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { motion, AnimatePresence } from "framer-motion";

const Loading = ({ 
  onComplete, 
  heroRef,
  heroContainerRef
}: { 
  onComplete: () => void,
  heroRef: React.RefObject<HTMLElement>,
  heroContainerRef: React.RefObject<HTMLDivElement>
}) => {
  const counterRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const circleTopRef = useRef<HTMLDivElement>(null);
  const circleBottomRef = useRef<HTMLDivElement>(null);
  const centerImageRef = useRef<HTMLDivElement>(null);
  const pixiekatRef = useRef<HTMLDivElement>(null); // NEW - Pixiekat Text

  const [countComplete, setCountComplete] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  // Define the images array
  const images = [
    "/img/loading/1.jpg",  // Eye/face close-up
    "/img/loading/2.jpg",  // Black and white architectural
    "/img/loading/3.jpg",  // Person walking
    "/img/loading/4.jpg",  // Green leaf/glass
    "/img/loading/5.jpg",  // Red abstract
    "/img/loading/6.jpg",  // Blue/teal abstract
    "/img/loading/7.jpg",  // Purple crystals/stones
    "/img/loading/8.jpg",  // Bottle/product shot
    "/img/loading/9.jpg"   // Green abstract
  ];

  useEffect(() => {
    setWindowWidth(window.innerWidth || 1024);
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getExitDistance = () => {
    if (windowWidth < 640) return "-50vw"; 
    if (windowWidth < 1024) return "-70vw"; 
    return "-120vw"; 
  };

  useEffect(() => {
    if (heroRef.current && heroContainerRef.current) {
      gsap.set(heroContainerRef.current, { opacity: 0 });
    }
  }, [heroRef, heroContainerRef]);

  useEffect(() => {
    const counter = counterRef.current;
    const gallery = galleryRef.current;
    
    if (!counter || !gallery) return;

    // Set initial state - all images grayscale
    const figures = Array.from(gallery.children);
    figures.forEach(figure => {
      figure.classList.add('grayscale');
    });

    // Counter Animation
    const countTl = gsap.timeline({ delay: 0.1 });
    
    countTl.to(counter, {
      duration: 1.5,
      innerText: 100,
      snap: { innerText: 1 },
      ease: "power2.inOut",
      onUpdate: () => {
        if (counter) {
          const currentValue = parseInt(counter.innerText || "0");
          counter.innerText = String(currentValue).padStart(3, "0") + "%";

          // Color reveal logic
          if (gallery) {
            const figures = Array.from(gallery.children);
            const middleIndex = Math.floor(figures.length / 2);
            const progress = currentValue / 100;
            
            // Calculate how many images to reveal
            const totalToReveal = Math.ceil(figures.length * progress);
            const halfToReveal = Math.floor(totalToReveal / 2);

            figures.forEach((figure, index) => {
              const distanceFromMiddle = Math.abs(index - middleIndex);
              if (distanceFromMiddle <= halfToReveal) {
                figure.classList.add('reveal-color');
                figure.classList.remove('grayscale');
              }
            });
          }
        }
      },
      onComplete: () => {
        setCountComplete(true);

        const timeline = gsap.timeline({
          defaults: { duration: 1.8, ease: "expo.inOut" }
        });

        if (galleryRef.current && circleTopRef.current && circleBottomRef.current) {
          const centerImage = galleryRef.current.children[4];

          timeline
            .to(galleryRef.current, {
              scale: 1,
              duration: 1.5
            })
            .to(centerImage, {
              width: '100vw',
              height: '100vh',
              duration: 1.5
            }, 0)
            .to(circleTopRef.current, {
              yPercent: -100,
              duration: 1.2
            }, 0)
            .to(circleBottomRef.current, {
              yPercent: 100,
              duration: 1.2
            }, 0)
            .to(pixiekatRef.current, { // NEW - Pixiekat Text Scaling
              scale: 10,
              opacity: 0,
              duration: 1.2
            }, "-=1.2") 
            .then(() => {
              if (heroContainerRef.current) {
                gsap.to(heroContainerRef.current, {
                  opacity: 1,
                  duration: 0.5,
                  onComplete: () => {
                    onComplete();
                  }
                });
              } else {
                onComplete();
              }
            });
        } else {
          setTimeout(onComplete, 1000);
        }
      }
    });

    return () => {
      countTl.kill();
    };
  }, [onComplete, heroRef, heroContainerRef]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (backgroundRef.current) {
        onComplete();
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onComplete]);

  // Add this useEffect to prevent scrolling while loading is active
  useEffect(() => {
    // Disable scrolling on mount
    document.body.style.overflow = 'hidden';
    
    // Re-enable scrolling on cleanup
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  return (
    <div 
      ref={backgroundRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#10061E',
        zIndex: 99999,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div className="loader_wrapper" style={{ overflow: 'hidden' }}>
        {/* Circles positioned first in DOM but with lower z-index */}
        <div ref={circleTopRef} className="loader_circle loader_circle-top" />
        <div ref={circleBottomRef} className="loader_circle loader_circle-bottom" />

        {/* Pixiekat Text with adjusted z-index */}
        <div 
          ref={pixiekatRef} 
          className="absolute inset-0 flex items-center justify-center text-yellow-200 text-[50px] md:text-[80px] font-bold pixiekat-text pointer-events-none"
          style={{ 
            zIndex: 9997,
            textShadow: '0 4px 8px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.3)'
          }}
        >
          PIXIEKAT
        </div>

        {/* Gallery with adjusted positioning */}
        <div 
          ref={galleryRef} 
          className="loader_gallery"
          style={{ overflow: 'hidden' }}
        >
          {images.map((src, index) => (
            <div 
              key={index} 
              className={`loader_gallery_figure grayscale ${index === 4 ? 'center-image' : ''}`}
              ref={index === 4 ? centerImageRef : null}
              style={{
                boxShadow: '0 4px 30px rgba(0, 0, 0, 0.4)',
                overflow: 'hidden'
              }}
            >
              <img
                src={src}
                alt=""
                className="loader_gallery_image"
                style={{
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.5))',
                  pointerEvents: 'none'
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Counter with highest z-index */}
      <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12 z-[9999]">
        <AnimatePresence mode="wait">
          {!countComplete ? (
            <motion.div
              key="counter"
              exit={{
                x: getExitDistance(),
                opacity: 0,
                transition: { 
                  duration: 1.2,
                  ease: "easeInOut"
                }
              }}
              className="counter-container"
            >
              <div 
                ref={counterRef}
                className="text-[60px] md:text-[80px] font-black text-white"
                style={{
                  textShadow: "0 0 10px rgba(255,255,255,0.5)",
                  position: "relative",
                  zIndex: 9999
                }}
              >
                000%
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0 }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Loading;
