import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

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
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Floating Dots */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-black opacity-20"
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
        className="absolute right-10 top-20 size-32 rounded-full bg-yellow-300 opacity-60 blur-xl"
        variants={pulseVariants}
        animate="animate"
      />
      
      <motion.div
        className="absolute bottom-20 right-20 size-40 rounded-full bg-blue-300 opacity-40 blur-xl"
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
        className="absolute left-10 top-1/2 size-24 rounded-full bg-purple-300 opacity-30 blur-lg"
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
        className="absolute left-1/4 top-1/4 size-6 rotate-45 bg-black opacity-10"
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
        className="absolute bottom-1/3 left-1/3 size-4 rounded-full bg-black opacity-15"
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
        className="absolute right-1/3 top-2/3 size-8 border-2 border-black opacity-10"
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
