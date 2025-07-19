// utils/indicators.js
function calculateSMA(prices) {
    const sum = prices.reduce((a, b) => a + b, 0);
    return sum / prices.length;
}

function calculateRSI(prices, period = 14) {
    if (prices.length < period) return 50;
    let gains = 0, losses = 0;
    for (let i = 1; i < period; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff > 0) gains += diff;
        else losses -= diff;
    }
    const rs = gains / (losses || 1);
    return 100 - 100 / (1 + rs);
}

function calculateVolatility(prices) {
    const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
    const avg = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avg, 2), 0) / returns.length;
    return Math.sqrt(variance) * 100;
}

module.exports = { calculateSMA, calculateRSI, calculateVolatility };
