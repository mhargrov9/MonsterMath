import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { veoClient } from "./veoApi";
import { insertQuestionSchema, insertMonsterSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Serve uploaded monster assets
  app.use('/assets', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
  app.use('/assets', express.static('attached_assets'));

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Game routes
  app.get("/api/monsters", isAuthenticated, async (req, res) => {
    try {
      const monsters = await storage.getAllMonsters();
      res.json(monsters);
    } catch (error) {
      console.error("Error fetching monsters:", error);
      res.status(500).json({ message: "Failed to fetch monsters" });
    }
  });

  app.get("/api/user/monsters", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userMonsters = await storage.getUserMonsters(userId);
      res.json(userMonsters);
    } catch (error) {
      console.error("Error fetching user monsters:", error);
      res.status(500).json({ message: "Failed to fetch user monsters" });
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
      console.error("Error purchasing monster:", error);
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
      console.error("Error upgrading monster:", error);
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
      console.error("Error applying monster upgrade:", error);
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
      console.error("Error fetching question:", error);
      res.status(500).json({ message: "Failed to fetch question" });
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
      console.error("Error processing answer:", error);
      res.status(500).json({ message: "Failed to process answer" });
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

  // Veo API routes for photorealistic monsters
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
          goldCost: 450,
          diamondCost: 0,
          description: "A fiery creature with blazing attacks",
          iconClass: "fas fa-fire",
          gradient: "from-red-500 to-orange-500"
        },
        {
          name: "Thunder Drake",
          type: "electric",
          basePower: 85,
          baseSpeed: 72,
          baseDefense: 68,
          goldCost: 750,
          diamondCost: 0,
          description: "Lightning-fast dragon with electric powers",
          iconClass: "fas fa-bolt",
          gradient: "from-yellow-400 to-blue-500"
        },
        {
          name: "Crystal Guardian",
          type: "crystal",
          basePower: 45,
          baseSpeed: 40,
          baseDefense: 95,
          goldCost: 600,
          diamondCost: 5,
          description: "A defensive powerhouse made of living crystal",
          iconClass: "fas fa-gem",
          gradient: "from-purple-500 to-pink-500"
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

  const httpServer = createServer(app);
  return httpServer;
}
