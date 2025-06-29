import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { processBattleAction } from "./battleEngine";

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

  // --- MONSTER LAB ---
  app.get("/api/monster-lab-data", isAuthenticated, async (req: any, res) => {
    try {
      const data = await storage.getMonsterLabData(req.user.claims.sub);
      res.json(data);
    } catch (error) {
      handleError(error, res, "Failed to fetch Monster Lab data");
    }
  });

  // This specific route is left for other potential uses, but MonsterLab now uses the combined endpoint
  app.get("/api/monster-abilities/:monsterId", isAuthenticated, async (req: any, res) => {
    try {
      const monsterId = parseInt(req.params.monsterId);
      if (isNaN(monsterId)) { return res.status(400).json({ message: "Invalid monster ID" }); }
      const abilities = await storage.getMonsterAbilities(monsterId);
      res.json(abilities);
    } catch (error) { handleError(error, res, "Failed to fetch monster abilities"); }
  });

  // --- BATTLE ARENA ---
  app.get('/api/user/battle-slots', isAuthenticated, async (req: any, res) => {
    try {
        const slots = await storage.getUserBattleSlots(req.user.claims.sub);
        res.json({ battleSlots: slots });
    } catch (error) { handleError(error, res, "Failed to fetch battle slots"); }
  });

  app.post('/api/battle/generate-opponent', isAuthenticated, async (req: any, res) => {
    try {
      const aiOpponent = await storage.generateAiOpponent(0);
      res.json(aiOpponent);
    } catch (error) { handleError(error, res, "Failed to generate opponent"); }
  });

  app.post('/api/battle/spend-token', isAuthenticated, async (req: any, res) => {
    try {
        await storage.spendBattleToken(req.user.claims.sub);
        res.json({ message: 'Battle token spent' });
    } catch (error) { handleError(error, res, "Failed to spend battle token"); }
  });

  // --- SERVER-SIDE BATTLE ENGINE ENDPOINT ---
  app.post('/api/battle/action', isAuthenticated, async (req: any, res) => {
    try {
      const { battleState, action } = req.body;
      if (!battleState || !action) {
        return res.status(400).json({ message: "Missing battleState or action in request body." });
      }
      const result = await processBattleAction(battleState, action);
      res.json(result);
    } catch (error) {
      handleError(error, res, "Failed to process battle action");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}