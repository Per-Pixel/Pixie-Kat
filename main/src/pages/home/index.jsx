import Hero from "./sections/Hero";
import TrendingGames from "./sections/TrendingGames";
import ExclusiveOffers from "./sections/ExclusiveOffers";
import Leaderboard from "./sections/Leaderboard";
import About from "./sections/About";
import Features from "./sections/Features";
import Promotion from "./sections/Promotion";
import Contact from "./sections/Contact";

const HomePage = () => {
  return (
    <>
      <Hero />
      <TrendingGames />
      <ExclusiveOffers />
      <Leaderboard />
      <About />
      <Features />
      <Promotion />
      <Contact />
    </>
  );
};

export default HomePage;
