import * as client from 'openid-client';
import { Strategy, type VerifyFunction } from 'openid-client/passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';

import passport from 'passport';
import session from 'express-session';
import type { Express, RequestHandler } from 'express';
import memoize from 'memoizee';
import connectPg from 'connect-pg-simple';
import { storage } from './storage';

const getOidcConfig = memoize(
  async () => {
    // This check is now safer.
    if (!process.env.ISSUER_URL) {
      console.warn('OIDC issuer URL not provided, Replit auth may not function.');
      return null;
    }
    return await client.discovery(
      new URL(process.env.ISSUER_URL),
      process.env.REPL_ID!,
    );
  },
  { maxAge: 3600 * 1000 },
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const PgStore = connectPg(session);
  const sessionStore = new PgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true, // Set to true to ensure table exists in new DB
    tableName: 'sessions',
  });
  return session({
    secret: process.env.SESSION_SECRET || 'a-default-secret-for-dev', // Provide a default for dev
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Secure only in production
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await storage.upsertUser({
    id: claims['sub'],
    email: claims['email'],
    firstName: claims['first_name'],
    lastName: claims['last_name'],
    profileImageUrl: claims['profile_image_url'],
  });
}

export async function setupAuth(app: Express) {
  app.set('trust proxy', 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy for username/password (remains unchanged)
  passport.use(
    new LocalStrategy(
      { usernameField: 'username', passwordField: 'password' },
      async (username: string, password: string, done) => {
        try {
          const user = await storage.getUserByUsername(username);
          if (!user || !user.passwordHash) {
            return done(null, false, { message: 'Invalid username or password' });
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);
          if (!isValid) {
            return done(null, false, { message: 'Invalid username or password' });
          }

          const sessionUser = {
            claims: {
              sub: user.id,
              email: user.email,
              first_name: user.firstName,
              last_name: user.lastName,
              profile_image_url: user.profileImageUrl,
            },
            authProvider: 'local',
          };

          return done(null, sessionUser);
        } catch (error) {
          return done(error);
        }
      },
    ),
  );

  // --- REPLIT OAUTH FIX ---
  // The Replit-specific setup is now wrapped in a condition to only run
  // if the necessary environment variables are present.
  if (process.env.REPLIT_DOMAINS && process.env.ISSUER_URL) {
    console.log('REPLIT_DOMAINS detected, setting up Replit OAuth...');
    const config = await getOidcConfig();

    if (config) {
        const verify: VerifyFunction = async (
          tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
          verified: passport.AuthenticateCallback,
        ) => {
          const user = {};
          updateUserSession(user, tokens);
          await upsertUser(tokens.claims());
          verified(null, user);
        };

        for (const domain of process.env.REPLIT_DOMAINS.split(',')) {
          const strategy = new Strategy(
            {
              name: `replitauth:${domain}`,
              client: new config.Client({ client_id: process.env.REPL_ID! }),
              params: {
                scope: "openid email profile offline_access",
                redirect_uri: `https://${domain}/api/callback`,
              },
            },
            verify,
          );
          passport.use(strategy);
        }

        // OAuth login endpoint
        app.get('/api/login/oauth', (req, res, next) => {
          passport.authenticate(`replitauth:${req.hostname}`, {
            prompt: 'login consent',
          })(req, res, next);
        });

        app.get('/api/callback', (req, res, next) => {
          passport.authenticate(`replitauth:${req.hostname}`, {
            successReturnToOrRedirect: '/',
            failureRedirect: '/api/login',
          })(req, res, next);
        });

        app.get('/api/logout', (req, res, next) => {
            if (!req.user) return res.redirect('/');
            req.logout((err) => {
                if(err) { return next(err); }
                const endSessionUrl = client.buildEndSessionUrl(config, {
                    client_id: process.env.REPL_ID!,
                    post_logout_redirect_uri: `https://${req.hostname}`,
                });
                res.redirect(endSessionUrl.href);
            });
        });
    }
  } else {
    console.log('REPLIT_DOMAINS not detected, skipping Replit OAuth setup.');
  }

  passport.serializeUser((user: any, cb) => {
    process.nextTick(() => {
        cb(null, user);
    });
  });
  
  passport.deserializeUser((user: any, cb) => {
    process.nextTick(() => {
        cb(null, user);
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'Unauthorized' });
};