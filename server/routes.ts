import type { Express } from 'express';
import express from 'express';
import { createServer, type Server } from 'http';
import { storage } from './storage';
import { setupAuth, isAuthenticated } from './replitAuth';
import {
  createBattleSession,
  performAction,
} from './battleEngine';
import passport from 'passport';
import fs from 'fs';
import path from 'path';

// Standardized error handler
const handleError = (
  error: unknown,
  res: express.Response,
  message: string,
) => {
  console.error(message, error);
  res.status(500).json({
    message,
    error: error instanceof Error ? error.message : 'Unknown error',
  });
};

// Input validation helpers
const validateMonsterId = (id: any): number => {
  const parsed = parseInt(id);
  if (isNaN(parsed) || parsed < 1) {
    throw new Error('Invalid monster ID');
  }
  return parsed;
};

const validateTPL = (tpl: any): number => {
  const parsed = parseInt(tpl);
  if (isNaN(parsed) || parsed < 1) {
    throw new Error('Invalid TPL (must be positive number)');
  }
  return parsed;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Add middleware to parse JSON and URL-encoded bodies.
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve uploaded monster assets
  app.use('/assets', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
  app.use('/assets', express.static('attached_assets'));

  // Serve static files from the public directory
  app.use(express.static('public'));

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      handleError(error, res, 'Failed to fetch user');
    }
  });

  // Local registration endpoint
  app.post('/api/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res
          .status(400)
          .json({ message: 'Username, email, and password are required' });
      }
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createLocalUser(username, email, passwordHash);
      res.status(201).json({ message: 'Account created', userId: user.id });
    } catch (error) {
      handleError(error, res, 'Failed to create account');
    }
  });

  // Local login endpoint
  app.post('/api/login/local', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) return res.status(500).json({ message: 'Authentication error' });
      if (!user) return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      req.logIn(user, (err) => {
        if (err) return res.status(500).json({ message: 'Login error' });
        res.json({ message: 'Login successful', user: { id: user.claims.sub } });
      });
    })(req, res, next);
  });

  // Game routes
  app.get('/api/monsters', isAuthenticated, async (req, res) => {
    try {
      const monsters = await storage.getAllMonsters();
      res.json(monsters);
    } catch (error) {
      handleError(error, res, 'Failed to fetch monsters');
    }
  });

  app.get('/api/user/monsters', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userMonsters = await storage.getUserMonsters(userId);
      res.json(userMonsters);
    } catch (error) {
      handleError(error, res, 'Failed to fetch user monsters');
    }
  });

  app.post('/api/monsters/with-abilities', isAuthenticated, async (req: any, res) => {
      try {
        const userMonsters = req.body.monsters;
        if (!userMonsters || !Array.isArray(userMonsters)) {
          return res.status(400).json({ message: 'Invalid monster data provided.' });
        }
        const populatedMonsters = await storage.populateMonstersWithAbilities(userMonsters);
        res.json(populatedMonsters);
      } catch (error) {
        handleError(error, res, 'Failed to fetch monsters with abilities');
      }
    }
  );

  app.post('/api/monsters/purchase', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { monsterId } = req.body;
      const validatedMonsterId = validateMonsterId(monsterId);
      const userMonster = await storage.purchaseMonster(userId, validatedMonsterId);
      res.json(userMonster);
    } catch (error) {
      res.status(400).json({
        message:
          error instanceof Error ? error.message : 'Failed to purchase monster',
      });
    }
  });

  app.post('/api/battle/generate-opponent', isAuthenticated, async (req: any, res) => {
      try {
        const { tpl } = req.body;
        const validatedTPL = validateTPL(tpl);
        const aiOpponent = await storage.generateAiOpponent(validatedTPL);
        res.json(aiOpponent);
      } catch (error) {
        handleError(error, res, 'Failed to generate opponent');
      }
    },
  );

  app.post('/api/battle/create', isAuthenticated, async (req: any, res) => {
    try {
      const { playerTeam, opponentTeam, playerLeadMonsterIndex } = req.body;
      if (!playerTeam || !opponentTeam || playerLeadMonsterIndex === undefined) {
        return res.status(400).json({ message: 'Missing required battle data.' });
      }
      const battleSession = await createBattleSession(
        playerTeam,
        opponentTeam,
        playerLeadMonsterIndex,
      );
      res.json(battleSession);
    } catch (error) {
      handleError(error, res, 'Failed to create battle session');
    }
  });

  app.post('/api/battle/perform-action', isAuthenticated, async (req: any, res) => {
      try {
        const { battleId, abilityId, targetId } = req.body;

        if (!battleId || abilityId === undefined) {
          return res.status(400).json({
            message: 'Missing required battle data (battleId, abilityId)',
          });
        }

        const actionResult = await performAction(battleId, abilityId, targetId);
        res.json(actionResult);
      } catch (error) {
        handleError(error, res, 'Failed to perform battle action');
      }
    },
  );

  app.post('/api/battle/spend-token', isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.spendBattleToken(userId);
        res.json({ message: 'Battle token spent', user, battleTokens: user.battleTokens });
      } catch (error) {
        if (error instanceof Error && error.message.includes('NO_BATTLE_TOKENS')) {
          res.status(400).json({ message: 'NO_BATTLE_TOKENS' });
        } else {
          handleError(error, res, 'Failed to spend battle token');
        }
      }
    },
  );

  // Add a new route specifically for test setup
  app.post('/api/test/reset', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ 
          message: 'Missing required fields', 
          received: { username, email, password } 
        });
      }
      
      await storage.resetTestUser(username, email, password);
      res.status(200).json({ message: 'Test user reset successfully.' });
    } catch (error) {
      handleError(error, res, 'Failed to reset test user');
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}