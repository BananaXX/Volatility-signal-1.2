// notifier/whatsapp.js
const axios = require('axios');

const WHATSAPP_NUMBER = process.env.WHATSAPP_NUMBER; // e.g. +2547xxxxxxx
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;

function sendWhatsAppSignal(signal) {
    if (!WHATSAPP_NUMBER || !WHATSAPP_API_KEY) return;
    const message = `📢 SIGNAL: ${signal.direction}\nSymbol: ${signal.symbol}\nPrice: ${signal.price}\nRSI: ${signal.rsi}\nVol: ${signal.volatility}%`;
    axios.get(`https://api.callmebot.com/whatsapp.php`, {
        params: {
            phone: WHATSAPP_NUMBER,
            text: message,
            apikey: WHATSAPP_API_KEY
        }
    }).catch(err => console.error("WhatsApp Error:", err.message));
}

module.exports = { sendWhatsAppSignal };
