import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import passport from 'passport';
import session from 'express-session';
import type { Express, RequestHandler } from 'express';
import connectPg from 'connect-pg-simple';
import { storage } from './storage';

// Global variables to hold the openid-client components
let authorizationCodeGrant: any;
let buildAuthorizationUrl: any;
let buildEndSessionUrl: any;
let refreshTokenGrant: any;
let fetchUserInfo: any;
let issuerConfig: any;

// Initialize openid-client components
async function initializeOpenIdClient() {
  const openidClient = await import('openid-client');
  
  // In openid-client v6+, use these functions directly
  authorizationCodeGrant = openidClient.authorizationCodeGrant;
  buildAuthorizationUrl = openidClient.buildAuthorizationUrl;
  buildEndSessionUrl = openidClient.buildEndSessionUrl;
  refreshTokenGrant = openidClient.refreshTokenGrant;
  fetchUserInfo = openidClient.fetchUserInfo;
  
  // Use discovery to get the issuer configuration
  issuerConfig = await openidClient.discovery(new URL('https://replit.com/oidc'), process.env.REPL_ID!, {
    algorithm: 'none',
  });
}


export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: 'sessions',
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: TokenSet,
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = tokens.expires_at;
}

async function upsertUser(claims: UserinfoResponse) {
  await storage.upsertUser({
    id: claims.sub,
    email: claims.email,
    firstName: claims.name,
    profileImageUrl: claims.picture,
  });
}

export async function setupAuth(app: Express) {
  // Initialize openid-client components first
  await initializeOpenIdClient();
  
  app.set('trust proxy', 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Local Strategy for username/password with debugging
  passport.use(
    new LocalStrategy(
      { usernameField: 'username', passwordField: 'password' },
      async (username, password, done) => {
        try {
          console.log(`[AUTH DEBUG] Attempting to authenticate user: ${username}`);
          const user = await storage.getUserByUsername(username);

          if (!user || !user.passwordHash) {
            console.log(`[AUTH DEBUG] User not found or no password hash for: ${username}`);
            return done(null, false, {
              message: 'Invalid username or password',
            });
          }

          console.log(`[AUTH DEBUG] User found: ${user.id}. Comparing password...`);
          const isValid = await bcrypt.compare(password, user.passwordHash);
          console.log(`[AUTH DEBUG] Password validation result for ${username}: ${isValid}`);

          if (!isValid) {
            console.log(`[AUTH DEBUG] Password incorrect for ${username}.`);
            return done(null, false, {
              message: 'Invalid username or password',
            });
          }

          console.log(`[AUTH DEBUG] Authentication successful for ${username}.`);

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
          console.error('[AUTH DEBUG] Error in LocalStrategy:', error);
          return done(error);
        }
      },
    ),
  );

  // Custom Replit OAuth Strategy for openid-client v6+
  class ReplitOAuthStrategy extends passport.Strategy {
    constructor(public domain: string) {
      super();
      this.name = `replitauth:${domain}`;
    }

    authenticate(req: any, options: any) {
      if (req.query.code) {
        // Handle callback
        this.handleCallback(req, options);
      } else {
        // Redirect to authorization
        this.redirectToAuth(req, options);
      }
    }

    async redirectToAuth(req: any, options: any) {
      try {
        const authUrl = buildAuthorizationUrl(issuerConfig, process.env.REPL_ID!, {
          redirect_uri: `https://${this.domain}/api/callback`,
          scope: 'openid email profile offline_access',
          state: 'random-state',
        });
        
        this.redirect(authUrl.href);
      } catch (err) {
        this.error(err);
      }
    }

    async handleCallback(req: any, options: any) {
      try {
        const tokenResponse = await authorizationCodeGrant(
          issuerConfig,
          process.env.REPL_ID!,
          req.query.code,
          `https://${this.domain}/api/callback`,
          'none'
        );

        const userInfo = await fetchUserInfo(issuerConfig, tokenResponse.access_token);
        
        const user: any = { ...userInfo };
        updateUserSession(user, tokenResponse);
        await upsertUser(userInfo);
        
        this.success(user);
      } catch (err) {
        this.error(err);
      }
    }
  }

  for (const domain of (process.env.REPLIT_DOMAINS ?? '').split(',')) {
    if (!domain) continue;
    const strategy = new ReplitOAuthStrategy(domain);
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // OAuth login endpoint
  app.get('/api/login/oauth', (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: 'login consent',
      scope: ['openid', 'email', 'profile', 'offline_access'],
    })(req, res, next);
  });

  // Legacy OAuth endpoint for backwards compatibility
  app.get('/api/login', (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: 'login consent',
      scope: ['openid', 'email', 'profile', 'offline_access'],
    })(req, res, next);
  });

  app.get('/api/callback', (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: '/',
      failureRedirect: '/api/login',
    })(req, res, next);
  });

  app.get('/api/logout', (req, res) => {
    req.logout(() => {
      res.redirect(
        buildEndSessionUrl(issuerConfig, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href,
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (user.authProvider === 'local') {
    return next();
  }

  if (!user.expires_at) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  try {
    const tokenResponse = await refreshTokenGrant(issuerConfig, process.env.REPL_ID!, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }
};