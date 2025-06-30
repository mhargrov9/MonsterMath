import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from './routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

function log(message: string) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [api-server] ${message}`);
}

const app = express();

// --- DEFINITIVE REPLIT FIX ---
// This middleware checks for the custom Replit header and rewrites the request URL.
// This ensures our Express router sees the correct path.
app.use((req, res, next) => {
  const originalPath = req.headers['x-replit-original-path'];
  if (originalPath && typeof originalPath === 'string') {
    req.url = originalPath;
  }
  next();
});


// Existing Middleware
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
  await registerRoutes(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  const PORT = process.env.PORT || 5000;
  const server = createServer(app);

  server.listen(PORT, () => {
    log(`API server running on port ${PORT}`);
  });
})();