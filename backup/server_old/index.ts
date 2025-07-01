import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from './routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import path from 'path';
import fs from 'fs';

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
  const distPath = path.resolve(process.cwd(), 'client', 'dist');
  app.use(express.static(distPath));

  // Fallback for client-side routing
  app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api')) {
      return notFoundHandler(req, res);
    }
    
    const indexPath = path.resolve(distPath, 'index.html');
    
    // Check if the file exists before trying to serve it
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      // Frontend build not ready yet, send a loading page
      res.status(202).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Monster Academy - Loading</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .spinner { 
              border: 4px solid #f3f3f3; 
              border-top: 4px solid #3498db; 
              border-radius: 50%; 
              width: 40px; 
              height: 40px; 
              animation: spin 2s linear infinite; 
              margin-bottom: 20px;
            }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .container { text-align: center; }
          </style>
          <script>
            setTimeout(() => window.location.reload(), 3000);
          </script>
        </head>
        <body>
          <div class="container">
            <div class="spinner"></div>
            <h2>Monster Academy</h2>
            <p>Building your adventure...</p>
            <p><small>This page will refresh automatically</small></p>
          </div>
        </body>
        </html>
      `);
    }
  });

  // Error handlers must be last
  app.use(notFoundHandler);
  app.use(errorHandler);

  const PORT = process.env.PORT || 3000;
  server.listen(Number(PORT), '0.0.0.0', () => {
    log(`API server running on port ${PORT}`);
  });
})();