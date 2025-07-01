import express from 'express';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Basic middleware
app.use(express.json());

// Simple test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Monster Academy Server Running!', timestamp: new Date().toISOString() });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});