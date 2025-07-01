import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from './routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { setupVite, serveStatic, log } from './vite.js';

const app = express();

// Path Fix Middleware
app.use((req, res, next) => {
  const originalPath = req.headers['x-replit-original-path'] || req.headers['x-forwarded-path'];
  if (originalPath && typeof originalPath === 'string') {
    req.url = originalPath;
  }
  next();
});

// API and other Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  );
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

(async () => {
  const server = createServer(app);

  // Set up API routes and authentication
  await registerRoutes(app);

  if (process.env.NODE_ENV === 'development') {
    // In development, Vite handles serving the frontend.
    await setupVite(app, server);
  } else {
    // In production, Express serves the built static files.
    serveStatic(app);
  }

  // Error handlers must be last
  app.use(notFoundHandler);
  app.use(errorHandler);

  const PORT = process.env.PORT || 5002;
  server.listen(PORT, '0.0.0.0', () => {
    log(`API server and client running on port ${PORT}`);
  });
})();