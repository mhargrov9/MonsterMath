import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { veoClient } from "./veoApi";
import { insertQuestionSchema, insertMonsterSchema } from "@shared/schema";
import passport from "passport";
import fs from "fs";
import path from "path";
import { processBattleAction } from "./battleEngine"; // <-- NEW IMPORT

// Standardized error handler
const handleError = (error: unknown, res: express.Response, message: string) => {
  console.error(message, error);
  res.status(500).json({
    message,
    error: error instanceof Error ? error.message : 'Unknown error'
  });
};

// Input validation helpers
const validateMonsterId = (id: any): number => {
  const parsed = parseInt(id);
  if (isNaN(parsed) || parsed < 1) { throw new Error("Invalid monster ID"); }
  return parsed;
};

const validateTPL = (tpl: any): number => {
  const parsed = parseInt(tpl);
  if (isNaN(parsed) || parsed < 1) { throw new Error("Invalid TPL (must be positive number)");}
  return parsed;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // --- Existing routes are preserved here ---
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
      res.json({ message: `Awarded 50 XP to user ${winnerId}.`});
    } catch(error) { handleError(error, res, "Failed to complete battle and award XP"); }
  });

  // --- NEW BATTLE ACTION ENDPOINT ---
  app.post("/api/battle/action", isAuthenticated, async (req: any, res) => {
    try {
      const { battleState, action, allAbilities } = req.body;

      // Basic validation
      if (!battleState || !action || !allAbilities) {
        return res.status(400).json({ message: "Missing battle state, action, or ability data." });
      }

      // Process the action on the server
      const nextBattleState = processBattleAction(battleState, action, allAbilities);

      res.json({ success: true, nextBattleState });

    } catch (error) {
      handleError(error, res, "Failed to process battle action");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}