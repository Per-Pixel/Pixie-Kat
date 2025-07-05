import React from 'react';
import { useRef } from 'react';
import { useParallaxScroll } from '../animations/hooks/useParallaxScroll';

const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="rounded-lg bg-blue-100 p-6 shadow-md transition-all duration-300 hover:shadow-xl">
      <div className="mb-4 text-3xl text-gaming-primary">{icon}</div>
      <h3 className="mb-2 text-xl font-bold">{title}</h3>
      <p className="text-gray-700">{description}</p>
    </div>
  );
};

const GameFeatures = () => {
  const sectionRef = useRef(null);
  useParallaxScroll(sectionRef, { speed: 0.3 });
  
  return (
    <div ref={sectionRef} className="py-16">
      <h2 className="mb-12 text-center text-3xl font-bold">Why Choose Our Topup Service</h2>
      
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-4 md:grid-cols-2 lg:grid-cols-3">
        <FeatureCard 
          icon="⚡"
          title="Instant Delivery"
          description="Credits delivered to your account within seconds of payment confirmation"
        />
        <FeatureCard 
          icon="🔒"
          title="Secure Transactions"
          description="Bank-level encryption and secure payment processing"
        />
        <FeatureCard 
          icon="💰"
          title="Best Rates"
          description="Get more gaming credits for your money with our competitive rates"
        />
        <FeatureCard 
          icon="🎮"
          title="Multiple Games"
          description="Support for all major gaming platforms and titles"
        />
        <FeatureCard 
          icon="🎁"
          title="Loyalty Rewards"
          description="Earn points with every purchase for future discounts"
        />
        <FeatureCard 
          icon="📱"
          title="Mobile Friendly"
          description="Topup from any device, anytime, anywhere"
        />
      </div>
    </div>
  );
};

export default GameFeatures;