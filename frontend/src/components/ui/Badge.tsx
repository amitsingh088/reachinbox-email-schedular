import React from 'react';
import type { EmailStatus } from '../../types';

const statusConfig: Record<EmailStatus, { bg: string; text: string; label: string }> = {
  SCHEDULED: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Scheduled' },
  QUEUED: { bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Queued' },
  SENDING: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Sending' },
  SENT: { bg: 'bg-green-50', text: 'text-green-700', label: 'Sent' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-700', label: 'Failed' },
  RATE_LIMITED: { bg: 'bg-purple-50', text: 'text-purple-700', label: 'Rate Limited' },
};

interface BadgeProps {
  status: EmailStatus;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const cfg = statusConfig[status] || statusConfig.SCHEDULED;
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${cfg.text.replace('text-', 'bg-')}`} />
      {cfg.label}
    </span>
  );
};
