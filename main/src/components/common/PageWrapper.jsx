import { motion } from 'framer-motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const PageWrapper = ({ children }) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? undefined : { opacity: 0, y: -20 }}
      transition={{ duration: reduced ? 0 : 0.5 }}
      className="min-h-screen pt-24"
    >
      {children}
    </motion.div>
  );
};

export default PageWrapper;
