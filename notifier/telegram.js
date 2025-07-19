const TelegramBot = require('node-telegram-bot-api');

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

let bot;
if (TELEGRAM_TOKEN) {
    bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });
}

/**
 * Send enhanced trading signal to Telegram
 */
async function sendTelegramSignal(signal) {
    if (!bot || !TELEGRAM_CHAT_ID) return;

    const aiStatus = signal.aiApproved ? `\n🧠 AI: ${signal.aiReason}` : '';

    const message = `🚨 ${signal.aiApproved ? 'AI-APPROVED' : 'LIVE'} TRADING SIGNAL 🚨

📊 ${signal.volatility}
⚡ Update Frequency: ${signal.frequency}
🎯 Direction: ${signal.direction}
💰 Entry: ${signal.entryPrice}
🛡️ Stop Loss: ${signal.stopLoss}
🎯 Take Profit: ${signal.takeProfit}
📈 Risk/Reward: ${signal.riskReward}
⚡ Confidence: ${signal.confidence}%

📋 Technical Analysis:
• RSI: ${signal.technicals.rsi}
• Volatility: ${signal.technicals.volatility}%
• Trend: ${signal.technicals.trend}
• Momentum: ${signal.technicals.momentum}

💡 Reason: ${signal.reason}${aiStatus}
📊 Spread: ${signal.spread}
⏰ Time: ${new Date(signal.timestamp).toLocaleTimeString()}

🔴 LIVE ${signal.indexType.toUpperCase()} DATA - Risk: ${signal.riskPercent}% max

Execute manually on Deriv platform`;

    try {
        await bot.sendMessage(TELEGRAM_CHAT_ID, message);
        console.log('Enhanced Telegram signal sent successfully');
        return { success: true, message: 'Signal sent' };
    } catch (error) {
        console.error('Telegram send error:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Send informational message to Telegram
 */
async function sendTelegramInfo(message) {
    if (!bot || !TELEGRAM_CHAT_ID) return;

    try {
        await bot.sendMessage(TELEGRAM_CHAT_ID, message);
        console.log('Telegram info sent successfully');
        return { success: true };
    } catch (error) {
        console.error('Telegram info error:', error);
        return { success: false, message: error.message };
    }
}

/**
 * Test Telegram connection
 */
async function testTelegramConnection() {
    if (!bot || !TELEGRAM_CHAT_ID) {
        return {
            success: false,
            message: 'Telegram not configured. Check TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID'
        };
    }

    const testMessage = `🤖 ENHANCED BOT TEST MESSAGE

✅ Bot connected to LIVE Deriv data
📊 Telegram integration working
🧠 AI enhancement layer ready
📱 Multi-platform alerts active

This is a test message from your Enhanced Volatility Bot!
Time: ${new Date().toLocaleString()}`;

    try {
        await bot.sendMessage(TELEGRAM_CHAT_ID, testMessage);
        return {
            success: true,
            message: 'Test message sent successfully to Telegram'
        };
    } catch (error) {
        return {
            success: false,
            message: `Telegram test failed: ${error.message}`
        };
    }
}

/**
 * Send alert with custom formatting
 */
async function sendTelegramAlert(title, message, priority = 'normal') {
    if (!bot || !TELEGRAM_CHAT_ID) return;

    const emoji = priority === 'high' ? '🚨' : priority === 'warning' ? '⚠️' : 'ℹ️';
    const formattedMessage = `${emoji} ${title}

${message}

⏰ ${new Date().toLocaleString()}`;

    try {
        await bot.sendMessage(TELEGRAM_CHAT_ID, formattedMessage);
        return { success: true };
    } catch (error) {
        console.error('Telegram alert error:', error);
        return { success: false, message: error.message };
    }
}

module.exports = {
    sendTelegramSignal,
    sendTelegramInfo,
    testTelegramConnection,
    sendTelegramAlert
};
