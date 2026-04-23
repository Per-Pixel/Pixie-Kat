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

  const paymentMethods = [
    { name: 'Visa', color: 'bg-blue-600' },
    { name: 'MC', color: 'bg-red-500' },
    { name: 'PayPal', color: 'bg-blue-500' },
    { name: 'Skrill', color: 'bg-purple-600' },
    { name: 'OVO', color: 'bg-blue-400' },
    { name: 'DANA', color: 'bg-blue-500' }
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
    <div className="py-8 md:py-16 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Contact Us Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-8 md:mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-black mb-6 md:mb-8">Contact Us</h2>

          {/* Contact Methods Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-2xl mx-auto mb-8 md:mb-16"
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
                className={`${method.color} ${method.hoverColor} text-white py-3 md:py-4 px-4 md:px-6 rounded-lg md:rounded-xl font-medium transition-all duration-300 shadow-md hover:shadow-lg flex flex-col items-center space-y-1 md:space-y-2`}
              >
                <span className="text-xl md:text-2xl">{method.icon}</span>
                <span className="text-xs md:text-sm font-bold">{method.name}</span>
              </motion.button>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default ContactSection;
