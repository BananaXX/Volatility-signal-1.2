# 🤖 Enhanced Volatility Trading Bot

> **AI-Powered Signal Generation with Multi-Platform Alerts**

A sophisticated trading bot that monitors Deriv's volatility indices, performs advanced technical analysis, and sends intelligent trading signals via Telegram and WhatsApp. Enhanced with AI filtering for improved signal quality.

## 🚀 **Key Features**

### 🧠 **AI Enhancement Layer**
- **Smart Signal Filtering**: AI evaluates each signal before delivery
- **Dynamic Adjustments**: Automatically adjusts TP/SL based on market conditions
- **Confidence Scoring**: AI-enhanced confidence levels for each signal
- **Transparent Logging**: Full visibility into AI decision-making process

### 📊 **Technical Analysis**
- **Multiple Indicators**: SMA, RSI, Volatility calculations
- **Signal Strength**: Confidence-based signal generation
- **Trend Analysis**: Strong/weak trend identification
- **Market Timing**: Time-based filtering for optimal entry points

### 📱 **Multi-Platform Alerts**
- **Telegram Integration**: Detailed signals with full analysis
- **WhatsApp Support**: Concise signals via CallMeBot API
- **Group Support**: Send alerts to Telegram groups
- **Instant Delivery**: Real-time signal notifications

### 🎯 **Index Flexibility**
- **Hot-Swapping**: Switch between indices without restart
- **Multiple Timeframes**: 1-second and 2-second indices
- **Full Coverage**: Vol 10, 25, 50, 75, 100 support
- **Live Data**: Real-time price feeds from Deriv

### 📈 **Risk Management**
- **Dynamic TP/SL**: Market condition-based adjustments
- **Risk Percentages**: Configurable risk per trade
- **Spread Analysis**: Wide spread detection and filtering
- **Volatility Filtering**: Ultra-low volatility signal blocking

## 📁 **Project Structure**

```
enhanced-volatility-bot/
├── server.js                  # Main application server
├── package.json              # Dependencies and scripts
├── .env.example              # Environment configuration template
├── README.md                 # This file
├── modules/                  # Core functionality modules
│   ├── telegram.js           # Telegram integration
│   ├── whatsapp.js          # WhatsApp integration  
│   ├── aiFilter.js          # AI signal filtering
│   └── logger.js            # Enhanced logging system
├── public/                   # Web dashboard
│   └── index.html           # Enhanced control panel
├── logs/                    # Auto-generated log files
│   ├── signals_YYYY-MM-DD.jsonl
│   ├── activity_YYYY-MM-DD.jsonl
│   └── errors_YYYY-MM-DD.jsonl
└── scripts/                 # Utility scripts
    ├── view-logs.js         # Log viewer
    └── clean-logs.js        # Log cleanup
```

## 🛠️ **Installation & Setup**

### **Prerequisites**
- Node.js 16+ and npm 8+
- Telegram Bot Token (from @BotFather)
- Your Telegram Chat ID
- WhatsApp API Key (optional, from CallMeBot)

### **1. Clone and Install**
```bash
git clone https://github.com/yourusername/enhanced-volatility-bot.git
cd enhanced-volatility-bot
npm install
```

### **2. Environment Configuration**
```bash
# Copy environment template
cp .env.example .env

# Edit with your credentials
nano .env
```

### **3. Telegram Setup**
1. **Create Bot**: Message @BotFather on Telegram
   - Send `/newbot`
   - Choose a name and username
   - Copy the bot token

2. **Get Chat ID**: Message @userinfobot
   - Send `/start`
   - Copy your chat ID

3. **Configure**: Add to `.env`
   ```bash
   TELEGRAM_BOT_TOKEN=your_bot_token_here
   TELEGRAM_CHAT_ID=your_chat_id_here
   ```

### **4. WhatsApp Setup (Optional)**
1. **Add Contact**: Add `+34 644 34 82 96` (name: CallMeBot)
2. **Activate**: Send message: `I allow callmebot to send me messages`
3. **Get API Key**: You'll receive your API key in the reply
4. **Configure**: Add to `.env`
   ```bash
   WHATSAPP_API_KEY=your_api_key
   WHATSAPP_PHONE=1234567890  # Your number with country code
   ```

### **5. Start the Bot**
```bash
# Production mode
npm start

# Development mode (auto-restart)
npm run dev
```

### **6. Access Dashboard**
Open your browser to: `http://localhost:3000`

## 🎮 **Using the Bot**

### **Web Dashboard**
- **Bot Control**: Start/stop the bot
- **Index Selection**: Switch between volatility indices
- **AI Controls**: Toggle AI filtering and WhatsApp alerts
- **Live Stats**: View real-time market data and performance
- **Log Viewer**: Monitor AI decisions and signal history

### **Signal Format**
```
🚨 AI-APPROVED TRADING SIGNAL 🚨

📊 Volatility 75 (1s) Index
⚡ Update Frequency: 1s
🎯 Direction: BULLISH
💰 Entry: 12345.67890
🛡️ Stop Loss: 12245.67890
🎯 Take Profit: 12595.67890
📈 Risk/Reward: 1:2.5
⚡ Confidence: 87%

📋 Technical Analysis:
• RSI: 45.2
• Volatility: 1.8%
• Trend: STRONG_BULLISH
• Momentum: NEUTRAL

💡 Reason: Strong Trend Confirmed + High Volatility Breakout
🧠 AI: Signal approved - optimal market conditions
📊 Spread: 0.00012
⏰ Time: 14:30:25

🔴 LIVE 1S DATA - Risk: 2.2% max
Execute manually on Deriv platform
```

### **Available Indices**
- **1-Second Indices**: 1HZ10V, 1HZ25V, 1HZ50V, 1HZ75V, 1HZ100V
- **Regular Indices**: R_10, R_25, R_50, R_75, R_100
- **Default**: Volatility 75 (1s) - balanced volatility and frequency

## 🧠 **AI Filtering Logic**

The AI evaluates each signal using multiple criteria:

### **Rejection Rules**
- ❌ **Ultra-low volatility** (< 0.4%)
- ❌ **Wide spreads** (> 0.008)
- ❌ **RSI extremes** with opposing trends
- ❌ **Weekend trading** (low liquidity)
- ❌ **Night hours** with low confidence
- ❌ **Conflicting signals** (no clear bias)

### **Confidence Adjustments**
- ✅ **Strong confluence**: +8% confidence
- ✅ **Peak trading hours**: +5% confidence  
- ✅ **Optimal volatility**: +3% confidence
- ⚠️ **Weak momentum**: -10% confidence
- ⚠️ **High volatility**: -5% confidence
- ⚠️ **Night hours**: -25% confidence

### **Signal Adjustments**
- 🎯 **Early TP** in RSI extreme zones
- 🛡️ **Wider SL** during high volatility
- 📊 **Risk optimization** based on market state

## 📊 **API Endpoints**

### **Bot Control**
```http
POST /api/start                 # Start the bot
POST /api/stop                  # Stop the bot
GET  /api/status                # Get bot status
```

### **Index Management**
```http
POST /api/switch-index          # Switch monitoring index
GET  /api/available-indices     # List all available indices
```

### **AI Controls**
```http
POST /api/ai/toggle             # Toggle AI filtering
POST /api/whatsapp/toggle       # Toggle WhatsApp alerts
```

### **Testing**
```http
POST /api/telegram-test         # Test Telegram connection
POST /api/whatsapp-test        # Test WhatsApp connection
```

### **Data & Logs**
```http
GET  /api/signals              # Recent signals
GET  /api/logs                 # Signal decision logs
GET  /health                   # System health check
```

## 📝 **Logging System**

### **Log Types**
- **signals_YYYY-MM-DD.jsonl**: All signal decisions (approved/rejected)
- **activity_YYYY-MM-DD.jsonl**: Bot activity and status changes
- **errors_YYYY-MM-DD.jsonl**: Error logs with stack traces
- **market_YYYY-MM-DD.jsonl**: Market data samples (10% sampling)

### **Log Viewing**
```bash
# View recent logs
npm run logs

# Clean old logs (30+ days)
npm run clean-logs
```

### **Log Format**
```json
{
  "timestamp": "2024-01-15T14:30:25.123Z",
  "signalId": 1705334625123,
  "symbol": "1HZ75V",
  "direction": "BULLISH",
  "entryPrice": "12345.67890",
  "confidence": 87,
  "aiApproved": true,
  "aiReason": "Strong trend + optimal volatility",
  "technicals": {
    "rsi": "45.2",
    "volatility": "1.8",
    "trend": "STRONG_BULLISH"
  }
}
```

## ⚙️ **Configuration Options**

### **Environment Variables**
```bash
# Core Configuration
TELEGRAM_BOT_TOKEN=required
TELEGRAM_CHAT_ID=required
WHATSAPP_API_KEY=optional
WHATSAPP_PHONE=optional
PORT=3000

# AI Settings
AI_FILTER_ENABLED=false
AI_CONFIDENCE_THRESHOLD=75

# Trading Settings  
DEFAULT_VOLATILITY=75
DEFAULT_INDEX_TYPE=1s
MIN_SIGNAL_INTERVAL=5

# Logging
LOG_LEVEL=info
LOG_RETENTION_DAYS=30
```

### **Runtime Controls**
- **AI Filter**: Toggle via dashboard or API
- **WhatsApp Alerts**: Enable/disable independently
- **Index Switching**: Hot-swap without restart
- **Signal Frequency**: Configurable minimum intervals

## 🔧 **Troubleshooting**

### **Common Issues**

**Bot not connecting to Deriv**
```bash
# Check internet connection and firewall
curl -I https://ws.binaryws.com/websockets/v3?app_id=1089
```

**Telegram not working**
- Verify bot token with @BotFather
- Check chat ID with @userinfobot  
- Ensure bot can send messages to you

**WhatsApp not working**
- Complete CallMeBot setup process
- Verify phone number format (no + or spaces)
- Test API key manually

**AI not filtering signals**
- Check AI toggle in dashboard
- Verify logs for AI decisions
- Review AI statistics

### **Debug Mode**
```bash
# Start with debug logging
LOG_LEVEL=debug npm start

# Check specific logs
tail -f logs/activity_$(date +%Y-%m-%d).jsonl
tail -f logs/signals_$(date +%Y-%m-%d).jsonl
```

## 🚨 **Important Notes**

### **Trading Disclaimers**
- ⚠️ **Educational Purpose**: This bot is for educational and personal use only
- ⚠️ **No Trading Advice**: Signals are not financial advice
- ⚠️ **Risk Management**: Always use proper risk management
- ⚠️ **Manual Execution**: Bot sends signals only - you execute trades manually

### **Security**
- 🔒 **Keep .env secure**: Never share your environment file
- 🔒 **Regenerate tokens**: If compromised, regenerate immediately
- 🔒 **Use HTTPS**: In production, use HTTPS and proper SSL
- 🔒 **Firewall**: Restrict access to dashboard in production

### **Performance**
- 📈 **Resource Usage**: Minimal CPU and memory footprint
- 📈 **Data Efficiency**: 10% market data sampling to reduce storage
- 📈 **Log Rotation**: Automatic cleanup of old logs
- 📈 **WebSocket**: Persistent connection to Deriv for real-time data

## 📞 **Support**

### **Getting Help**
1. **Check Logs**: Review error logs for specific issues
2. **Dashboard Status**: Use web dashboard for real-time diagnostics  
3. **Test Endpoints**: Use API test endpoints to verify functionality
4. **Documentation**: Refer to this README for configuration help

### **Development**
- **Contributing**: Fork, feature branch, pull request
- **Issues**: Use GitHub issues for bug reports
- **Feature Requests**: Create detailed GitHub issues

## 📄 **License**

MIT License - See LICENSE file for details.

## 🎯 **Version History**

- **v3.0.0**: AI enhancement layer, multi-platform alerts, advanced logging
- **v2.0.0**: Enhanced technical analysis, improved WebSocket handling  
- **v1.0.0**: Basic volatility bot with Telegram integration

---

**⚡ Ready to start trading smarter with AI-enhanced signals!**
