import express from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Set environment variable to disable host check
process.env.DANGEROUSLY_DISABLE_HOST_CHECK = 'true';

const app = express();

// Add CORS headers to allow Replit dev environment
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  // Register API routes first
  const server = await registerRoutes(app);

  // Setup Vite or static file serving BEFORE error handlers
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Error handling middleware must be LAST
  app.use(notFoundHandler);
  app.use(errorHandler);

  // Use port 5000 by default, or PORT environment variable
  const PORT = parseInt(process.env.PORT || "5000", 10);

  server.listen(PORT, "0.0.0.0", () => {
    log(`Server running on port ${PORT}`);
  });
})();