const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log signal decisions (approved/rejected by AI)
 */
function logSignalDecision(signal, aiResult) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        signalId: signal.id,
        symbol: signal.symbol,
        direction: signal.direction,
        entryPrice: signal.entryPrice,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit,
        confidence: signal.confidence,
        spread: signal.spread,
        aiApproved: aiResult.approve,
        aiReason: aiResult.reason,
        aiConfidence: aiResult.confidence,
        technicals: {
            rsi: signal.technicals.rsi,
            volatility: signal.technicals.volatility,
            trend: signal.technicals.trend,
            momentum: signal.technicals.momentum
        },
        adjustments: aiResult.adjustedSignal || null
    };

    const today = new Date().toISOString().split('T')[0];
    const signalsLogFile = path.join(logsDir, `signals_${today}.jsonl`);
    
    try {
        fs.appendFileSync(signalsLogFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
        console.error('Error writing signal log:', error);
    }
}

/**
 * Log general bot activity
 */
function logBotActivity(message, level = 'info') {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level: level,
        message: message
    };

    const today = new Date().toISOString().split('T')[0];
    const activityLogFile = path.join(logsDir, `activity_${today}.jsonl`);
    
    try {
        fs.appendFileSync(activityLogFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
        console.error('Error writing activity log:', error);
    }
}

/**
 * Log market data for analysis
 */
function logMarketData(marketData, technicals) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        price: marketData.bid,
        ask: marketData.ask,
        bid: marketData.bid,
        spread: marketData.spread,
        symbol: marketData.symbol,
        technicals: technicals
    };

    const today = new Date().toISOString().split('T')[0];
    const marketLogFile = path.join(logsDir, `market_${today}.jsonl`);
    
    try {
        // Only log every 10th entry to avoid massive files
        if (Math.random() < 0.1) {
            fs.appendFileSync(marketLogFile, JSON.stringify(logEntry) + '\n');
        }
    } catch (error) {
        console.error('Error writing market log:', error);
    }
}

/**
 * Log errors with stack trace
 */
function logError(error, context = '') {
    const logEntry = {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        context: context
    };

    const today = new Date().toISOString().split('T')[0];
    const errorLogFile = path.join(logsDir, `errors_${today}.jsonl`);
    
    try {
        fs.appendFileSync(errorLogFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
        console.error('Error writing error log:', error);
    }
}

/**
 * Get recent logs for dashboard
 */
function getRecentLogs(type = 'signals', limit = 50) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        let logs = [];
        
        // Try today's logs first
        const todayFile = path.join(logsDir, `${type}_${today}.jsonl`);
        if (fs.existsSync(todayFile)) {
            const todayData = fs.readFileSync(todayFile, 'utf8');
            const todayLogs = todayData.trim().split('\n')
                .filter(line => line)
                .map(line => JSON.parse(line));
            logs = logs.concat(todayLogs);
        }
        
        // If we need more logs, get yesterday's
        if (logs.length < limit) {
            const yesterdayFile = path.join(logsDir, `${type}_${yesterday}.jsonl`);
            if (fs.existsSync(yesterdayFile)) {
                const yesterdayData = fs.readFileSync(yesterdayFile, 'utf8');
                const yesterdayLogs = yesterdayData.trim().split('\n')
                    .filter(line => line)
                    .map(line => JSON.parse(line));
                logs = logs.concat(yesterdayLogs);
            }
        }
        
        // Sort by timestamp (newest first) and limit
        return logs
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
            
    } catch (error) {
        console.error('Error reading logs:', error);
        return [];
    }
}

/**
 * Get logs summary for dashboard
 */
function getLogsSummary() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Count signals today
        const signalsFile = path.join(logsDir, `signals_${today}.jsonl`);
        let signalsToday = 0;
        let approvedToday = 0;
        let rejectedToday = 0;
        
        if (fs.existsSync(signalsFile)) {
            const signalsData = fs.readFileSync(signalsFile, 'utf8');
            const signalsLines = signalsData.trim().split('\n').filter(line => line);
            signalsToday = signalsLines.length;
            
            signalsLines.forEach(line => {
                try {
                    const signal = JSON.parse(line);
                    if (signal.aiApproved) {
                        approvedToday++;
                    } else {
                        rejectedToday++;
                    }
                } catch (e) {
                    // Skip invalid lines
                }
            });
        }
        
        // Count activity logs
        const activityFile = path.join(logsDir, `activity_${today}.jsonl`);
        let activityToday = 0;
        
        if (fs.existsSync(activityFile)) {
            const activityData = fs.readFileSync(activityFile, 'utf8');
            activityToday = activityData.trim().split('\n').filter(line => line).length;
        }
        
        // Count errors
        const errorsFile = path.join(logsDir, `errors_${today}.jsonl`);
        let errorsToday = 0;
        
        if (fs.existsSync(errorsFile)) {
            const errorsData = fs.readFileSync(errorsFile, 'utf8');
            errorsToday = errorsData.trim().split('\n').filter(line => line).length;
        }
        
        return {
            date: today,
            signals: {
                total: signalsToday,
                approved: approvedToday,
                rejected: rejectedToday,
                approvalRate: signalsToday > 0 ? ((approvedToday / signalsToday) * 100).toFixed(1) + '%' : '0%'
            },
            activity: activityToday,
            errors: errorsToday
        };
        
    } catch (error) {
        console.error('Error getting logs summary:', error);
        return {
            date: new Date().toISOString().split('T')[0],
            signals: { total: 0, approved: 0, rejected: 0, approvalRate: '0%' },
            activity: 0,
            errors: 0
        };
    }
}

/**
 * Clean old log files (keep last 30 days)
 */
function cleanOldLogs() {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const files = fs.readdirSync(logsDir);
        
        files.forEach(file => {
            const filePath = path.join(logsDir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.mtime < thirtyDaysAgo) {
                fs.unlinkSync(filePath);
                console.log(`Deleted old log file: ${file}`);
            }
        });
    } catch (error) {
        console.error('Error cleaning old logs:', error);
    }
}

/**
 * Export logs to CSV for analysis
 */
function exportSignalsToCSV(days = 7) {
    try {
        const signals = [];
        
        for (let i = 0; i < days; i++) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const signalsFile = path.join(logsDir, `signals_${date}.jsonl`);
            
            if (fs.existsSync(signalsFile)) {
                const signalsData = fs.readFileSync(signalsFile, 'utf8');
                const daySignals = signalsData.trim().split('\n')
                    .filter(line => line)
                    .map(line => JSON.parse(line));
                signals.push(...daySignals);
            }
        }
        
        if (signals.length === 0) return null;
        
        // Create CSV content
        const headers = [
            'timestamp', 'symbol', 'direction', 'entryPrice', 'stopLoss', 'takeProfit',
            'confidence', 'aiApproved', 'aiReason', 'rsi', 'volatility', 'trend', 'momentum'
        ];
        
        let csvContent = headers.join(',') + '\n';
        
        signals.forEach(signal => {
            const row = [
                signal.timestamp,
                signal.symbol,
                signal.direction,
                signal.entryPrice,
                signal.stopLoss,
                signal.takeProfit,
                signal.confidence,
                signal.aiApproved,
                `"${signal.aiReason}"`,
                signal.technicals.rsi,
                signal.technicals.volatility,
                signal.technicals.trend,
                signal.technicals.momentum
            ];
            csvContent += row.join(',') + '\n';
        });
        
        const csvFile = path.join(logsDir, `signals_export_${new Date().toISOString().split('T')[0]}.csv`);
        fs.writeFileSync(csvFile, csvContent);
        
        return csvFile;
    } catch (error) {
        console.error('Error exporting to CSV:', error);
        return null;
    }
}

// Clean old logs on startup
cleanOldLogs();

module.exports = {
    logSignalDecision,
    logBotActivity,
    logMarketData,
    logError,
    getRecentLogs,
    getLogsSummary,
    cleanOldLogs,
    exportSignalsToCSV
};
