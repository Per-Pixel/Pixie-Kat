import React from 'react';
import { Eye, EyeOff, FileText, Clock, Trash2 } from 'lucide-react';
import { PageStatus } from '../../types/cms';

interface StatusBadgeProps {
  status: PageStatus;
  showIcon?: boolean;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  className = '',
}) => {
  const statusConfig = {
    [PageStatus.PUBLISHED]: {
      label: 'Published',
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: <Eye className="w-3 h-3" />,
    },
    [PageStatus.HIDDEN]: {
      label: 'Hidden',
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: <EyeOff className="w-3 h-3" />,
    },
    [PageStatus.DRAFT]: {
      label: 'Draft',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: <FileText className="w-3 h-3" />,
    },
    [PageStatus.SCHEDULED]: {
      label: 'Scheduled',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: <Clock className="w-3 h-3" />,
    },
    [PageStatus.TRASHED]: {
      label: 'Trashed',
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: <Trash2 className="w-3 h-3" />,
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.color} ${className}`}
    >
      {showIcon && config.icon}
      {config.label}
    </span>
  );
};

export default StatusBadge;
