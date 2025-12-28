export const MANUFACTURERS = {
    "4C4A": "LingJi Technology", "4E52": "Nordic Semiconductor",
    "5449": "Texas Instruments", "004C": "Apple Inc.",
    "0006": "Microsoft", "00E0": "Google"
};

export const MODEL_CODES = {
    "373337": "737", "4D4234": "Mi Band 4",
    "4837": "H7", "4754": "GT"
};

export const STD_SERVICES = {
    '1800': 'Generic Access', '1801': 'Generic Attribute', '180a': 'Device Information',
    '180f': 'Battery Service', '180d': 'Heart Rate', '1805': 'Current Time',
    'fee0': 'Anhui Huami (Xiaomi)', 'fee1': 'Huami Wearable', 'feea': 'Fitbit', 'fe05': 'Realme'
};

export const STD_CHARS = {
    '2a00': 'Device Name', '2a01': 'Appearance', '2a04': 'Pref. Conn. Params',
    '2a29': 'Manufacturer Name', '2a24': 'Model Number', '2a25': 'Serial Number',
    '2a26': 'Firmware Revision', '2a27': 'Hardware Revision', '2a28': 'Software Revision',
    '2a19': 'Battery Level', '2a37': 'Heart Rate Measurement', '2a2b': 'Current Time',
    '2a05': 'Service Changed', '2902': 'Client Char Config'
};

export const COMMON_SERVICES = [
    '0000180f-0000-1000-8000-00805f9b34fb', // Battery
    '0000180a-0000-1000-8000-00805f9b34fb', // Device Info
    '6e401301-b5a3-f393-e0a9-e50e24dcca9d'  // UART/Nordic
];

export const TEMPLATES = {
    info: [
        { name: "Handshake (HF-795)", cmd: "AA 55 01 00 01", desc: "Init Connection" },
        { name: "Get Device Info", cmd: "AA 55 02 00 00", desc: "Fw, Model" },
        { name: "Get Battery", cmd: "AA 55 04 00 00", desc: "Read Status" },
        { name: "Ping (Simple)", cmd: "00", desc: "Wakeup" }
    ],
    config: [
        { name: "Set Time (Now)", cmd: "DYNAMIC_TIME", desc: "Sync Current Time" },
        { name: "Set User Profile", cmd: "AA 55 12 ...", desc: "Example Profile" },
        { name: "Enable Ancs", cmd: "AA 55 14 01 01", desc: "Notifications" }
    ],
    ota: [
        { name: "Enter OTA Mode", cmd: "AA 55 08 00 08", desc: "Firmware Update" },
        { name: "Reboot", cmd: "AA 55 09 00 09", desc: "System Reset" }
    ]
};
