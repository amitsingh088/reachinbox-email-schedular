import { env } from '../config/env';

/**
 * Send a Slack notification when rate limit is hit.
 * Uses incoming webhook URL stored per user.
 */
export const sendSlackNotification = async (
  webhookUrl: string,
  message: {
    sender: string;
    limit: number;
    currentCount: number;
    nextWindowMs: number;
  }
): Promise<void> => {
  try {
    const nextWindowMinutes = Math.ceil(message.nextWindowMs / 60000);

    const payload = {
      text: `🚨 *Email Rate Limit Hit*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚨 Email Rate Limit Reached',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sender:*\n${message.sender}`,
            },
            {
              type: 'mrkdwn',
              text: `*Limit:*\n${message.limit} emails/hour`,
            },
            {
              type: 'mrkdwn',
              text: `*Emails Sent This Hour:*\n${message.currentCount}`,
            },
            {
              type: 'mrkdwn',
              text: `*Next Window In:*\n~${nextWindowMinutes} minutes`,
            },
          ],
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `Remaining emails have been automatically rescheduled to the next available hour window.`,
            },
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`⚠️  Slack notification failed: ${response.status} ${response.statusText}`);
    } else {
      console.log(`✅ Slack notification sent for sender: ${message.sender}`);
    }
  } catch (error) {
    console.warn('⚠️  Failed to send Slack notification:', (error as Error).message);
  }
};
