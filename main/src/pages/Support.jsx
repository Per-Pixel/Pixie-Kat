import React, { useState } from 'react';
import { motion } from 'framer-motion';

const Support = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    priority: 'medium',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Reset form
    setFormData({
      name: '',
      email: '',
      subject: '',
      priority: 'medium',
      message: ''
    });
    
    setIsSubmitting(false);
    alert('Your message has been sent successfully! We\'ll get back to you soon.');
  };

  const supportChannels = [
    {
      name: 'WhatsApp',
      icon: '📱',
      color: 'from-green-500 to-green-600',
      description: 'Get instant support via WhatsApp',
      contact: '+91 98765 43210',
      action: 'Chat Now',
      available: '24/7',
      responseTime: '< 5 minutes'
    },
    {
      name: 'Instagram',
      icon: '📷',
      color: 'from-pink-500 to-purple-600',
      description: 'Follow us and DM for support',
      contact: '@pixiekat_official',
      action: 'Follow & DM',
      available: '24/7',
      responseTime: '< 15 minutes'
    },
    {
      name: 'Email',
      icon: '📧',
      color: 'from-blue-500 to-blue-600',
      description: 'Send us detailed queries via email',
      contact: 'support@pixiekat.com',
      action: 'Send Email',
      available: '24/7',
      responseTime: '< 2 hours'
    },
    {
      name: 'Live Chat',
      icon: '💬',
      color: 'from-neon-purple to-neon-blue',
      description: 'Chat with our support team',
      contact: 'Available on website',
      action: 'Start Chat',
      available: '24/7',
      responseTime: '< 1 minute'
    }
  ];

  const businessHours = [
    { day: 'Monday - Friday', hours: '24/7 Support' },
    { day: 'Saturday - Sunday', hours: '24/7 Support' },
    { day: 'Public Holidays', hours: '24/7 Support' }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-700 pt-20 pb-16">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            <span className="bg-gradient-to-r from-neon-purple to-neon-blue bg-clip-text text-transparent">
              Customer Support
            </span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-3xl mx-auto">
            We're here to help! Get instant support through multiple channels or send us a message
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
          {/* Support Channels */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <h2 className="text-3xl font-bold text-white mb-8 text-center lg:text-left">
              Get In Touch
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              {supportChannels.map((channel, index) => (
                <motion.div
                  key={index}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className={`bg-gradient-to-br ${channel.color} rounded-2xl p-6 text-white shadow-xl`}
                >
                  <div className="text-4xl mb-4">{channel.icon}</div>
                  <h3 className="text-xl font-bold mb-2">{channel.name}</h3>
                  <p className="text-gray-100 text-sm mb-4">{channel.description}</p>
                  <div className="space-y-2 mb-4">
                    <div className="text-sm">
                      <span className="font-medium">Contact:</span> {channel.contact}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Available:</span> {channel.available}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Response:</span> {channel.responseTime}
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-full bg-white/20 backdrop-blur-sm text-white font-bold py-2 px-4 rounded-lg hover:bg-white/30 transition-all duration-200"
                  >
                    {channel.action}
                  </motion.button>
                </motion.div>
              ))}
            </div>

            {/* Business Hours */}
            <motion.div
              variants={itemVariants}
              className="bg-dark-600 rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="text-2xl mr-3">🕒</span>
                Business Hours
              </h3>
              <div className="space-y-3">
                {businessHours.map((schedule, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-gray-300">{schedule.day}</span>
                    <span className="text-neon-purple font-medium">{schedule.hours}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-neon-purple/10 rounded-lg border border-neon-purple/20">
                <p className="text-neon-purple text-sm font-medium">
                  ⚡ We provide 24/7 support for all our customers with premium members getting priority assistance!
                </p>
              </div>
            </motion.div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-3xl font-bold text-white mb-8 text-center lg:text-left">
              Send Us a Message
            </h2>
            
            <form onSubmit={handleSubmit} className="bg-dark-600 rounded-2xl p-8 shadow-xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-white font-medium mb-2">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-neon-purple focus:outline-none transition-colors duration-200"
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-neon-purple focus:outline-none transition-colors duration-200"
                    placeholder="your@email.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-white font-medium mb-2">Subject *</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-neon-purple focus:outline-none transition-colors duration-200"
                    placeholder="Brief subject of your inquiry"
                  />
                </div>
                <div>
                  <label className="block text-white font-medium mb-2">Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-neon-purple focus:outline-none transition-colors duration-200"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-white font-medium mb-2">Message *</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  required
                  rows={6}
                  className="w-full bg-dark-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:border-neon-purple focus:outline-none transition-colors duration-200 resize-vertical"
                  placeholder="Please describe your issue or question in detail..."
                />
              </div>

              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full bg-gradient-to-r from-neon-purple to-neon-blue text-white font-bold py-4 px-6 rounded-xl shadow-lg transition-all duration-300 ${
                  isSubmitting 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:shadow-neon-purple/50'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Sending...
                  </div>
                ) : (
                  'Send Message'
                )}
              </motion.button>

              <p className="text-gray-400 text-sm mt-4 text-center">
                We typically respond within 2 hours during business hours
              </p>
            </form>
          </motion.div>
        </div>

        {/* Quick Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <h2 className="text-3xl font-bold text-white mb-8">Quick Help</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-dark-600 rounded-xl p-6">
              <div className="text-3xl mb-4">❓</div>
              <h3 className="text-neon-purple font-semibold mb-2">Check FAQ</h3>
              <p className="text-gray-300 text-sm mb-4">Find answers to common questions</p>
              <button className="text-neon-purple hover:text-neon-blue transition-colors duration-200">
                View FAQ →
              </button>
            </div>
            <div className="bg-dark-600 rounded-xl p-6">
              <div className="text-3xl mb-4">📋</div>
              <h3 className="text-neon-purple font-semibold mb-2">Order Status</h3>
              <p className="text-gray-300 text-sm mb-4">Track your recent orders</p>
              <button className="text-neon-purple hover:text-neon-blue transition-colors duration-200">
                Track Order →
              </button>
            </div>
            <div className="bg-dark-600 rounded-xl p-6">
              <div className="text-3xl mb-4">💡</div>
              <h3 className="text-neon-purple font-semibold mb-2">How It Works</h3>
              <p className="text-gray-300 text-sm mb-4">Learn about our process</p>
              <button className="text-neon-purple hover:text-neon-blue transition-colors duration-200">
                Learn More →
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Support;
