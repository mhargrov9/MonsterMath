#!/bin/bash

# Monster Academy - Application Startup Script
echo "🏫 Starting Monster Academy..."

# Build the application first
echo "📦 Building frontend..."
cd client && vite build
cd ..

echo "🔧 Building backend..."
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Start the application
echo "🚀 Starting server on port 3000..."
node dist/index.js