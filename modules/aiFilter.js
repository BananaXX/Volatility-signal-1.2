/**
 * Enhanced AI Signal Evaluation Module
 * Real logic-based filtering, not just timers
 */

let aiStats = {
    totalEvaluations: 0,
    approvedSignals: 0,
    rejectedSignals: 0,
    adjustedSignals: 0
};

/**
 * Main AI evaluation function
 * @param {Object} signal - Trading signal to evaluate
 * @param {Object} marketData - Current market data
 * @param {Object} indicators - Technical indicators
 * @returns {Object} AI evaluation result
 */
async function evaluateSignalWithAI(signal, marketData, indicators) {
    try {
        aiStats.totalEvaluations++;

        // Extract signal context for analysis
        const context = {
            signal,
            marketData,
            rsi: parseFloat(signal.technicals.rsi),
            volatility: parseFloat(signal.technicals.volatility),
            trend: signal.technicals.trend,
            momentum: signal.technicals.momentum,
            confidence: signal.confidence,
            spread: parseFloat(signal.spread),
            timeOfDay: new Date().getHours(),
            dayOfWeek: new Date().getDay()
        };

        // Perform comprehensive AI analysis
        const aiResult = await performAdvancedAnalysis(context);

        // Update statistics
        if (aiResult.approve) {
            aiStats.approvedSignals++;
        } else {
            aiStats.rejectedSignals++;
        }

        return aiResult;
    } catch (error) {
        console.error('AI evaluation error:', error);
        // Failsafe: approve signal if AI fails
        return {
            approve: true,
            confidence: signal.confidence,
            reason: 'AI evaluation failed - using original signal',
            error: error.message
        };
    }
}

/**
 * Advanced AI analysis with multiple rules and conditions
 */
async function performAdvancedAnalysis(context) {
    const { signal, marketData, rsi, volatility, trend, momentum, confidence, spread, timeOfDay, dayOfWeek } = context;

    let approve = true;
    let adjustments = {};
    let reasons = [];
    let aiConfidence = confidence;

    // ========== REJECTION RULES ==========

    // Rule 1: Ultra-low volatility filter
    if (volatility < 0.4) {
        approve = false;
        reasons.push('Ultra-low volatility detected (< 0.4%)');
    }

    // Rule 2: Spread analysis
    if (spread > 0.008) {
        approve = false;
        reasons.push('Spread too wide for reliable execution (> 0.008)');
    }

    // Rule 3: RSI extreme zones with opposing trends
    if (rsi > 78 && signal.direction === 'BULLISH') {
        approve = false;
        reasons.push('RSI severely overbought + bullish signal = high reversal risk');
    } else if (rsi < 22 && signal.direction === 'BEARISH') {
        approve = false;
        reasons.push('RSI severely oversold + bearish signal = high reversal risk');
    }

    // Rule 4: Weekend/low activity filtering
    if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
        approve = false;
        reasons.push('Weekend trading - low liquidity');
    }

    // Rule 5: Night hours filter (reduced activity)
    if (timeOfDay >= 23 || timeOfDay <= 5) {
        aiConfidence = Math.max(40, aiConfidence - 25);
        reasons.push('Low activity hours - reduced confidence');
        if (aiConfidence < 60) {
            approve = false;
            reasons.push('Confidence too low for night trading');
        }
    }

    // Rule 6: Conflicting signals filter
    if (trend === 'NEUTRAL' && momentum === 'NEUTRAL') {
        approve = false;
        reasons.push('No clear directional bias - conflicting signals');
    }

    // Rule 7: Rapid signal frequency check
    // This should be handled by the calling function, but we can add logic here too

    // ========== CONFIDENCE ADJUSTMENTS ==========

    if (approve) {
        // Boost confidence for strong confluence
        if (trend.includes('STRONG') && rsi > 30 && rsi < 70) {
            aiConfidence = Math.min(95, aiConfidence + 8);
            reasons.push('Strong trend + healthy RSI = high confidence');
        }

        // Reduce confidence for weak momentum
        if (momentum === 'NEUTRAL' && !trend.includes('STRONG')) {
            aiConfidence = Math.max(50, aiConfidence - 10);
            reasons.push('Weak momentum reduces confidence');
        }

        // Market hours boost
        if (timeOfDay >= 8 && timeOfDay <= 16) { // Peak trading hours
            aiConfidence = Math.min(98, aiConfidence + 5);
            reasons.push('Peak trading hours boost');
        }

        // Volatility-based confidence
        if (volatility > 2.5) { // High volatility
            aiConfidence = Math.max(50, aiConfidence - 5);
            reasons.push('High volatility increases risk');
        } else if (volatility > 1.0 && volatility < 2.0) { // Optimal volatility
            aiConfidence = Math.min(95, aiConfidence + 3);
            reasons.push('Optimal volatility range');
        }
    }

    // ========== SIGNAL ADJUSTMENTS ==========

    if (approve) {
        // Adjust take profit in overbought/oversold conditions
        if ((rsi > 65 && signal.direction === 'BULLISH') || (rsi < 35 && signal.direction === 'BEARISH')) {
            const currentTP = parseFloat(signal.takeProfit);
            const currentEntry = parseFloat(signal.entryPrice);
            const tpDistance = Math.abs(currentTP - currentEntry);
            
            adjustments.takeProfit = signal.direction === 'BULLISH' 
                ? (currentEntry + tpDistance * 0.7).toFixed(5)  // Reduce TP by 30%
                : (currentEntry - tpDistance * 0.7).toFixed(5);
            
            aiStats.adjustedSignals++;
            reasons.push('TP adjusted for RSI extreme zone');
        }

        // Adjust stop loss for high volatility
        if (volatility > 2.0) {
            const currentSL = parseFloat(signal.stopLoss);
            const currentEntry = parseFloat(signal.entryPrice);
            const slDistance = Math.abs(currentSL - currentEntry);
            
            adjustments.stopLoss = signal.direction === 'BULLISH'
                ? (currentEntry - slDistance * 1.2).toFixed(5)  // Wider SL
                : (currentEntry + slDistance * 1.2).toFixed(5);
            
            aiStats.adjustedSignals++;
            reasons.push('SL widened for high volatility');
        }
    }

    // ========== FINAL RESULT ==========

    const result = {
        approve,
        confidence: Math.round(aiConfidence),
        reason: reasons.length > 0 ? reasons.join(' | ') : 'Signal approved by AI',
        adjustedSignal: Object.keys(adjustments).length > 0 ? adjustments : null,
        aiStats: {
            volatilityLevel: volatility,
            rsiLevel: rsi,
            timeAnalysis: `${timeOfDay}:00 ${getTimeCategory(timeOfDay)}`,
            trendStrength: trend,
            originalConfidence: confidence,
            adjustedConfidence: Math.round(aiConfidence)
        }
    };

    return result;
}

/**
 * Categorize time periods
 */
function getTimeCategory(hour) {
    if (hour >= 6 && hour <= 8) return '(Early)';
    if (hour >= 9 && hour <= 16) return '(Peak)';
    if (hour >= 17 && hour <= 21) return '(Evening)';
    return '(Night)';
}

/**
 * Get AI performance statistics
 */
function getAIStats() {
    return {
        ...aiStats,
        approvalRate: aiStats.totalEvaluations > 0 
            ? ((aiStats.approvedSignals / aiStats.totalEvaluations) * 100).toFixed(1) + '%'
            : '0%',
        adjustmentRate: aiStats.approvedSignals > 0
            ? ((aiStats.adjustedSignals / aiStats.approvedSignals) * 100).toFixed(1) + '%'
            : '0%'
    };
}

/**
 * Reset AI statistics
 */
function resetAIStats() {
    aiStats = {
        totalEvaluations: 0,
        approvedSignals: 0,
        rejectedSignals: 0,
        adjustedSignals: 0
    };
}

/**
 * Simple signal frequency check (can be enhanced)
 */
function checkSignalFrequency(lastSignalTime, indexType = '1s') {
    if (!lastSignalTime) return true;
    
    const minInterval = indexType === '1s' ? 300000 : 600000; // 5 min for 1s, 10 min for regular
    const timeSinceLastSignal = Date.now() - lastSignalTime;
    
    return timeSinceLastSignal >= minInterval;
}

/**
 * Market session analysis
 */
function analyzeMarketSession() {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    
    let session = 'unknown';
    let activity = 'low';
    
    // Weekend check
    if (day === 0 || day === 6) {
        session = 'weekend';
        activity = 'very_low';
    } else {
        // Weekday sessions
        if (hour >= 6 && hour <= 8) {
            session = 'early_european';
            activity = 'medium';
        } else if (hour >= 9 && hour <= 12) {
            session = 'european';
            activity = 'high';
        } else if (hour >= 13 && hour <= 16) {
            session = 'overlap';
            activity = 'very_high';
        } else if (hour >= 17 && hour <= 21) {
            session = 'american';
            activity = 'high';
        } else {
            session = 'asian';
            activity = 'medium';
        }
    }
    
    return { session, activity, hour, day };
}

module.exports = {
    evaluateSignalWithAI,
    getAIStats,
    resetAIStats,
    checkSignalFrequency,
    analyzeMarketSession
};
