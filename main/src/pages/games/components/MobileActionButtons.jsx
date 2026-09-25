import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const MobileActionButtons = () => {
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 2500);
    return () => clearTimeout(timer);
  }, [notice]);

  const actions = [
    {
      id: 1,
      title: 'Add Money',
      icon: '$',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
      onClick: () => navigate('/games/mobile-legends/add-money'),
    },
    {
      id: 2,
      title: 'Payments',
      icon: 'Card',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
      onClick: () => setNotice('Payments coming soon'),
    },
    {
      id: 3,
      title: 'Purchase',
      icon: 'Buy',
      bgColor: 'bg-green-100',
      textColor: 'text-green-600',
      onClick: () => navigate('/account'),
    },
    {
      id: 4,
      title: 'Refer & Earn',
      icon: 'Gift',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-600',
      onClick: () => setNotice('Refer & Earn coming soon'),
    },
  ];

  return (
    <div className="bg-blue-50 px-4 py-6">
      {notice ? (
        <p className="mb-3 rounded-xl bg-slate-900 px-4 py-2 text-center text-sm font-medium text-white">
          {notice}
        </p>
      ) : null}
      <div className="grid grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <motion.button
            key={action.id}
            type="button"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={action.onClick}
            className={`${action.bgColor} flex flex-col items-center space-y-2 rounded-xl p-4 transition-transform hover:scale-105`}
          >
            <div className="text-center text-sm font-bold">{action.icon}</div>
            <span className={`text-center text-xs font-medium leading-tight ${action.textColor}`}>
              {action.title}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default MobileActionButtons;
