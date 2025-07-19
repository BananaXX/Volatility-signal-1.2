// server.js
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');
const { sendTelegramSignal, sendTelegramInfo } = require('./notifier/telegram');
const { sendWhatsAppSignal } = require('./notifier/whatsapp');
const { shouldAllowSignal } = require('./filters/aiFilter');
const { calculateRSI, calculateSMA, calculateVolatility } = require('./utils/indicators');
const { logSignalToFile } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let derivWS = null;
let isConnectedToDerivs = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

let botState = {
    isRunning: false,
    currentVol: '1HZ75V',
    indexType: '1s',
    currentPrice: 0,
    lastPrice: 0,
    priceHistory: [],
    signals: [],
    performance: {
        totalTrades: 0,
        winningTrades: 0,
        dailyPL: 0,
        lastSignalTime: null
    }
};

const volatilityIndices = {
    '1s': {
        75: { symbol: '1HZ75V', name: 'Volatility 75 (1s) Index', stopLoss: 100, takeProfit: 250, riskPercent: 2.2, frequency: '1s' }
    }
};

function connectToDerivAPI() {
    console.log('Connecting to Deriv...');
    derivWS = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

    derivWS.on('open', () => {
        isConnectedToDerivs = true;
        reconnectAttempts = 0;
        subscribeToVolatilityIndex(botState.currentVol);
        sendTelegramInfo(`Connected to Deriv: ${botState.currentVol}`);
    });

    derivWS.on('message', data => {
        const msg = JSON.parse(data);
        if (msg.tick) {
            botState.lastPrice = botState.currentPrice;
            botState.currentPrice = parseFloat(msg.tick.quote);
            botState.priceHistory.push(botState.currentPrice);
            if (botState.priceHistory.length > 100) botState.priceHistory.shift();

            if (botState.isRunning) analyzeMarket();
        }
    });

    derivWS.on('close', () => {
        isConnectedToDerivs = false;
        if (++reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
            setTimeout(connectToDerivAPI, 3000);
        }
    });

    derivWS.on('error', () => {
        isConnectedToDerivs = false;
    });
}

function subscribeToVolatilityIndex(symbol) {
    derivWS.send(JSON.stringify({ forget_all: "ticks" }));
    setTimeout(() => {
        derivWS.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
    }, 500);
}

function analyzeMarket() {
    const prices = botState.priceHistory;
    if (prices.length < 20) return;

    const sma5 = calculateSMA(prices.slice(-5));
    const sma10 = calculateSMA(prices.slice(-10));
    const sma20 = calculateSMA(prices.slice(-20));
    const rsi = calculateRSI(prices);
    const volatility = calculateVolatility(prices);

    const signal = {
        id: Date.now(),
        symbol: botState.currentVol,
        indexType: botState.indexType,
        direction: sma5 > sma10 && sma10 > sma20 ? 'BULLISH' :
                   sma5 < sma10 && sma10 < sma20 ? 'BEARISH' : 'NEUTRAL',
        rsi: rsi.toFixed(1),
        volatility: volatility.toFixed(2),
        price: botState.currentPrice,
        timestamp: new Date().toISOString()
    };

    if (signal.direction !== 'NEUTRAL' &&
        shouldAllowSignal(signal, botState.performance.lastSignalTime)) {
        botState.signals.unshift(signal);
        botState.performance.lastSignalTime = Date.now();
        logSignalToFile(signal);
        sendTelegramSignal(signal);
        sendWhatsAppSignal(signal);
        console.log("Signal sent:", signal);
    }
}

app.post('/api/start', (req, res) => {
    botState.isRunning = true;
    res.json({ success: true });
});

app.post('/api/stop', (req, res) => {
    botState.isRunning = false;
    res.json({ success: true });
});

app.get('/api/status', (req, res) => {
    res.json({ isRunning: botState.isRunning, price: botState.currentPrice });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/index.html'));
});

connectToDerivAPI();
app.listen(PORT, () => console.log(`Bot live on port ${PORT}`));
