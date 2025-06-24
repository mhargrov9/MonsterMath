import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { veoClient } from "./veoApi";
import { insertQuestionSchema, insertMonsterSchema } from "@shared/schema";
import { AI_OPPONENTS, MONSTER_NAMES } from "../config/gameData";
import passport from "passport";
import fs from "fs";
import path from "path";

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
  if (isNaN(parsed) || parsed < 1) {
    throw new Error("Invalid monster ID");
  }
  return parsed;
};

const validateLevel = (level: any): number => {
  const parsed = parseInt(level);
  if (isNaN(parsed) || parsed < 1 || parsed > 10) {
    throw new Error("Invalid level (must be 1-10)");
  }
  return parsed;
};

const validateTPL = (tpl: any): number => {
  const parsed = parseInt(tpl);
  if (isNaN(parsed) || parsed < 1) {
    throw new Error("Invalid TPL (must be positive number)");
  }
  return parsed;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded monster assets
  app.use('/assets', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
  app.use('/assets', express.static('attached_assets'));

  // Also serve attached assets directly for custom monster images
  app.use('/attached_assets', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
  app.use('/attached_assets', express.static('attached_assets'));

  // GET endpoint for monster images (unauthenticated for collage use)
  app.get('/api/generate/monster-image', async (req, res) => {
    try {
      const { monster: monsterId, level } = req.query;

      if (!monsterId) {
        return res.status(400).json({ message: "monster parameter is required" });
      }

      try {
        const monsterIdNum = validateMonsterId(monsterId);
        const levelNum = level ? validateLevel(level) : 1;

        // For monsters with custom uploaded images, serve them directly
        if (monsterIdNum === 6 || monsterIdNum === 7 || (monsterIdNum >= 8 && monsterIdNum <= 12)) {
          const monsterName = MONSTER_NAMES[monsterIdNum as keyof typeof MONSTER_NAMES];

          // Try to find the image file using fs.readdir
          try {
            const files = fs.readdirSync('attached_assets');
            console.log(`Looking for ${monsterName}_Level_${levelNum}_ in:`, files.filter((f: string) => f.includes(monsterName)));

            const imageFile = files.find((file: string) =>
              file.startsWith(`${monsterName}_Level_${levelNum}_`) && file.endsWith('.png')
            );

            if (imageFile) {
              const fullPath = path.join('attached_assets', imageFile);
              console.log(`Found image file: ${fullPath}`);
              const imageBuffer = fs.readFileSync(fullPath);
              res.set({
                'Content-Type': 'image/png',
                'Content-Length': imageBuffer.length,
                'Cache-Control': 'public, max-age=3600'
              });
              return res.send(imageBuffer);
            } else {
              console.log(`No matching file found for ${monsterName}_Level_${levelNum}_`);
            }
          } catch (err) {
            console.error(`Error finding image for ${monsterName} level ${levelNum}:`, err);
          }
        }

        // Fallback to VEO API for other monsters or if custom image not found
        const upgradeChoices = level ? { level: levelNum } : {};
        const imageData = await veoClient.generateMonsterImage(monsterIdNum, upgradeChoices);

        // Return actual image data for img tags
        const buffer = Buffer.from(imageData, 'base64');
        res.set({
          'Content-Type': 'image/png',
          'Content-Length': buffer.length,
          'Cache-Control': 'public, max-age=3600'
        });
        res.send(buffer);

      } catch (validationError) {
        return res.status(400).json({ message: validationError instanceof Error ? validationError.message : "Invalid parameters" });
      }

    } catch (error) {
      handleError(error, res, "Failed to generate monster image");
    }
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
      handleError(error, res, "Failed to fetch user");
    }
  });

  // Local registration endpoint
  app.post('/api/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;

      // Validate input
      if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password and create user
      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createLocalUser(username, email, passwordHash);

      res.status(201).json({ message: "Account created successfully", userId: user.id });

    } catch (error) {
      handleError(error, res, "Failed to create account");
    }
  });

  // Local login endpoint
  app.post('/api/login/local', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
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

  // Developer Tools - Add Battle Tokens
  app.post("/api/dev/add-tokens", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount = 5 } = req.body;

      const user = await storage.addBattleTokens(userId, amount);

      res.json({ 
        message: `${amount} battle tokens added.`, 
        user,
        battleTokens: user.battleTokens 
      });
    } catch (error) {
      handleError(error, res, "Failed to add battle tokens");
    }
  });

  // Game routes
  app.get("/api/monsters", isAuthenticated, async (req, res) => {
    try {
      const monsters = await storage.getAllMonsters();
      res.json(monsters);
    } catch (error) {
      handleError(error, res, "Failed to fetch monsters");
    }
  });

  app.get("/api/user/monsters", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userMonsters = await storage.getUserMonsters(userId);
      res.json(userMonsters);
    } catch (error) {
      handleError(error, res, "Failed to fetch user monsters");
    }
  });

  app.get("/api/monster-abilities/:monsterId", isAuthenticated, async (req: any, res) => {
    try {
      const monsterId = parseInt(req.params.monsterId);
      if (isNaN(monsterId)) {
        return res.status(400).json({ message: "Invalid monster ID" });
      }

      const abilities = await storage.getMonsterAbilities(monsterId);
      res.json(abilities);
    } catch (error) {
      handleError(error, res, "Failed to fetch monster abilities");
    }
  });

  app.post("/api/monsters/purchase", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { monsterId } = req.body;

      try {
        const validatedMonsterId = validateMonsterId(monsterId);
        const userMonster = await storage.purchaseMonster(userId, validatedMonsterId);
        res.json(userMonster);
      } catch (validationError) {
        return res.status(400).json({ message: validationError instanceof Error ? validationError.message : "Invalid monster ID" });
      }

    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to purchase monster" });
    }
  });

  app.post("/api/monsters/upgrade", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { userMonsterId } = req.body;

      if (!userMonsterId) {
        return res.status(400).json({ message: "User monster ID is required" });
      }

      const upgradedMonster = await storage.upgradeMonster(userId, userMonsterId);
      res.json(upgradedMonster);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to upgrade monster" });
    }
  });

  app.post("/api/monsters/apply-upgrade", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const {
        userMonsterId,
        upgradeKey,
        upgradeValue,
        statBoosts,
        goldCost,
        diamondCost
      } = req.body;

      if (!userMonsterId || !upgradeKey || !upgradeValue) {
        return res.status(400).json({ message: "Missing required upgrade parameters" });
      }

      const upgradedMonster = await storage.applyMonsterUpgrade(
        userId,
        userMonsterId,
        upgradeKey,
        upgradeValue,
        statBoosts,
        goldCost,
        diamondCost
      );

      res.json(upgradedMonster);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to apply upgrade" });
    }
  });

  // Monster healing endpoint
  app.post("/api/monsters/heal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { monsterId, healingCost } = req.body;

      if (!monsterId || healingCost === undefined) {
        return res.status(400).json({ message: "Monster ID and healing cost are required" });
      }

      // Get user to check gold balance
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.gold < healingCost) {
        return res.status(400).json({ message: "Insufficient gold for healing" });
      }

      // Get user's monsters to verify ownership and get current HP
      const userMonsters = await storage.getUserMonsters(userId);
      const userMonster = userMonsters.find(m => m.id === monsterId);

      if (!userMonster) {
        return res.status(404).json({ message: "Monster not found" });
      }

      // Calculate max HP based on monster level and base HP
      const maxHp = userMonster.monster.baseHp || 950;
      const currentHp = userMonster.hp || maxHp;

      if (currentHp >= maxHp) {
        return res.status(400).json({ message: "Monster is already at full health" });
      }

      // Deduct gold and heal monster to full HP
      await storage.updateUserCurrency(userId, -healingCost, 0);
      await storage.updateMonsterStats(userId, monsterId, maxHp, userMonster.mp || userMonster.monster.baseMp || 200);

      res.json({
        message: "Monster healed successfully",
        goldSpent: healingCost,
        newHp: maxHp
      });

    } catch (error) {
      console.error("Error healing monster:", error);
      res.status(500).json({ message: "Failed to heal monster" });
    }
  });

  // AI Battle Opponent Generation endpoint
  app.post('/api/battle/generate-opponent', isAuthenticated, async (req: any, res) => {
    try {
      const { tpl } = req.body;

      try {
        const validatedTPL = validateTPL(tpl);
        const aiOpponent = await storage.generateAiOpponent(validatedTPL);
        res.json(aiOpponent);
      } catch (validationError) {
        return res.status(400).json({ message: validationError instanceof Error ? validationError.message : "Invalid TPL" });
      }

    } catch (error) {
      handleError(error, res, "Failed to generate opponent");
    }
  });

  // Battle token spending endpoint
  app.post('/api/battle/spend-token', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.spendBattleToken(userId);

      res.json({
        message: 'Battle token spent',
        user,
        battleTokens: user.battleTokens
      });

    } catch (error) {
      console.error('Error spending battle token:', error);
      if (error instanceof Error && error.message.includes('NO_BATTLE_TOKENS')) {
        res.status(400).json({ message: 'NO_BATTLE_TOKENS' });
      } else {
        res.status(500).json({
          message: 'Failed to spend battle token',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  });

  // Questions endpoint
  app.get('/api/questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subject = 'mixed', difficulty = 2 } = req.query;

      const question = await storage.getRandomQuestion(subject as string, parseInt(difficulty as string), userId);

      if (!question) {
        return res.status(404).json({ message: 'No questions available' });
      }

      res.json(question);
    } catch (error) {
      handleError(error, res, "Failed to fetch question");
    }
  });

  app.post('/api/questions/answer', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { questionId, answer, isCorrect, usedHint, subject, difficulty } = req.body;

      if (isCorrect) {
        // Award gold for correct answer
        const goldEarned = usedHint ? 15 : 25; // Less gold if hint was used
        await storage.updateUserCurrency(userId, goldEarned, 0);
        await storage.markQuestionAnswered(userId, questionId);

        // Get next question
        const nextQuestion = await storage.getRandomQuestion(subject, difficulty, userId);

        res.json({
          isCorrect: true,
          goldEarned,
          nextQuestion
        });
      } else {
        res.json({
          isCorrect: false,
          goldEarned: 0
        });
      }
    } catch (error) {
      handleError(error, res, "Failed to process answer");
    }
  });

  // Veo API routes for photorealistic monsters (POST endpoint for authenticated users)
  app.post('/api/generate/monster-image', isAuthenticated, async (req, res) => {
    try {
      const { monsterId, upgradeChoices } = req.body;

      if (!monsterId) {
        return res.status(400).json({ message: "monsterId is required" });
      }

      const imageData = await veoClient.generateMonsterImage(monsterId, upgradeChoices || {});

      res.json({
        success: true,
        imageData: imageData,
        mimeType: 'image/png'
      });

    } catch (error) {
      console.error("Error generating monster image:", error);
      res.status(500).json({
        message: "Failed to generate monster image",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Battle Token - Check refresh status
  app.get('/api/battle/tokens', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.refreshBattleTokens(userId);

      res.json({
        battleTokens: user.battleTokens,
        lastRefresh: user.battleTokensLastRefresh,
        user
      });

    } catch (error) {
      console.error("Error checking battle tokens:", error);
      res.status(500).json({ message: "Failed to check battle tokens" });
    }
  });

  // AI Teams and Encounter System routes
  app.get('/api/ai-teams', isAuthenticated, async (req: any, res) => {
    try {
      const teams = await storage.getAllAiTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching AI teams:", error);
      res.status(500).json({ message: "Failed to fetch AI teams" });
    }
  });

  app.get('/api/user/battle-slots', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const battleSlots = await storage.getUserBattleSlots(userId);
      res.json({ battleSlots });
    } catch (error) {
      console.error("Error fetching battle slots:", error);
      res.status(500).json({ message: "Failed to fetch battle slots" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
