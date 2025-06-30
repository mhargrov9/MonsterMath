import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { processAction, getAiAction } from "./battleEngine"; // Updated import

const handleError = (error: unknown, res: express.Response, message: string) => {
  console.error(message, error);
  res.status(500).json({
    message,
    error: error instanceof Error ? error.message : 'Unknown error'
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // --- AUTH & USER ---
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      res.json(user);
    } catch (error) { handleError(error, res, "Failed to fetch user"); }
  });

  // --- MONSTER LAB & DATA ---
  app.get("/api/monster-lab-data", isAuthenticated, async (req: any, res) => {
    try {
      const data = await storage.getMonsterLabData(req.user.claims.sub);
      res.json(data);
    } catch (error) {
      handleError(error, res, "Failed to fetch Monster Lab data");
    }
  });

  // --- BATTLE ARENA ---
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

  // Player action endpoint
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

  // AI action endpoint
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


  // Other routes...
  app.get("/api/monster-abilities/:monsterId", isAuthenticated, async (req: any, res) => { /* ... */ });
  app.get('/api/user/battle-slots', isAuthenticated, async (req: any, res) => { /* ... */ });
  app.get('/api/questions', isAuthenticated, async (req: any, res) => { /* ... */ });
  app.post('/api/questions/answer', isAuthenticated, async (req: any, res) => { /* ... */ });
  app.get('/api/inventory', isAuthenticated, async (req: any, res) => { /* ... */ });


  const httpServer = createServer(app);
  return httpServer;
}