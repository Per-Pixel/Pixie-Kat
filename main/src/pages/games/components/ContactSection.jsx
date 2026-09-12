import { motion } from 'framer-motion';

const ContactSection = () => {
  const contactMethods = [
    {
      id: 'email',
      name: 'Email',
      icon: '📧',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600'
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: '💬',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600'
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: '📷',
      color: 'bg-pink-500',
      hoverColor: 'hover:bg-pink-600'
    },
    {
      id: 'discord',
      name: 'Discord',
      icon: '🎮',
      color: 'bg-indigo-500',
      hoverColor: 'hover:bg-indigo-600'
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 30,
      scale: 0.9
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="px-4 py-8 md:px-8 md:py-16">
      <div className="mx-auto max-w-7xl">
        {/* Contact Us Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="mb-8 text-center md:mb-12"
        >
          <h2 className="mb-6 text-2xl font-bold text-black md:mb-8 md:text-3xl">Contact Us</h2>

          {/* Contact Methods Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="mx-auto mb-8 grid max-w-2xl grid-cols-2 gap-3 md:mb-16 md:grid-cols-4 md:gap-4"
          >
            {contactMethods.map((method) => (
              <motion.button
                key={method.id}
                variants={itemVariants}
                whileHover={{
                  scale: 1.03,
                  y: -2,
                  transition: { duration: 0.2 }
                }}
                whileTap={{ scale: 0.97 }}
                className={`${method.color} ${method.hoverColor} flex flex-col items-center space-y-1 rounded-lg px-4 py-3 font-medium text-white shadow-md transition-all duration-300 hover:shadow-lg md:space-y-2 md:rounded-xl md:px-6 md:py-4`}
              >
                <span className="text-xl md:text-2xl">{method.icon}</span>
                <span className="text-xs font-bold md:text-sm">{method.name}</span>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactSection;
