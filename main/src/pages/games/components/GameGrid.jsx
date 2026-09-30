import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { fallbackGameImage } from '../gamesData';
import { useActiveGames } from '../../../hooks/useActiveGames';
import { useJjkCheaperPlacement } from '../../../hooks/useJjkCheaperPlacement';

const GameGrid = () => {
  const navigate = useNavigate();
  const [showAllGames, setShowAllGames] = useState(false);
  const { games: availableGames, loading, error } = useActiveGames();
  const jjkPromo = useJjkCheaperPlacement('games_page');

  // Only show games from Supabase — never the old hardcoded demo catalog.
  const games = showAllGames ? availableGames : availableGames.slice(0, 7);

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
    <div className="px-4 py-8 md:px-8 md:py-16">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-8 flex items-center md:mb-12"
        >
          <div className="flex items-center text-xl font-bold text-black md:text-2xl">
            <span className="mr-3 text-2xl">+</span>
            <span>All Games</span>
          </div>
        </motion.div>

        {loading ? (
          <p className="text-sm text-black/50 md:text-base">Loading games…</p>
        ) : error ? (
          <p className="text-sm text-red-600 md:text-base">Couldn’t load games: {error}</p>
        ) : availableGames.length === 0 ? (
          <p className="text-sm text-black/50 md:text-base">No games available yet.</p>
        ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 md:gap-6 lg:grid-cols-5"
        >
          {jjkPromo ? (
            <motion.div
              key="jjk-cheaper-promo"
              variants={itemVariants}
              whileHover={{
                scale: 1.03,
                y: -3,
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.97 }}
              className="group cursor-pointer rounded-[18px] border border-black bg-[#dedede] p-3 shadow-md transition-all duration-300 hover:shadow-lg md:rounded-[22px] md:p-4"
              onClick={() => navigate(jjkPromo.link)}
            >
              <div className="relative mb-3 aspect-square overflow-hidden rounded-[16px] bg-black md:rounded-[18px]">
                <img
                  src={jjkPromo.image}
                  alt={jjkPromo.title}
                  className="size-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = fallbackGameImage;
                  }}
                />
                <span className="absolute left-2 top-2 rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-bold uppercase text-black">
                  Event
                </span>
              </div>
              <h3 className="line-clamp-2 text-sm font-semibold text-black md:text-base">{jjkPromo.title}</h3>
            </motion.div>
          ) : null}
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
              className="group cursor-pointer rounded-[18px] border border-black bg-[#dedede] p-3 shadow-md transition-all duration-300 hover:shadow-lg md:rounded-[22px] md:p-4"
              onClick={() => handleGameClick(game)}
            >
              <div className="mb-3 aspect-square overflow-hidden rounded-[16px] bg-black md:rounded-[18px]">
                <img
                  src={game.image}
                  alt={game.name}
                  className="size-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = fallbackGameImage;
                  }}
                />
              </div>

              <div className="text-center">
                <h3 className="text-[20px] font-bold leading-tight tracking-tight text-black md:text-[26px]">
                  {game.name}
                </h3>
                <p className="mt-1 text-sm text-black/45 md:text-base">{game.subtitle}</p>
              </div>
            </motion.div>
          ))}

          {!showAllGames && availableGames.length > 7 && (
            <motion.div
              variants={itemVariants}
              whileHover={{
                scale: 1.03,
                y: -3,
                transition: { duration: 0.2 },
              }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSeeAllClick}
              className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-black bg-gradient-to-br from-purple-500 to-blue-600 p-3 text-white shadow-md transition-all duration-300 hover:shadow-lg md:rounded-2xl md:p-4"
            >
              <div className="mb-3 flex aspect-square w-full items-center justify-center rounded-lg md:mb-4 md:rounded-xl">
                <div className="text-2xl md:text-3xl">{'>'}</div>
              </div>
              <div className="text-center">
                <h3 className="text-xs font-medium leading-tight md:text-sm">See All</h3>
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
              className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-black bg-gradient-to-br from-gray-500 to-gray-700 p-3 text-white shadow-md transition-all duration-300 hover:shadow-lg md:rounded-2xl md:p-4"
            >
              <div className="mb-3 flex aspect-square w-full items-center justify-center rounded-lg md:mb-4 md:rounded-xl">
                <div className="text-2xl md:text-3xl">{'<'}</div>
              </div>
              <div className="text-center">
                <h3 className="text-xs font-medium leading-tight md:text-sm">Show Less</h3>
              </div>
            </motion.div>
          )}
        </motion.div>
        )}
      </div>
    </div>
  );
};

export default GameGrid;
