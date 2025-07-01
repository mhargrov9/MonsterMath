#!/bin/bash

# Monster Academy - Application Startup Script
echo "🏫 Starting Monster Academy..."

# Build the application using npm scripts (which have access to node_modules/.bin)
echo "📦 Building application..."
npm run build

# Start the application
echo "🚀 Starting server on port 3000..."
node dist/index.js