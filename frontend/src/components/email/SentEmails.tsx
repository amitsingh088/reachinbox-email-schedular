import { Send, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useEmails } from '../../hooks/useEmails';
import { getSentEmails } from '../../services/api';
import { Table } from '../ui/Table';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { EmptyState } from '../ui/EmptyState';

interface SentEmailsProps {
  refreshKey: number;
}

export default function SentEmails({ refreshKey }: SentEmailsProps) {
  const { emails, isLoading, error } = useEmails(getSentEmails, refreshKey);

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
        icon={<Send className="w-8 h-8 text-gray-400" />}
        title="No sent emails yet"
        description="Emails will appear here once they are sent from your scheduled campaigns."
      />
    );
  }

  return (
    <Table headers={['Recipient', 'Subject', 'Sent At', 'Status', 'Preview']}>
      {emails.map((email) => (
        <tr key={email.id} className="hover:bg-gray-50 transition-colors">
          <td className="px-6 py-4 text-sm text-gray-900 font-medium">{email.recipient}</td>
          <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{email.subject}</td>
          <td className="px-6 py-4 text-sm text-gray-500">
            {email.sentAt
              ? format(new Date(email.sentAt), 'MMM d, yyyy h:mm a')
              : '—'}
          </td>
          <td className="px-6 py-4">
            <Badge status={email.status} />
          </td>
          <td className="px-6 py-4 text-sm">
            {email.previewUrl ? (
              <a
                href={email.previewUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 font-medium hover:underline"
              >
                <span>View Ethereal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ) : (
              <span className="text-gray-400 text-xs">—</span>
            )}
          </td>
        </tr>
      ))}
    </Table>
  );
}
