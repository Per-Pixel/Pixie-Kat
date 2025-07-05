import React, { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';

const FloatingParticles = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate particles
    const generateParticles = () => {
      const newParticles = [];
      for (let i = 0; i < 8; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
          y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
          size: Math.random() * 3 + 1.5,
          duration: Math.random() * 15 + 15,
          delay: Math.random() * 3,
        });
      }
      setParticles(newParticles);
    };

    generateParticles();

    // Regenerate particles on window resize
    const handleResize = () => {
      generateParticles();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const floatingVariants = {
    animate: {
      y: [0, -20, 0],
      x: [0, 10, -10, 0],
      transition: {
        duration: 20,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  const pulseVariants = {
    animate: {
      scale: [1, 1.1, 1],
      opacity: [0.4, 0.6, 0.4],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Floating Dots */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute bg-black rounded-full opacity-20"
          style={{
            left: particle.x,
            top: particle.y,
            width: particle.size,
            height: particle.size,
          }}
          variants={floatingVariants}
          animate="animate"
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Large Decorative Circles */}
      <motion.div
        className="absolute top-20 right-10 w-32 h-32 bg-yellow-300 rounded-full opacity-60 blur-xl"
        variants={pulseVariants}
        animate="animate"
      />
      
      <motion.div
        className="absolute bottom-20 right-20 w-40 h-40 bg-blue-300 rounded-full opacity-40 blur-xl"
        variants={pulseVariants}
        animate="animate"
        transition={{
          duration: 4,
          delay: 1,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <motion.div
        className="absolute top-1/2 left-10 w-24 h-24 bg-purple-300 rounded-full opacity-30 blur-lg"
        variants={pulseVariants}
        animate="animate"
        transition={{
          duration: 5,
          delay: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Geometric Shapes */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-6 h-6 bg-black opacity-10 transform rotate-45"
        animate={{
          rotate: [45, 225, 45],
          scale: [1, 1.5, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <motion.div
        className="absolute bottom-1/3 left-1/3 w-4 h-4 bg-black opacity-15 rounded-full"
        animate={{
          y: [0, -20, 0],
          x: [0, 10, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <motion.div
        className="absolute top-2/3 right-1/3 w-8 h-8 border-2 border-black opacity-10"
        animate={{
          rotate: [0, 360],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear"
        }}
      />
    </div>
  );
};

export default FloatingParticles;
