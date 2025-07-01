import type { Express, Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import type { Server } from 'http';
import path from 'path';
import fs from 'fs';
import express from 'express';
import { notFoundHandler } from './middleware/errorHandler.js';

const __dirname = path.resolve();

// This function sets up Vite as middleware for development
export async function setupVite(app: Express, server: Server) {
  const vite = await createViteServer({
    configFile: path.resolve(__dirname, 'vite.config.ts'),
    server: { 
      middlewareMode: true,
      hmr: { server }
    },
    appType: 'custom'
  });

  app.use(vite.middlewares);

  app.use('*', async (req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    try {
      const url = req.originalUrl;
      const templatePath = path.resolve(__dirname, 'client', 'index.html');
      let template = fs.readFileSync(templatePath, 'utf-8');
      template = await vite.transformIndexHtml(url, template);
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      const err = e as Error;
      vite.ssrFixStacktrace(err);
      next(err);
    }
  });
}

// This function serves the built static files in production
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, 'dist');
  app.use(express.static(distPath));
  app.use('*', (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
      return notFoundHandler(req, res);
    }
    res.sendFile(path.resolve(distPath, 'index.html'));
  });
}

// A consistent logging function
export function log(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [server] ${message}`);
}