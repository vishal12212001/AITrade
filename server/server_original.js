

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'database.json');

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- PERSISTENCE LAYER ---
let db = {
    accounts: [],
    marketPrices: {
        "EURUSD": 1.0850,
        "GBPUSD": 1.2630,
        "USDJPY": 151.20,
        "XAUUSD": 2340.50,
        "US30": 39500.00
    }
};

// Load Data
const loadData = () => {
    if (fs.existsSync(DB_FILE)) {
        try {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            db = JSON.parse(data);
            console.log(`[Database] Loaded ${db.accounts.length} accounts from disk.`);
        } catch (e) {
            console.error("[Database] Error loading data:", e);
        }
    }
};

// Save Data
const saveData = () => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (e) {
        console.error("[Database] Error saving data:", e);
    }
};

// Initialize
loadData();


// --- SIMULATION HELPERS ---
const generateTicket = () => Math.floor(Math.random() * 1000000000);

// Update prices every tick
setInterval(() => {
    Object.keys(db.marketPrices).forEach(symbol => {
        const move = (Math.random() - 0.5) * 0.0005 * (db.marketPrices[symbol] / 100);
        db.marketPrices[symbol] += move;
    });
    // We don't save DB on every tick to save IO, only on structural changes
}, 1000);

// Update Account Equity based on Open Trades
setInterval(() => {
    db.accounts.forEach(acc => {
        let totalProfit = 0;
        acc.trades = acc.trades.map(trade => {
            const currentPrice = db.marketPrices[trade.symbol] || trade.openPrice;
            const diff = trade.type === 'BUY' 
                ? currentPrice - trade.openPrice 
                : trade.openPrice - currentPrice;
            
            // Simplified Profit Calc: diff * lots * 100000
            const profit = diff * 100000 * trade.lots;
            totalProfit += profit;

            return { ...trade, currentPrice, profit };
        });
        
        acc.equity = acc.balance + totalProfit;
    });
}, 1000);


// --- API ROUTES ---

// Health Check
app.get('/', (req, res) => {
    res.send('MetaSync Backend Running. Connect via http://localhost:3001/api');
});

// 1. Get All Accounts (Sync State)
app.get('/api/accounts/sync', (req, res) => {
    res.json(db.accounts);
});

// 2. Add Account (Connect)
app.post('/api/accounts', (req, res) => {
    const { name, login, server, platform, role, password, defaultTakeProfit, defaultStopLoss, allowedPairs } = req.body;
    
    // Simulate Connection Delay
    setTimeout(() => {
        const newAccount = {
            id: `live-${Date.now()}`,
            name,
            login,
            server,
            platform,
            role,
            password: '***', // Don't store plain text in real app
            balance: Math.floor(Math.random() * 50000) + 10000, // Simulate existing balance
            equity: 0, // Will be synced in loop
            leverage: 100,
            currency: 'USD',
            status: 'CONNECTED',
            trades: [],
            history: [],
            // Optional fields
            defaultTakeProfit,
            defaultStopLoss,
            allowedPairs
        };
        
        // Init Equity
        newAccount.equity = newAccount.balance;
        
        db.accounts.push(newAccount);
        saveData(); // Persist

        console.log(`[Backend] Account Connected: ${login} (${server})`);
        res.json(newAccount);
    }, 1500);
});

// 3. Delete Account
app.delete('/api/accounts/:id', (req, res) => {
    const { id } = req.params;
    db.accounts = db.accounts.filter(a => a.id !== id);
    saveData(); // Persist
    console.log(`[Backend] Account Removed: ${id}`);
    res.json({ success: true });
});

// 4. Open Trade (Execute)
app.post('/api/accounts/:id/trades', (req, res) => {
    const { id } = req.params;
    const tradeRequest = req.body;
    
    const account = db.accounts.find(a => a.id === id);
    if (!account) {
        return res.status(404).json({ error: "Account not found" });
    }

    const price = db.marketPrices[tradeRequest.symbol] || tradeRequest.openPrice || 0;
    
    const newTrade = {
        ...tradeRequest,
        id: `ord-${Date.now()}`,
        ticket: generateTicket(),
        openPrice: price,
        currentPrice: price,
        openTime: new Date().toISOString(),
        profit: 0,
        isClosed: false
    };

    account.trades.push(newTrade);
    saveData(); // Persist

    console.log(`[Backend] Trade Opened on ${account.login}: ${newTrade.type} ${newTrade.lots} ${newTrade.symbol}`);
    res.json(newTrade);
});

// 5. Close Trade
app.delete('/api/accounts/:id/trades/:ticket', (req, res) => {
    const { id, ticket } = req.params;
    
    const account = db.accounts.find(a => a.id === id);
    if (!account) {
        return res.status(404).json({ error: "Account not found" });
    }

    const tradeIndex = account.trades.findIndex(t => t.ticket == ticket);
    if (tradeIndex === -1) {
        return res.status(404).json({ error: "Trade not found" });
    }

    const trade = account.trades[tradeIndex];
    trade.isClosed = true;
    trade.closeTime = new Date().toISOString();
    trade.closePrice = trade.currentPrice;

    // Move to history
    account.history.push(trade);
    account.trades.splice(tradeIndex, 1);
    
    // Update balance
    account.balance += trade.profit;

    saveData(); // Persist

    console.log(`[Backend] Trade Closed on ${account.login}: #${ticket} P/L: ${trade.profit.toFixed(2)}`);
    res.json({ success: true, trade });
});

// Start Server
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(` MetaSync Backend Server Running on Port ${PORT}`);
    console.log(` Database: ${DB_FILE}`);
    console.log(` Connectivity Mode: LIVE`);
    console.log(` Waiting for dashboard connection...`);
    console.log(`=========================================`);
});
