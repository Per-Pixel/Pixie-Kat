import React, { useState } from 'react';
import { motion } from 'framer-motion';
import PageWrapper from '../components/PageWrapper';
import GameHero from '../components/Games/GameHero';
import GameGrid from '../components/Games/GameGrid';
import ContactSection from '../components/Games/ContactSection';
import FloatingParticles from '../components/Games/FloatingParticles';
import MobileActionButtons from '../components/Games/MobileActionButtons';
import MobileHelpSection from '../components/Games/MobileHelpSection';

const Games = () => {
  const [selectedGame, setSelectedGame] = useState(null);

  return (
    <PageWrapper>
      <div className="relative overflow-hidden">
        <FloatingParticles />
        <div className="relative z-10">
          <GameHero />
          <div className="md:hidden">
            <MobileActionButtons />
          </div>
          <GameGrid selectedGame={selectedGame} setSelectedGame={setSelectedGame} />
          <div className="md:hidden">
            <MobileHelpSection />
          </div>
          <ContactSection />
        </div>
      </div>
    </PageWrapper>
  );
};

export default Games;