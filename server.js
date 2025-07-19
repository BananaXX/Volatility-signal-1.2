const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const cors = require('cors');

// Import enhanced modules
const { sendTelegramSignal, sendTelegramInfo, testTelegramConnection } = require('./modules/telegram');
const { sendWhatsAppSignal, testWhatsAppConnection } = require('./modules/whatsapp');
const { evaluateSignalWithAI } = require('./modules/aiFilter');
const { logSignalDecision, logBotActivity, getRecentLogs } = require('./modules/logger');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// WebSocket connection variables
let derivWS = null;
let isConnectedToDerivs = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Enhanced bot state with all original features + AI enhancements
let botState = {
    isRunning: false,
    currentVol: '1HZ75V',
    indexType: '1s',
    currentPrice: 0,
    lastPrice: 0,
    priceHistory: [],
    signals: [],
    marketData: {
        bid: 0,
        ask: 0,
        spread: 0,
        timestamp: null,
        volatility: 0
    },
    performance: {
        totalTrades: 0,
        winningTrades: 0,
        dailyPL: 0,
        lastSignalTime: null
    },
    // Enhanced AI features
    aiFilterEnabled: false,
    whatsappEnabled: false,
    aiStats: {
        totalEvaluations: 0,
        approvedSignals: 0,
        rejectedSignals: 0,
        adjustedSignals: 0
    }
};

// Complete volatility indices configuration (from original)
const volatilityIndices = {
    regular: {
        10: { symbol: 'R_10', name: 'Volatility 10 Index', stopLoss: 30, takeProfit: 75, riskPercent: 1, frequency: '2s' },
        25: { symbol: 'R_25', name: 'Volatility 25 Index', stopLoss: 50, takeProfit: 125, riskPercent: 1.5, frequency: '2s' },
        50: { symbol: 'R_50', name: 'Volatility 50 Index', stopLoss: 100, takeProfit: 250, riskPercent: 2, frequency: '2s' },
        75: { symbol: 'R_75', name: 'Volatility 75 Index', stopLoss: 150, takeProfit: 375, riskPercent: 2.5, frequency: '2s' },
        100: { symbol: 'R_100', name: 'Volatility 100 Index', stopLoss: 250, takeProfit: 625, riskPercent: 3, frequency: '2s' }
    },
    '1s': {
        10: { symbol: '1HZ10V', name: 'Volatility 10 (1s) Index', stopLoss: 20, takeProfit: 50, riskPercent: 0.8, frequency: '1s' },
        25: { symbol: '1HZ25V', name: 'Volatility 25 (1s) Index', stopLoss: 35, takeProfit: 90, riskPercent: 1.2, frequency: '1s' },
        50: { symbol: '1HZ50V', name: 'Volatility 50 (1s) Index', stopLoss: 70, takeProfit: 180, riskPercent: 1.8, frequency: '1s' },
        75: { symbol: '1HZ75V', name: 'Volatility 75 (1s) Index', stopLoss: 100, takeProfit: 250, riskPercent: 2.2, frequency: '1s' },
        100: { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index', stopLoss: 150, takeProfit: 400, riskPercent: 2.8, frequency: '1s' }
    }
};

// ==================== DERIV WEBSOCKET CONNECTION (ORIGINAL LOGIC) ====================

function connectToDerivAPI() {
    console.log('Connecting to Deriv WebSocket API...');
    logBotActivity('Attempting to connect to Deriv API');

    derivWS = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');

    derivWS.on('open', () => {
        console.log('Connected to Deriv WebSocket API');
        isConnectedToDerivs = true;
        reconnectAttempts = 0;

        subscribeToVolatilityIndex(botState.currentVol);

        const currentIndex = getCurrentVolatilityIndex();
        const message = `🤖 Bot connected to LIVE Deriv data!
📊 Monitoring: ${currentIndex.name}
⚡ Update frequency: ${currentIndex.frequency}
🧠 AI Filter: ${botState.aiFilterEnabled ? 'ENABLED' : 'DISABLED'}
📱 WhatsApp: ${botState.whatsappEnabled ? 'ENABLED' : 'DISABLED'}`;

        sendTelegramInfo(message);
        logBotActivity('Successfully connected to Deriv API');
    });

    derivWS.on('message', (data) => {
        try {
            const response = JSON.parse(data);
            handleDerivMessage(response);
        } catch (error) {
            console.error('Error parsing Deriv message:', error);
            logBotActivity('Error parsing Deriv message: ' + error.message);
        }
    });

    derivWS.on('close', () => {
        console.log('Deriv WebSocket connection closed');
        isConnectedToDerivs = false;
        logBotActivity('Deriv WebSocket connection closed');

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(`Reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
            setTimeout(connectToDerivAPI, 5000);
        } else {
            logBotActivity('Max reconnection attempts reached');
        }
    });

    derivWS.on('error', (error) => {
        console.error('Deriv WebSocket error:', error);
        isConnectedToDerivs = false;
        logBotActivity('Deriv WebSocket error: ' + error.message);
    });
}

function subscribeToVolatilityIndex(symbol) {
    if (!derivWS || derivWS.readyState !== WebSocket.OPEN) {
        console.log('WebSocket not ready, queuing subscription...');
        setTimeout(() => subscribeToVolatilityIndex(symbol), 1000);
        return;
    }

    derivWS.send(JSON.stringify({
        forget_all: "ticks"
    }));

    setTimeout(() => {
        const subscription = {
            ticks: symbol,
            subscribe: 1
        };

        console.log(`Subscribing to ${symbol} live data...`);
        derivWS.send(JSON.stringify(subscription));
        logBotActivity(`Subscribed to ${symbol}`);
    }, 500);
}

function handleDerivMessage(response) {
    if (response.tick) {
        const tick = response.tick;

        botState.lastPrice = botState.currentPrice;
        botState.currentPrice = parseFloat(tick.quote);
        botState.marketData = {
            bid: parseFloat(tick.bid || tick.quote),
            ask: parseFloat(tick.ask || tick.quote),
            spread: Math.abs((tick.ask || tick.quote) - (tick.bid || tick.quote)),
            timestamp: new Date(tick.epoch * 1000),
            symbol: tick.symbol
        };

        botState.priceHistory.push({
            price: botState.currentPrice,
            timestamp: botState.marketData.timestamp
        });

        const maxHistory = botState.indexType === '1s' ? 300 : 150;
        if (botState.priceHistory.length > maxHistory) {
            botState.priceHistory = botState.priceHistory.slice(-maxHistory);
        }

        if (botState.isRunning) {
            analyzeRealMarket();
        }
    }

    if (response.msg_type === 'tick') {
        const currentIndex = getCurrentVolatilityIndex();
        console.log(`Successfully subscribed to ${response.echo_req.ticks} (${currentIndex.name})`);
    }

    if (response.error) {
        console.error('Deriv API Error:', response.error.message);
        logBotActivity('Deriv API Error: ' + response.error.message);

        if (response.error.code === 'InvalidSymbol') {
            console.log('Invalid symbol, trying fallback...');
            if (botState.indexType === '1s') {
                botState.indexType = 'regular';
                botState.currentVol = 'R_75';
                setTimeout(() => subscribeToVolatilityIndex('R_75'), 2000);
            }
        }
    }
}

// ==================== TECHNICAL ANALYSIS (ORIGINAL LOGIC) ====================

function analyzeRealMarket() {
    const minDataPoints = botState.indexType === '1s' ? 30 : 20;
    if (botState.priceHistory.length < minDataPoints) return;

    const currentIndex = getCurrentVolatilityIndex();
    const dataPoints = botState.indexType === '1s' ? 60 : 30;
    const prices = botState.priceHistory.slice(-dataPoints).map(p => p.price);

    const sma5 = calculateSMA(prices.slice(-5));
    const sma10 = calculateSMA(prices.slice(-10));
    const sma20 = calculateSMA(prices.slice(-20));
    const rsi = calculateRSI(prices);
    const volatility = calculateVolatility(prices);
    const priceChange = ((botState.currentPrice - botState.lastPrice) / botState.lastPrice) * 100;

    const volatilityThreshold = botState.indexType === '1s' ? 1.5 : 2.0;
    const priceChangeThreshold = botState.indexType === '1s' ? 0.05 : 0.1;

    const signals = {
        trend: sma5 > sma10 ? (sma10 > sma20 ? 'STRONG_BULLISH' : 'BULLISH') :
               sma5 < sma10 ? (sma10 < sma20 ? 'STRONG_BEARISH' : 'BEARISH') : 'NEUTRAL',
        momentum: rsi > 70 ? 'OVERBOUGHT' : rsi < 30 ? 'OVERSOLD' : 'NEUTRAL',
        volatilityState: volatility > volatilityThreshold ? 'HIGH' : volatility < 0.5 ? 'LOW' : 'NORMAL',
        priceAction: Math.abs(priceChange) > priceChangeThreshold ? 'STRONG_MOVE' : 'WEAK_MOVE'
    };

    const signalStrength = calculateSignalStrength(signals, rsi, volatility);
    const strengthThreshold = botState.indexType === '1s' ? 80 : 75;

    if (signalStrength > strengthThreshold && shouldGenerateSignal()) {
        generateRealTradingSignal(signals, signalStrength, {
            rsi,
            volatility,
            sma5,
            sma10,
            sma20,
            priceChange
        });
    }
}

// ==================== SIGNAL GENERATION (ENHANCED WITH AI) ====================

async function generateRealTradingSignal(signals, strength, indicators) {
    const currentIndex = getCurrentVolatilityIndex();
    const direction = signals.trend.includes('BULLISH') ? 'BULLISH' : 'BEARISH';
    const entryPrice = botState.currentPrice;

    let signal = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        symbol: botState.currentVol,
        volatility: currentIndex.name,
        indexType: botState.indexType,
        direction: direction,
        entryPrice: entryPrice.toFixed(5),
        stopLoss: direction === 'BULLISH' ?
            (entryPrice - currentIndex.stopLoss).toFixed(5) :
            (entryPrice + currentIndex.stopLoss).toFixed(5),
        takeProfit: direction === 'BULLISH' ?
            (entryPrice + currentIndex.takeProfit).toFixed(5) :
            (entryPrice - currentIndex.takeProfit).toFixed(5),
        confidence: Math.floor(strength),
        riskPercent: currentIndex.riskPercent,
        riskReward: `1:${(currentIndex.takeProfit / currentIndex.stopLoss).toFixed(1)}`,
        frequency: currentIndex.frequency,
        technicals: {
            rsi: indicators.rsi.toFixed(1),
            volatility: indicators.volatility.toFixed(2),
            trend: signals.trend,
            momentum: signals.momentum
        },
        reason: determineSignalReason(signals, indicators),
        spread: botState.marketData.spread.toFixed(5),
        marketTime: botState.marketData.timestamp.toISOString()
    };

    // ========== AI ENHANCEMENT INTEGRATION ==========
    if (botState.aiFilterEnabled) {
        console.log('🧠 AI evaluating signal...');
        const aiResult = await evaluateSignalWithAI(signal, botState.marketData, indicators);

        if (!aiResult.approve) {
            console.log(`🚫 AI rejected signal: ${aiResult.reason}`);
            logSignalDecision(signal, aiResult);
            return; // Block signal completely
        }

        // Apply AI adjustments if any
        if (aiResult.adjustedSignal) {
            signal = { ...signal, ...aiResult.adjustedSignal };
            botState.aiStats.adjustedSignals++;
            console.log(`🔧 AI adjusted signal: ${aiResult.reason}`);
        }

        // Update confidence with AI evaluation
        signal.confidence = aiResult.confidence;
        signal.aiApproved = true;
        signal.aiReason = aiResult.reason;
        
        botState.aiStats.approvedSignals++;
    }

    // Store signal
    botState.signals.unshift(signal);
    if (botState.signals.length > 50) {
        botState.signals = botState.signals.slice(0, 50);
    }
    botState.performance.lastSignalTime = Date.now();

    // Log signal decision
    logSignalDecision(signal, { approve: true, reason: signal.aiReason || 'No AI filter' });

    // Send alerts
    await sendTelegramSignal(signal);

    if (botState.whatsappEnabled) {
        await sendWhatsAppSignal(signal);
    }

    console.log(`✅ SIGNAL SENT: ${direction} on ${currentIndex.name} (${currentIndex.frequency}) at ${entryPrice}`);
    logBotActivity(`Signal sent: ${direction} on ${signal.symbol} at ${entryPrice}`);

    return signal;
}

// ==================== UTILITY FUNCTIONS (ORIGINAL LOGIC) ====================

function calculateSMA(prices) {
    return prices.reduce((sum, price) => sum + price, 0) / prices.length;
}

function calculateRSI(prices, period = 14) {
    if (prices.length < period) return 50;

    const gains = [];
    const losses = [];

    for (let i = 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss = losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateVolatility(prices) {
    if (prices.length < 2) return 0;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }

    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;

    return Math.sqrt(variance) * 100;
}

function calculateSignalStrength(signals, rsi, volatility) {
    let strength = 50;

    if (signals.trend === 'STRONG_BULLISH' || signals.trend === 'STRONG_BEARISH') strength += 20;
    else if (signals.trend === 'BULLISH' || signals.trend === 'BEARISH') strength += 10;

    if (signals.momentum === 'OVERSOLD' && signals.trend.includes('BULLISH')) strength += 15;
    if (signals.momentum === 'OVERBOUGHT' && signals.trend.includes('BEARISH')) strength += 15;

    if (signals.volatilityState === 'HIGH' && signals.priceAction === 'STRONG_MOVE') strength += 10;

    if (signals.volatilityState === 'LOW') strength -= 20;

    if (botState.indexType === '1s') {
        if (signals.priceAction !== 'STRONG_MOVE') strength -= 10;
    }

    return Math.max(0, Math.min(100, strength));
}

function shouldGenerateSignal() {
    const minInterval = botState.indexType === '1s' ? 180000 : 300000;

    if (botState.performance.lastSignalTime) {
        const timeSinceLastSignal = Date.now() - botState.performance.lastSignalTime;
        if (timeSinceLastSignal < minInterval) return false;
    }

    return true;
}

function determineSignalReason(signals, indicators) {
    const reasons = [];

    if (signals.trend === 'STRONG_BULLISH' || signals.trend === 'STRONG_BEARISH') {
        reasons.push('Strong Trend Confirmed');
    }

    if (signals.momentum === 'OVERSOLD' && signals.trend.includes('BULLISH')) {
        reasons.push('RSI Oversold + Bullish Trend');
    }

    if (signals.momentum === 'OVERBOUGHT' && signals.trend.includes('BEARISH')) {
        reasons.push('RSI Overbought + Bearish Trend');
    }

    if (signals.volatilityState === 'HIGH') {
        reasons.push('High Volatility Breakout');
    }

    if (botState.indexType === '1s' && signals.priceAction === 'STRONG_MOVE') {
        reasons.push('1s Scalping Opportunity');
    }

    return reasons.length > 0 ? reasons.join(' + ') : 'Technical Confluence';
}

function getCurrentVolatilityIndex() {
    for (const type of ['1s', 'regular']) {
        for (const vol of Object.values(volatilityIndices[type])) {
            if (vol.symbol === botState.currentVol) {
                return vol;
            }
        }
    }
    return volatilityIndices['1s'][75];
}

// ==================== ENHANCED API ROUTES ====================

// Original routes
app.get('/api/status', (req, res) => {
    res.json({
        isRunning: botState.isRunning,
        isConnectedToDerivs: isConnectedToDerivs,
        currentVol: botState.currentVol,
        indexType: botState.indexType,
        currentPrice: botState.currentPrice.toFixed(5),
        lastUpdate: botState.marketData.timestamp,
        signalsToday: botState.signals.filter(s =>
            new Date(s.timestamp).toDateString() === new Date().toDateString()
        ).length,
        performance: botState.performance,
        marketData: botState.marketData,
        // Enhanced features
        aiFilterEnabled: botState.aiFilterEnabled,
        whatsappEnabled: botState.whatsappEnabled,
        aiStats: botState.aiStats,
        availableIndices: Object.keys(volatilityIndices)
    });
});

app.post('/api/start', (req, res) => {
    if (!isConnectedToDerivs) {
        return res.status(400).json({
            success: false,
            message: 'Not connected to Deriv. Please wait for connection.'
        });
    }

    botState.isRunning = true;
    logBotActivity('Bot started by user');
    res.json({ success: true, message: `Bot started with LIVE ${botState.indexType} data` });
});

app.post('/api/stop', (req, res) => {
    botState.isRunning = false;
    logBotActivity('Bot stopped by user');
    res.json({ success: true, message: 'Bot stopped' });
});

// Enhanced index switching
app.post('/api/switch-index', (req, res) => {
    const { type, volatility } = req.body;

    const indexType = type || botState.indexType;
    const volIndex = volatilityIndices[indexType] && volatilityIndices[indexType][volatility];

    if (volIndex) {
        if (derivWS && derivWS.readyState === WebSocket.OPEN) {
            derivWS.send(JSON.stringify({
                forget_all: "ticks"
            }));
        }

        botState.currentVol = volIndex.symbol;
        botState.indexType = indexType;
        setTimeout(() => subscribeToVolatilityIndex(volIndex.symbol), 1000);

        logBotActivity(`Switched to ${volIndex.name}`);

        res.json({
            success: true,
            message: `Switched to ${volIndex.name}`,
            symbol: volIndex.symbol,
            type: indexType,
            config: volIndex
        });
    } else {
        res.status(400).json({ 
            success: false, 
            message: 'Invalid volatility level or type',
            available: volatilityIndices
        });
    }
});

// AI control routes
app.post('/api/ai/toggle', (req, res) => {
    botState.aiFilterEnabled = !botState.aiFilterEnabled;
    logBotActivity(`AI filter ${botState.aiFilterEnabled ? 'enabled' : 'disabled'}`);
    res.json({
        success: true,
        aiEnabled: botState.aiFilterEnabled,
        message: `AI filter ${botState.aiFilterEnabled ? 'enabled' : 'disabled'}`
    });
});

app.post('/api/whatsapp/toggle', (req, res) => {
    if (!process.env.WHATSAPP_API_KEY || !process.env.WHATSAPP_PHONE) {
        return res.status(400).json({
            success: false,
            message: 'WhatsApp credentials not configured'
        });
    }
    
    botState.whatsappEnabled = !botState.whatsappEnabled;
    logBotActivity(`WhatsApp alerts ${botState.whatsappEnabled ? 'enabled' : 'disabled'}`);
    res.json({
        success: true,
        whatsappEnabled: botState.whatsappEnabled,
        message: `WhatsApp alerts ${botState.whatsappEnabled ? 'enabled' : 'disabled'}`
    });
});

// Enhanced routes
app.get('/api/signals', (req, res) => {
    res.json(botState.signals.slice(0, 20));
});

app.get('/api/available-indices', (req, res) => {
    res.json(volatilityIndices);
});

app.get('/api/logs', (req, res) => {
    const logs = getRecentLogs();
    res.json(logs);
});

app.post('/api/telegram-test', async (req, res) => {
    try {
        const result = await testTelegramConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.post('/api/whatsapp-test', async (req, res) => {
    try {
        const result = await testWhatsAppConnection();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        derivConnection: isConnectedToDerivs,
        botRunning: botState.isRunning,
        aiEnabled: botState.aiFilterEnabled,
        whatsappEnabled: botState.whatsappEnabled,
        timestamp: new Date().toISOString()
    });
});

// Initialize
connectToDerivAPI();

app.listen(PORT, () => {
    console.log(`🚀 ENHANCED Volatility Bot server running on port ${PORT}`);
    console.log(`📊 Default: Vol 75 (1s) - Symbol: ${botState.currentVol}`);
    console.log(`📱 Telegram Bot: ${process.env.TELEGRAM_BOT_TOKEN ? 'Configured' : 'Not configured'}`);
    console.log(`📞 WhatsApp: ${process.env.WHATSAPP_API_KEY ? 'Configured' : 'Not configured'}`);
    console.log(`🧠 AI Enhancement Layer: Ready`);
    logBotActivity('Enhanced Volatility Bot started');
});
