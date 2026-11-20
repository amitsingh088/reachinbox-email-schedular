export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  slackConnected: boolean;
}

export interface Email {
  id: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt: string | null;
  failedAt: string | null;
  errorMessage: string | null;
  previewUrl?: string | null;
  batchId: string;
  createdAt: string;
}

export type EmailStatus =
  | 'SCHEDULED'
  | 'QUEUED'
  | 'SENDING'
  | 'SENT'
  | 'FAILED'
  | 'RATE_LIMITED';

export interface EmailStats {
  scheduled: number;
  sent: number;
  failed: number;
}

export interface ScheduleEmailRequest {
  sender: string;
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt: string;
  delayBetweenMs: number;
  hourlyLimit: number;
}
