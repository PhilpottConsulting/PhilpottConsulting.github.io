const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

// CORS middleware (log for debug)
app.use((req, res, next) => {
  console.log(`Incoming request: ${req.method} ${req.url}`);
  next();
});

// ✅ Enable CORS for all origins (broadest test case)
app.use(cors());

// Example API endpoint for testing
app.get('/api/test/:symbol', (req, res) => {
  const { symbol } = req.params;

  console.log(`Responding to /api/test/${symbol}`);
  res.json({
    status: 'success',
    symbol,
    price: 123.45,
    timestamp: new Date().toISOString()
  });
});

// Root for sanity check
app.get('/', (req, res) => {
  res.send('CORS debug server is running.');
});

app.listen(PORT, () => {
  console.log(`🟢 Server listening at http://localhost:${PORT}`);
});
