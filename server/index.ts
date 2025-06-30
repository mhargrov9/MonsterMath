import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// ... existing code ...

// After registerRoutes(app)
app.use(notFoundHandler);
app.use(errorHandler);

// ... rest of server startup code ...