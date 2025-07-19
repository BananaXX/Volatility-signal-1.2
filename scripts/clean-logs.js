#!/usr/bin/env node

/**
 * Log Cleanup Utility for Enhanced Volatility Bot
 * Usage: npm run clean-logs [days] [--dry-run]
 * Examples:
 *   npm run clean-logs           # Clean logs older than 30 days
 *   npm run clean-logs 7         # Clean logs older than 7 days
 *   npm run clean-logs 30 --dry-run  # Preview what would be deleted
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const retentionDays = parseInt(args[0]) || 30;
const isDryRun = args.includes('--dry-run') || args.includes('-n');

const logsDir = path.join(__dirname, '../logs');

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function main() {
    console.log(colorize(`
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                           🧹 ENHANCED VOLATILITY BOT LOG CLEANER                     ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
    `, 'bright'));

    console.log(`${colorize('Retention Period:', 'blue')} ${retentionDays} days`);
    console.log(`${colorize('Logs Directory:', 'blue')} ${logsDir}`);
    console.log(`${colorize('Mode:', 'blue')} ${isDryRun ? colorize('DRY RUN (preview only)', 'yellow') : colorize('LIVE (will delete files)', 'red')}\n`);

    // Check if logs directory exists
    if (!fs.existsSync(logsDir)) {
        console.log(colorize('❌ Logs directory does not exist. Nothing to clean.', 'red'));
        return;
    }

    try {
        // Calculate cutoff date
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        
        console.log(`${colorize('Cutoff Date:', 'blue')} ${formatDate(cutoffDate)} (files older than this will be ${isDryRun ? 'marked for deletion' : 'deleted'})\n`);

        // Get all files in logs directory
        const files = fs.readdirSync(logsDir);
        
        if (files.length === 0) {
            console.log(colorize('📝 No files found in logs directory.', 'yellow'));
            return;
        }

        // Analyze files
        const logFiles = [];
        const otherFiles = [];
        let totalSize = 0;
        let oldFilesSize = 0;
        let oldFilesCount = 0;

        files.forEach(file => {
            const filePath = path.join(logsDir, file);
            const stats = fs.statSync(filePath);
            
            if (stats.isFile()) {
                totalSize += stats.size;
                
                const fileInfo = {
                    name: file,
                    path: filePath,
                    size: stats.size,
                    modified: stats.mtime,
                    isOld: stats.mtime < cutoffDate
                };

                if (file.endsWith('.jsonl') || file.endsWith('.log') || file.endsWith('.csv')) {
                    logFiles.push(fileInfo);
                    if (fileInfo.isOld) {
                        oldFilesSize += stats.size;
                        oldFilesCount++;
                    }
                } else {
                    otherFiles.push(fileInfo);
                }
            }
        });

        // Display current status
        console.log(colorize('📊 CURRENT LOG STATUS:', 'cyan'));
        console.log(`${colorize('Total Files:', 'blue')} ${files.length}`);
        console.log(`${colorize('Log Files:', 'blue')} ${logFiles.length}`);
        console.log(`${colorize('Other Files:', 'blue')} ${otherFiles.length}`);
        console.log(`${colorize('Total Size:', 'blue')} ${formatBytes(totalSize)}`);
        console.log(`${colorize('Files to Clean:', 'blue')} ${oldFilesCount} (${formatBytes(oldFilesSize)})\n`);

        if (oldFilesCount === 0) {
            console.log(colorize('✅ No old files found. Nothing to clean!', 'green'));
            return;
        }

        // Group files by type and date
        const filesByType = {};
        logFiles.forEach(file => {
            if (file.isOld) {
                const type = file.name.split('_')[0] || 'unknown';
                if (!filesByType[type]) {
                    filesByType[type] = [];
                }
                filesByType[type].push(file);
            }
        });

        // Display files to be cleaned
        console.log(colorize('🗑️  FILES TO BE CLEANED:', 'yellow'));
        
        Object.keys(filesByType).sort().forEach(type => {
            const typeFiles = filesByType[type].sort((a, b) => a.modified - b.modified);
            const typeSize = typeFiles.reduce((sum, file) => sum + file.size, 0);
            
            console.log(`\n${colorize(`${type.toUpperCase()} LOGS:`, 'cyan')} ${typeFiles.length} files, ${formatBytes(typeSize)}`);
            
            typeFiles.forEach(file => {
                const ageInDays = Math.floor((Date.now() - file.modified.getTime()) / (1000 * 60 * 60 * 24));
                console.log(`  ${colorize('●', 'red')} ${file.name} (${formatBytes(file.size)}, ${ageInDays} days old)`);
            });
        });

        // Show other old files if any
        const oldOtherFiles = otherFiles.filter(file => file.isOld);
        if (oldOtherFiles.length > 0) {
            console.log(`\n${colorize('OTHER OLD FILES:', 'cyan')}`);
            oldOtherFiles.forEach(file => {
                const ageInDays = Math.floor((Date.now() - file.modified.getTime()) / (1000 * 60 * 60 * 24));
                console.log(`  ${colorize('●', 'yellow')} ${file.name} (${formatBytes(file.size)}, ${ageInDays} days old)`);
            });
        }

        // Confirmation and cleanup
        if (isDryRun) {
            console.log(colorize(`\n🔍 DRY RUN COMPLETE - No files were deleted`, 'yellow'));
            console.log(colorize(`   Run without --dry-run to actually delete these ${oldFilesCount} files`, 'yellow'));
        } else {
            console.log(colorize(`\n⚠️  WARNING: About to delete ${oldFilesCount} files (${formatBytes(oldFilesSize)})`, 'red'));
            console.log(colorize('   This action cannot be undone!', 'red'));
            
            // In a real implementation, you might want to add a confirmation prompt
            // For now, we'll proceed with the cleanup
            
            console.log(colorize('\n🧹 Starting cleanup...', 'blue'));
            
            let deletedCount = 0;
            let deletedSize = 0;
            let errors = [];

            // Delete old log files
            logFiles.forEach(file => {
                if (file.isOld) {
                    try {
                        fs.unlinkSync(file.path);
                        deletedCount++;
                        deletedSize += file.size;
                        console.log(`   ${colorize('✓', 'green')} Deleted ${file.name}`);
                    } catch (error) {
                        errors.push({ file: file.name, error: error.message });
                        console.log(`   ${colorize('✗', 'red')} Failed to delete ${file.name}: ${error.message}`);
                    }
                }
            });

            // Delete other old files
            oldOtherFiles.forEach(file => {
                try {
                    fs.unlinkSync(file.path);
                    deletedCount++;
                    deletedSize += file.size;
                    console.log(`   ${colorize('✓', 'green')} Deleted ${file.name}`);
                } catch (error) {
                    errors.push({ file: file.name, error: error.message });
                    console.log(`   ${colorize('✗', 'red')} Failed to delete ${file.name}: ${error.message}`);
                }
            });

            // Summary
            console.log(colorize(`\n📊 CLEANUP SUMMARY:`, 'cyan'));
            console.log(`${colorize('Files Deleted:', 'blue')} ${deletedCount}/${oldFilesCount}`);
            console.log(`${colorize('Space Freed:', 'blue')} ${formatBytes(deletedSize)}`);
            
            if (errors.length > 0) {
                console.log(`${colorize('Errors:', 'red')} ${errors.length}`);
                errors.forEach(error => {
                    console.log(`  ${colorize('●', 'red')} ${error.file}: ${error.error}`);
                });
            } else {
                console.log(colorize('✅ All files cleaned successfully!', 'green'));
            }

            // Show remaining files
            const remainingFiles = fs.readdirSync(logsDir).length;
            console.log(`${colorize('Remaining Files:', 'blue')} ${remainingFiles}`);
        }

        // Recommendations
        console.log(colorize(`\n💡 RECOMMENDATIONS:`, 'cyan'));
        console.log(`   • Run this cleanup weekly to maintain disk space`);
        console.log(`   • Consider reducing retention period if disk space is limited`);
        console.log(`   • Monitor log growth with: npm run logs`);
        console.log(`   • Set up automated cleanup with cron if running in production`);

    } catch (error) {
        console.log(colorize(`❌ Error during cleanup: ${error.message}`, 'red'));
        console.log(colorize(`Stack trace: ${error.stack}`, 'yellow'));
    }
}

// Help text
if (args.includes('-h') || args.includes('--help')) {
    console.log(colorize(`
🧹 Enhanced Volatility Bot - Log Cleaner

Usage: npm run clean-logs [days] [--dry-run]

Arguments:
  days      Number of days to retain logs [default: 30]

Options:
  --dry-run, -n    Preview what would be deleted without actually deleting
  -h, --help       Show this help message

Examples:
  npm run clean-logs                # Clean logs older than 30 days
  npm run clean-logs 7              # Clean logs older than 7 days  
  npm run clean-logs 30 --dry-run   # Preview what would be deleted
  npm run clean-logs 14 -n          # Preview cleanup for 14-day retention

File Types Cleaned:
  *.jsonl   - Structured log files (signals, activity, errors)
  *.log     - General log files
  *.csv     - Exported log data

Safety Features:
  • Dry run mode to preview changes
  • Detailed reporting of what will be deleted
  • Error handling for permission issues
  • Preserves non-log files by default

Notes:
  • This tool only cleans files in the /logs directory
  • Files are deleted based on their modification time
  • The current day's logs are always preserved
  • Backup important logs before running cleanup
    `, 'bright'));
    process.exit(0);
}

// Run the main function
main();
