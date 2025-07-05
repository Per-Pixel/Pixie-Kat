import React, { useState } from 'react';
import { motion } from 'framer-motion';
import GameDetailsModal from './GameDetailsModal';

const GameGrid = ({ selectedGame, setSelectedGame }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGameForModal, setSelectedGameForModal] = useState(null);
  const [showAllGames, setShowAllGames] = useState(false);
  const allGames = [
    {
      id: 'mobile-legends',
      name: 'Mobile Legends',
      icon: '⚔️',
      bgColor: 'from-blue-400 to-blue-600'
    },
    {
      id: 'pubg-global',
      name: 'PUBG Global',
      icon: '🎯',
      bgColor: 'from-orange-400 to-red-500'
    },
    {
      id: 'genshin-impact',
      name: 'Genshin Impact',
      icon: '⭐',
      bgColor: 'from-purple-400 to-pink-500'
    },
    {
      id: 'clash-of-clans',
      name: 'Clash of Clans',
      icon: '⚡',
      bgColor: 'from-yellow-400 to-orange-500'
    },
    {
      id: 'honkai-star-rail',
      name: 'Honkai: Star Rail',
      icon: '🌟',
      bgColor: 'from-indigo-400 to-purple-500'
    },
    {
      id: 'clash-royale',
      name: 'Clash Royale',
      icon: '👑',
      bgColor: 'from-red-400 to-pink-500'
    },
    {
      id: 'farlight-84',
      name: 'Farlight 84',
      icon: '🚀',
      bgColor: 'from-green-400 to-teal-500'
    },
    {
      id: 'free-fire',
      name: 'Free Fire',
      icon: '🔥',
      bgColor: 'from-red-500 to-orange-500'
    },
    {
      id: 'call-of-duty',
      name: 'Call of Duty',
      icon: '🎮',
      bgColor: 'from-gray-600 to-gray-800'
    },
    {
      id: 'valorant',
      name: 'Valorant',
      icon: '🎯',
      bgColor: 'from-red-600 to-pink-600'
    },
    {
      id: 'apex-legends',
      name: 'Apex Legends',
      icon: '🏆',
      bgColor: 'from-orange-500 to-red-600'
    },
    {
      id: 'fortnite',
      name: 'Fortnite',
      icon: '🌪️',
      bgColor: 'from-purple-500 to-blue-500'
    }
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
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="py-8 md:py-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex items-center mb-8 md:mb-12"
        >
          <div className="text-xl md:text-2xl font-bold text-black flex items-center">
            <span className="mr-3 text-2xl">🛒</span>
            <span>All Games</span>
          </div>
        </motion.div>

        {/* Games Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6"
        >
          {games.map((game, index) => (
            <motion.div
              key={game.id}
              variants={itemVariants}
              whileHover={{
                scale: 1.03,
                y: -3,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.97 }}
              className="bg-white rounded-xl md:rounded-2xl p-3 md:p-4 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group border border-gray-100"
              onClick={() => handleGameClick(game)}
            >
              {/* Game Image */}
              <div className="aspect-square bg-gray-50 rounded-lg md:rounded-xl mb-3 md:mb-4 flex items-center justify-center overflow-hidden">
                <div className={`w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br ${game.bgColor} rounded-md md:rounded-lg flex items-center justify-center text-white text-lg md:text-2xl`}>
                  {game.icon}
                </div>
              </div>

              {/* Game Info */}
              <div className="text-center">
                <h3 className="text-xs md:text-sm font-medium text-black mb-2 md:mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">
                  {game.name}
                </h3>
              </div>
            </motion.div>
          ))}

          {/* See All Button */}
          {!showAllGames && (
            <motion.div
              variants={itemVariants}
              whileHover={{
                scale: 1.03,
                y: -3,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSeeAllClick}
              className="bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group border border-gray-100 flex flex-col items-center justify-center text-white"
            >
              <div className="aspect-square w-full rounded-lg md:rounded-xl mb-3 md:mb-4 flex items-center justify-center">
                <div className="text-2xl md:text-3xl">➡️</div>
              </div>
              <div className="text-center">
                <h3 className="text-xs md:text-sm font-medium leading-tight">
                  See All
                </h3>
              </div>
            </motion.div>
          )}

          {/* Show Less Button */}
          {showAllGames && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{
                scale: 1.03,
                y: -3,
                transition: { duration: 0.2 }
              }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSeeAllClick}
              className="bg-gradient-to-br from-gray-500 to-gray-700 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group border border-gray-100 flex flex-col items-center justify-center text-white"
            >
              <div className="aspect-square w-full rounded-lg md:rounded-xl mb-3 md:mb-4 flex items-center justify-center">
                <div className="text-2xl md:text-3xl">⬅️</div>
              </div>
              <div className="text-center">
                <h3 className="text-xs md:text-sm font-medium leading-tight">
                  Show Less
                </h3>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Game Details Modal */}
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
