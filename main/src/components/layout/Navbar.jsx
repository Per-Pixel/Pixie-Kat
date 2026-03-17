import clsx from "clsx";
import gsap from "gsap";
import { useWindowScroll } from "react-use";
import { useEffect, useRef, useState } from "react";
import { TiLocationArrow } from "react-icons/ti";
import { Plus, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import Button from "../common/Button";
import DropdownMenu from "../common/DropdownMenu";

const navItems = [
  { name: "Games", path: "/games" },
  { name: "Pricing", path: "/pricing" },
  { name: "How It Works", path: "/how-it-works" },
  { name: "FAQ", path: "/faq" },
  { name: "Support", path: "/support" }
];

const darkTextTopRoutes = ["/games", "/pricing", "/support"];

const NavBar = () => {
  const { isAuthenticated } = useAuth();
  const [isAudioPlaying, setIsAudioPlaying] = useState(true);
  const [isIndicatorActive, setIsIndicatorActive] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const audioElementRef = useRef(null);
  const navContainerRef = useRef(null);
  const location = useLocation();

  const { y: currentScrollY } = useWindowScroll();
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const useDarkTextAtTop =
    currentScrollY === 0 &&
    darkTextTopRoutes.some((route) => location.pathname.startsWith(route));

  const navTextColorClass = useDarkTextAtTop ? "text-black" : "text-white";
  const navActiveBorderClass = useDarkTextAtTop ? "border-black" : "border-white";
  const authPanelClass = useDarkTextAtTop
    ? "bg-white/95 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
    : "bg-white/90 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.22)]";

  const toggleAudioIndicator = () => {
    setIsAudioPlaying((prev) => !prev);
    setIsIndicatorActive((prev) => !prev);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    if (!audioElementRef.current) return;

    audioElementRef.current.volume = 0.5;
    audioElementRef.current.muted = true;

    const attemptPlay = () => {
      audioElementRef.current.play()
        .then(() => {
          setTimeout(() => {
            audioElementRef.current.muted = false;
            setIsMuted(false);
            setIsAudioPlaying(true);
            setIsIndicatorActive(true);
          }, 1000);
        })
        .catch(() => {
          const resumeAudio = () => {
            audioElementRef.current.muted = false;
            setIsMuted(false);
            audioElementRef.current.play()
              .then(() => {
                setIsAudioPlaying(true);
                setIsIndicatorActive(true);
                document.removeEventListener('click', resumeAudio);
                document.removeEventListener('touchstart', resumeAudio);
                document.removeEventListener('keydown', resumeAudio);
              })
              .catch(() => {});
          };

          document.addEventListener('click', resumeAudio, { once: true });
          document.addEventListener('touchstart', resumeAudio, { once: true });
          document.addEventListener('keydown', resumeAudio, { once: true });
        });
    };

    attemptPlay();
    setTimeout(attemptPlay, 500);
    window.addEventListener('load', attemptPlay);

    return () => {
      window.removeEventListener('load', attemptPlay);
    };
  }, []);

  useEffect(() => {
    if (isAudioPlaying) {
      audioElementRef.current.play().catch(() => {});
    } else {
      audioElementRef.current.pause();
    }
  }, [isAudioPlaying]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (audioElementRef.current) {
          audioElementRef.current.pause();
        }
      } else if (isAudioPlaying && audioElementRef.current) {
        audioElementRef.current.play().catch(() => {});
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAudioPlaying]);

  useEffect(() => {
    if (currentScrollY === 0) {
      setIsNavVisible(true);
      navContainerRef.current.classList.remove("floating-nav");
    } else if (currentScrollY > lastScrollY) {
      setIsNavVisible(false);
      navContainerRef.current.classList.add("floating-nav");
    } else if (currentScrollY < lastScrollY) {
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
          <div className="flex items-center gap-7">
            <Link to="/" className="flex items-center">
              <img src="/img/logo.png" alt="PixieKat Logo" className="w-10" />
              <span
                className={clsx(
                  "ml-2 hidden text-xl font-bold sm:block",
                  useDarkTextAtTop ? "text-black" : "text-white"
                )}
              >
                PixieKat
              </span>
            </Link>

            <Button
              id="product-button"
              title="Menu"
              rightIcon={<TiLocationArrow />}
              containerClass="hidden bg-blue-50 items-center justify-center gap-1 md:flex"
              onClick={toggleMenu}
            />
          </div>

          <div className="flex h-full items-center">
            <div className="hidden md:block">
              {navItems.map((item, index) => (
                <Link
                  key={index}
                  to={item.path}
                  className={`nav-hover-btn ${
                    location.pathname === item.path
                      ? `${navTextColorClass} border-b-2 ${navActiveBorderClass}`
                      : `${navTextColorClass} hover:text-neon-purple`
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {!isAuthenticated ? (
              <Link to="/login" className="ml-6">
                <Button
                  title="Login"
                  containerClass="bg-neon-purple hover:bg-neon-purple/80 rounded-md px-4 py-2 text-black transition-colors duration-200"
                />
              </Link>
            ) : (
              <div className="ml-6 flex items-center gap-3">
                <Link
                  to="/games/mobile-legends/add-money"
                  className={clsx(
                    "flex h-11 items-center gap-2 rounded-full border border-slate-200/80 px-2.5 backdrop-blur-md transition-all duration-300 ease-in-out hover:-translate-y-0.5",
                    authPanelClass
                  )}
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-700">
                    PKS
                  </span>
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-violet-100 px-2 text-xs font-semibold text-violet-700">
                    0
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </Link>

                <button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-violet-200 via-white to-violet-400 text-violet-700 shadow-[0_10px_25px_rgba(168,85,247,0.35)] transition-all duration-300 ease-in-out hover:-translate-y-0.5"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 backdrop-blur">
                    <UserRound className="h-4 w-4" />
                  </span>
                </button>
              </div>
              )}

            <button
              type="button"
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

      {isMenuOpen ? (
        <DropdownMenu
          onClose={() => {
            setTimeout(() => {
              setIsMenuOpen(false);
            }, 500);
          }}
        />
      ) : null}
    </div>
  );
};

export default NavBar;
