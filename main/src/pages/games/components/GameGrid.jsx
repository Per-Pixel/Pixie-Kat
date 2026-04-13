import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { fallbackGameImage, gamesData } from '../gamesData';

const GameGrid = () => {
  const navigate = useNavigate();
  const [showAllGames, setShowAllGames] = useState(false);

  const games = showAllGames ? gamesData : gamesData.slice(0, 7);

  const handleGameClick = (game) => {
    navigate(`/games/${game.id}`);
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
      </div>
    </div>
  );
};

export default GameGrid;
