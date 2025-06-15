# Monster Academy - Educational Gaming Platform

## Overview

Monster Academy is a full-stack educational gaming platform that combines learning with entertainment. Players answer questions in subjects like math and spelling to earn currency, which they can use to purchase and upgrade digital monsters. The application features a modern React frontend with a Node.js/Express backend, utilizing PostgreSQL for data persistence and integrating with Google's Veo API for dynamic monster image generation.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Styling**: Tailwind CSS with custom game-themed colors and animations
- **UI Components**: Radix UI primitives with custom styling via shadcn/ui
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit Auth with OpenID Connect integration
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful API endpoints with JSON responses

## Key Components

### Authentication System
- **Provider**: Replit Auth using OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple
- **User Management**: Automatic user creation and profile synchronization
- **Security**: HTTP-only cookies with secure session handling

### Database Schema
- **Users**: Profile data, currency (gold/diamonds), progress tracking
- **Monsters**: Base monster templates with stats and costs
- **User Monsters**: Player-owned monsters with levels and upgrades
- **Questions**: Educational content with difficulty levels and subjects
- **Battles**: PvP battle system with results tracking
- **Sessions**: Secure session storage for authentication

### Game Systems
1. **Learning System**: Question-based gameplay with gold rewards
2. **Monster Lab**: Purchase and upgrade system with visual customization
3. **Battle Arena**: Player vs AI combat with turn-based mechanics
4. **Currency System**: Gold (earned through learning) and Diamonds (premium currency)

### External API Integration
- **Google Veo API**: Dynamic monster image generation based on upgrades
- **Neon Database**: Serverless PostgreSQL hosting
- **Image Caching**: In-memory caching for generated monster images

## Data Flow

1. **User Authentication**: Replit Auth → Session Creation → User Profile Sync
2. **Learning Flow**: Question Fetch → Answer Submission → Reward Calculation → Profile Update
3. **Monster Management**: Purchase Request → Currency Check → Monster Creation → Upgrade Application
4. **Battle System**: Opponent Selection → Battle Simulation → Result Processing → Rewards Distribution
5. **Image Generation**: Monster Data → Veo API Request → Image Cache → Frontend Display

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM
- **express**: Web application framework
- **react**: Frontend UI library
- **@tanstack/react-query**: Server state management
- **passport**: Authentication middleware

### UI/UX Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **class-variance-authority**: Utility for component variants

### Development Dependencies
- **vite**: Build tool and development server
- **typescript**: Type checking and compilation
- **tsx**: TypeScript execution for server development

## Deployment Strategy

### Development Environment
- **Runtime**: Replit with Node.js 20
- **Database**: Provisioned PostgreSQL instance
- **Port Configuration**: Internal port 5000, external port 80
- **Hot Reload**: Vite HMR for frontend, tsx for backend

### Production Build
- **Frontend**: Vite build with optimized assets
- **Backend**: esbuild compilation to single bundle
- **Deployment Target**: Replit Autoscale
- **Static Assets**: Served from dist/public directory

### Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `GOOGLE_API_KEY`: Veo API authentication
- `REPL_ID`: Replit environment identifier
- `ISSUER_URL`: OpenID Connect provider URL

## Changelog

- June 13, 2025: Initial setup with photorealistic AI-generated monsters
- June 13, 2025: Migrated to custom monster design system with user-provided images
  - Removed all AI-generated monsters (Fire Dragon, Ice Dragon, Thunder Dragon, Water Dragon, Earth Dragon)
  - Implemented two new monsters from Monster Design Document:
    * Gigalith: Tank/Physical Brawler (HP: 950, MP: 200, Earth-type)
    * Aetherion: Glass Cannon/Psychic Mage (HP: 400, MP: 800, Psychic-type)
  - Enhanced database schema with detailed battle stats (HP, MP, abilities, resistances, weaknesses, level upgrades)
  - Created placeholder graphics system for custom monster images
  - Updated visual generation to support upgrade-specific appearance changes
- June 14, 2025: Enhanced monster card abilities section with professional styling
  - Added contextual icons for each ability type (brain, target, hand, mountain, etc.)
  - Implemented black circles with white "P" for passive abilities
  - Maintained red badges with "A" for active abilities
  - Added bordered containers for each ability to prevent text overflow
  - Increased card heights significantly (medium: 900px) to accommodate all content
  - Fixed abilities section height (360px) with proper spacing and no scroll bars
  - Implemented client-side image caching to eliminate hover lag
  - Added level cap system (max level 10) with both client and server validation
- June 14, 2025: Strategic Battle Engine Development
  - Integrated full Monster Cards into Battle Arena replacing simple image/HP displays
  - Implemented database-driven player attack command interface
  - Created dynamic abilities system reading ACTIVE abilities from monster database
  - Added mana cost validation and deduction system (abilities show "Name (40 MP)" format)
  - Buttons disable automatically when insufficient MP available
  - Added strategic decision-making with complete stat visibility during battles
  - Level 10 Gigalith set as default opponent for consistent testing
  - Battle interface transformed from passive viewing to interactive strategic gameplay
  - Fixed ability parsing to correctly read database format (active1/active2 structure)
  - Corrected Aetherion Level 8 abilities to match Design Document (Mind Strike, Psy-Beam)
  - Fixed frontend caching issue preventing updated ability names from displaying
  - Added cache invalidation to ensure fresh monster data loads in battles
- June 14, 2025: Interactive Monster Card Ability System
  - Removed separate ability button grid below monster cards
  - Made ability boxes on monster cards directly clickable during player's turn
  - Added red glowing borders on affordable abilities with visual feedback
  - Implemented "Click to attack!" prompts and hover effects for interactive abilities
  - Maintained all existing damage calculations and mana cost validation
  - Abilities on opponent cards remain non-interactive for visual reference only
  - Added Basic Attack button below Mana stat with blue design (0 MP cost)
  - Basic Attack damage calculated as 0.6 × monster's Power stat
  - Always available as clickable option during player's turn
  - Fixed AI attack system to use monster's actual database abilities instead of generic attacks
  - AI Gigalith now uses Basic Attack, Magma Punch, and Tremor Stomp (removed non-existent Heavy Strike)
  - Standardized damage calculations between player and AI for consistent battle mechanics
  - Balanced AI attack distribution: Basic Attack 50%, each special ability 25%
  - Fixed database foreign key error for AI battle completion by using NULL for AI opponents
- June 14, 2025: UI Polish and Clean Design
  - Removed redundant text prompts from Basic Attack button ("Standard physical attack", "Click to attack!")
  - Cleaned up abilities section by removing all "Click to attack!" prompts
  - Maintained visual interaction cues (red glow, hover effects) for cleaner professional appearance
- June 14, 2025: AI Mana System Implementation
  - Added MP tracking to AI monsters with proper initialization (160/200 MP)
  - Implemented AI mana consumption when using abilities (Magma Punch: 30 MP, Tremor Stomp: 70 MP)
  - Fixed AI monster card to display dynamic mana values from battle state
  - Added battle log messages for AI mana consumption ("AI [X] MP consumed")
  - Fixed AI monster card mana display to show real-time mana updates during battle
  - Resolved NaN display issue with proper null coalescing for battleMp values
  - Added attack execution guard to prevent duplicate mana deduction during animations
  - Enhanced battle log debugging with before/after mana tracking for troubleshooting
  - Corrected Gigalith ability mana costs: Magma Punch (40 MP), Tremor Stomp (50 MP)
  - Synchronized database values with AI attack generation for consistent mana consumption
  - Reverted to 80% starting MP to preserve monster stats between battles for persistent resource management
- June 15, 2025: Persistent Monster Stats System
  - Added HP and MP columns to user_monsters database table for persistent stat tracking
  - Updated Monster Card display to show current HP/MP from database instead of calculated values
  - Fixed battle initialization to use persistent HP/MP values instead of recalculating from base stats
  - Implemented battle completion API endpoint to save monster stats after each fight
  - Added retreat button to battle arena allowing mid-battle exit with stat preservation
  - Updated monster purchase logic to properly initialize HP/MP for new monsters
  - Fixed getUserMonsters query to include HP/MP columns in returned data
  - Monsters now maintain HP/MP between battles for strategic resource management
- June 15, 2025: Victory Rewards System
  - Updated battle victory rewards to award exactly 10 Diamonds for wins (0 for losses)
  - Changed victory message to display "YOU WIN! You earned 10 Diamonds!"
  - Streamlined reward structure for clear player feedback
- June 15, 2025: Monster Card UI Polish and Healing System
  - Moved pulsating purple eye to left side below level indicator for owned monsters only
  - Removed blue flip button that was causing unwanted blue eye icon display
  - Added healing button below HP bar for damaged owned monsters with cost calculation
  - Implemented healing confirmation dialog showing cost and HP restoration details
  - Created backend healing API with gold balance validation and ownership checks
  - Purple pulsating eye now appears for both Gigalith (ID 6) and Aetherion (ID 7) when owned
  - Healing cost: 1 Gold per 10 HP healed (rounded up) with full HP restoration
  - Fixed Aetherion max HP from 950 to correct value of 400 HP
  - Prevented card flipping after healing confirmation with proper event handling
  - Corrected database values for accurate HP display and healing calculations
- June 15, 2025: Shattered Monster State System
  - Added `isShattered` boolean field to user_monsters database table
  - Implemented visual indicators: grayed out cards with reduced opacity
  - Added red "SHATTERED" status icon with ShieldX symbol below HP display
  - Disabled healing functionality for shattered monsters (no heal button)
  - Created battle restrictions preventing shattered monster selection
  - Auto-shattering system: monsters shatter when HP reaches 0 in battles
  - Prepared repair API endpoint for future Repair Kit item integration
  - Monster Stable now visually distinguishes between healthy and shattered monsters
- June 15, 2025: Dual Authentication System Implementation
  - Extended database schema with username, passwordHash, and authProvider fields
  - Added local username/password authentication alongside existing Replit OAuth
  - Implemented bcrypt password hashing for secure local account storage
  - Created registration and login API endpoints for local accounts
  - Added passport-local strategy for username/password authentication
  - Built beautiful tabbed interface on landing page with "Quick Start" (OAuth) and "Create Account" (local) options
  - Local accounts support username/password registration with email validation
  - Users can choose between instant OAuth login or creating custom Monster Academy accounts
  - All user data (Gold, Diamonds, Monster Stable) properly isolated by user ID regardless of auth method
- June 15, 2025: Player Inventory System Implementation
  - Added comprehensive inventory database table for non-monster items storage
  - Implemented complete CRUD operations for inventory management
  - Created beautiful backpack interface with item categorization and rarity system
  - Added backpack icon to main navigation with item count badge
  - Supports item types: consumable, tool, quest, material with rarity levels
  - Includes demo "Find Item" button to test system with Repair Kit example
  - Full integration with user authentication and data persistence
  - Ready for story quest item rewards and monster repair functionality
- June 15, 2025: Story State Manager Implementation
  - Added storyProgress column to users database table for adventure tracking
  - Implemented complete story progress API with GET/POST endpoints
  - Created comprehensive Story Manager component with choose-your-own-adventure demo
  - Added STORY tab to main navigation with 6 interconnected story nodes
  - Automatic progress saving ensures players continue exactly where they left off
  - Story nodes include Academy Gates, Great Hall, Training Grounds, Enchanted Forest
  - Full integration with user authentication and persistent database storage
  - Foundation complete for unlimited story quest expansion and narrative gameplay

## User Preferences

Preferred communication style: Simple, everyday language.