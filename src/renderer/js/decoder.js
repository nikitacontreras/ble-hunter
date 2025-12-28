import { UTILS } from './utils.js';
import { MANUFACTURERS } from './constants.js';

export const DECODER = {
    // Context for smart parsing
    lastCommand: null,

    decode: (data, contextCharUuid) => {
        const hex = UTILS.buf2hex(data);
        const str = new TextDecoder().decode(data).replace(/[^\x20-\x7E]/g, '');

        let result = { hex, text: str, interpretation: null };

        // 1. Check for Manufacturer/Model patterns in ASCII
        const hexStr = hex.replace(/\s/g, '');
        for (let key in MANUFACTURERS) {
            if (hexStr.includes(key)) {
                result.interpretation = `Mfr: ${MANUFACTURERS[key]}`;
                if (str.length > 2) result.text = str; // Prioritize ASCII if it makes sense
            }
        }

        // 2. Protocol Specific Parsing (HF-795 / Magic Headers)
        if (data[0] === 0xCD && data[1] === 0x00) {
            // HF-795 Response
            result.interpretation = "HF-795 Protocol Response";
        }

        // 3. Context-Aware Parsing (Based on Last Command Sent)
        if (DECODER.lastCommand) {
            const cmdByte = DECODER.lastCommand[2]; // Assuming AA 55 CMD format
            // e.g., if we asked for Battery (0x04)
            if (cmdByte === 0x04 && data.length > 0) {
                // Often battery is in the payload. Simple heuristic:
                const val = data[data.length - 1]; // Last byte often value
                if (val <= 100) result.interpretation = `Battery: ${val}%`;
            }
            if (cmdByte === 0x05 && data.length >= 4) {
                // Steps (Hypothetical LE 4 bytes)
                // result.interpretation = "Steps Data"; 
            }
        }

        // 4. Standard Characteristics
        if (contextCharUuid) {
            if (contextCharUuid.includes('2a19')) result.interpretation = `Battery: ${data[0]}%`;
            if (contextCharUuid.includes('2a26')) result.interpretation = `Fw: ${str}`;
            if (contextCharUuid.includes('2a29')) result.interpretation = `Mfr: ${str}`;
        }

        return result;
    }
};
