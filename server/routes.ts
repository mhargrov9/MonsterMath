import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage, DatabaseStorage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { veoClient } from "./veoApi";
import passport from "passport";
import bcrypt from "bcrypt";
import { inArray } from "drizzle-orm";
import { monsters, aiTrainerArchetypes } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication FIRST before using isAuthenticated middleware
  await setupAuth(app);

  // User auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      let userId: string;
      
      if (user.authProvider === 'local') {
        userId = user.claims.sub;
      } else {
        userId = user.claims?.sub;
      }
      
      if (!userId) {
        return res.status(401).json({ message: 'User ID not found' });
      }
      
      const dbUser = await storage.getUser(userId);
      if (!dbUser) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json(dbUser);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Local account registration
  app.post('/api/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ message: 'Username, email, and password are required' });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }
      
      // Hash password and create user
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createLocalUser(username, email, passwordHash);
      
      res.status(201).json({ message: 'Account created successfully', userId: user.id });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Local account login
  app.post('/api/login/local', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Invalid credentials' });
      }
      
      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Login failed' });
        }
        res.json({ message: 'Login successful' });
      });
    })(req, res, next);
  });

  // Monster routes
  app.get("/api/monsters", isAuthenticated, async (req, res) => {
    try {
      const allMonsters = await storage.getAllMonsters();
      res.json(allMonsters);
    } catch (error) {
      console.error('Error fetching monsters:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get("/api/user/monsters", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.claims?.sub;
      
      const userMonsters = await storage.getUserMonsters(userId);
      res.json(userMonsters);
    } catch (error) {
      console.error('Error fetching user monsters:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/monsters/purchase", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.claims?.sub;
      const { monsterId } = req.body;

      const userMonster = await storage.purchaseMonster(userId, monsterId);
      res.json(userMonster);
    } catch (error) {
      console.error('Error purchasing monster:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Purchase failed' });
    }
  });

  app.post("/api/monsters/upgrade", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.claims?.sub;
      const { userMonsterId } = req.body;

      const upgradedMonster = await storage.upgradeMonster(userId, userMonsterId);
      res.json(upgradedMonster);
    } catch (error) {
      console.error('Error upgrading monster:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Upgrade failed' });
    }
  });

  app.post("/api/monsters/heal", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.claims?.sub;
      const { userMonsterId } = req.body;

      const healedMonster = await storage.repairMonster(userId, userMonsterId);
      res.json(healedMonster);
    } catch (error) {
      console.error('Error healing monster:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Healing failed' });
    }
  });

  // Battle routes
  app.post('/api/battle/generate-opponent', isAuthenticated, async (req: any, res) => {
    try {
      const { tpl } = req.body;
      if (!tpl || typeof tpl !== 'number' || tpl <= 0) {
        return res.status(400).json({ message: 'Valid player TPL is required' });
      }

      const opponentTeam = await storage.generateAiOpponent(tpl);

      if (!opponentTeam || !opponentTeam.team || !opponentTeam.scaledMonsters || opponentTeam.scaledMonsters.length === 0) {
        throw new Error('storage.generateAiOpponent returned an invalid team structure.');
      }

      res.status(200).json(opponentTeam);

    } catch (error) {
      console.error('CRITICAL ERROR in /api/battle/generate-opponent:', error);
      res.status(500).json({ message: 'Failed to generate opponent due to a critical server error.' });
    }
  });

  app.post("/api/battle/complete", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.claims?.sub;
      const { monsters, victory, rpGained } = req.body;

      // Update monster stats
      for (const monsterUpdate of monsters) {
        await storage.updateMonsterStats(userId, monsterUpdate.userMonsterId, monsterUpdate.hp, monsterUpdate.mp);
        
        // Shatter monster if HP reaches 0
        if (monsterUpdate.hp <= 0) {
          await storage.shatterMonster(userId, monsterUpdate.userMonsterId);
        }
      }

      // Award rewards if victory
      if (victory) {
        await storage.updateUserCurrency(userId, 0, 10); // 10 diamonds for victory
      }

      // Update rank points
      if (rpGained) {
        await storage.updateUserRankPoints(userId, rpGained);
      }

      res.json({ message: 'Battle completed' });
    } catch (error) {
      console.error('Error completing battle:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Question routes
  app.get("/api/questions/random", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.claims?.sub;
      const { subject, difficulty } = req.query;

      const question = await storage.getRandomQuestion(subject as string, parseInt(difficulty as string), userId);
      if (!question) {
        return res.status(404).json({ message: 'No questions available' });
      }

      res.json(question);
    } catch (error) {
      console.error('Error fetching question:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/questions/answer", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.claims?.sub;
      const { questionId, answer } = req.body;

      // Mark question as answered
      await storage.markQuestionAnswered(userId, questionId);

      // Award gold for correct answers (simplified - you may want to verify the answer)
      await storage.updateUserCurrency(userId, 10, 0);

      res.json({ message: 'Answer recorded', goldEarned: 10 });
    } catch (error) {
      console.error('Error recording answer:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Inventory routes
  app.get("/api/inventory", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.claims?.sub;

      const inventory = await storage.getUserInventory(userId);
      res.json(inventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/inventory/add", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.claims?.sub;
      const itemData = req.body;

      const item = await storage.addInventoryItem(userId, itemData);
      res.json(item);
    } catch (error) {
      console.error('Error adding inventory item:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Story routes
  app.get("/api/story/progress", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.claims?.sub;

      const progress = await storage.getStoryProgress(userId);
      res.json({ progress });
    } catch (error) {
      console.error('Error fetching story progress:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/story/progress", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.claims?.sub;
      const { storyNode } = req.body;

      await storage.updateStoryProgress(userId, storyNode);
      res.json({ message: 'Progress saved' });
    } catch (error) {
      console.error('Error updating story progress:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // AI Trainer routes
  app.get("/api/ai-trainers", isAuthenticated, async (req, res) => {
    try {
      const trainers = await storage.getAllAiTrainers();
      res.json(trainers);
    } catch (error) {
      console.error('Error fetching AI trainers:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Battle slots routes
  app.get("/api/battle-slots", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.claims?.sub;

      const slots = await storage.getUserBattleSlots(userId);
      res.json({ slots });
    } catch (error) {
      console.error('Error fetching battle slots:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/battle-slots/purchase", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.claims?.sub;

      const result = await storage.purchaseBattleSlot(userId);
      res.json(result);
    } catch (error) {
      console.error('Error purchasing battle slot:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Purchase failed' });
    }
  });

  // Interest test routes
  app.post("/api/interest-test/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.claims?.sub;
      const { intent } = req.body;

      await storage.recordSubscriptionIntent(userId, intent);
      res.json({ message: 'Subscription intent recorded' });
    } catch (error) {
      console.error('Error recording subscription intent:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/interest-test/email", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.calls?.sub;
      const { email } = req.body;

      await storage.recordNotificationEmail(userId, email);
      res.json({ message: 'Email recorded' });
    } catch (error) {
      console.error('Error recording email:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Battle tokens routes
  app.post("/api/battle-tokens/refresh", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.claims?.sub;

      const updatedUser = await storage.refreshBattleTokens(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error refreshing battle tokens:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post("/api/battle-tokens/spend", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user as any;
      const userId = user.authProvider === 'local' ? user.claims.sub : user.claims?.sub;

      const updatedUser = await storage.spendBattleToken(userId);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error spending battle token:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to spend token' });
    }
  });

  // Image generation routes
  app.get('/api/monsters/:monsterId/image/:level', async (req, res) => {
    try {
      const { monsterId, level } = req.params;
      const imageUrl = await veoClient.generateMonsterImage(parseInt(monsterId), parseInt(level));
      res.json({ imageUrl });
    } catch (error) {
      console.error('Error generating monster image:', error);
      res.status(500).json({ message: 'Image generation failed' });
    }
  });

  // Static asset serving
  app.use('/attached_assets', express.static('attached_assets'));

  const httpServer = createServer(app);
  return httpServer;
}