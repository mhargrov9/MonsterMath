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
import bcrypt from "bcryptjs"; // CHANGE: Using bcryptjs

const handleError = (error: unknown, res: express.Response, message: string) => {
  console.error(message, error);
  res.status(500).json({
    message,
    error: error instanceof Error ? error.message : 'Unknown error'
  });
};

const validateMonsterId = (id: any): number => {
  const parsed = parseInt(id);
  if (isNaN(parsed) || parsed < 1) { throw new Error("Invalid monster ID"); }
  return parsed;
};

const validateLevel = (level: any): number => {
  const parsed = parseInt(level);
  if (isNaN(parsed) || parsed < 1 || parsed > 10) { throw new Error("Invalid level (must be 1-10)"); }
  return parsed;
};

const validateTPL = (tpl: any): number => {
  const parsed = parseInt(tpl);
  if (isNaN(parsed) || parsed < 1) { throw new Error("Invalid TPL (must be positive number)");}
  return parsed;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // ... (unchanged section) ...

  await setupAuth(app);

  // ... (unchanged section) ...

  app.post('/api/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createLocalUser(username, email, passwordHash);
      res.status(201).json({ message: "Account created successfully", userId: user.id });
    } catch (error) {
      handleError(error, res, "Failed to create account");
    }
  });

  app.post('/api/login/local', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.error("Passport authentication error:", err);
        return res.status(500).json({ message: err.message || "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login error" });
        }
        res.json({ message: "Login successful", user: { id: user.claims.sub } });
      });
    })(req, res, next);
  });

  const httpServer = createServer(app);
  return httpServer;
}