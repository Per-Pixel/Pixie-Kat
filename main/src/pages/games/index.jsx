import PageWrapper from '../../components/common/PageWrapper';
import GameHero from './components/GameHero';
import GameGrid from './components/GameGrid';
import ContactSection from './components/ContactSection';
import FloatingParticles from './components/FloatingParticles';
import MobileActionButtons from './components/MobileActionButtons';
import MobileHelpSection from './components/MobileHelpSection';

const Games = () => {
  return (
    <PageWrapper>
      <div className="relative overflow-hidden">
        <FloatingParticles />
        <div className="relative z-10">
          <GameHero />
          <div className="md:hidden">
            <MobileActionButtons />
          </div>
          <GameGrid />
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
