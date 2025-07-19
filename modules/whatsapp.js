const axios = require('axios');

const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY;
const WHATSAPP_PHONE = process.env.WHATSAPP_PHONE;

/**
 * Send concise trading signal to WhatsApp
 */
async function sendWhatsAppSignal(signal) {
    if (!WHATSAPP_API_KEY || !WHATSAPP_PHONE) {
        console.log('WhatsApp not configured - skipping');
        return { success: false, message: 'WhatsApp not configured' };
    }

    const message = formatWhatsAppSignal(signal);

    try {
        const url = 'https://api.callmebot.com/whatsapp.php';
        const response = await axios.get(url, {
            params: {
                phone: WHATSAPP_PHONE,
                text: message,
                apikey: WHATSAPP_API_KEY
            },
            timeout: 10000
        });

        console.log('WhatsApp signal sent successfully');
        return { success: true, message: 'WhatsApp signal sent' };
    } catch (error) {
        console.error('WhatsApp send error:', error.message);
        return { success: false, message: error.message };
    }
}

/**
 * Format signal for WhatsApp (concise format)
 */
function formatWhatsAppSignal(signal) {
    const aiTag = signal.aiApproved ? '[AI✓]' : '';
    
    return `🚨 ${aiTag} ${signal.direction} SIGNAL

📊 ${signal.volatility}
💰 Entry: ${signal.entryPrice}
🛡️ SL: ${signal.stopLoss}
🎯 TP: ${signal.takeProfit}
⚡ Confidence: ${signal.confidence}%
📈 R/R: ${signal.riskReward}

💡 ${signal.reason}
⏰ ${new Date(signal.timestamp).toLocaleTimeString()}

Risk: ${signal.riskPercent}% max`;
}

/**
 * Send informational message to WhatsApp
 */
async function sendWhatsAppInfo(message) {
    if (!WHATSAPP_API_KEY || !WHATSAPP_PHONE) return;

    try {
        const url = 'https://api.callmebot.com/whatsapp.php';
        await axios.get(url, {
            params: {
                phone: WHATSAPP_PHONE,
                text: message,
                apikey: WHATSAPP_API_KEY
            },
            timeout: 10000
        });

        console.log('WhatsApp info sent successfully');
        return { success: true };
    } catch (error) {
        console.error('WhatsApp info error:', error.message);
        return { success: false, message: error.message };
    }
}

/**
 * Test WhatsApp connection
 */
async function testWhatsAppConnection() {
    if (!WHATSAPP_API_KEY || !WHATSAPP_PHONE) {
        return {
            success: false,
            message: 'WhatsApp not configured. Set WHATSAPP_API_KEY and WHATSAPP_PHONE environment variables'
        };
    }

    const testMessage = `🤖 BOT TEST

✅ WhatsApp integration working
📱 Enhanced Volatility Bot ready
⏰ ${new Date().toLocaleString()}

This is a test from your trading bot!`;

    try {
        const url = 'https://api.callmebot.com/whatsapp.php';
        const response = await axios.get(url, {
            params: {
                phone: WHATSAPP_PHONE,
                text: testMessage,
                apikey: WHATSAPP_API_KEY
            },
            timeout: 15000
        });

        return {
            success: true,
            message: 'WhatsApp test message sent successfully'
        };
    } catch (error) {
        return {
            success: false,
            message: `WhatsApp test failed: ${error.message}`
        };
    }
}

/**
 * Send alert to WhatsApp
 */
async function sendWhatsAppAlert(title, message, priority = 'normal') {
    if (!WHATSAPP_API_KEY || !WHATSAPP_PHONE) return;

    const emoji = priority === 'high' ? '🚨' : priority === 'warning' ? '⚠️' : 'ℹ️';
    const formattedMessage = `${emoji} ${title}

${message}

⏰ ${new Date().toLocaleString()}`;

    return await sendWhatsAppInfo(formattedMessage);
}

module.exports = {
    sendWhatsAppSignal,
    sendWhatsAppInfo,
    testWhatsAppConnection,
    sendWhatsAppAlert
};
