import { UTILS } from './utils.js';
import { STD_SERVICES, STD_CHARS } from './constants.js';
import { DECODER } from './decoder.js';

export const UI = {
    app: null,

    elements: {
        log: () => document.getElementById('console-logs'),
        gattTree: () => document.getElementById('gatt-tree'),
        statusDot: () => document.getElementById('statusDot'),
        statusText: () => document.getElementById('statusText'),
        keepAliveBtn: () => document.getElementById('keep-alive-toggle'),
        frameViz: () => document.getElementById('frame-viz'),
        chkAlgo: () => document.getElementById('chk-algo'),
        lenByte: () => document.getElementById('len-byte')
    },

    setApp(appInstance) {
        this.app = appInstance;
    },

    // Logging
    log(msg, type = 'sys', detail = null) {
        const line = document.createElement('div');
        line.className = `log-entry log-${type}`;
        const ts = new Date().toISOString().substring(11, 23);

        let html = `<span class="opacity-50">[${ts}]</span> ${msg}`;

        if (detail) {
            html += `<div class="pl-6 text-[10px] text-slate-400 font-mono">↳ ${detail}</div>`;
        }

        line.innerHTML = html;
        const logEl = this.elements.log();
        logEl.appendChild(line);
        if (document.getElementById('autoscroll').checked) {
            logEl.scrollTop = logEl.scrollHeight;
        }
    },

    updateStatus(connected, text) {
        const btnC = document.getElementById('connectBtn');
        const btnD = document.getElementById('disconnectBtn');
        const header = document.getElementById('device-header');
        const statusSimple = document.getElementById('connectionStatus');

        if (connected) {
            header.classList.remove('hidden');
            header.classList.add('flex');
            statusSimple.classList.add('hidden');
            statusSimple.classList.remove('flex');

            document.getElementById('dh-name').textContent = text || "Device";
            document.getElementById('dh-mac').innerHTML = `
                ID: ${this.app.device?.id.substring(0, 8)}... 
                <button id="add-fav-btn" class="ml-2 hover:text-yellow-400 text-slate-500" title="Add to Favorites">★</button>
            `;

            document.getElementById('add-fav-btn').onclick = () => this.app.saveFav(this.app.device);

            btnC.classList.add('hidden');
            btnD.classList.remove('hidden');
        } else {
            header.classList.add('hidden');
            header.classList.remove('flex');
            statusSimple.classList.remove('hidden');
            statusSimple.classList.add('flex');

            this.elements.statusDot().className = 'w-2 h-2 rounded-full bg-slate-600';
            this.elements.statusText().classList.remove('text-white');
            this.elements.statusText().textContent = "Disconnected";
            btnC.classList.remove('hidden');
            btnD.classList.add('hidden');
            this.app.stopKeepAlive();
        }
    },

    updateHeaderInfo(info) {
        if (info.name) document.getElementById('dh-name').textContent = info.name;
        if (info.mfr) document.getElementById('dh-mfr').textContent = info.mfr;
        if (info.model) document.getElementById('dh-model').textContent = info.model;
        if (info.fw) document.getElementById('dh-fw').textContent = info.fw;
        if (info.proto) document.getElementById('dh-proto').textContent = info.proto;
    },

    renderFavs(favorites) {
        const list = document.getElementById('favorites-list');
        if (!favorites.length) {
            list.innerHTML = '<p class="text-[10px] text-slate-600 italic">No favorites saved.</p>';
            return;
        }
        list.innerHTML = '';
        favorites.forEach(f => {
            const el = document.createElement('div');
            el.className = "flex justify-between items-center group p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer border border-white/5";
            el.innerHTML = `
                 <div class="flex items-center gap-2">
                     <div class="w-2 h-2 rounded-full bg-yellow-500"></div>
                     <div>
                         <div class="text-xs text-white font-bold">${f.name}</div>
                         <div class="text-[9px] text-slate-500 font-mono">${f.id}</div>
                     </div>
                 </div>
                 <button class="opacity-0 group-hover:opacity-100 text-[10px] bg-ble-600 hover:bg-ble-500 text-white px-2 py-1 rounded">Connect</button>
            `;
            el.onclick = () => {
                // Load into filter
                document.getElementById('cfg-filter').value = f.name;
                document.getElementById('cfg-all-devices').checked = false;
                document.getElementById('modal-connect-action').click();
            };
            list.appendChild(el);
        });
    },

    // Tree Rendering
    async renderServiceCard(svc) {
        const uuidShort = svc.uuid.substring(4, 8).toLowerCase();
        const name = STD_SERVICES[uuidShort] || 'Custom Service';
        const isCustom = !STD_SERVICES[uuidShort];

        const card = document.createElement('div');
        card.className = `service-card ${isCustom ? 'border-ble-500/30' : ''}`;

        const header = document.createElement('div');
        header.className = 'service-header';
        header.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="p-1.5 rounded bg-slate-800 text-slate-400">
                     <span class="font-mono text-xs font-bold">${isCustom ? '0x' + uuidShort.toUpperCase() : '0x' + uuidShort.toUpperCase()}</span>
                </div>
                <div>
                    <div class="text-sm font-medium text-slate-200">${name}</div>
                    <div class="text-[10px] text-slate-500 font-mono">${svc.uuid}</div>
                </div>
            </div>
            <div class="text-slate-500 transform transition-transform duration-200 svg-chevron">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
        `;

        header.onclick = () => {
            card.classList.toggle('expanded');
            const chev = header.querySelector('.svg-chevron');
            chev.style.transform = card.classList.contains('expanded') ? 'rotate(180deg)' : 'rotate(0deg)';
        };

        const charList = document.createElement('div');
        charList.className = 'char-list';

        card.appendChild(header);
        card.appendChild(charList);
        this.elements.gattTree().appendChild(card);

        try {
            const chars = await svc.getCharacteristics();
            if (chars.length === 0) {
                charList.innerHTML = '<div class="p-2 text-xs text-slate-500 italic text-center">No characteristics exposed</div>';
                return;
            }

            for (const c of chars) {
                this.renderCharRow(c, charList);

                // Side effect on APP state
                this.app.registerCharacteristic(c);
            }
        } catch (e) {
            charList.innerHTML = `<div class="p-2 text-xs text-red-400 text-center">Access Blocked: ${e.message}</div>`;
        }
    },

    renderCharRow(c, container) {
        const uuidShort = c.uuid.substring(4, 8).toLowerCase();
        const name = STD_CHARS[uuidShort] || 'Unknown Characteristic';
        const props = [];
        if (c.properties.read) props.push('<span class="badge-prop bg-prop-read">READ</span>');
        if (c.properties.write || c.properties.writeWithoutResponse) props.push('<span class="badge-prop bg-prop-write">WRITE</span>');
        if (c.properties.notify || c.properties.indicate) props.push('<span class="badge-prop bg-prop-notify">NOTIFY</span>');

        const row = document.createElement('div');
        row.className = 'char-row';
        const rowId = `char-${c.uuid.replace(/-/g, '')}`;

        row.innerHTML = `
            <div class="char-top">
                <div class="flex flex-col">
                    <span class="text-xs font-bold text-slate-300">${name}</span>
                    <span class="text-[10px] font-mono text-slate-500">${c.uuid}</span>
                </div>
                <div class="flex gap-1">${props.join('')}</div>
            </div>
            <div class="flex items-center justify-between mt-2">
                <div class="flex gap-2" id="${rowId}-actions"></div>
                <div id="${rowId}-val" class="val-box hidden">--</div>
            </div>
        `;

        container.appendChild(row);

        const actionsDiv = document.getElementById(`${rowId}-actions`);
        const valDiv = document.getElementById(`${rowId}-val`);

        // Write UI
        const writeDiv = document.createElement('div');
        writeDiv.id = `${rowId}-write`;
        writeDiv.className = "hidden mt-2 p-2 bg-black/20 rounded border border-white/5 flex gap-2 items-center";
        writeDiv.innerHTML = `
            <input type="text" id="${rowId}-input" placeholder="AA 55 01 (Hex) or Text" 
                class="flex-1 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-ble-500">
            <button id="${rowId}-send" class="px-3 py-1 bg-ble-600 hover:bg-ble-500 text-white text-[10px] font-bold rounded">SEND</button>
            <button id="${rowId}-close" class="px-2 text-slate-500 hover:text-white">&times;</button>
        `;
        writeDiv.onclick = (e) => e.stopPropagation();
        row.appendChild(writeDiv);

        document.getElementById(`${rowId}-close`).onclick = (e) => {
            e.stopPropagation();
            writeDiv.classList.add('hidden');
        };

        document.getElementById(`${rowId}-send`).onclick = async (e) => {
            e.stopPropagation();
            const input = document.getElementById(`${rowId}-input`);
            const val = input.value.trim();
            if (!val) return;

            const success = await this.app.sendCommand(val, c);
            if (success) {
                input.value = '';
                input.classList.add('border-green-500');
                setTimeout(() => input.classList.remove('border-green-500'), 500);
            } else {
                input.classList.add('border-red-500');
                setTimeout(() => input.classList.remove('border-red-500'), 500);
            }
        };

        // READ
        if (c.properties.read) {
            const btn = document.createElement('button');
            btn.className = "px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-white flex items-center gap-1 border border-white/10";
            btn.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg> Read`;
            btn.onclick = async (e) => {
                e.stopPropagation();
                try {
                    btn.classList.add('opacity-50');
                    const val = await c.readValue();
                    const data = new Uint8Array(val.buffer);
                    const hex = UTILS.buf2hex(data);

                    valDiv.classList.remove('hidden');
                    const decoding = DECODER.decode(data, c.uuid);

                    this.updateValBox(valDiv, decoding, hex);
                    this.updateHeaderFromDecoding(uuidShort, decoding);

                    // Log
                    let detailMsg = null;
                    if (decoding.interpretation) detailMsg = `Decoded: <span class="text-green-400">"${decoding.interpretation}"</span>`;
                    else if (decoding.text.length > 2) detailMsg = `ASCII: "${decoding.text}"`;

                    this.log(`READ ${name}: ${hex}`, 'rx', detailMsg);
                } catch (err) {
                    this.log(`Read Error: ${err.message}`, 'error');
                } finally {
                    btn.classList.remove('opacity-50');
                }
            };
            actionsDiv.appendChild(btn);

            // Auto-Read
            if (['2a00', '2a24', '2a25', '2a26', '2a19', '2a29'].includes(uuidShort)) {
                setTimeout(() => btn.click(), 500 + Math.random() * 1000);
            }
        }

        // NOTIFY
        if (c.properties.notify) {
            const btn = document.createElement('button');
            let isSubscribed = false;
            btn.className = "px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-white flex items-center gap-1 border border-white/10";
            btn.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path></svg> Subscribe`;

            btn.onclick = async (e) => {
                e.stopPropagation();
                try {
                    if (!isSubscribed) {
                        await c.startNotifications();
                        c.addEventListener('characteristicvaluechanged', (ev) => this.handleNotification(ev, rowId));
                        btn.classList.remove('bg-slate-700');
                        btn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
                        btn.innerHTML = `Listening...`;
                        this.log(`Subscribed to ${name}`, 'success');
                    } else {
                        await c.stopNotifications();
                        btn.classList.add('bg-slate-700');
                        btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
                        btn.innerHTML = `Subscribe`;
                        this.log(`Unsubscribed from ${name}`, 'sys');
                    }
                    isSubscribed = !isSubscribed;
                } catch (err) {
                    this.log(`Notify Error: ${err.message}`, 'error');
                }
            };
            actionsDiv.appendChild(btn);

            // Auto subscribe
            if (uuidShort === 'e0a9' || name === 'Battery Level') {
                setTimeout(() => btn.click(), 800);
            }
        }

        // WRITE BTN
        if (c.properties.write || c.properties.writeWithoutResponse) {
            const btn = document.createElement('button');
            btn.className = "px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-[10px] text-white flex items-center gap-1 border border-white/10";
            btn.innerHTML = `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg> Write`;
            btn.onclick = (e) => {
                e.stopPropagation();
                const wDiv = document.getElementById(`${rowId}-write`);
                wDiv.classList.toggle('hidden');
                if (!wDiv.classList.contains('hidden')) {
                    document.getElementById(`${rowId}-input`).focus();
                }
            };
            actionsDiv.appendChild(btn);
        }
    },

    handleNotification(e, rowId) {
        const data = new Uint8Array(e.target.value.buffer);
        const hex = UTILS.buf2hex(data);

        // Specific row update
        const box = document.getElementById(`${rowId}-val`);
        const decoding = DECODER.decode(data, null);

        if (box) {
            box.classList.remove('hidden');
            box.classList.add('pulse');
            this.updateValBox(box, decoding, hex);
            setTimeout(() => box.classList.remove('pulse'), 500);
        }

        // Log
        let detailMsg = null;
        if (decoding.interpretation) detailMsg = `Decoded: <span class="text-green-400">"${decoding.interpretation}"</span>`;
        else if (decoding.text.length > 2) detailMsg = `ASCII: "${decoding.text}"`;

        this.log(`RX << ${hex}`, "rx", detailMsg);
        this.updateProtocolPanel(data);
    },

    updateValBox(box, decoding, hex) {
        if (decoding.interpretation) {
            box.innerHTML = `<span class="text-green-400 font-bold">${decoding.interpretation}</span>`;
        } else if (decoding.text.length > 2 && /^[A-Za-z0-9\s().-]+$/.test(decoding.text)) {
            box.innerHTML = `<span class="text-white">"${decoding.text}"</span>`;
        } else {
            box.innerHTML = `${hex}`;
        }
    },

    updateHeaderFromDecoding(uuidShort, decoding) {
        if (decoding.interpretation) {
            if (uuidShort === '2a00') this.updateHeaderInfo({ name: decoding.text });
            if (uuidShort === '2a29') this.updateHeaderInfo({ mfr: decoding.text });
            if (uuidShort === '2a24') this.updateHeaderInfo({ model: decoding.text });
            if (uuidShort === '2a26') this.updateHeaderInfo({ fw: decoding.text });
        }
    },

    updateProtocolPanel(data) {
        if (data.length < 2) return;

        const viz = this.elements.frameViz();
        if (!viz) return;
        viz.innerHTML = '';

        for (let i = 0; i < data.length; i++) {
            const b = data[i];
            const span = document.createElement('span');
            span.className = "font-mono font-bold px-1 rounded " +
                (i === 0 ? "bg-purple-900/50 text-purple-200" : "bg-slate-700/50 text-slate-300");
            span.textContent = b.toString(16).toUpperCase().padStart(2, '0');
            viz.appendChild(span);
        }

        let chkType = 'None';
        if (data.length > 3) {
            const last = data[data.length - 1];
            const payload = data.slice(0, data.length - 1);
            const xor = UTILS.calculateChecksum(payload, 'XOR');
            const sum = UTILS.calculateChecksum(payload, 'SUM');

            if (xor === last) chkType = 'XOR (Last Byte)';
            else if (sum === last) chkType = 'SUM (Last Byte)';
        }

        const chk = this.elements.chkAlgo();
        if (chk) {
            chk.textContent = chkType;
            chk.className = chkType !== 'None' ? "text-green-400 font-mono" : "text-slate-500 font-mono";
        }

        const len = this.elements.lenByte();
        if (len) len.textContent = data.length + ' Bytes';
    }
};
