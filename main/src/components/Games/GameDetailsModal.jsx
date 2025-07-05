import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const GameDetailsModal = ({ game, isOpen, onClose }) => {
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [gameId, setGameId] = useState('');
  const [serverId, setServerId] = useState('');

  const topUpOptions = [
    { id: 1, amount: '100 Diamonds', price: '₹89', popular: false },
    { id: 2, amount: '500 Diamonds', price: '₹399', popular: true },
    { id: 3, amount: '1000 Diamonds', price: '₹799', popular: false },
    { id: 4, amount: '2000 Diamonds', price: '₹1599', popular: false },
    { id: 5, amount: '5000 Diamonds', price: '₹3999', popular: false },
    { id: 6, amount: '10000 Diamonds', price: '₹7999', popular: false },
  ];

  const handlePurchase = () => {
    if (!selectedAmount || !gameId) {
      alert('Please select an amount and enter your Game ID');
      return;
    }
    
    // Here you would integrate with your payment system
    alert(`Purchase initiated for ${selectedAmount.amount} - ${selectedAmount.price}`);
    onClose();
  };

  if (!game) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 bg-gradient-to-br ${game.bgColor} rounded-lg flex items-center justify-center text-white text-xl`}>
                  {game.icon}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-black">{game.name}</h2>
                  <p className="text-sm text-gray-500">Top Up</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
              {/* Game ID Input */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Game ID *
                </label>
                <input
                  type="text"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  placeholder="Enter your Game ID"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Server ID Input (optional) */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Server ID (Optional)
                </label>
                <input
                  type="text"
                  value={serverId}
                  onChange={(e) => setServerId(e.target.value)}
                  placeholder="Enter Server ID if required"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Top Up Options */}
              <div>
                <label className="block text-sm font-medium text-black mb-3">
                  Select Top Up Amount *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {topUpOptions.map((option) => (
                    <motion.button
                      key={option.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedAmount(option)}
                      className={`relative p-3 border-2 rounded-lg text-left transition-all ${
                        selectedAmount?.id === option.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {option.popular && (
                        <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded-full">
                          Popular
                        </div>
                      )}
                      <div className="font-medium text-black text-sm">
                        {option.amount}
                      </div>
                      <div className="text-blue-600 font-bold text-lg">
                        {option.price}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Purchase Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePurchase}
                disabled={!selectedAmount || !gameId}
                className={`w-full py-4 rounded-lg font-bold text-white transition-all ${
                  selectedAmount && gameId
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {selectedAmount ? `Purchase ${selectedAmount.price}` : 'Select Amount & Enter Game ID'}
              </motion.button>

              {/* Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs">i</span>
                  </div>
                  <div className="text-sm text-gray-700">
                    <p className="font-medium mb-1">Important Notes:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• Make sure your Game ID is correct</li>
                      <li>• Top-up will be processed instantly</li>
                      <li>• Contact support if you face any issues</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GameDetailsModal;
