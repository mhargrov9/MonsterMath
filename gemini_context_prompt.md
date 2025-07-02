# Monster Academy - Complete Context for Gemini AI

## Project Overview
Monster Academy is an educational gaming platform that combines learning with monster training. Players answer questions to earn currency, purchase and upgrade monsters, and engage in strategic turn-based battles. The application is built with React frontend, Node.js/Express backend, and PostgreSQL database.

## Unbreakable Rules (CRITICAL - Never Violate)

### 1. Database-Driven Architecture
- ALL game data MUST come from PostgreSQL database - never use hardcoded constants
- Monsters, abilities, AI teams, questions - everything must be database-driven
- Single source of truth: PostgreSQL database only

### 2. Authentic Data Only
- NEVER use mock, placeholder, or synthetic data
- Always request API keys/credentials from user for testing with real data
- Display clear error states when authentic data cannot be retrieved
- No fallback to fake data under any circumstances

## Overall Strategy: Client-to-Server Migration

### Goal
Migrate from client-side battle logic to fully server-authoritative gameplay while maintaining identical user experience.

### Migration Pattern
1. Identify client-side logic (damage calculation, turn management, etc.)
2. Move logic to server with identical functionality
3. Create API endpoints for server-controlled operations
4. Update client to consume server APIs instead of local calculations
5. Maintain exact same user experience throughout migration

## Architecture Summary

### Frontend (React + TypeScript)
- Wouter for routing, TanStack Query for server state
- Tailwind CSS + Radix UI components
- Monster cards, battle arena, learning system, story mode
- Client displays server-authoritative data only

### Backend (Node.js + Express + TypeScript)
- PostgreSQL with Drizzle ORM
- Replit Auth with dual local/OAuth authentication
- RESTful API endpoints with JSON responses
- Server-side battle engine with in-memory session management

### Database Schema (Key Tables)
- `users`: profiles, currency (gold/diamonds), progress, battle tokens
- `monsters`: base templates with stats, costs, abilities
- `user_monsters`: owned monsters with levels, HP/MP, shattered state
- `abilities`: monster abilities with damage, mana costs, types
- `battles`: battle history and results
- `ai_teams`: AI opponents with different archetypes

## Migration Progress (Tasks 4-8a Completed)

### Task 4-5: Server-Side Damage Calculations ✅
- Moved `calculateDamage` function from client to `server/battleEngine.ts`
- Created `/api/battle/calculate-damage` endpoint (response time: 72-84ms)
- Client now sends ability data to server, receives authoritative damage results
- Maintains exact same damage formulas and affinity multipliers

### Task 6: Server-Side Battle Sessions ✅
- Created in-memory battle session store using Map with crypto.randomUUID()
- Added `startBattle` function in battleEngine.ts for session initialization
- Created `/api/battle/start` endpoint for server-controlled battle creation
- Client receives battleId and requests server-managed battle state

### Task 7: Server-Authoritative Turn Management ✅
- Enhanced `applyDamage` function to use battleId for session lookup
- Added automatic turn switching and battle end detection on server
- Created `processAiTurn` function for server-side AI decision making
- Updated `/api/battle/perform-action` endpoint (accepts battleId + ability only)
- Added `/api/battle/ai-turn` endpoint for complete server-controlled AI turns
- Client sends minimal data, receives complete authoritative battle state updates

### Task 8a: Server-Side AI Battle Logging ✅ (JUST COMPLETED)
- Enhanced `processAiTurn` to add specific AI ability messages to server battle log
- Server generates "Opponent's [Monster Name] used [Ability Name]!" with authentic data
- Removed redundant client-side AI log message generation
- Fixed bug showing "used an ability" instead of specific ability names
- Client displays server's authoritative battle log for accurate information

## Current System State

### Server-Side Battle Engine (`server/battleEngine.ts`)
- `calculateDamage()`: Handles all damage calculations with affinity multipliers
- `applyDamage()`: Applies damage to battle sessions and manages turn switching
- `startBattle()`: Creates battle sessions with unique IDs and team initialization
- `processAiTurn()`: AI decision making, ability selection, and action execution
- In-memory battle session store with Map-based state management

### Client-Side Battle Arena (`client/src/components/BattleArena.tsx`)
- Displays server-authoritative battle state (no local battle logic)
- Sends player actions to server via API calls
- Receives complete battle updates from server responses
- Shows authentic battle log messages from server
- Handles visual effects and UI updates only

### API Endpoints
- `POST /api/battle/start`: Create new battle session
- `POST /api/battle/perform-action`: Execute player ability
- `POST /api/battle/ai-turn`: Process AI turn
- `POST /api/battle/calculate-damage`: Standalone damage calculation
- `POST /api/battle/complete`: Save battle results

## Key Files to Understand
- `server/battleEngine.ts`: Core battle logic and session management
- `server/routes.ts`: API endpoint definitions
- `client/src/components/BattleArena.tsx`: Battle UI component
- `shared/types.ts`: Shared TypeScript types between client/server
- `server/storage.ts`: Database operations interface
- `shared/schema.ts`: Drizzle database schema definitions

## Next Steps Context
The migration is progressing successfully with Tasks 4-8a complete. The battle system is now fully server-authoritative while maintaining identical user experience. All damage calculations, turn management, AI decisions, and battle logging happen on the server.

## Development Guidelines
- Use database-driven queries instead of hardcoded data
- Maintain exact same user experience during server migrations
- Implement comprehensive error handling for API failures
- Follow the established pattern: client → server API → database → response
- Always test that battles work identically before and after changes
- Keep authentication and session management through existing Replit Auth system

## Our Collaborative Workflow Process

### Step-by-Step Process (IMPORTANT - Follow Exactly)

1. **Gemini Creates Instructions**: You (Gemini) analyze the current state and create detailed, specific instructions for the next task. Include:
   - Goal of the task
   - Exact files to modify
   - Specific code changes needed
   - Verification steps

2. **User Sends Instructions for Review**: User copies your instructions and sends them to the Replit AI agent for review

3. **Agent Reviews (No Code)**: The Replit AI agent reviews your instructions and responds with:
   - Whether instructions fit our overall strategy
   - Whether they violate any unbreakable rules
   - Any concerns or suggestions
   - **IMPORTANT**: Agent does NOT write any code during review

4. **User Approves or Modifies**: User either:
   - Approves: "please proceed"
   - Gives feedback: Modified instructions or corrections

5. **Agent Implements**: Only after approval, the agent writes the actual code following your instructions exactly

6. **User Tests**: User tests the implementation and reports results back to you (Gemini)

7. **Repeat**: You (Gemini) analyze results and provide next task instructions

### Key Points for Gemini
- Always wait for user approval before the agent implements
- Be very specific in your instructions (exact file paths, code snippets, etc.)
- Consider the unbreakable rules when creating instructions
- Focus on incremental, testable changes
- The agent will only implement after user says "proceed"

## Communication Style
User prefers simple, everyday language without technical jargon. Focus on what the system does rather than how it's implemented. Avoid mentioning specific tool names or technical implementation details in user-facing communications.