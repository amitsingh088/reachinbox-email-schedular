import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import prisma from '../config/database';

// Type augmentation for Express Request
declare global {
  namespace Express {
    interface User {
      id: string;
      googleId: string;
      name: string;
      email: string;
      avatar?: string | null;
      slackWebhookUrl?: string | null;
    }
  }
}

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
    },
    async (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: (error: any, user?: Express.User | false) => void
    ) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error('No email found in Google profile'));
        }

        // Find or create user
        let user = await prisma.user.findUnique({
          where: { googleId: profile.id },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              googleId: profile.id,
              name: profile.displayName,
              email,
              avatar: profile.photos?.[0]?.value || null,
            },
          });
          console.log(`👤 New user created: ${user.email}`);
        }

        return done(null, user as Express.User);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Serialize/deserialize for session support (not strictly needed for JWT, but Passport expects it)
passport.serializeUser((user: Express.User, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user as Express.User | null);
  } catch (error) {
    done(error, null);
  }
});

// JWT token generation
export const generateToken = (user: Express.User): string => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// JWT authentication middleware
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query.token && typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      res.status(401).json({ error: 'Authorization token required' });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      name: string;
      avatar?: string;
    };

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = user as Express.User;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired' });
      return;
    }
    res.status(500).json({ error: 'Authentication failed' });
  }
};

export default passport;
