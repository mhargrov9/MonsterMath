import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from './routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import path from 'path';

const __dirname = path.resolve();

function log(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [server] ${message}`);
}

const app = express();

// Replit Path Fix Middleware
app.use((req, res, next) => {
  const originalPath = req.headers['x-replit-original-path'];
  if (originalPath && typeof originalPath === 'string') {
    req.url = originalPath;
  }
  next();
});

// API and other Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
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

  // Serve Static Files
  const distPath = path.resolve(__dirname, '..', 'client', 'dist');
  app.use(express.static(distPath));

  // Fallback for client-side routing
  app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
      return notFoundHandler(req, res);
    }
    res.sendFile(path.resolve(distPath, 'index.html'));
  });

  // Error handlers must be last
  app.use(notFoundHandler);
  app.use(errorHandler);

  const PORT = process.env.PORT || 5002; // Port changed to 5002
  server.listen(PORT, '0.0.0.0', () => {
    log(`API server running on port ${PORT}`);
  });
})();