const coins = ["bitcoin", "ethereum", "dogecoin", "tether", "ripple", "binancecoin", "solana"];
const symbols = {
  bitcoin: "BTC",
  ethereum: "ETH",
  dogecoin: "DOGE",
  tether: "USDT",
  ripple: "XRP",
  binancecoin: "BNB",
  solana: "SOL",
};

const refreshBtn = document.getElementById("refresh-btn");
const tbody = document.getElementById("crypto-table");

// Spread thresholds for action labels
const SPREAD_THRESHOLDS = [
  { limit: 5, label: "Act Now", className: "action-now" },
  { limit: 2, label: "Check It Out", className: "check-it-out" },
  { limit: 1, label: "Eh, you busy?", className: "maybe" },
];

// --- API fetch functions ---

async function fetchBinanceUSPrice(symbol) {
  try {
    const url = `https://api.binance.us/api/v3/ticker/price?symbol=${symbol}USD`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`BinanceUS API error ${res.status}`);
    const data = await res.json();
    const price = parseFloat(data.price);
    if (isNaN(price)) throw new Error(`Price NaN for ${symbol} on BinanceUS`);
    console.log(`✅ BinanceUS ${symbol}: ${price}`);
    return price;
  } catch (err) {
    console.warn(`❌ BinanceUS ${symbol}: ${err.message}`);
    return NaN;
  }
}

async function fetchCoinbasePrice(symbol) {
  try {
    const url = `https://api.coinbase.com/v2/prices/${symbol}-USD/spot`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Coinbase API error ${res.status}`);
    const data = await res.json();
    const price = parseFloat(data.data.amount);
    if (isNaN(price)) throw new Error(`Price NaN for ${symbol} on Coinbase`);
    return price;
  } catch (err) {
    console.warn(`❌ Coinbase ${symbol}: ${err.message}`);
    return NaN;
  }
}

async function fetchKrakenPrice(symbol) {
  try {
    const krakenSymbols = {
      BTC: "XXBTZUSD",
      ETH: "XETHZUSD",
      DOGE: "XDGUSD",
      USDT: "USDTZUSD",
      XRP: "XXRPZUSD",
      BNB: "BNBUSDT",
      SOL: "SOLUSD",
    };
    const pair = krakenSymbols[symbol];
    if (!pair) {
      console.warn(`Kraken: no symbol mapping for ${symbol}`);
      return NaN;
    }
    const url = `https://api.kraken.com/0/public/Ticker?pair=${pair}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Kraken API error ${res.status}`);
    const data = await res.json();
    if (!data.result) {
      console.warn(`Kraken: no result for ${symbol}`);
      return NaN;
    }
    const resultKey = Object.keys(data.result)[0];
    const price = parseFloat(data.result[resultKey].c[0]);
    if (isNaN(price)) throw new Error(`Price NaN for ${symbol} on Kraken`);
    return price;
  } catch (err) {
    console.warn(`❌ Kraken ${symbol}: ${err.message}`);
    return NaN;
  }
}

async function fetchCoinGeckoPrice(coinId) {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CoinGecko API error ${res.status}`);
    const data = await res.json();
    const price = data[coinId]?.usd;
    if (typeof price !== "number") throw new Error(`Price missing for ${coinId} on CoinGecko`);
    return price;
  } catch (err) {
    console.warn(`❌ CoinGecko ${coinId}: ${err.message}`);
    return NaN;
  }
}

async function fetchGeminiPrice(symbol) {
  // Gemini uses lowercase symbols (e.g., btcusd)
  try {
    const geminiSymbol = symbol.toLowerCase() + "usd";
    const url = `https://api.gemini.com/v1/pubticker/${geminiSymbol}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Gemini API error ${res.status}`);
    const data = await res.json();
    const price = parseFloat(data.last);
    if (isNaN(price)) throw new Error(`Price NaN for ${symbol} on Gemini`);
    return price;
  } catch (err) {
    console.warn(`❌ Gemini ${symbol}: ${err.message}`);
    return NaN;
  }
}

async function fetchCryptoComPrice(symbol) {
  // Crypto.com uses uppercase symbols (e.g., BTC_USD)
  const coin = "ETH"; // or BTC, DOGE, etc.
fetch(`http://localhost:3001/api/crypto-com/${coin}`)
  .then(res => res.json())
  .then(data => {
    console.log(data); // now should work without CORS issue
  });

}

const exchanges = {
  binanceUS: { name: "BinanceUS", fetch: fetchBinanceUSPrice },
  coinbase: { name: "Coinbase", fetch: fetchCoinbasePrice },
  kraken: { name: "Kraken", fetch: fetchKrakenPrice },
  coingecko: { name: "CoinGecko", fetch: fetchCoinGeckoPrice },
  gemini: { name: "Gemini", fetch: fetchGeminiPrice },
};

function getActionLabel(spreadPercent) {
  for (const threshold of SPREAD_THRESHOLDS) {
    if (spreadPercent >= threshold.limit) return threshold.label;
  }
  return "No Action";
}

function getActionClass(spreadPercent) {
  for (const threshold of SPREAD_THRESHOLDS) {
    if (spreadPercent >= threshold.limit) return threshold.className;
  }
  return "";
}

function formatPrice(price) {
  return isNaN(price) ? "N/A" : `$${price.toFixed(2)}`;
}

async function fetchAndPopulate() {
  refreshBtn.disabled = true;
  refreshBtn.textContent = "Loading...";
  tbody.innerHTML = "";

  const results = {};

  // Fetch all prices in parallel for all coins & exchanges
  await Promise.all(
    coins.map(async (coin) => {
      const sym = symbols[coin];

      // For coingecko fetch use coinId (like bitcoin), for others symbol like BTC
      const coinId = coin;

      // Prepare array of promises for all exchanges
      const pricePromises = [
        fetchBinanceUSPrice(sym),
        fetchCoinbasePrice(sym),
        fetchKrakenPrice(sym),
        fetchCoinGeckoPrice(coinId),
        fetchGeminiPrice(sym),
      ];

      // Await all prices for current coin
      const [
        binanceUSPrice,
        coinbasePrice,
        krakenPrice,
        coingeckoPrice,
        geminiPrice,
        cryptoComPrice,
      ] = await Promise.all(pricePromises);

      results[coin] = {
        sym,
        binanceUS: binanceUSPrice,
        coinbase: coinbasePrice,
        kraken: krakenPrice,
        coingecko: coingeckoPrice,
        gemini: geminiPrice,
        cryptoCom: cryptoComPrice,
      };
    })
  );

  // Build table rows per coin
  for (const coin of coins) {
    const rowData = results[coin];
    if (!rowData) continue;

    // Gather prices array (all exchanges)
    const prices = [
      rowData.binanceUS,
      rowData.coinbase,
      rowData.kraken,
      rowData.coingecko,
      rowData.gemini,
      rowData.cryptoCom,
    ].filter((p) => !isNaN(p));

    if (prices.length === 0) continue;

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const spreadPercent = ((maxPrice - minPrice) / minPrice) * 100;

    const tr = document.createElement("tr");
    tr.className = getActionClass(spreadPercent);

    tr.innerHTML = `
      <td class="px-4 py-2 font-semibold">${rowData.sym}</td>
      <td class="px-4 py-2">${formatPrice(rowData.binanceUS)}</td>
      <td class="px-4 py-2">${formatPrice(rowData.coinbase)}</td>
      <td class="px-4 py-2">${formatPrice(rowData.kraken)}</td>
      <td class="px-4 py-2">${formatPrice(rowData.coingecko)}</td>
      <td class="px-4 py-2">${formatPrice(rowData.gemini)}</td>
      <td class="px-4 py-2">${formatPrice(minPrice)}</td>
      <td class="px-4 py-2">${formatPrice(maxPrice)}</td>
      <td class="px-4 py-2">${spreadPercent.toFixed(2)}%</td>
      <td class="px-4 py-2">${getActionLabel(spreadPercent)}</td>
    `;

    tbody.appendChild(tr);
  }

  // Append your test rows exactly as in your HTML for user info
  const testRows = [
    {
      sym: "MOVE",
      binanceUS: 100,
      coinbase: 105,
      kraken: 102,
      coingecko: 101,
      gemini: 103,
      min: 100,
      max: 105,
      spread: 5,
      action: "Act Now",
      className: "action-now",
    },
    {
      sym: "CHECK",
      binanceUS: 100,
      coinbase: 102,
      kraken: 101,
      coingecko: 101,
      gemini: 102,
      min: 100,
      max: 102,
      spread: 2,
      action: "Check It Out",
      className: "check-it-out",
    },
    {
      sym: "MEH?",
      binanceUS: 100,
      coinbase: 100.5,
      kraken: 101.1,
      coingecko: 101.0,
      gemini: 101.2,
      min: 100,
      max: 101.1,
      spread: 1.1,
      action: "Eh, you busy?",
      className: "maybe",
    },
  ];

  for (const row of testRows) {
    const tr = document.createElement("tr");
    tr.className = row.className;
    tr.innerHTML = `
      <td class="px-4 py-2 font-semibold">${row.sym}</td>
      <td class="px-4 py-2">${row.binanceUS}</td>
      <td class="px-4 py-2">${row.coinbase}</td>
      <td class="px-4 py-2">${row.kraken}</td>
      <td class="px-4 py-2">${row.coingecko}</td>
      <td class="px-4 py-2">${row.gemini}</td>
      <td class="px-4 py-2">${row.min}</td>
      <td class="px-4 py-2">${row.max}</td>
      <td class="px-4 py-2">${row.spread}%</td>
      <td class="px-4 py-2">${row.action}</td>
    `;
    tbody.appendChild(tr);
  }

  refreshBtn.disabled = false;
  refreshBtn.textContent = "Refresh";
}

// Initial fetch call
fetchAndPopulate();

// Refresh button handler
refreshBtn.addEventListener("click", fetchAndPopulate);
