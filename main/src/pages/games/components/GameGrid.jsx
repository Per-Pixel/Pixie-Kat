import { useState } from 'react';
import { motion } from 'framer-motion';
import GameDetailsModal from './GameDetailsModal';

const GameGrid = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGameForModal, setSelectedGameForModal] = useState(null);
  const [showAllGames, setShowAllGames] = useState(false);

  const fallbackGameImage = '/img/games/mobile-legends.webp';

  const allGames = [
    {
      id: 'mobile-legends',
      name: 'Mobile Legends',
      subtitle: 'Mobile Legends',
      image: '/img/games/mobile-legends.webp',
      icon: 'M',
      bgColor: 'from-blue-400 to-blue-600',
    },
    {
      id: 'honor-of-kings',
      name: 'Honor Of Kings',
      subtitle: 'Honor Of Kings',
      image: '/img/games/honor-of-kings.jpg',
      icon: 'H',
      bgColor: 'from-yellow-400 to-amber-600',
    },
    {
      id: 'pubg-global',
      name: 'PUBG Global',
      subtitle: 'PUBG Global',
      image: '/img/games/honor-of-kings.jpg',
      icon: 'P',
      bgColor: 'from-orange-400 to-red-500',
    },
    {
      id: 'genshin-impact',
      name: 'Genshin Impact',
      subtitle: 'Genshin Impact',
      image: '/img/games/mobile-legends.webp',
      icon: 'G',
      bgColor: 'from-purple-400 to-pink-500',
    },
    {
      id: 'clash-of-clans',
      name: 'Clash of Clans',
      subtitle: 'Clash Of Clans',
      image: '/img/games/honor-of-kings.jpg',
      icon: 'C',
      bgColor: 'from-yellow-400 to-orange-500',
    },
    {
      id: 'honkai-star-rail',
      name: 'Honkai: Star Rail',
      subtitle: 'Honkai Star Rail',
      image: '/img/games/mobile-legends.webp',
      icon: 'H',
      bgColor: 'from-indigo-400 to-purple-500',
    },
    {
      id: 'clash-royale',
      name: 'Clash Royale',
      subtitle: 'Clash Royale',
      image: '/img/games/honor-of-kings.jpg',
      icon: 'R',
      bgColor: 'from-red-400 to-pink-500',
    },
    {
      id: 'farlight-84',
      name: 'Farlight 84',
      subtitle: 'Farlight 84',
      image: '/img/games/mobile-legends.webp',
      icon: 'F',
      bgColor: 'from-green-400 to-teal-500',
    },
    {
      id: 'free-fire',
      name: 'Free Fire',
      subtitle: 'Free Fire',
      image: '/img/games/honor-of-kings.jpg',
      icon: 'F',
      bgColor: 'from-red-500 to-orange-500',
    },
    {
      id: 'call-of-duty',
      name: 'Call of Duty',
      subtitle: 'Call Of Duty',
      image: '/img/games/mobile-legends.webp',
      icon: 'C',
      bgColor: 'from-gray-600 to-gray-800',
    },
    {
      id: 'valorant',
      name: 'Valorant',
      subtitle: 'Valorant',
      image: '/img/games/honor-of-kings.jpg',
      icon: 'V',
      bgColor: 'from-red-600 to-pink-600',
    },
    {
      id: 'apex-legends',
      name: 'Apex Legends',
      subtitle: 'Apex Legends',
      image: '/img/games/mobile-legends.webp',
      icon: 'A',
      bgColor: 'from-orange-500 to-red-600',
    },
    {
      id: 'fortnite',
      name: 'Fortnite',
      subtitle: 'Fortnite',
      image: '/img/games/honor-of-kings.jpg',
      icon: 'F',
      bgColor: 'from-purple-500 to-blue-500',
    },
  ];

  const games = showAllGames ? allGames : allGames.slice(0, 7);

  const handleGameClick = (game) => {
    setSelectedGameForModal(game);
    setIsModalOpen(true);
  };

  const handleSeeAllClick = () => {
    setShowAllGames(!showAllGames);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 30,
      scale: 0.9,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  };

  return (
    <div className="py-8 md:py-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex items-center mb-8 md:mb-12"
        >
          <div className="text-xl md:text-2xl font-bold text-black flex items-center">
            <span className="mr-3 text-2xl">+</span>
            <span>All Games</span>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
        >
          {games.map((game) => (
            <motion.div
              key={game.id}
              variants={itemVariants}
              whileHover={{
                scale: 1.03,
                y: -3,
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.97 }}
              className="rounded-[18px] md:rounded-[22px] bg-[#dedede] p-3 md:p-4 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group border border-black"
              onClick={() => handleGameClick(game)}
            >
              <div className="aspect-square rounded-[16px] md:rounded-[18px] mb-3 overflow-hidden bg-black">
                <img
                  src={game.image}
                  alt={game.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = fallbackGameImage;
                  }}
                />
              </div>

              <div className="text-center">
                <h3 className="text-[20px] md:text-[26px] font-bold text-black leading-tight tracking-tight">
                  {game.name}
                </h3>
                <p className="mt-1 text-sm md:text-base text-black/45">{game.subtitle}</p>
              </div>
            </motion.div>
          ))}

          {!showAllGames && (
            <motion.div
              variants={itemVariants}
              whileHover={{
                scale: 1.03,
                y: -3,
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSeeAllClick}
              className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group border border-black flex flex-col items-center justify-center text-white"
            >
              <div className="aspect-square w-full rounded-lg md:rounded-xl mb-3 md:mb-4 flex items-center justify-center">
                <div className="text-2xl md:text-3xl">{'>'}</div>
              </div>
              <div className="text-center">
                <h3 className="text-xs md:text-sm font-medium leading-tight">See All</h3>
              </div>
            </motion.div>
          )}

          {showAllGames && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{
                scale: 1.03,
                y: -3,
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSeeAllClick}
              className="bg-gradient-to-br from-gray-500 to-gray-700 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group border border-black flex flex-col items-center justify-center text-white"
            >
              <div className="aspect-square w-full rounded-lg md:rounded-xl mb-3 md:mb-4 flex items-center justify-center">
                <div className="text-2xl md:text-3xl">{'<'}</div>
              </div>
              <div className="text-center">
                <h3 className="text-xs md:text-sm font-medium leading-tight">Show Less</h3>
              </div>
            </motion.div>
          )}
        </motion.div>

        <GameDetailsModal
          game={selectedGameForModal}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedGameForModal(null);
          }}
        />
      </div>
    </div>
  );
};

export default GameGrid;
