// server.js
const express = require('express');
const cors = require('cors')
const fetch = require('node-fetch');
const app = express();
const PORT = 3001;

app.use(cors()); // Enable CORS for all routes

// Example route for Crypto.com
app.get('/api/crypto-com/:coin', async (req, res) => {
  const coin = req.params.coin.toUpperCase();
  const instrument = `${coin}_USD`;
  const url = `https://api.crypto.com/v2/public/get-ticker?instrument_name=${instrument}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(`Crypto.com error for ${coin}:`, err.message);
    res.status(500).json({ error: `Failed to fetch ${coin} from Crypto.com` });
  }
});


// Add other exchange endpoints as needed
// e.g., Gemini, Binance.US, etc.

app.listen(PORT, () => {
  console.log(`✅ Proxy server running on http://localhost:${PORT}`);
});
