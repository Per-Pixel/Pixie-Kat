import clsx from "clsx";
import gsap from "gsap";
import { useWindowScroll } from "react-use";
import { useEffect, useRef, useState } from "react";
import { TiLocationArrow } from "react-icons/ti";
import { Link, useLocation } from "react-router-dom";

import Button from "./Button";
import DropdownMenu from "./DropdownMenu"; // We'll create this component

const navItems = [
  { name: "Games", path: "/games" },
  { name: "Pricing", path: "/pricing" },
  { name: "How It Works", path: "/how-it-works" },
  { name: "FAQ", path: "/faq" },
  { name: "Support", path: "/support" }
];

const NavBar = () => {
  // State for toggling audio and visual indicator
  const [isAudioPlaying, setIsAudioPlaying] = useState(true); // Default to true for autoplay
  const [isIndicatorActive, setIsIndicatorActive] = useState(true); // Default to true for visual indicator
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Add state for menu
  const [isMuted, setIsMuted] = useState(true); // Start muted to help with autoplay

  // Refs for audio and navigation container
  const audioElementRef = useRef(null);
  const navContainerRef = useRef(null);

  // Get current location for active nav highlighting
  const location = useLocation();

  const { y: currentScrollY } = useWindowScroll();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Toggle audio and visual indicator
  const toggleAudioIndicator = () => {
    setIsAudioPlaying((prev) => !prev);
    setIsIndicatorActive((prev) => !prev);
  };

  // Toggle menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Initialize audio on component mount with multiple attempts
  useEffect(() => {
    if (!audioElementRef.current) return;
    
    // Set initial volume to 50%
    audioElementRef.current.volume = 0.5;
    // Start muted to bypass autoplay restrictions
    audioElementRef.current.muted = true;
    
    // Function to attempt playback
    const attemptPlay = () => {
      audioElementRef.current.play()
        .then(() => {
          console.log("Audio playback started successfully (muted)");
          // After successful play, try to unmute
          setTimeout(() => {
            audioElementRef.current.muted = false;
            setIsMuted(false);
            setIsAudioPlaying(true);
            setIsIndicatorActive(true);
          }, 1000);
        })
        .catch(error => {
          console.log("Autoplay prevented:", error);
          // Try again with user interaction
          const resumeAudio = () => {
            // Unmute and play
            audioElementRef.current.muted = false;
            setIsMuted(false);
            audioElementRef.current.play()
              .then(() => {
                console.log("Audio playback started after user interaction");
                setIsAudioPlaying(true);
                setIsIndicatorActive(true);
                // Remove the event listeners once successful
                document.removeEventListener('click', resumeAudio);
                document.removeEventListener('touchstart', resumeAudio);
                document.removeEventListener('keydown', resumeAudio);
              })
              .catch(e => console.log("Still couldn't play:", e));
          };
          
          // Add event listeners for user interaction
          document.addEventListener('click', resumeAudio, { once: true });
          document.addEventListener('touchstart', resumeAudio, { once: true });
          document.addEventListener('keydown', resumeAudio, { once: true });
        });
    };
    
    // Try to play immediately
    attemptPlay();
    
    // Also try after a short delay (sometimes helps)
    setTimeout(attemptPlay, 500);
    
    // Try again after page has fully loaded
    window.addEventListener('load', attemptPlay);
    
    return () => {
      window.removeEventListener('load', attemptPlay);
    };
  }, []);

  // Manage audio playback
  useEffect(() => {
    if (isAudioPlaying) {
      audioElementRef.current.play().catch(e => console.log("Play error:", e));
    } else {
      audioElementRef.current.pause();
    }
  }, [isAudioPlaying]);

  // Handle tab visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden, pause audio
        if (audioElementRef.current) {
          audioElementRef.current.pause();
        }
      } else {
        // Tab is visible again, resume audio if it was playing before
        if (isAudioPlaying && audioElementRef.current) {
          audioElementRef.current.play().catch(e => console.log("Resume error:", e));
        }
      }
    };

    // Add event listener for visibility change
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Clean up
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAudioPlaying]);

  useEffect(() => {
    if (currentScrollY === 0) {
      // Topmost position: show navbar without floating-nav
      setIsNavVisible(true);
      navContainerRef.current.classList.remove("floating-nav");
    } else if (currentScrollY > lastScrollY) {
      // Scrolling down: hide navbar and apply floating-nav
      setIsNavVisible(false);
      navContainerRef.current.classList.add("floating-nav");
    } else if (currentScrollY < lastScrollY) {
      // Scrolling up: show navbar with floating-nav
      setIsNavVisible(true);
      navContainerRef.current.classList.add("floating-nav");
    }

    setLastScrollY(currentScrollY);
  }, [currentScrollY, lastScrollY]);

  useEffect(() => {
    gsap.to(navContainerRef.current, {
      y: isNavVisible ? 0 : -100,
      opacity: isNavVisible ? 1 : 0,
      duration: 0.2,
    });
  }, [isNavVisible]);

  return (
    <div
      ref={navContainerRef}
      className="fixed inset-x-0 top-4 z-[100] h-16 border-none transition-all duration-700 sm:inset-x-6"
    >
      <header className="absolute top-1/2 w-full -translate-y-1/2">
        <nav className="flex size-full items-center justify-between p-4">
          {/* Logo and Menu button */}
          <div className="flex items-center gap-7">
            <Link to="/" className="flex items-center">
              <img src="/img/logo.png" alt="PixieKat Logo" className="w-10" />
              <span className="ml-2 text-white font-bold text-xl hidden sm:block">PixieKat</span>
            </Link>

            <Button
              id="product-button"
              title="Menu"
              rightIcon={<TiLocationArrow />}
              containerClass="bg-blue-50 flex items-center justify-center gap-1"
              onClick={toggleMenu}
            />

          </div>

          {/* Navigation Links and Audio Button */}
          <div className="flex h-full items-center">
            <div className="hidden md:block">
              {navItems.map((item, index) => (
                <Link
                  key={index}
                  to={item.path}
                  className={`nav-hover-btn ${
                    location.pathname === item.path
                      ? 'text-neon-purple border-b-2 border-neon-purple'
                      : 'text-white hover:text-neon-purple'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {/* Login Button */}
            <Link to="/login" className="ml-6">
              <Button
                title="Login"
                containerClass="bg-neon-purple hover:bg-neon-purple/80 text-black py-2 px-4 rounded-md transition-colors duration-200"
              />
            </Link>

            <button
              onClick={toggleAudioIndicator}
              className="ml-4 flex items-center space-x-0.5"
            >
              <audio
                ref={audioElementRef}
                className="hidden"
                src="/audio/loop.mp3"
                loop
                preload="auto"
                muted={isMuted}
              />
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={clsx("indicator-line", {
                    active: isIndicatorActive,
                  })}
                  style={{
                    animationDelay: `${bar * 0.1}s`,
                  }}
                />
              ))}
            </button>
          </div>
        </nav>
      </header>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <DropdownMenu 
          onClose={() => {
            setTimeout(() => {
              setIsMenuOpen(false);
            }, 500);
          }} 
        />
      )}
    </div>
  );
};

export default NavBar;












