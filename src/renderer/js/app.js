import { UTILS } from './utils.js';
import { DISCOVERY } from './engine.js';
import { UI } from './ui.js';
import { TEMPLATES } from './constants.js';
import { DECODER } from './decoder.js';

export const APP = {
    device: null,
    server: null,
    services: [],
    characteristics: {
        all: [],
        write: null,
        notify: null
    },

    discovery: {
        running: false,
        stage: 'IDLE'
    },

    keepAlive: {
        interval: null,
        enabled: false,
        counter: 0
    },

    favorites: JSON.parse(localStorage.getItem('ble_favs') || '[]'),

    init() {
        UI.setApp(this);

        UI.renderFavs(this.favorites);
        this.renderTemplates('all');
        this.initGrid();
        this.bindElectronEvents();

        this.bindEvents();

        UI.log("BLE Hunter Ready", "success");
    },

    bindEvents() {
        document.getElementById('tab-discovery').onclick = () => {
            document.getElementById('panel-discovery').classList.remove('hidden');
            document.getElementById('panel-manual').classList.add('hidden');
            document.getElementById('panel-manual').classList.remove('flex');
            document.getElementById('tab-discovery').classList.add('tab-active');
            document.getElementById('tab-manual').classList.remove('tab-active');
            document.getElementById('tab-manual').classList.remove('text-ble-400');
        };

        document.getElementById('tab-manual').onclick = () => {
            document.getElementById('panel-discovery').classList.add('hidden');
            document.getElementById('panel-manual').classList.remove('hidden');
            document.getElementById('panel-manual').classList.add('flex');
            document.getElementById('tab-discovery').classList.remove('tab-active');
            document.getElementById('tab-manual').classList.add('tab-active');
            document.getElementById('tab-manual').classList.add('text-ble-400');
        };

        const modal = document.getElementById('modal-settings');
        document.getElementById('connectBtn').onclick = () => modal.classList.remove('hidden');
        document.getElementById('modal-close').onclick = () => modal.classList.add('hidden');
        document.getElementById('modal-connect-action').onclick = async () => {
            modal.classList.add('hidden');
            await this.connectToDevice();
        };

        document.getElementById('disconnectBtn').onclick = () => {
            if (this.device?.gatt?.connected) {
                this.device.gatt.disconnect();
            }
        };

        document.getElementById('send-manual').onclick = async () => {
            const raw = document.getElementById('manual-input').value.trim();
            if (!raw) return;
            await this.sendCommand(raw);
        };

        document.getElementById('manual-checksum').onclick = () => {
            const input = document.getElementById('manual-input');
            const raw = input.value.trim();
            try {
                const bytes = UTILS.hex2buf(raw);
                const checksum = UTILS.calculateChecksum(bytes, 'XOR');
                input.value = raw + ' ' + checksum.toString(16).padStart(2, '0').toUpperCase();
            } catch (e) {
                UI.log("Invalid Hex for Checksum", "error");
            }
        };

        const filterBtns = document.querySelectorAll('[data-template-filter]');
        filterBtns.forEach(btn => {
            btn.onclick = () => this.renderTemplates(btn.dataset.templateFilter);
        });

        document.getElementById('clear-logs').onclick = () => {
            document.getElementById('console-logs').innerHTML = '';
            UI.log("Logs Cleared", "sys");
        };

        document.getElementById('keep-alive-toggle').onclick = () => this.toggleKeepAlive();
    },

    initGrid() {
        const grid = document.getElementById('cmd-grid');
        for (let i = 0; i < 256; i++) {
            const div = document.createElement('div');
            div.className = 'hex-cell hex-unknown';
            div.id = `hex-${i}`;
            div.textContent = i.toString(16).toUpperCase().padStart(2, '0');
            div.onclick = () => {
                document.getElementById('manual-input').value = `AA 55 ${div.textContent} 00 00`;
            };
            grid.appendChild(div);
        }
    },

    bindElectronEvents() {
        if (window.electronAPI) {
            window.electronAPI.onDeviceList((event, list) => {
                this.showDevicePicker(list);
            });
        }
    },

    showDevicePicker(list) {
        const modal = document.getElementById('modal-picker');
        const container = document.getElementById('picker-list');

        modal.classList.remove('hidden');
        container.innerHTML = '';

        if (list.length === 0) {
            container.innerHTML = '<div class="text-center text-xs text-slate-500 mt-10">No new devices found yet...</div>';
        }

        list.forEach(d => {
            const el = document.createElement('div');
            el.className = "flex justify-between items-center p-3 rounded bg-white/5 hover:bg-white/10 cursor-pointer border border-white/5 transition-all hover:border-ble-500/50 mb-1";
            el.innerHTML = `
                <div>
                    <div class="text-xs font-bold text-white">${d.deviceName}</div>
                    <div class="text-[10px] text-slate-500 font-mono">${d.deviceId}</div>
                </div>
                <div class="text-[10px] text-ble-400 font-bold">CONNECT</div>
            `;
            el.onclick = () => {
                modal.classList.add('hidden');
                window.electronAPI.selectDevice(d.deviceId);
            };
            container.appendChild(el);
        });

        document.getElementById('picker-cancel').onclick = () => {
            modal.classList.add('hidden');
            window.electronAPI.cancelSelection();
        }
    },

    renderTemplates(category) {
        const list = document.getElementById('template-list');
        list.innerHTML = '';

        let show = [];
        if (category === 'all') {
            show = [].concat(TEMPLATES.info, TEMPLATES.config, TEMPLATES.ota);
        } else {
            show = TEMPLATES[category] || [];
        }

        show.forEach(t => {
            const btn = document.createElement('div');
            btn.className = "flex justify-between items-center bg-white/5 hover:bg-white/10 p-2 rounded cursor-pointer group border border-white/5";
            btn.innerHTML = `
                <div>
                    <div class="text-[11px] font-bold text-slate-200">${t.name}</div>
                    <div class="text-[9px] text-slate-500">${t.desc}</div>
                </div>
                <code class="text-[9px] font-mono text-ble-400 group-hover:text-ble-300">
                    ${t.cmd === 'DYNAMIC_TIME' ? '{Template}' : t.cmd.substring(0, 14) + (t.cmd.length > 14 ? '...' : '')}
                </code>
            `;
            btn.onclick = () => {
                let finalCmd = t.cmd;
                if (t.cmd === 'DYNAMIC_TIME') {
                    const now = new Date();
                    const y = now.getFullYear();
                    const parts = [
                        (y >> 8) & 0xFF, y & 0xFF,
                        now.getMonth() + 1, now.getDate(),
                        now.getHours(), now.getMinutes(), now.getSeconds(),
                        now.getDay()
                    ];
                    finalCmd = `AA 55 10 00 07 ${parts.map(p => p.toString(16).padStart(2, '0').toUpperCase()).join(' ')}`;
                }
                document.getElementById('manual-input').value = finalCmd;
            };
            list.appendChild(btn);
        });
    },

    registerCharacteristic(c) {
        this.characteristics.all.push(c);
        if (c.properties.write || c.properties.writeWithoutResponse) this.characteristics.write = c;
        if (c.properties.notify) this.characteristics.notify = c;

        if (this.characteristics.write) {
            document.getElementById('start-frame-btn').disabled = false;
        }
    },

    async sendCommand(rawInput, specificChar = null) {
        const target = specificChar || this.characteristics.write;
        if (!target) {
            UI.log("No write characteristic selected", "error");
            return false;
        }
        try {
            const buf = UTILS.hex2buf(rawInput);
            DECODER.lastCommand = buf;
            await target.writeValue(buf);
            UI.log(`TX >> ${UTILS.buf2hex(buf)}`, "tx");
            return true;
        } catch (e) {
            UI.log(`TX Error: ${e.message}`, "error");
            return false;
        }
    },

    resetSession() {
        this.services = [];
        this.characteristics = { all: [], write: null, notify: null };

        document.getElementById('gatt-tree').innerHTML = `
            <div class="absolute inset-0 flex items-center justify-center text-slate-600 flex-col gap-2 pointer-events-none opacity-50">
                <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <span class="text-xs">Connect to a device to explore services</span>
            </div>`;
        document.getElementById('gatt-stats').textContent = "Not scanned yet.";
        document.getElementById('frame-viz').innerHTML = '<span class="text-slate-600 text-[10px] italic">Waiting for analysis...</span>';

        UI.updateHeaderInfo({ mfr: 'Unknown', model: 'Generic', fw: 'v--.--', proto: 'Auto-Detecting...' });
        UI.log("Session data cleared.", "sys");
    },

    saveFav(device) {
        if (!device) return;
        const fav = { id: device.id, name: device.name || 'Unknown', ts: Date.now() };
        const exists = this.favorites.find(f => f.id === fav.id);
        if (!exists) {
            this.favorites.push(fav);
            localStorage.setItem('ble_favs', JSON.stringify(this.favorites));
            UI.renderFavs(this.favorites);
            UI.log("Added to Favorites", "success");
        }
    },

    async connectToDevice() {
        const nameFilter = document.getElementById('cfg-filter').value.trim();
        const serviceRaw = document.getElementById('cfg-services').value.trim();
        const acceptAll = document.getElementById('cfg-all-devices').checked;
        const clearSession = document.getElementById('cfg-clear-session').checked;

        if (clearSession) this.resetSession();

        const options = {};
        if (acceptAll) {
            options.acceptAllDevices = true;
            options.optionalServices = ['00001800-0000-1000-8000-00805f9b34fb', '00001801-0000-1000-8000-00805f9b34fb'];
        } else {
            if (nameFilter) options.filters = [{ namePrefix: nameFilter }];
            else if (serviceRaw) options.filters = [{ namePrefix: '' }]; else options.acceptAllDevices = true;
        }

        const commonServices = [
            '0000180f-0000-1000-8000-00805f9b34fb',
            '0000180a-0000-1000-8000-00805f9b34fb',
            '6e401301-b5a3-f393-e0a9-e50e24dcca9d'
        ];

        if (serviceRaw) {
            const extra = serviceRaw.split(',').map(s => s.trim());
            options.optionalServices = (options.optionalServices || []).concat(extra);
        }
        options.optionalServices = (options.optionalServices || []).concat(commonServices);
        options.optionalServices = [...new Set(options.optionalServices)];

        try {
            UI.updateStatus(false, "Connecting...");
            UI.log("Requesting Bluetooth device...", "sys");

            const device = await navigator.bluetooth.requestDevice(options);
            this.device = device;

            device.addEventListener('gattserverdisconnected', () => {
                UI.updateStatus(false);
                UI.log("Device disconnected", "error");
            });

            UI.log(`Device found: ${device.name || 'Unknown'} (${device.id})`, "success");

            const server = await device.gatt.connect();
            this.server = server;

            UI.updateStatus(true, device.name || "Connected");
            UI.log("GATT connected successfully", "success");

            await DISCOVERY.runGattDiscovery(server, {
                onLog: (msg, type) => UI.log(msg, type),
                onServiceFound: async (svc) => await UI.renderServiceCard(svc),
                onComplete: (proto, services) => {
                    this.services = services;
                    UI.updateHeaderInfo({ proto: proto });
                    UI.log(`Protocol Detected: ${proto}`, 'success');
                    document.getElementById('gatt-badge').textContent = "Done";
                    document.getElementById('gatt-badge').className = "px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]";
                },
                onError: (e) => {
                    UI.log(`GATT Scan Failed: ${e.message}`, "error");
                    document.getElementById('gatt-badge').textContent = "Error";
                }
            });

            setTimeout(() => this.startKeepAlive(), 10000);

        } catch (e) {
            if (e.name === 'NotFoundError') UI.log("No device selected", "error");
            else UI.log(`Connection Error: ${e.message}`, "error");
            UI.updateStatus(false);
        }
    },

    startKeepAlive() {
        if (this.keepAlive.interval) clearInterval(this.keepAlive.interval);
        this.keepAlive.enabled = true;
        this.keepAlive.counter = 0;
        document.getElementById('keep-alive-toggle').textContent = 'Keep-Alive: ON';
        document.getElementById('keep-alive-toggle').classList.add('text-green-400');

        this.keepAlive.interval = setInterval(async () => {
            if (!this.device?.gatt?.connected || !this.characteristics.write) {
                this.stopKeepAlive();
                return;
            }
            try {
                this.keepAlive.counter++;
                await this.characteristics.write.writeValue(new Uint8Array([0x01]));
            } catch (e) { }
        }, 30000);
        UI.log("Keep-alive activated (30s intervals)", "success");
    },

    stopKeepAlive() {
        if (this.keepAlive.interval) {
            clearInterval(this.keepAlive.interval);
            this.keepAlive.interval = null;
        }
        this.keepAlive.enabled = false;
        document.getElementById('keep-alive-toggle').textContent = 'Keep-Alive: OFF';
        document.getElementById('keep-alive-toggle').classList.remove('text-green-400');
    },

    toggleKeepAlive() {
        if (this.keepAlive.enabled) this.stopKeepAlive();
        else this.startKeepAlive();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    APP.init();
});
