export const UTILS = {
    buf2hex: (buffer) => [...new Uint8Array(buffer)].map(x =>
        x.toString(16).padStart(2, '0').toUpperCase()).join(' '),

    hex2buf: (hex) => {
        // Handle UUID like "2A26" or hex string "AA 55 01"
        const cleanHex = hex.replace(/\s+/g, '');

        // If it's a 4-char UUID (like 2A26)
        if (/^[0-9A-Fa-f]{4}$/.test(cleanHex)) {
            return new Uint8Array([
                parseInt(cleanHex.substr(0, 2), 16),
                parseInt(cleanHex.substr(2, 2), 16)
            ]);
        }

        // If it's valid hex string
        if (/^[0-9A-Fa-f]+$/.test(cleanHex)) {
            if (cleanHex.length % 2 !== 0) {
                // If odd length, maybe prepend 0? Or throw. 
                // Original threw error, let's keep it consistent or just warn
                throw new Error('Hex string must have even length');
            }
            const bytes = [];
            for (let i = 0; i < cleanHex.length; i += 2) {
                bytes.push(parseInt(cleanHex.substr(i, 2), 16));
            }
            return new Uint8Array(bytes);
        }

        // Otherwise treat as text
        return new TextEncoder().encode(hex);
    },

    wait: (ms) => new Promise(r => setTimeout(r, ms)),

    calculateChecksum: (data, type = 'XOR') => {
        if (type === 'XOR') {
            return data.reduce((a, b) => a ^ b, 0);
        } else if (type === 'SUM') {
            return data.reduce((a, b) => a + b, 0) & 0xFF;
        }
        return 0;
    },

    // Convert short UUID to full UUID
    shortToFullUUID: (shortUuid) => {
        if (shortUuid.includes('-')) return shortUuid;
        return `0000${shortUuid.toLowerCase()}-0000-1000-8000-00805f9b34fb`;
    }
};
