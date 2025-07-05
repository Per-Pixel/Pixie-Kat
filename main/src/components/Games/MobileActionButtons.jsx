import React from 'react';
import { motion } from 'framer-motion';

const MobileActionButtons = () => {
  const actions = [
    {
      id: 1,
      title: 'Add Money',
      icon: '💰',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600'
    },
    {
      id: 2,
      title: 'Payments',
      icon: '💳',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600'
    },
    {
      id: 3,
      title: 'Purchase',
      icon: '🛒',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600'
    },
    {
      id: 4,
      title: 'Refer & Earn',
      icon: '🎁',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-600'
    }
  ];

  return (
    <div className="px-4 py-6 bg-blue-50">
      <div className="grid grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${action.bgColor} rounded-xl p-4 flex flex-col items-center space-y-2 hover:scale-105 transition-transform`}
          >
            <div className="text-2xl">{action.icon}</div>
            <span className={`text-xs font-medium ${action.textColor} text-center leading-tight`}>
              {action.title}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default MobileActionButtons;
