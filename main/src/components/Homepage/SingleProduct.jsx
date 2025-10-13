import React, { useRef, useState, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SlideTextButton from "../../animations/components/SlideTextButton";
import AnimatedTitle from "../../components/AnimatedTitle";
import { TiLocationArrow } from "react-icons/ti";
import { useImageReveal } from "../../animations/hooks/useImageReveal";

gsap.registerPlugin(ScrollTrigger);

const SingleProduct = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const overlayRef = useRef(null);
  const shapeRef = useRef(null);
  const buttonRef = useRef(null);
  const titleRef = useRef(null);
  
  // Use image reveal animation
  useImageReveal(imageRef, overlayRef, {
    duration: 1.5,
  });
  
  // Handle image loading
  useEffect(() => {
    if (imageRef.current) {
      const img = imageRef.current;
      if (img.complete) {
        setIsLoaded(true);
      } else {
        img.onload = () => setIsLoaded(true);
      }
    }
    
    // Ensure ScrollTrigger is refreshed
    ScrollTrigger.refresh();
    
    return () => {
      // Clean up any animations when component unmounts
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);
  
  // Animate gradient text
  useEffect(() => {
    if (!titleRef.current) return;
    
    gsap.to(titleRef.current, {
      backgroundPosition: "200% center",
      duration: 8,
      repeat: -1,
      ease: "linear"
    });
  }, []);
  
  useGSAP(() => {
    if (!isLoaded) return;
    
    // Animate text elements
    gsap.from(".product-text > *", {
      y: 50,
      opacity: 0,
      stagger: 0.2,
      duration: 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 70%",
      }
    });
    
    // Animate shape on scroll
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top bottom",
        end: "bottom top",
        scrub: 1,
        markers: false, // Remove markers for production
      }
    });
    
    tl.fromTo(
      shapeRef.current,
      {
        clipPath: "polygon(18% 32%, 94% 11%, 89% 74%, 3% 80%)",
        WebkitClipPath: "polygon(18% 32%, 94% 11%, 89% 74%, 3% 80%)"
      },
      {
        clipPath: "polygon(24% 35%, 94% 11%, 91% 79%, 5% 75%)",
        WebkitClipPath: "polygon(24% 35%, 94% 11%, 91% 79%, 5% 75%)",
        ease: "power1.inOut",
      }
    );
    
  }, { scope: containerRef, dependencies: [isLoaded] });



export default SingleProduct;
