import type { Express } from 'express';
import express from 'express';
import { createServer, type Server } from 'http';
import { storage } from './storage';
import { setupAuth, isAuthenticated } from './replitAuth';
import { veoClient } from './veoApi';
import { insertQuestionSchema, insertMonsterSchema } from '@shared/schema';
import {
  applyDamage,
  createBattleSession,
  processAiTurn,
  performSwapAndProcessAiTurn, // <-- UPDATED: Import the new atomic swap function
  processForfeit,
} from './battleEngine';
import passport from 'passport';
import fs from 'fs';
import path from 'path';

// Standardized error handler
const handleError = (
  error: unknown,
  res: express.Response,
  message: string,
) => {
  console.error(message, error);
  res.status(500).json({
    message,
    error: error instanceof Error ? error.message : 'Unknown error',
  });
};

// Input validation helpers
const validateMonsterId = (id: any): number => {
  const parsed = parseInt(id);
  if (isNaN(parsed) || parsed < 1) {
    throw new Error('Invalid monster ID');
  }
  return parsed;
};

const validateLevel = (level: any): number => {
  const parsed = parseInt(level);
  if (isNaN(parsed) || parsed < 1 || parsed > 10) {
    throw new Error('Invalid level (must be 1-10)');
  }
  return parsed;
};

const validateTPL = (tpl: any): number => {
  const parsed = parseInt(tpl);
  if (isNaN(parsed) || parsed < 1) {
    throw new Error('Invalid TPL (must be positive number)');
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

  // Serve static files from the public directory
  app.use(express.static('public'));

  // Also serve attached assets directly for custom monster images
  app.use('/attached_assets', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });
  app.use('/attached_assets', express.static('attached_assets'));

  // Health endpoint for server status verification
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // GET endpoint for monster images (unauthenticated for collage use)
  app.get('/api/generate/monster-image', async (req, res) => {
    try {
      const { monster: monsterId, level } = req.query;

      if (!monsterId) {
        return res
          .status(400)
          .json({ message: 'monster parameter is required' });
      }

      try {
        const monsterIdNum = validateMonsterId(monsterId);
        const levelNum = level ? validateLevel(level) : 1;

        if (
          monsterIdNum === 6 ||
          monsterIdNum === 7 ||
          (monsterIdNum >= 8 && monsterIdNum <= 12)
        ) {
          const monsters = await storage.getAllMonsters();
          const monster = monsters.find((m) => m.id === monsterIdNum);
          const monsterName = monster?.name;

          if (!monsterName) {
            console.error(`No monster found with ID: ${monsterIdNum}`);
            const upgradeChoices = level ? { level: levelNum } : {};
            const imageData = await veoClient.generateMonsterImage(
              monsterIdNum,
              upgradeChoices,
            );
            const buffer = Buffer.from(imageData, 'base64');
            res.set({
              'Content-Type': 'image/png',
              'Content-Length': buffer.length,
              'Cache-Control': 'public, max-age=3600',
            });
            return res.send(buffer);
          }

          try {
            const files = fs.readdirSync('attached_assets');
            const imageFile = files.find(
              (file: string) =>
                file.startsWith(`${monsterName}_Level_${levelNum}_`) &&
                file.endsWith('.png'),
            );

            if (imageFile) {
              const fullPath = path.join('attached_assets', imageFile);
              const imageBuffer = fs.readFileSync(fullPath);
              res.set({
                'Content-Type': 'image/png',
                'Content-Length': imageBuffer.length,
                'Cache-Control': 'public, max-age=3600',
              });
              return res.send(imageBuffer);
            }
          } catch (err) {
            console.error(
              `Error finding image for ${monsterName} level ${levelNum}:`,
              err,
            );
          }
        }

        const upgradeChoices = level ? { level: levelNum } : {};
        const imageData = await veoClient.generateMonsterImage(
          monsterIdNum,
          upgradeChoices,
        );

        const buffer = Buffer.from(imageData, 'base64');
        res.set({
          'Content-Type': 'image/png',
          'Content-Length': buffer.length,
          'Cache-Control': 'public, max-age=3600',
        });
        res.send(buffer);
      } catch (validationError) {
        return res.status(400).json({
          message:
            validationError instanceof Error
              ? validationError.message
              : 'Invalid parameters',
        });
      }
    } catch (error) {
      handleError(error, res, 'Failed to generate monster image');
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
      handleError(error, res, 'Failed to fetch user');
    }
  });

  // Local registration endpoint
  app.post('/api/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res
          .status(400)
          .json({ message: 'Username, email, and password are required' });
      }

      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: 'Password must be at least 6 characters long' });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already registered' });
      }

      const bcrypt = await import('bcrypt');
      const passwordHash = await bcrypt.hash(password, 10);

      const user = await storage.createLocalUser(username, email, passwordHash);
      res
        .status(201)
        .json({ message: 'Account created successfully', userId: user.id });
    } catch (error) {
      handleError(error, res, 'Failed to create account');
    }
  });

  // Local login endpoint
  app.post('/api/login/local', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: 'Authentication error' });
      }

      if (!user) {
        return res
          .status(401)
          .json({ message: info?.message || 'Invalid credentials' });
      }

      req.logIn(user, (err) => {
        if (err) {
          return res.status(500).json({ message: 'Login error' });
        }
        res.json({
          message: 'Login successful',
          user: { id: user.claims.sub },
        });
      });
    })(req, res, next);
  });

  // Developer Tools - Add Battle Tokens
  app.post('/api/dev/add-tokens', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount = 5 } = req.body;

      const user = await storage.updateUserBattleTokens(userId, amount);
      res.json({
        message: `${amount} battle tokens added.`,
        user,
        battleTokens: user.battleTokens,
      });
    } catch (error) {
      handleError(error, res, 'Failed to add battle tokens');
    }
  });

  // Game routes
  app.get('/api/monsters', isAuthenticated, async (req, res) => {
    try {
      const monsters = await storage.getAllMonsters();
      res.json(monsters);
    } catch (error) {
      handleError(error, res, 'Failed to fetch monsters');
    }
  });

  app.get('/api/user/monsters', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const userMonsters = await storage.getUserMonsters(userId);
      res.json(userMonsters);
    } catch (error) {
      handleError(error, res, 'Failed to fetch user monsters');
    }
  });

  app.get('/api/user/rank', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const rankInfo = await storage.getUserRank(userId);
      res.json(rankInfo);
    } catch (error) {
      handleError(error, res, 'Failed to fetch user rank information');
    }
  });

  app.get(
    '/api/monster-abilities/:monsterId',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const monsterId = parseInt(req.params.monsterId);
        if (isNaN(monsterId)) {
          return res.status(400).json({ message: 'Invalid monster ID' });
        }

        const abilities = await storage.getMonsterAbilities(monsterId);
        res.json(abilities);
      } catch (error) {
        handleError(error, res, 'Failed to fetch monster abilities');
      }
    },
  );

  app.post('/api/monsters/purchase', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { monsterId } = req.body;

      try {
        const validatedMonsterId = validateMonsterId(monsterId);
        const userMonster = await storage.purchaseMonster(
          userId,
          validatedMonsterId,
        );
        res.json(userMonster);
      } catch (validationError) {
        return res.status(400).json({
          message:
            validationError instanceof Error
              ? validationError.message
              : 'Invalid monster ID',
        });
      }
    } catch (error) {
      res.status(400).json({
        message:
          error instanceof Error ? error.message : 'Failed to purchase monster',
      });
    }
  });

  app.post('/api/monsters/upgrade', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { userMonsterId } = req.body;

      if (!userMonsterId) {
        return res.status(400).json({ message: 'User monster ID is required' });
      }

      const upgradedMonster = await storage.upgradeMonster(
        userId,
        userMonsterId,
      );
      res.json(upgradedMonster);
    } catch (error) {
      res.status(400).json({
        message:
          error instanceof Error ? error.message : 'Failed to upgrade monster',
      });
    }
  });

  app.post(
    '/api/monsters/apply-upgrade',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const {
          userMonsterId,
          upgradeKey,
          upgradeValue,
          statBoosts,
          goldCost,
          diamondCost,
        } = req.body;

        if (!userMonsterId || !upgradeKey || !upgradeValue) {
          return res
            .status(400)
            .json({ message: 'Missing required upgrade parameters' });
        }

        const upgradedMonster = await storage.applyMonsterUpgrade(
          userId,
          userMonsterId,
          upgradeKey,
          upgradeValue,
          statBoosts,
          goldCost,
          diamondCost,
        );

        res.json(upgradedMonster);
      } catch (error) {
        res.status(400).json({
          message:
            error instanceof Error ? error.message : 'Failed to apply upgrade',
        });
      }
    },
  );

  app.post('/api/monsters/heal', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { monsterId, healingCost } = req.body;

      if (!monsterId || healingCost === undefined) {
        return res
          .status(400)
          .json({ message: 'Monster ID and healing cost are required' });
      }

      const monsterToHeal = await storage.repairMonster(userId, monsterId);
      await storage.updateUserCurrency(userId, -healingCost, 0);

      res.json({
        message: 'Monster healed successfully',
        goldSpent: healingCost,
        newHp: monsterToHeal.maxHp,
      });
    } catch (error) {
      console.error('Error healing monster:', error);
      res.status(500).json({ message: 'Failed to heal monster' });
    }
  });

  app.post(
    '/api/battle/generate-opponent',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { tpl } = req.body;

        try {
          const validatedTPL = validateTPL(tpl);
          const aiOpponent = await storage.generateAiOpponent(validatedTPL);
          res.json(aiOpponent);
        } catch (validationError) {
          return res.status(400).json({
            message:
              validationError instanceof Error
                ? validationError.message
                : 'Invalid TPL',
          });
        }
      } catch (error) {
        handleError(error, res, 'Failed to generate opponent');
      }
    },
  );

  app.post('/api/battle/create', isAuthenticated, async (req: any, res) => {
    try {
      const { playerTeam, opponentTeam, playerLeadMonsterIndex } = req.body;

      if (
        !playerTeam ||
        !opponentTeam ||
        !Array.isArray(playerTeam) ||
        !Array.isArray(opponentTeam)
      ) {
        return res.status(400).json({
          message:
            'Missing or invalid team data (playerTeam, opponentTeam must be arrays)',
        });
      }

      if (
        playerLeadMonsterIndex === undefined ||
        typeof playerLeadMonsterIndex !== 'number'
      ) {
        return res
          .status(400)
          .json({ message: 'Missing or invalid playerLeadMonsterIndex' });
      }

      if (playerTeam.length === 0 || opponentTeam.length === 0) {
        return res.status(400).json({ message: 'Teams cannot be empty' });
      }

      if (
        playerLeadMonsterIndex < 0 ||
        playerLeadMonsterIndex >= playerTeam.length
      ) {
        return res
          .status(400)
          .json({ message: 'Invalid playerLeadMonsterIndex' });
      }

      const battleSession = await createBattleSession(
        playerTeam,
        opponentTeam,
        playerLeadMonsterIndex,
      );
      res.json(battleSession);
    } catch (error) {
      handleError(error, res, 'Failed to create battle session');
    }
  });

  app.post(
    '/api/battle/perform-action',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { battleId, abilityId, targetId } = req.body;

        if (!battleId || !abilityId) {
          return res.status(400).json({
            message: 'Missing required battle data (battleId, abilityId)',
          });
        }

        const actionResult = await applyDamage(battleId, abilityId, targetId);
        res.json(actionResult);
      } catch (error) {
        handleError(error, res, 'Failed to perform battle action');
      }
    },
  );

  app.post('/api/battle/ai-turn', isAuthenticated, async (req: any, res) => {
    try {
      const { battleId } = req.body;

      if (!battleId) {
        return res.status(400).json({ message: 'Missing battleId' });
      }

      const aiTurnResult = await processAiTurn(battleId);
      res.json(aiTurnResult);
    } catch (error) {
      handleError(error, res, 'Failed to process AI turn');
    }
  });

  // UPDATED: Monster swapping endpoint to be atomic
  app.post('/api/battle/swap', isAuthenticated, async (req: any, res) => {
    try {
      const { battleId, newMonsterIndex } = req.body;
      if (battleId === undefined || newMonsterIndex === undefined) {
        return res
          .status(400)
          .json({ message: 'Missing battleId or newMonsterIndex' });
      }

      // This single function now handles the player's swap and the AI's resulting turn.
      const { battleState } = await performSwapAndProcessAiTurn(
        battleId,
        newMonsterIndex,
      );

      res.json(battleState);
    } catch (error) {
      handleError(error, res, 'Failed to perform monster swap');
    }
  });

  app.post(
    '/api/battle/forfeit-turn',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const { battleId } = req.body;
        if (!battleId) {
          return res.status(400).json({ message: 'Missing battleId' });
        }
        const { battleState } = processForfeit(battleId);
        res.json(battleState);
      } catch (error) {
        handleError(error, res, 'Failed to process forfeit turn');
      }
    },
  );

  app.post(
    '/api/battle/spend-token',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.spendBattleToken(userId);

        res.json({
          message: 'Battle token spent',
          user,
          battleTokens: user.battleTokens,
        });
      } catch (error) {
        console.error('Error spending battle token:', error);
        if (
          error instanceof Error &&
          error.message.includes('NO_BATTLE_TOKENS')
        ) {
          res.status(400).json({ message: 'NO_BATTLE_TOKENS' });
        } else {
          res.status(500).json({
            message: 'Failed to spend battle token',
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    },
  );

  app.get('/api/questions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subject = 'mixed', difficulty = 2 } = req.query;

      const question = await storage.getRandomQuestion(
        subject as string,
        parseInt(difficulty as string),
        userId,
      );

      if (!question) {
        return res.status(404).json({ message: 'No questions available' });
      }

      res.json(question);
    } catch (error) {
      handleError(error, res, 'Failed to fetch question');
    }
  });

  app.post('/api/questions/answer', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { questionId, answer, isCorrect, usedHint, subject, difficulty } =
        req.body;

      if (isCorrect) {
        const goldEarned = usedHint ? 15 : 25;
        await storage.updateUserCurrency(userId, goldEarned, 0);
        await storage.markQuestionAnswered(userId, questionId);

        const nextQuestion = await storage.getRandomQuestion(
          subject,
          difficulty,
          userId,
        );

        res.json({
          isCorrect: true,
          goldEarned,
          nextQuestion,
        });
      } else {
        res.json({
          isCorrect: false,
          goldEarned: 0,
        });
      }
    } catch (error) {
      handleError(error, res, 'Failed to process answer');
    }
  });

  app.post(
    '/api/generate/monster-image',
    isAuthenticated,
    async (req, res) => {
      try {
        const { monsterId, upgradeChoices } = req.body;

        if (!monsterId) {
          return res.status(400).json({ message: 'monsterId is required' });
        }

        const imageData = await veoClient.generateMonsterImage(
          monsterId,
          upgradeChoices || {},
        );

        res.json({
          success: true,
          imageData: imageData,
          mimeType: 'image/png',
        });
      } catch (error) {
        console.error('Error generating monster image:', error);
        res.status(500).json({
          message: 'Failed to generate monster image',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  );

  app.get('/api/battle/tokens', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.refreshBattleTokens(userId);

      res.json({
        battleTokens: user.battleTokens,
        lastRefresh: user.battleTokensLastRefresh,
        user,
      });
    } catch (error) {
      console.error('Error checking battle tokens:', error);
      res.status(500).json({ message: 'Failed to check battle tokens' });
    }
  });

  app.get('/api/ai-teams', isAuthenticated, async (req: any, res) => {
    try {
      const teams = await storage.getAllAiTeams();
      res.json(teams);
    } catch (error) {
      console.error('Error fetching AI teams:', error);
      res.status(500).json({ message: 'Failed to fetch AI teams' });
    }
  });

  app.get(
    '/api/user/battle-slots',
    isAuthenticated,
    async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const battleSlots = await storage.getUserBattleSlots(userId);
        res.json({ battleSlots });
      } catch (error) {
        console.error('Error fetching battle slots:', error);
        res.status(500).json({ message: 'Failed to fetch battle slots' });
      }
    },
  );

  const httpServer = createServer(app);
  return httpServer;
}