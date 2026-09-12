import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { TiLocationArrow } from "react-icons/ti";
import { createPortal } from 'react-dom';

import { useAuth } from '../../contexts/AuthContext';
import { publicMediaUrl } from '../../lib/supabase';
import SlideTextButton from "../../animations/components/SlideTextButton";
import { useReducedMotion } from '../../hooks/useReducedMotion';

const menuItems = [
  { title: 'Home', path: '/' },
  { title: 'Games', path: '/games' },
  { title: 'Pricing', path: '/pricing' },
  { title: 'How It Works', path: '/how-it-works' },
  { title: 'FAQ', path: '/faq' },
  { title: 'Support', path: '/support' }
];

const cardData = [
  {
    id: 'home',
    title: 'Welcome to PixieKat',
    description: 'Your trusted gaming top-up partner',
    path: '/',
    image: publicMediaUrl('/videos/feature-1.mp4'),
    buttonText: 'Get Started',
    gradient: 'from-violet-500 to-blue-500'
  },
  {
    id: 'games',
    title: 'Popular Games',
    description: 'Top up MLBB, PUBG, Free Fire & more',
    path: '/games',
    image: publicMediaUrl('/videos/feature-2.mp4'),
    buttonText: 'Browse Games',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'pricing',
    title: 'Membership Plans',
    description: 'Get exclusive benefits and bonuses',
    path: '/pricing',
    image: publicMediaUrl('/videos/feature-3.mp4'),
    buttonText: 'View Plans',
    gradient: 'from-cyan-500 to-pink-500'
  },
  {
    id: 'howitworks',
    title: 'How It Works',
    description: 'Simple 5-step process for instant top-ups',
    path: '/how-it-works',
    image: publicMediaUrl('/videos/feature-4.mp4'),
    buttonText: 'Learn More',
    gradient: 'from-pink-500 to-violet-500'
  },
  {
    id: 'faq',
    title: 'FAQ',
    description: 'Find answers to common questions',
    path: '/faq',
    image: publicMediaUrl('/videos/feature-5.mp4'),
    buttonText: 'Read FAQ',
    gradient: 'from-violet-500 to-blue-500'
  },
  {
    id: 'support',
    title: 'Customer Support',
    description: '24/7 support via WhatsApp & more',
    path: '/support',
    image: publicMediaUrl('/videos/feature-1.mp4'),
    buttonText: 'Get Help',
    gradient: 'from-blue-500 to-cyan-500'
  }
];

const DropdownMenu = ({ onClose }) => {
  const [activeCard, setActiveCard] = useState('home');
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const reduced = useReducedMotion();

  useEffect(() => {
    const menu = menuRef.current;

    if (reduced) {
      gsap.set(menu, { y: 0, opacity: 1 });
      return;
    }

    gsap.set(menu, {
      y: '-100%',
      opacity: 1
    });

    gsap.to(menu, {
      y: 0,
      duration: 0.6,
      ease: 'power3.out'
    });

    gsap.fromTo(
      menu.children,
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, delay: 0.3, stagger: 0.1, ease: 'power2.out' }
    );

    const handleClickOutside = (e) => {
      if (menu && !menu.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose, reduced]);

  const handleMenuItemHover = (id) => {
    const formattedId = id.toLowerCase().replace(/\s+/g, '').replace(/it/g, '');
    setActiveCard(formattedId);
  };

  const currentCard = cardData.find(card => card.id === activeCard) || cardData[0];

  const handleClose = () => {
    if (reduced) {
      onClose();
      return;
    }
    const menu = menuRef.current;

    gsap.to(menu, {
      y: '-100%',
      duration: 0.5,
      ease: 'power2.in',
      onComplete: onClose
    });
  };

  return createPortal(
    <div
      ref={menuRef}
      className="fixed inset-0 z-[1000] m-0 overflow-hidden bg-black/90 p-0 backdrop-blur-lg"
      style={{
        height: '100vh',
        width: '100vw',
        margin: 0,
        padding: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <div className="m-0 flex size-full p-0">
        <div className="w-full overflow-y-auto border-r border-white/10 p-6 sm:p-10 lg:w-1/3 lg:p-16">
          <h2 className="mb-8 text-3xl font-bold text-white lg:mb-12 lg:text-4xl">Menu</h2>
          <ul className="space-y-5 lg:space-y-8">
            {menuItems.map((item) => (
              <li key={item.title}>
                <Link
                  to={item.path}
                  className="group flex items-center gap-3 text-xl text-white/70 transition-colors duration-300 hover:text-white lg:text-2xl"
                  onMouseEnter={() => handleMenuItemHover(item.title)}
                  onClick={handleClose}
                >
                  <span className="h-0.5 w-0 bg-violet-500 transition-all duration-300 group-hover:w-4"></span>
                  {item.title}
                </Link>
              </li>
            ))}

            {!isAuthenticated ? (
              <li>
                <Link
                  to="/login"
                  className="group flex items-center gap-3 text-xl text-white/70 transition-colors duration-300 hover:text-white lg:text-2xl"
                  onClick={handleClose}
                >
                  <span className="h-0.5 w-0 bg-violet-500 transition-all duration-300 group-hover:w-4"></span>
                  Login
                </Link>
              </li>
            ) : null}
          </ul>
        </div>

        <div className="hidden w-2/3 p-16 lg:block">
          <div className="relative h-full overflow-hidden rounded-lg">
            <div className={`absolute inset-0 bg-gradient-to-br ${currentCard.gradient} opacity-80`}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>

            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <div className="text-9xl">Game</div>
            </div>

            <div className="absolute bottom-0 left-0 w-full p-16">
              <h3 className="mb-4 text-5xl font-bold text-white">{currentCard.title}</h3>
              <p className="mb-8 text-xl text-white/80">{currentCard.description}</p>
              <SlideTextButton
                title={currentCard.buttonText}
                leftIcon={<TiLocationArrow />}
                containerClass="bg-white text-sm py-3 px-8 text-violet-600 flex-center gap-2 hover:bg-gray-100 transition-colors duration-200"
                onClick={() => {
                  handleClose();
                  navigate(currentCard.path);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="absolute right-8 top-8 text-white/70 hover:text-white"
        onClick={handleClose}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>,
    document.body
  );
};

export default DropdownMenu;
