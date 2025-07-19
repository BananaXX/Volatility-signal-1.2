// utils/logger.js
const fs = require('fs');
const path = require('path');

function logSignalToFile(signal) {
    const folder = path.join(__dirname, '../logs');
    if (!fs.existsSync(folder)) fs.mkdirSync(folder);

    const file = path.join(folder, `${new Date().toISOString().split('T')[0]}.json`);
    let data = [];
    if (fs.existsSync(file)) {
        const raw = fs.readFileSync(file, 'utf-8');
        try {
            data = JSON.parse(raw);
        } catch {}
    }

    data.unshift(signal);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

module.exports = { logSignalToFile };
