import { STD_SERVICES, STD_CHARS } from './constants.js';

export const SMART_ENGINE = {
    protocol: 'Unknown',
    macros: [],

    detectProtocol: (services) => {
        const uuids = services.map(s => s.uuid);

        let detected = 'Generic BLE';
        if (uuids.some(u => u.includes('6e40'))) detected = 'Nordic UART (Potential HF-795)';
        if (uuids.some(u => u.includes('fee0'))) detected = 'Huami / Xiaomi';
        if (uuids.some(u => u.includes('feea'))) detected = 'FitBit';

        SMART_ENGINE.protocol = detected;
        return detected;
    }
};

export const DISCOVERY = {
    async runGattDiscovery(server, callbacks) {
        // callbacks: { onLog, onServiceFound, onComplete, onError }
        if (!server) return;

        callbacks.onLog("Starting GATT Discovery...", "sys");

        try {
            const services = await server.getPrimaryServices();
            callbacks.onLog(`Found ${services.length} services. Building Tree...`, "sys");

            for (const svc of services) {
                await callbacks.onServiceFound(svc);
            }

            // Smart Protocol Detection
            const proto = SMART_ENGINE.detectProtocol(services);
            callbacks.onComplete(proto, services);

        } catch (e) {
            callbacks.onError(e);
        }
    }
};
