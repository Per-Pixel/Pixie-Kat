import { motion } from 'framer-motion';

/**
 * A reusable square button for mobile views with smooth animations and feedback.
 */
const MobileSquareButton = (props) => {
  return (
    <motion.button
      type="button"
      className={`flex size-10 items-center justify-center rounded-md bg-white shadow-md transition-transform active:scale-95 ${props.className}`}
      onClick={props.onClick}
      aria-label={props.ariaLabel}
      title={props.title}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 20
      }}
    >
      {props.children}
    </motion.button>
  );
};

export default MobileSquareButton;
