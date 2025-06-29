import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";

// Standardized error handler
const handleError = (error: unknown, res: express.Response, message: string) => {
  console.error(message, error);
  res.status(500).json({
    message,
    error: error instanceof Error ? error.message : 'Unknown error'
  });
};

// Input validation helpers
const validateTPL = (tpl: any): number => {
  const parsed = parseInt(tpl);
  if (isNaN(parsed) || parsed < 1) { throw new Error("Invalid TPL (must be positive number)");}
  return parsed;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // All API routes are protected
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      res.json(user);
    } catch (error) { handleError(error, res, "Failed to fetch user"); }
  });

  app.get("/api/monsters", isAuthenticated, async (req, res) => {
    try {
      const monsters = await storage.getAllMonsters();
      res.json(monsters);
    } catch (error) { handleError(error, res, "Failed to fetch monsters"); }
  });

  app.get("/api/user/monsters", isAuthenticated, async (req: any, res) => {
    try {
      const userMonsters = await storage.getUserMonsters(req.user.claims.sub);
      res.json(userMonsters);
    } catch (error) { handleError(error, res, "Failed to fetch user monsters"); }
  });

  app.get("/api/monster-abilities/:monsterId", isAuthenticated, async (req: any, res) => {
    try {
      const monsterId = parseInt(req.params.monsterId);
      if (isNaN(monsterId)) { return res.status(400).json({ message: "Invalid monster ID" }); }
      const abilities = await storage.getMonsterAbilities(monsterId);
      res.json(abilities);
    } catch (error) { handleError(error, res, "Failed to fetch monster abilities"); }
  });

  app.get('/api/user/battle-slots', isAuthenticated, async (req: any, res) => {
    try {
        const slots = await storage.getUserBattleSlots(req.user.claims.sub);
        res.json({ battleSlots: slots });
    } catch (error) { handleError(error, res, "Failed to fetch battle slots"); }
  });

  app.post('/api/battle/generate-opponent', isAuthenticated, async (req: any, res) => {
    try {
      const validatedTPL = validateTPL(req.body.tpl);
      const aiOpponent = await storage.generateAiOpponent(validatedTPL);
      res.json(aiOpponent);
    } catch (error) { handleError(error, res, "Failed to generate opponent"); }
  });

  app.post('/api/battle/spend-token', isAuthenticated, async (req: any, res) => {
    try {
        await storage.spendBattleToken(req.user.claims.sub);
        res.json({ message: 'Battle token spent' });
    } catch (error) { handleError(error, res, "Failed to spend battle token"); }
  });

  app.post('/api/battle/complete', isAuthenticated, async (req: any, res) => {
    try {
      const { winnerId } = req.body;
      if (!winnerId) { return res.status(400).json({ message: 'Winner ID is required.' }); }
      await storage.awardRankXp(winnerId, 50);
      res.json({ message: `Awarded 50 XP.`});
    } catch(error) { handleError(error, res, "Failed to complete battle and award XP"); }
  });

  // The complex and fragile /api/generate/monster-image endpoint has been removed.
  // Images are now served as static assets directly, which is more robust and scalable.

  const httpServer = createServer(app);
  return httpServer;
}