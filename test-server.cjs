const express = require('express');
const app = express();
const port = 5002;

app.get('/', (req, res) => {
  res.send('Hello World! The test server is working.');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Test server listening on port ${port}`);
});