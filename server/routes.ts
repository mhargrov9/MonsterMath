import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { processTurn } from "./battleEngine";

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

  // --- BATTLE ARENA ---
  app.post('/api/battle/generate-opponent', isAuthenticated, async (req: any, res) => {
    try {
      // --- THIS IS THE TEST ---
      // We are bypassing the storage function and returning a hardcoded opponent
      // to isolate the source of the runtime freeze.
      console.log("[routes] Bypassing storage. BUIDLING HARDCODED OPPONENT.");
      const hardcodedOpponent = {
        name: "Test Dummy",
        scaledMonsters: [
          {
            id: 10, name: 'Cinder-Tail Salamander', type: 'fire',
            basePower: 100, baseSpeed: 110, baseDefense: 70,
            baseHp: 75, baseMp: 160, goldCost: 350,
            hp: 75, maxHp: 75, mp: 160, maxMp: 160,
            abilities: [
              { id: 1, name: 'Basic Attack', mp_cost: 0, ability_type: 'ACTIVE' },
              { id: 2, name: 'Ember Spit', mp_cost: 30, ability_type: 'ACTIVE' }
            ]
          }
        ]
      };
      res.json(hardcodedOpponent);
    } catch (error) { 
      handleError(error, res, "Failed to generate opponent"); 
    }
  });

  app.post('/api/battle/action', isAuthenticated, async (req: any, res) => {
    try {
      const { battleState, action } = req.body;
      if (!battleState || !action) {
        return res.status(400).json({ message: "Missing battleState or action in request body." });
      }
      const result = await processTurn(battleState, action);
      res.json(result);
    } catch (error) {
      handleError(error, res, "Failed to process battle action");
    }
  });

  // Other routes...
  app.get("/api/monster-abilities/:monsterId", isAuthenticated, async (req: any, res) => { /* ... */ });
  app.get('/api/user/battle-slots', isAuthenticated, async (req: any, res) => { /* ... */ });
  app.post('/api/battle/spend-token', isAuthenticated, async (req: any, res) => {
      await storage.spendBattleToken(req.user.claims.sub);
      res.json({ success: true });
  });
  app.get('/api/questions', isAuthenticated, async (req: any, res) => { /* ... */ });
  app.post('/api/questions/answer', isAuthenticated, async (req: any, res) => { /* ... */ });


  const httpServer = createServer(app);
  return httpServer;
}