import React from "react";
import TextWave from "../components/TextWave";
import HoverCard from "../components/HoverCard";

const MetagameLayerSection = ({ 
  title = "Into the Metagame Layer",
  cards = [],
  className = "",
  titleClassName = "",
  cardsContainerClassName = ""
}) => {
  // Default cards if none provided
  const defaultCards = [
    {
      title: <>radia<b>n</b>t</>,
      description: "A cross-platform metagame app, turning your activities across Web2 and Web3 games into a rewarding adventure.",
      image: "videos/feature-1.mp4",
      isComingSoon: true
    },
    {
      title: <>zig<b>m</b>a</>,
      description: "An anime and gaming-inspired NFT collection - the IP foundation of the Zentry universe.",
      image: "videos/feature-2.mp4",
      isComingSoon: true
    },
    {
      title: <>az<b>u</b>l</>,
      description: "A cross-world AI Agent - elevating your gameplay to be more fun and productive.",
      image: "videos/feature-3.mp4",
      isComingSoon: true
    }
  ];

  const displayCards = cards.length > 0 ? cards : defaultCards;

  return (
    <section className={`py-24 bg-gray-100 ${className}`}>
      <div className="max-w-7xl mx-auto px-4">
        <TextWave
          text={title}
          tag="h2"
          className={`text-4xl font-bold mb-16 text-center ${titleClassName}`}
          amplitude={10}
          frequency={0.1}
        />
        
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${cardsContainerClassName}`}>
          {displayCards.map((card, index) => (
            <HoverCard
              key={index}
              title={card.title}
              description={card.description}
              image={card.image}
              isComingSoon={card.isComingSoon}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default MetagameLayerSection;