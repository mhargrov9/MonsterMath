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

// Standardized error handler
const handleError = (error: unknown, res: express.Response, message: string) => {
  console.error(message, error);
  res.status(500).json({ 
    message, 
    error: error instanceof Error ? error.message : 'Unknown error' 
  });
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

      const monsterIdNum = parseInt(monsterId as string);
      const levelNum = level ? parseInt(level as string) : 1;
      
      // For monsters with custom uploaded images, serve them directly
      if (monsterIdNum === 6 || monsterIdNum === 7 || (monsterIdNum >= 8 && monsterIdNum <= 12)) {
        const monsterNames = {
          6: 'Gigalith',
          7: 'Aetherion', 
          8: 'Geode Tortoise',
          9: 'Gale-Feather Griffin',
          10: 'Cinder-Tail Salamander',
          11: 'River-Spirit Axolotl',
          12: 'Spark-Tail Squirrel'
        };
        
        const monsterName = monsterNames[monsterIdNum as keyof typeof monsterNames];
        
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
    } catch (error) {
      console.error("Error generating monster image:", error);
      res.status(500).json({ 
        message: "Failed to generate monster image",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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

  app.post("/api/monsters/purchase", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { monsterId } = req.body;
      
      if (!monsterId) {
        return res.status(400).json({ message: "Monster ID is required" });
      }

      const userMonster = await storage.purchaseMonster(userId, monsterId);
      res.json(userMonster);
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

  app.get("/api/questions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subject = "mixed", difficulty = "2" } = req.query;
      const question = await storage.getRandomQuestion(
        subject as string,
        parseInt(difficulty as string),
        userId
      );
      
      if (!question) {
        return res.status(404).json({ message: "No questions found" });
      }

      res.json(question);
    } catch (error) {
      handleError(error, res, "Failed to fetch question");
    }
  });

  app.post("/api/questions/answer", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { questionId, answer, isCorrect, usedHint, subject = "mixed", difficulty = 2 } = req.body;
      
      let goldEarned = 0;
      let nextQuestion = null;
      
      if (isCorrect) {
        goldEarned = usedHint ? 25 : 50; // 50% penalty for using hint
        await storage.updateUserCurrency(userId, goldEarned);
        
        // Mark question as answered correctly
        await storage.markQuestionAnswered(userId, questionId);
        
        // Award battle token every 1 correct answer
        const user = await storage.getUser(userId);
        if (user && (user.correctAnswers + 1) % 1 === 0) {
          await storage.updateUserBattleTokens(userId, 1);
        }
        
        // Automatically get next question
        nextQuestion = await storage.getRandomQuestion(subject, difficulty, userId);
      }

      res.json({ 
        goldEarned, 
        isCorrect,
        nextQuestion
      });
    } catch (error) {
      handleError(error, res, "Failed to process answer");
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

  // Repair shattered monster endpoint (requires Repair Kit item)
  app.post("/api/monsters/repair", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { monsterId } = req.body;
      
      if (!monsterId) {
        return res.status(400).json({ message: "Monster ID is required" });
      }

      // Get user's monsters to verify ownership and shattered state
      const userMonsters = await storage.getUserMonsters(userId);
      const userMonster = userMonsters.find(m => m.id === monsterId);
      
      if (!userMonster) {
        return res.status(404).json({ message: "Monster not found" });
      }

      if (!userMonster.isShattered) {
        return res.status(400).json({ message: "Monster is not shattered" });
      }

      // TODO: Check for Repair Kit item in inventory (not implemented yet)
      // For now, we'll allow repair without cost for testing

      // Repair the monster
      await storage.repairMonster(userId, monsterId);

      res.json({ 
        message: "Monster repaired successfully",
        monsterId: monsterId
      });
    } catch (error) {
      console.error("Error repairing monster:", error);
      res.status(500).json({ message: "Failed to repair monster" });
    }
  });

  app.get("/api/battle/opponents", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const opponents = await storage.getAvailableOpponents(userId);
      res.json(opponents);
    } catch (error) {
      console.error("Error fetching opponents:", error);
      res.status(500).json({ message: "Failed to fetch opponents" });
    }
  });

  // AI Battle endpoint
  app.post("/api/battles/challenge-ai", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { opponentId, monsterId, goldFee = 10 } = req.body;
      
      // Check if user has battle tokens
      const user = await storage.getUser(userId);
      if (!user || user.battleTokens < 1) {
        return res.status(400).json({ message: "Insufficient battle tokens" });
      }

      // Get user's monster
      const userMonsters = await storage.getUserMonsters(userId);
      const userMonster = userMonsters.find(m => m.id === monsterId);
      
      if (!userMonster) {
        return res.status(400).json({ message: "Invalid monster selection" });
      }

      // AI opponents data (matching frontend)
      const aiOpponents = {
        'ai-1': { name: 'Professor Quibble', difficulty: 'Easy', winChance: 0.75 },
        'ai-2': { name: 'Scholar Maya', difficulty: 'Easy', winChance: 0.70 },
        'ai-3': { name: 'Wizard Finn', difficulty: 'Medium', winChance: 0.60 },
        'ai-4': { name: 'Knight Vera', difficulty: 'Medium', winChance: 0.55 },
        'ai-5': { name: 'Sage Kael', difficulty: 'Medium', winChance: 0.50 },
        'ai-6': { name: 'Champion Zara', difficulty: 'Hard', winChance: 0.40 },
        'ai-7': { name: 'Lord Draven', difficulty: 'Hard', winChance: 0.35 },
        'ai-8': { name: 'Empress Luna', difficulty: 'Hard', winChance: 0.30 },
        'ai-9': { name: 'Titan Rex', difficulty: 'Expert', winChance: 0.25 },
        'ai-10': { name: 'Supreme Aether', difficulty: 'Expert', winChance: 0.20 },
      };

      const opponent = aiOpponents[opponentId as keyof typeof aiOpponents];
      if (!opponent) {
        return res.status(400).json({ message: "Invalid opponent" });
      }

      // Determine battle outcome
      const playerWins = Math.random() < opponent.winChance;
      const diamondsAwarded = playerWins ? 10 : 0;
      
      // Update user: consume battle token, award diamonds
      await storage.updateUserBattleTokens(userId, -1);
      await storage.updateUserCurrency(userId, 0, diamondsAwarded);

      // Create battle record (use NULL for AI opponents)
      const battle = await storage.createBattle({
        attackerId: userId,
        defenderId: null, // AI opponent - use NULL instead of invalid user ID
        attackerMonsterId: monsterId,
        defenderMonsterId: 0, // AI monster
        winnerId: playerWins ? userId : null, // NULL if AI wins
        goldFee: goldFee,
        diamondsAwarded: diamondsAwarded
      });

      res.json({
        result: playerWins ? "victory" : "defeat",
        diamondsAwarded,
        opponentName: opponent.name,
        battleId: battle.id
      });
    } catch (error) {
      console.error("Error in AI battle:", error);
      res.status(500).json({ message: "Failed to process AI battle" });
    }
  });

  // Complete battle with persistent monster stats
  app.post("/api/battles/complete", isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      const { monsterId, hp, mp } = req.body;

      if (!userId || !monsterId || hp === undefined || mp === undefined) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Update monster's persistent HP and MP
      await storage.updateMonsterStats(userId, monsterId, hp, mp);

      res.json({ message: "Battle completed and monster stats saved" });
    } catch (error) {
      console.error("Battle completion error:", error);
      res.status(500).json({ message: "Failed to complete battle" });
    }
  });

  app.post("/api/battle/challenge", isAuthenticated, async (req: any, res) => {
    try {
      const attackerId = req.user.claims.sub;
      const { defenderId, attackerMonsterId, defenderMonsterId } = req.body;
      
      const battleFee = 100;
      
      // Check if attacker has enough gold
      const attacker = await storage.getUser(attackerId);
      if (!attacker || attacker.gold < battleFee) {
        return res.status(400).json({ message: "Insufficient gold for battle fee" });
      }

      // Simulate battle (simple random with monster stats influence)
      const attackerMonsters = await storage.getUserMonsters(attackerId);
      const defenderMonsters = await storage.getUserMonsters(defenderId);
      
      const attackerMonster = attackerMonsters.find(m => m.id === attackerMonsterId);
      const defenderMonster = defenderMonsters.find(m => m.id === defenderMonsterId);
      
      if (!attackerMonster || !defenderMonster) {
        return res.status(400).json({ message: "Invalid monster selection" });
      }

      // Simple battle calculation based on total stats
      const attackerTotal = attackerMonster.power + attackerMonster.speed + attackerMonster.defense;
      const defenderTotal = defenderMonster.power + defenderMonster.speed + defenderMonster.defense;
      
      const attackerWinChance = attackerTotal / (attackerTotal + defenderTotal);
      const attackerWins = Math.random() < attackerWinChance;
      
      const winnerId = attackerWins ? attackerId : defenderId;
      const diamondsAwarded = attackerWins ? 25 : 12; // Defender gets 50% if they win
      
      // Create battle record
      const battle = await storage.createBattle({
        attackerId,
        defenderId,
        attackerMonsterId,
        defenderMonsterId,
        winnerId,
        goldFee: battleFee,
        diamondsAwarded,
      });

      // Update currencies
      await storage.updateUserCurrency(attackerId, -battleFee); // Always pay fee
      if (attackerWins) {
        await storage.updateUserCurrency(attackerId, 0, diamondsAwarded);
      } else {
        await storage.updateUserCurrency(defenderId, 0, diamondsAwarded);
      }

      res.json({ battle, attackerWins, diamondsAwarded });
    } catch (error) {
      console.error("Error processing battle:", error);
      res.status(500).json({ message: "Failed to process battle" });
    }
  });

  app.get("/api/battle/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const history = await storage.getBattleHistory(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching battle history:", error);
      res.status(500).json({ message: "Failed to fetch battle history" });
    }
  });

  // AI Battle Opponent Generation endpoint
  app.post('/api/battle/generate-opponent', isAuthenticated, async (req: any, res) => {
    try {
      const { tpl } = req.body;
      
      if (!tpl || typeof tpl !== 'number' || tpl <= 0) {
        return res.status(400).json({ message: 'Valid player TPL is required' });
      }

      const aiOpponent = await storage.generateAiOpponent(tpl);
      res.json(aiOpponent);
    } catch (error) {
      console.error('Error in /api/battle/generate-opponent:', error);
      res.status(500).json({ 
        message: 'Failed to generate opponent', 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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

  app.post('/api/generate/battle-video', isAuthenticated, async (req, res) => {
    try {
      const { playerMonsterId, aiMonsterId, playerUpgrades, aiUpgrades } = req.body;
      
      if (!playerMonsterId || !aiMonsterId) {
        return res.status(400).json({ message: "playerMonsterId and aiMonsterId are required" });
      }

      const videoData = await veoClient.generateBattleVideo(
        playerMonsterId, 
        aiMonsterId, 
        playerUpgrades || {}, 
        aiUpgrades || {}
      );
      
      res.json({ 
        success: true, 
        videoData: videoData,
        mimeType: 'video/mp4'
      });
    } catch (error) {
      console.error("Error generating battle video:", error);
      res.status(500).json({ 
        message: "Failed to generate battle video",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Inventory API routes
  app.get('/api/inventory', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const inventory = await storage.getUserInventory(userId);
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.post('/api/inventory/add', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { itemName, itemDescription, quantity, itemType, rarity, iconClass } = req.body;
      
      if (!itemName || !itemType) {
        return res.status(400).json({ message: "itemName and itemType are required" });
      }

      const item = await storage.addInventoryItem(userId, {
        itemName,
        itemDescription: itemDescription || "",
        quantity: quantity || 1,
        itemType,
        rarity: rarity || 'common',
        iconClass: iconClass || 'fas fa-box'
      });

      res.json(item);
    } catch (error) {
      console.error("Error adding inventory item:", error);
      res.status(500).json({ message: "Failed to add inventory item" });
    }
  });

  app.put('/api/inventory/:itemName', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { itemName } = req.params;
      const { quantityDelta } = req.body;
      
      if (quantityDelta === undefined) {
        return res.status(400).json({ message: "quantityDelta is required" });
      }

      const item = await storage.updateInventoryQuantity(userId, itemName, quantityDelta);
      res.json(item);
    } catch (error) {
      console.error("Error updating inventory item:", error);
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete('/api/inventory/:itemName', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { itemName } = req.params;
      
      await storage.removeInventoryItem(userId, itemName);
      res.json({ message: "Item removed from inventory" });
    } catch (error) {
      console.error("Error removing inventory item:", error);
      res.status(500).json({ message: "Failed to remove inventory item" });
    }
  });

  // Story progress API routes
  app.get('/api/story/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const storyProgress = await storage.getStoryProgress(userId);
      res.json({ storyProgress });
    } catch (error) {
      console.error("Error fetching story progress:", error);
      res.status(500).json({ message: "Failed to fetch story progress" });
    }
  });

  app.post('/api/story/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { storyNode } = req.body;
      
      if (!storyNode) {
        return res.status(400).json({ message: "storyNode is required" });
      }

      const updatedUser = await storage.updateStoryProgress(userId, storyNode);
      res.json({ 
        message: "Story progress updated",
        storyProgress: updatedUser.storyProgress
      });
    } catch (error) {
      console.error("Error updating story progress:", error);
      res.status(500).json({ message: "Failed to update story progress" });
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

  // Clear image cache for regeneration with improved prompts
  app.post('/api/generate/clear-cache', isAuthenticated, async (req, res) => {
    try {
      veoClient.clearCache();
      res.json({ success: true, message: 'Image cache cleared - fresh monsters will be generated' });
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({ success: false, error: 'Failed to clear cache' });
    }
  });

  // Initialize sample data
  app.post("/api/admin/init-data", async (req, res) => {
    try {
      // Create sample monsters
      const sampleMonsters = [
        {
          name: "Fire Salamander",
          type: "fire",
          basePower: 65,
          baseSpeed: 55,
          baseDefense: 45,
          baseHp: 800,
          baseMp: 150,
          goldCost: 450,
          diamondCost: 0,
          description: "A fiery creature with blazing attacks",
          iconClass: "fas fa-fire",
          gradient: "from-red-500 to-orange-500",
          abilities: {
            active1: "Flame Burst (25 MP): Deal 50 damage",
            active2: "Fire Shield (40 MP): Reduce incoming damage by 30%"
          }
        },
        {
          name: "Thunder Drake",
          type: "electric",
          basePower: 85,
          baseSpeed: 72,
          baseDefense: 68,
          baseHp: 750,
          baseMp: 180,
          goldCost: 750,
          diamondCost: 0,
          description: "Lightning-fast dragon with electric powers",
          iconClass: "fas fa-bolt",
          gradient: "from-yellow-400 to-blue-500",
          abilities: {
            active1: "Thunder Strike (30 MP): Deal 60 damage",
            active2: "Lightning Speed (35 MP): Increase speed by 50%"
          }
        },
        {
          name: "Crystal Guardian",
          type: "crystal",
          basePower: 45,
          baseSpeed: 40,
          baseDefense: 95,
          baseHp: 900,
          baseMp: 120,
          goldCost: 600,
          diamondCost: 5,
          description: "A defensive powerhouse made of living crystal",
          iconClass: "fas fa-gem",
          gradient: "from-purple-500 to-pink-500",
          abilities: {
            active1: "Crystal Shield (20 MP): Reduce damage by 40%",
            active2: "Gem Spike (35 MP): Deal 45 damage"
          }
        }
      ];

      for (const monster of sampleMonsters) {
        await storage.createMonster(monster);
      }

      // Create sample questions
      const sampleQuestions = [
        {
          subject: "math",
          difficulty: 2,
          questionText: "What is 24 ÷ 6?",
          correctAnswer: "4",
          options: ["4", "6", "18", "30"],
          hint: "Think about how many times 6 goes into 24!",
          goldReward: 50
        },
        {
          subject: "math",
          difficulty: 3,
          questionText: "What is 3/4 + 1/4?",
          correctAnswer: "1",
          options: ["1", "4/8", "3/8", "2/4"],
          hint: "When denominators are the same, just add the numerators!",
          goldReward: 75
        },
        {
          subject: "spelling",
          difficulty: 2,
          questionText: "Which word is spelled correctly?",
          correctAnswer: "beautiful",
          options: ["beautifull", "beautiful", "beatiful", "beutiful"],
          hint: "Remember: beauty becomes beautiful",
          goldReward: 50
        }
      ];

      for (const question of sampleQuestions) {
        await storage.createQuestion(question);
      }

      res.json({ message: "Sample data initialized successfully" });
    } catch (error) {
      console.error("Error initializing data:", error);
      res.status(500).json({ message: "Failed to initialize data" });
    }
  });

  // Interest Test endpoints (authenticated - user must be logged in)
  app.post("/api/interest/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { intent, source = 'story' } = req.body;
      
      if (!intent || !['monthly', 'yearly'].includes(intent)) {
        return res.status(400).json({ message: "Invalid subscription intent" });
      }

      // Track different sources for analytics
      console.log(`Subscription intent: ${intent} from ${source} by user ${userId}`);
      
      await storage.recordSubscriptionIntent(userId, intent);
      res.json({ message: "Subscription intent recorded", intent, source });
    } catch (error) {
      console.error("Error recording subscription intent:", error);
      res.status(500).json({ message: "Failed to record subscription intent" });
    }
  });

  app.post("/api/interest/email", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { email } = req.body;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ message: "Valid email address required" });
      }

      await storage.recordNotificationEmail(userId, email);
      res.json({ message: "Notification email saved" });
    } catch (error) {
      console.error("Error saving notification email:", error);
      res.status(500).json({ message: "Failed to save notification email" });
    }
  });

  // Interest Test - Record subscription intent
  app.post('/api/interest/subscription', isAuthenticated, async (req: any, res) => {
    try {
      const { intent, source } = req.body;
      const userId = req.user.claims.sub;
      
      console.log(`Subscription intent: ${intent} from ${source} by user ${userId}`);
      
      const user = await storage.recordSubscriptionIntent(userId, intent);
      res.json({ message: "Subscription intent recorded", user });
    } catch (error) {
      console.error("Error recording subscription intent:", error);
      res.status(500).json({ message: "Failed to record subscription intent" });
    }
  });

  // Interest Test - Record notification email
  app.post('/api/interest/email', isAuthenticated, async (req: any, res) => {
    try {
      const { email } = req.body;
      const userId = req.user.claims.sub;
      
      const user = await storage.recordNotificationEmail(userId, email);
      res.json({ message: "Email recorded successfully", user });
    } catch (error) {
      console.error("Error recording notification email:", error);
      res.status(500).json({ message: "Failed to record email" });
    }
  });

  // Battle Token - Spend token for battle


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

  // Battle slot purchasing
  app.post('/api/battle/purchase-slot', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const result = await storage.purchaseBattleSlot(userId);
      res.json({ 
        message: `Battle slot purchased for ${result.cost} diamonds`,
        user: result.user,
        cost: result.cost
      });
    } catch (error) {
      console.error('Error purchasing battle slot:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to purchase battle slot' });
    }
  });

  // Rank points system
  app.post('/api/battle/update-rank', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { playerTPL, opponentTPL, won } = req.body;
      
      let totalRP = 0;
      
      if (won) {
        totalRP += 20; // Base win reward
        if (opponentTPL > playerTPL) {
          totalRP += 5; // Bonus for defeating stronger opponent
        }
      } else {
        totalRP -= 10; // Loss penalty
      }
      
      const user = await storage.updateUserRankPoints(userId, totalRP);
      res.json({ 
        message: `Rank points updated: ${totalRP > 0 ? '+' : ''}${totalRP}`,
        user,
        rpChange: totalRP
      });
    } catch (error) {
      console.error('Error updating rank points:', error);
      res.status(500).json({ message: 'Failed to update rank points' });
    }
  });

  // AI Trainers management
  app.get('/api/ai-trainers', isAuthenticated, async (req, res) => {
    try {
      const trainers = await storage.getAllAiTrainers();
      res.json(trainers);
    } catch (error) {
      console.error('Error fetching AI trainers:', error);
      res.status(500).json({ message: 'Failed to fetch AI trainers' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
