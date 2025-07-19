#!/usr/bin/env node

/**
 * Log Viewer Utility for Enhanced Volatility Bot
 * Usage: npm run logs [type] [date] [lines]
 * Examples:
 *   npm run logs                    # Show recent signals
 *   npm run logs signals           # Show signal logs
 *   npm run logs activity          # Show activity logs
 *   npm run logs errors            # Show error logs
 *   npm run logs signals 2024-01-15 50  # Show 50 lines from specific date
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const logType = args[0] || 'signals';
const targetDate = args[1] || new Date().toISOString().split('T')[0];
const maxLines = parseInt(args[2]) || 20;

const logsDir = path.join(__dirname, '../logs');
const logFile = path.join(logsDir, `${logType}_${targetDate}.jsonl`);

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString();
}

function displaySignalLog(log) {
    const status = log.aiApproved ? 
        colorize('✅ APPROVED', 'green') : 
        colorize('❌ REJECTED', 'red');
    
    const confidence = log.confidence >= 80 ? 
        colorize(log.confidence + '%', 'green') :
        log.confidence >= 60 ?
        colorize(log.confidence + '%', 'yellow') :
        colorize(log.confidence + '%', 'red');
    
    console.log(`
${colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')}
${colorize('📊 SIGNAL LOG', 'bright')} | ${formatTimestamp(log.timestamp)}
${colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan')}
${colorize('Symbol:', 'blue')} ${log.symbol} | ${colorize('Direction:', 'blue')} ${log.direction}
${colorize('Entry:', 'blue')} ${log.entryPrice} | ${colorize('SL:', 'blue')} ${log.stopLoss} | ${colorize('TP:', 'blue')} ${log.takeProfit}
${colorize('Confidence:', 'blue')} ${confidence} | ${colorize('Status:', 'blue')} ${status}
${colorize('AI Reason:', 'blue')} ${log.aiReason}
${colorize('Technical:', 'blue')} RSI: ${log.technicals?.rsi}, Vol: ${log.technicals?.volatility}%, Trend: ${log.technicals?.trend}
    `);
}

function displayActivityLog(log) {
    const levelColor = log.level === 'error' ? 'red' : 
                      log.level === 'warn' ? 'yellow' : 'green';
    
    console.log(`${colorize(formatTimestamp(log.timestamp), 'cyan')} ${colorize(`[${log.level.toUpperCase()}]`, levelColor)} ${log.message}`);
}

function displayErrorLog(log) {
    console.log(`
${colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'red')}
${colorize('❌ ERROR LOG', 'bright')} | ${formatTimestamp(log.timestamp)}
${colorize('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'red')}
${colorize('Context:', 'blue')} ${log.context}
${colorize('Error:', 'red')} ${log.error}
${colorize('Stack:', 'yellow')} ${log.stack ? log.stack.split('\n').slice(0, 3).join('\n') : 'No stack trace'}
    `);
}

function main() {
    console.log(colorize(`
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                           📊 ENHANCED VOLATILITY BOT LOG VIEWER                      ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
    `, 'bright'));

    console.log(`${colorize('Log Type:', 'blue')} ${logType}`);
    console.log(`${colorize('Date:', 'blue')} ${targetDate}`);
    console.log(`${colorize('Max Lines:', 'blue')} ${maxLines}`);
    console.log(`${colorize('File:', 'blue')} ${logFile}\n`);

    // Check if logs directory exists
    if (!fs.existsSync(logsDir)) {
        console.log(colorize('❌ Logs directory does not exist. No logs found.', 'red'));
        return;
    }

    // Check if specific log file exists
    if (!fs.existsSync(logFile)) {
        console.log(colorize(`❌ Log file does not exist: ${logFile}`, 'red'));
        
        // Show available log files
        console.log(colorize('\n📁 Available log files:', 'yellow'));
        const files = fs.readdirSync(logsDir)
            .filter(file => file.endsWith('.jsonl'))
            .sort()
            .reverse()
            .slice(0, 10);
        
        if (files.length === 0) {
            console.log(colorize('   No log files found.', 'red'));
        } else {
            files.forEach(file => {
                const filePath = path.join(logsDir, file);
                const stats = fs.statSync(filePath);
                const size = (stats.size / 1024).toFixed(1) + 'KB';
                console.log(`   ${colorize(file, 'cyan')} (${size})`);
            });
        }
        return;
    }

    try {
        // Read and parse log file
        const logData = fs.readFileSync(logFile, 'utf8');
        const lines = logData.trim().split('\n').filter(line => line);
        
        if (lines.length === 0) {
            console.log(colorize('📝 Log file is empty.', 'yellow'));
            return;
        }

        // Parse JSON lines and sort by timestamp (newest first)
        const logs = lines
            .map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return null;
                }
            })
            .filter(log => log !== null)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, maxLines);

        console.log(colorize(`📊 Showing ${logs.length} most recent entries:\n`, 'bright'));

        // Display logs based on type
        logs.forEach((log, index) => {
            if (index > 0) console.log(''); // Add spacing between entries
            
            switch (logType) {
                case 'signals':
                    displaySignalLog(log);
                    break;
                case 'activity':
                    displayActivityLog(log);
                    break;
                case 'errors':
                    displayErrorLog(log);
                    break;
                default:
                    console.log(JSON.stringify(log, null, 2));
            }
        });

        // Summary
        console.log(colorize(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 SUMMARY: ${logs.length} entries shown from ${lines.length} total entries
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        `, 'cyan'));

        // Additional stats for signals
        if (logType === 'signals' && logs.length > 0) {
            const approved = logs.filter(log => log.aiApproved).length;
            const rejected = logs.filter(log => !log.aiApproved).length;
            const approvalRate = ((approved / logs.length) * 100).toFixed(1);
            
            console.log(`${colorize('AI Stats:', 'blue')} ${colorize(approved, 'green')} approved, ${colorize(rejected, 'red')} rejected (${colorize(approvalRate + '%', 'yellow')} approval rate)`);
        }

    } catch (error) {
        console.log(colorize(`❌ Error reading log file: ${error.message}`, 'red'));
    }
}

// Help text
if (args.includes('-h') || args.includes('--help')) {
    console.log(colorize(`
📊 Enhanced Volatility Bot - Log Viewer

Usage: npm run logs [type] [date] [lines]

Arguments:
  type     Log type to view (signals, activity, errors) [default: signals]
  date     Date to view (YYYY-MM-DD format) [default: today]
  lines    Maximum lines to show [default: 20]

Examples:
  npm run logs                           # Show recent signals from today
  npm run logs signals                   # Show signal logs from today
  npm run logs activity                  # Show activity logs from today
  npm run logs errors                    # Show error logs from today
  npm run logs signals 2024-01-15       # Show signals from specific date
  npm run logs signals 2024-01-15 50    # Show 50 lines from specific date

Log Types:
  signals   - Trading signal decisions (approved/rejected by AI)
  activity  - Bot activity and status changes
  errors    - Error logs with stack traces
  market    - Market data samples (if enabled)

Options:
  -h, --help    Show this help message
    `, 'bright'));
    process.exit(0);
}

// Run the main function
main();
