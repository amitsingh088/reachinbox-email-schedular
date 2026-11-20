import { Router, Request, Response } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { env } from '../config/env';
import prisma from '../config/database';

const router = Router();

// GET /connect — Redirect to Slack OAuth authorization URL
router.get('/connect', authenticateJWT, (_req: Request, res: Response) => {
  const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
  slackAuthUrl.searchParams.set('client_id', env.SLACK_CLIENT_ID);
  slackAuthUrl.searchParams.set('scope', 'incoming-webhook');
  slackAuthUrl.searchParams.set('redirect_uri', env.SLACK_REDIRECT_URI);
  slackAuthUrl.searchParams.set('state', _req.user!.id); // pass userId as state

  res.redirect(slackAuthUrl.toString());
});

// GET /callback — Handle Slack OAuth callback (Slack redirects here, no user JWT header)
router.get('/callback', async (req: Request, res: Response) => {
  try {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
      res.status(400).json({ error: 'Missing code or state parameter' });
      return;
    }

    // Exchange code for access_token
    const tokenResponse = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code: code as string,
        redirect_uri: env.SLACK_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json() as {
      ok: boolean;
      incoming_webhook?: { url: string };
      error?: string;
    };

    if (!tokenData.ok || !tokenData.incoming_webhook?.url) {
      console.error('Slack OAuth failed:', tokenData.error);
      res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error`);
      return;
    }

    // Store the incoming-webhook URL in the user record
    await prisma.user.update({
      where: { id: userId as string },
      data: { slackWebhookUrl: tokenData.incoming_webhook.url },
    });

    console.log(`✅ Slack connected for user ${userId}`);
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
  } catch (error) {
    console.error('❌ Slack OAuth callback error:', error);
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=error`);
  }
});

// GET /status — Check if user has Slack connected
router.get('/status', authenticateJWT, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { slackWebhookUrl: true },
    });

    res.json({ connected: !!user?.slackWebhookUrl });
  } catch (error) {
    console.error('❌ Error checking Slack status:', error);
    res.status(500).json({ error: 'Failed to check Slack status' });
  }
});

export default router;
