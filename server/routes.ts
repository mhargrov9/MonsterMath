import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { isAuthenticated } from "./replitAuth.js";
import { battleEngine } from "./battleEngine.js";
import { TurnAction } from "./types/battle.js";

const handleError = (error: unknown, res: express.Response, message: string) => {
  console.error(`[${new Date().toISOString()}] Error in ${message}:`, {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : 'No stack trace',
    code: (error as any)?.code,
    details: (error as any)?.details
  });
  
  const statusCode = (error as any)?.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      code: (error as any)?.code || 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      path: res.req?.originalUrl || '/',
      method: res.req?.method || 'GET'
    }
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize authentication system first
  const { setupAuth } = await import('./replitAuth.js');
  await setupAuth(app);
  
  // API versioning for professional scalability
  const apiV1 = express.Router();
  app.use('/api/v1', apiV1);

  // User data endpoints
  app.get('/api/user', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User ID not found in session' });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      res.json({ success: true, data: user });
    } catch (error) {
      handleError(error, res, 'GET /api/user');
    }
  });

  // Monster Lab endpoints
  app.get('/api/monster-lab', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'User ID not found in session' });
      }

      const labData = await storage.getMonsterLabData(userId);
      res.json({ success: true, data: labData });
    } catch (error) {
      handleError(error, res, 'GET /api/monster-lab');
    }
  });

  // Monster abilities endpoint
  app.get('/api/monster-abilities/:monsterId', async (req, res) => {
    try {
      const monsterId = parseInt(req.params.monsterId);
      if (isNaN(monsterId)) {
        return res.status(400).json({ success: false, error: 'Invalid monster ID' });
      }

      const abilities = await storage.getMonsterAbilities(monsterId);
      res.json({ success: true, data: abilities });
    } catch (error) {
      handleError(error, res, 'GET /api/monster-abilities/:monsterId');
    }
  });

  // Learning system endpoints
  app.get('/api/question', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { subject = 'mixed', difficulty = 1 } = req.query;
      
      const question = await storage.getQuestion(userId, subject as string, parseInt(difficulty as string));
      
      if (!question) {
        return res.status(404).json({ success: false, error: 'No questions available' });
      }

      res.json({ success: true, data: question });
    } catch (error) {
      handleError(error, res, 'GET /api/question');
    }
  });

  app.post('/api/question/answer', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { questionId, isCorrect, goldReward } = req.body;

      const updatedUser = await storage.saveQuestionResult(userId, questionId, isCorrect, goldReward);
      res.json({ success: true, data: updatedUser });
    } catch (error) {
      handleError(error, res, 'POST /api/question/answer');
    }
  });

  // Battle system endpoints
  app.post('/api/battle/generate-opponent', isAuthenticated, async (req, res) => {
    try {
      const { teamPowerLevel } = req.body;
      
      if (!teamPowerLevel || typeof teamPowerLevel !== 'number') {
        return res.status(400).json({ success: false, error: 'Valid team power level required' });
      }

      const opponent = await storage.generateAiOpponent(teamPowerLevel);
      
      if (!opponent) {
        return res.status(404).json({ success: false, error: 'No suitable opponent found' });
      }

      res.json({ success: true, data: opponent });
    } catch (error) {
      handleError(error, res, 'POST /api/battle/generate-opponent');
    }
  });

  app.post('/api/battle/spend-token', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const updatedUser = await storage.spendBattleToken(userId);
      res.json({ success: true, data: updatedUser });
    } catch (error) {
      handleError(error, res, 'POST /api/battle/spend-token');
    }
  });

  app.post('/api/battle/award-xp', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const { xp } = req.body;
      
      if (!xp || typeof xp !== 'number') {
        return res.status(400).json({ success: false, error: 'Valid XP amount required' });
      }

      const updatedUser = await storage.awardRankXp(userId, xp);
      res.json({ success: true, data: updatedUser });
    } catch (error) {
      handleError(error, res, 'POST /api/battle/award-xp');
    }
  });

  // Development endpoints
  app.post('/api/dev/add-tokens', isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Add 5 battle tokens for development
      const updatedUser = await storage.upsertUser({
        ...user,
        battleTokens: user.battleTokens + 5
      });

      res.json({ success: true, data: updatedUser });
    } catch (error) {
      handleError(error, res, 'POST /api/dev/add-tokens');
    }
  });

  // Static file serving for attached assets
  app.use('/attached_assets', express.static('attached_assets'));

  const server = createServer(app);
  return server;
}