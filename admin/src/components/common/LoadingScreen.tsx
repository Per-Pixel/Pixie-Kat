import React from 'react';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] py-16">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 rounded-full border-4 border-primary-100" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-600 animate-spin" />
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-primary-300 animate-spin" style={{ animationDuration: '0.6s', animationDirection: 'reverse' }} />
      </div>
      <p className="text-sm font-medium text-gray-500">{message}</p>
    </div>
  );
};

export default LoadingScreen;
