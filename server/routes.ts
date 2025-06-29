import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { processTurn } from "./battleEngine"; // Updated import

const handleError = (error: unknown, res: express.Response, message: string) => {
  console.error(message, error);
  res.status(500).json({
    message,
    error: error instanceof Error ? error.message : 'Unknown error'
  });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // All other routes remain the same...
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      res.json(user);
    } catch (error) { handleError(error, res, "Failed to fetch user"); }
  });

  app.get("/api/monster-lab-data", isAuthenticated, async (req: any, res) => {
    try {
      const data = await storage.getMonsterLabData(req.user.claims.sub);
      res.json(data);
    } catch (error) {
      handleError(error, res, "Failed to fetch Monster Lab data");
    }
  });

  app.get("/api/monster-abilities/:monsterId", isAuthenticated, async (req: any, res) => {
    try {
      const monsterId = parseInt(req.params.monsterId as string);
      if (isNaN(monsterId)) { return res.status(400).json({ message: "Invalid monster ID" }); }
      const abilities = await storage.getMonsterAbilities(monsterId);
      res.json(abilities);
    } catch (error) { handleError(error, res, "Failed to fetch monster abilities"); }
  });

  // --- BATTLE ARENA ---
  app.post('/api/battle/action', isAuthenticated, async (req: any, res) => {
    try {
      const { battleState, action } = req.body;
      if (!battleState || !action) {
        return res.status(400).json({ message: "Missing battleState or action in request body." });
      }
      // --- THIS IS THE FIX ---
      // Call the new orchestrator function
      const result = await processTurn(battleState, action);
      res.json(result);
    } catch (error) {
      handleError(error, res, "Failed to process battle action");
    }
  });

  // All other routes...
  app.get('/api/user/battle-slots', isAuthenticated, async (req: any, res) => { /* ... */ });
  app.post('/api/battle/generate-opponent', isAuthenticated, async (req: any, res) => { /* ... */ });
  app.post('/api/battle/spend-token', isAuthenticated, async (req: any, res) => { /* ... */ });
  app.get('/api/questions', isAuthenticated, async (req: any, res) => { /* ... */ });
  app.post('/api/questions/answer', isAuthenticated, async (req: any, res) => { /* ... */ });


  const httpServer = createServer(app);
  return httpServer;
}