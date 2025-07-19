// notifier/telegram.js
const TelegramBot = require('node-telegram-bot-api');
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const bot = TELEGRAM_TOKEN ? new TelegramBot(TELEGRAM_TOKEN) : null;

function sendTelegramSignal(signal) {
    if (!bot || !TELEGRAM_CHAT_ID) return;
    const msg = `📈 SIGNAL (${signal.indexType}) - ${signal.direction}
Symbol: ${signal.symbol}
Price: ${signal.price}
RSI: ${signal.rsi}
Volatility: ${signal.volatility}%
Time: ${new Date(signal.timestamp).toLocaleTimeString()}`;
    bot.sendMessage(TELEGRAM_CHAT_ID, msg);
}

function sendTelegramInfo(msg) {
    if (bot && TELEGRAM_CHAT_ID) {
        bot.sendMessage(TELEGRAM_CHAT_ID, msg);
    }
}

module.exports = { sendTelegramSignal, sendTelegramInfo };
