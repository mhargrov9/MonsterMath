import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { isAuthenticated, setupAuth } from "./replitAuth.js";
import { battleEngine } from "./battleEngine.js";
import { battleSessionManager } from "./services/BattleSessionManager.js";
import { TurnAction } from "./types/battle.js";

const handleError = (error: unknown, res: express.Response, message: string) => {
  console.error(message, error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';

  // Professional error response format
  res.status(500).json({
    success: false,
    error: {
      message,
      details: errorMessage,
      timestamp: new Date().toISOString()
    }
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize authentication system first
  await setupAuth(app);
  
  // API versioning for professional scalability
  const apiV1 = express.Router();
  app.use('/api/v1', apiV1);

  // Health check endpoint
  apiV1.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      sessionStats: battleSessionManager.getStats()
    });
  });

  // Authentication endpoints
  apiV1.get('/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      res.json({ success: true, data: user });
    } catch (error) { 
      handleError(error, res, "Failed to fetch user"); 
    }
  });

  // Monster Lab data endpoint
  apiV1.get("/monster-lab-data", isAuthenticated, async (req: any, res) => {
    try {
      const data = await storage.getMonsterLabData(req.user.claims.sub);
      res.json({ success: true, data });
    } catch (error) {
      handleError(error, res, "Failed to fetch Monster Lab data");
    }
  });

  // Battle Slots endpoint
  apiV1.get('/user/battle-slots', isAuthenticated, async (req: any, res) => {
    try {
      const slots = await storage.getUserBattleSlots(req.user.claims.sub);
      res.json({ success: true, data: { battleSlots: slots } });
    } catch (error) {
      handleError(error, res, "Failed to fetch battle slots");
    }
  });

  // ======================
  // BATTLE SESSION ENDPOINTS
  // ======================

  // Create new battle session
  apiV1.post('/battles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { playerTeam } = req.body;

      if (!playerTeam || !Array.isArray(playerTeam) || playerTeam.length === 0) {
        return res.status(400).json({
          success: false,
          error: { message: "Invalid player team" }
        });
      }

      // Spend battle token
      await storage.spendBattleToken(userId);

      // Generate AI opponent
      const tpl = playerTeam.reduce((sum: number, m: any) => sum + m.level, 0);
      const aiOpponent = await storage.generateAiOpponent(tpl);

      // Create battle session
      const battleId = battleSessionManager.createSession(
        userId,
        playerTeam,
        aiOpponent.scaledMonsters
      );

      res.json({
        success: true,
        data: {
          battleId,
          aiTeam: aiOpponent.scaledMonsters
        }
      });
    } catch (error: any) {
      if (error.message === 'BATTLE_ALREADY_IN_PROGRESS') {
        return res.status(409).json({
          success: false,
          error: { message: "You already have an active battle" }
        });
      }
      if (error.message === 'NO_BATTLE_TOKENS') {
        return res.status(403).json({
          success: false,
          error: { message: "No battle tokens available" }
        });
      }
      handleError(error, res, "Failed to create battle");
    }
  });

  // Get battle state
  apiV1.get('/battles/:battleId', isAuthenticated, async (req: any, res) => {
    try {
      const session = battleSessionManager.getSession(
        req.params.battleId,
        req.user.claims.sub
      );

      if (!session) {
        return res.status(404).json({
          success: false,
          error: { message: "Battle not found or expired" }
        });
      }

      res.json({
        success: true,
        data: session.state
      });
    } catch (error: any) {
      if (error.message === 'UNAUTHORIZED_ACCESS') {
        return res.status(403).json({
          success: false,
          error: { message: "Unauthorized access to battle" }
        });
      }
      handleError(error, res, "Failed to fetch battle state");
    }
  });

  // Process a turn
  apiV1.post('/battles/:battleId/turn', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { battleId } = req.params;
      const { action, isPlayerTurn } = req.body;

      // Validate request
      if (!action || typeof isPlayerTurn !== 'boolean') {
        return res.status(400).json({
          success: false,
          error: { message: "Invalid turn data" }
        });
      }

      // Get current session
      const session = battleSessionManager.getSession(battleId, userId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: { message: "Battle not found or expired" }
        });
      }

      // Validate turn order
      const expectedTurn = session.state.currentTurn === 'player';
      if (isPlayerTurn !== expectedTurn) {
        return res.status(400).json({
          success: false,
          error: { message: `It's not ${isPlayerTurn ? 'player' : 'AI'} turn` }
        });
      }

      // Process the turn
      let turnAction: TurnAction;
      if (isPlayerTurn) {
        turnAction = action;
      } else {
        // Generate AI action
        turnAction = battleEngine.generateAiAction(session.state);
      }

      const result = await battleEngine.processTurn(
        session.state,
        turnAction,
        isPlayerTurn
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: { message: result.error || "Failed to process turn" }
        });
      }

      // Update session with new state
      battleSessionManager.updateSession(battleId, userId, result.nextState);

      // Check if battle ended
      let rewards = null;
      if (result.nextState.status !== 'active') {
        // Award rewards
        if (result.nextState.status === 'victory') {
          const user = await storage.awardRankXp(userId, 20);
          rewards = { rankXp: 20 };
        }

        // Clean up session
        battleSessionManager.endSession(battleId);
      }

      res.json({
        success: true,
        data: {
          state: result.nextState,
          log: result.log,
          rewards
        }
      });
    } catch (error) {
      handleError(error, res, "Failed to process turn");
    }
  });

  // End battle (forfeit)
  apiV1.post('/battles/:battleId/end', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { battleId } = req.params;

      const session = battleSessionManager.getSession(battleId, userId);
      if (!session) {
        return res.status(404).json({
          success: false,
          error: { message: "Battle not found" }
        });
      }

      // Process forfeit
      const forfeitAction: TurnAction = {
        type: 'FORFEIT',
        payload: {}
      };

      const result = await battleEngine.processTurn(
        session.state,
        forfeitAction,
        true // Player is forfeiting
      );

      // Clean up
      battleSessionManager.endSession(battleId);

      res.json({
        success: true,
        data: {
          message: "Battle ended",
          finalState: result.nextState
        }
      });
    } catch (error) {
      handleError(error, res, "Failed to end battle");
    }
  });

  // Get active battle for user
  apiV1.get('/battles/active', isAuthenticated, async (req: any, res) => {
    try {
      const session = battleSessionManager.getUserBattle(req.user.claims.sub);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: { message: "No active battle" }
        });
      }

      res.json({
        success: true,
        data: {
          battleId: session.id,
          state: session.state
        }
      });
    } catch (error) {
      handleError(error, res, "Failed to fetch active battle");
    }
  });

  // Legacy endpoints - redirect to v1
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      res.json(user);
    } catch (error) { 
      handleError(error, res, "Failed to fetch user"); 
    }
  });

  app.get("/api/monster-lab-data", isAuthenticated, async (req: any, res) => {
    try {
      const data = await storage.getMonsterLabData(req.user.claims.sub);
      res.json(data);
    } catch (error) {
      handleError(error, res, "Failed to fetch Monster Lab data");
    }
  });

  app.post('/api/battle/generate-opponent', isAuthenticated, async (req: any, res) => {
    try {
      const aiOpponent = await storage.generateAiOpponent(0);
      res.json(aiOpponent);
    } catch (error) { 
      handleError(error, res, "Failed to generate opponent"); 
    }
  });

  app.post('/api/battle/spend-token', isAuthenticated, async (req: any, res) => {
    await storage.spendBattleToken(req.user.claims.sub);
    res.json({ success: true });
  });

  app.post('/api/battle/action', isAuthenticated, async (req: any, res) => {
    try {
      const { battleState, action } = req.body;
      if (!battleState || !action) {
        return res.status(400).json({ message: "Missing battleState or action in request body." });
      }
      const result = await processAction(battleState, action);
      res.json(result);
    } catch (error) {
      handleError(error, res, "Failed to process battle action");
    }
  });

  app.post('/api/battle/ai-action', isAuthenticated, async (req: any, res) => {
    try {
      const { battleState } = req.body;
      if (!battleState) {
        return res.status(400).json({ message: "Missing battleState in request body." });
      }
      const aiAction = getAiAction(battleState);
      res.json(aiAction);
    } catch (error) {
      handleError(error, res, "Failed to get AI action");
    }
  });

  app.get('/api/user/battle-slots', isAuthenticated, async (req: any, res) => {
    const slots = await storage.getUserBattleSlots((req.user as any).claims.sub);
    res.json({ battleSlots: slots });
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Legacy helper functions (will be removed later)
function processAction(battleState: any, action: any) {
  // This is a temporary stub - the real logic is in battleEngine
  return Promise.resolve(battleState);
}

function getAiAction(battleState: any) {
  // This is a temporary stub - the real logic is in battleEngine
  return { type: 'USE_ABILITY', payload: { abilityId: 1, targetId: 1 } };
}