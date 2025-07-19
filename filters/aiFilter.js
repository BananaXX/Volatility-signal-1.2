// filters/aiFilter.js
function shouldAllowSignal(signal, lastSignalTime) {
    const cooldownMs = 3 * 60 * 1000;
    if (!lastSignalTime) return true;
    const now = Date.now();
    return (now - lastSignalTime) > cooldownMs;
}

module.exports = { shouldAllowSignal };
