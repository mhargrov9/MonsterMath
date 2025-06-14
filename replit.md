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
  - Increased card heights significantly (medium: 840px) to accommodate all content
  - Fixed abilities section height (320px) with proper spacing and no scroll bars

## User Preferences

Preferred communication style: Simple, everyday language.