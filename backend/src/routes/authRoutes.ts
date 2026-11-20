import { Router } from 'express';
import passport, { generateToken, authenticateJWT } from '../middleware/auth';
import { env } from '../config/env';
import prisma from '../config/database';

const router = Router();

// GET /google — Initiate Google OAuth
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

// GET /google/callback — Handle Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  (req, res) => {
    if (!req.user) {
      res.redirect(`${env.FRONTEND_URL}/?error=auth_failed`);
      return;
    }

    const token = generateToken(req.user);
    res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);

// GET /dev-login — Quick local demo login without GCP credentials configured
router.get('/dev-login', async (_req, res) => {
  try {
    let user = await prisma.user.findFirst({
      where: { email: 'demo@reachinbox.ai' },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          googleId: 'demo-google-id-12345',
          name: 'Demo Reviewer',
          email: 'demo@reachinbox.ai',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ReachInbox',
        },
      });
    }

    const token = generateToken(user as Express.User);
    res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${token}`);
  } catch (error) {
    console.error('Dev login error:', error);
    res.redirect(`${env.FRONTEND_URL}/?error=dev_login_failed`);
  }
});

// GET /me — Fetch current authenticated user
router.get('/me', authenticateJWT, (req, res) => {
  res.json({ user: req.user });
});

export default router;
