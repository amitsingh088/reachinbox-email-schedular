import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { useEmails } from '../../hooks/useEmails';
import { getScheduledEmails } from '../../services/api';
import { Table } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';

interface ScheduledEmailsProps {
  refreshKey: number;
}

export default function ScheduledEmails({ refreshKey }: ScheduledEmailsProps) {
  const { emails, isLoading, error } = useEmails(getScheduledEmails, refreshKey);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-red-700">
        {error}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="w-8 h-8 text-gray-400" />}
        title="No scheduled emails"
        description="Schedule your first email campaign by clicking 'Compose New Email' above."
      />
    );
  }

  return (
    <Table headers={['Recipient', 'Subject', 'Scheduled At', 'Status']}>
      {emails.map((email) => (
        <tr key={email.id} className="hover:bg-gray-50 transition-colors">
          <td className="px-6 py-4 text-sm text-gray-900 font-medium">{email.recipient}</td>
          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{email.subject}</td>
          <td className="px-6 py-4 text-sm text-gray-500">
            {format(new Date(email.scheduledAt), 'MMM d, yyyy h:mm a')}
          </td>
          <td className="px-6 py-4">
            <Badge status={email.status} />
          </td>
        </tr>
      ))}
    </Table>
  );
}
