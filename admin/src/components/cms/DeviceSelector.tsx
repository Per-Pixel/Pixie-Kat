import React from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';
import type { DeviceType } from '../../types/cms';

interface DeviceSelectorProps {
  currentDevice: DeviceType;
  onChange: (device: DeviceType) => void;
  className?: string;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  currentDevice,
  onChange,
  className = '',
}) => {
  const devices: Array<{ type: DeviceType; icon: React.ReactNode; label: string }> = [
    { type: 'desktop', icon: <Monitor className="w-4 h-4" />, label: 'Desktop' },
    { type: 'tablet', icon: <Tablet className="w-4 h-4" />, label: 'Tablet' },
    { type: 'mobile', icon: <Smartphone className="w-4 h-4" />, label: 'Mobile' },
  ];

  return (
    <div className={`inline-flex rounded-lg border border-gray-200 bg-white p-1 ${className}`}>
      {devices.map((device) => (
        <button
          key={device.type}
          type="button"
          onClick={() => onChange(device.type)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            currentDevice === device.type
              ? 'bg-primary-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
          aria-label={`Switch to ${device.label} view`}
        >
          {device.icon}
          <span className="hidden sm:inline">{device.label}</span>
        </button>
      ))}
    </div>
  );
};

export default DeviceSelector;
