import type { Express } from 'express';
import { type Server, createServer } from 'http';
import express from 'express';
import { storage } from './storage.js';
import { isAuthenticated, setupAuth } from './replitAuth.js';
import passport from 'passport';
import bcrypt from 'bcrypt';

const handleError = (error: unknown, res: express.Response, message: string) => {
  console.error(message, error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  res.status(500).json({
    success: false,
    error: {
      message,
      details: errorMessage,
      timestamp: new Date().toISOString(),
    },
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);
  const apiV1 = express.Router();
  app.use('/api/v1', apiV1);

  // --- AUTHENTICATION ROUTES ---

  apiV1.post('/auth/register', async (req, res, next) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !password || !email) {
        return res
          .status(400)
          .json({ success: false, error: { message: 'Missing credentials' } });
      }
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res
          .status(409)
          .json({ success: false, error: { message: 'Username already exists' } });
      }
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      await storage.createLocalUser(username, email, passwordHash);
      res.status(201).json({ success: true, data: { message: 'User registered successfully' } });
    } catch (error) {
      handleError(error, res, 'Failed to register user');
    }
  });

  // --- UPDATED LOGIN ROUTE ---
  apiV1.post('/auth/login', passport.authenticate('local'), (req, res, next) => {
    // Manually call req.login to establish a persistent session
    req.login(req.user, (err) => {
      if (err) {
        return next(err);
      }
      return res.json({ success: true, data: { message: 'Login successful' } });
    });
  });

  // --- DATA ROUTES ---

  apiV1.get('/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      res.json({ success: true, data: user });
    } catch (error) {
      handleError(error, res, 'Failed to fetch user');
    }
  });

  apiV1.get('/monster-lab-data', isAuthenticated, async (req: any, res) => {
    try {
      const data = await storage.getMonsterLabData(req.user.claims.sub);
      res.json({ success: true, data });
    } catch (error) {
      handleError(error, res, 'Failed to fetch Monster Lab data');
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}