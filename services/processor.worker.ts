// Constants
const SIG_UNLOCKED = "0100010001010011"; // "DS"
const SIG_LOCKED = "0100010001001100";   // "DL"

// PRNG for Scattering (Mulberry32)
function mulberry32(a: number) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

self.onmessage = async (e: MessageEvent) => {
    const { type, imageData, password, message } = e.data;

    try {
        if (type === 'encode') {
            // 1. Determine Signature based on Password presence
            const hasPassword = password && password.length > 0;
            const signature = hasPassword ? SIG_LOCKED : SIG_UNLOCKED;

            // 2. Crypto Setup
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));

            const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password || ""), "PBKDF2", false, ["deriveKey"]);

            const key = await crypto.subtle.deriveKey(
                { name: "PBKDF2", salt: salt, iterations: 600000, hash: "SHA-256" },
                keyMaterial,
                { name: "AES-GCM", length: 256 },
                false,
                ["encrypt"]
            );

            const encodedMsg = new TextEncoder().encode(message);
            const encryptedBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, encodedMsg);
            const encryptedBytes = new Uint8Array(encryptedBuffer);

            // 3. Header Construction (Sequential)
            let headerBits = "";
            headerBits += signature;
            for(let b of salt) headerBits += b.toString(2).padStart(8, '0');
            for(let b of iv) headerBits += b.toString(2).padStart(8, '0');

            const dataBitsLength = encryptedBytes.length * 8;
            headerBits += dataBitsLength.toString(2).padStart(32, '0');

            // 4. Capacity Check
            const pixels = new Uint8ClampedArray(imageData);
            const totalPixels = pixels.length / 4;

            if ((headerBits.length + dataBitsLength) > totalPixels * 3) {
                    throw new Error("Message too long for this image size");
            }

            // 5. Embed Header (Sequential)
            let ptr = 0;
            for (let i = 0; i < headerBits.length; i++) {
                while ((ptr + 1) % 4 === 0) ptr++;
                if (headerBits[i] === '1') pixels[ptr] |= 1;
                else pixels[ptr] &= ~1;
                ptr++;
            }

            const headerEndIndex = ptr;

            // 6. Embed Body (Scattered with O(1) memory LCG)
            const saltView = new DataView(salt.buffer);
            let seed = saltView.getUint32(0, true);

            let availableCount = 0;
            for(let i = headerEndIndex; i < pixels.length; i++) {
                if ((i + 1) % 4 !== 0) availableCount++;
            }

            // Helper for Physical Index
            let validBytesBeforeHeader = Math.floor(headerEndIndex / 4) * 3;
            const rem = headerEndIndex % 4;
            if (rem > 0) validBytesBeforeHeader += rem;

            const getPhysicalIndex = (logicalIdx: number) => {
                const L_abs = logicalIdx + validBytesBeforeHeader;
                const P = Math.floor(L_abs / 3) * 4 + (L_abs % 3);
                return P;
            };

            let limit = availableCount;
            let m = 1;
            while (m < limit) m <<= 1; // Next power of 2

            const rng = mulberry32(seed);
            const a = 4 * Math.floor(rng() * (m/4)) + 1;
            const c = 2 * Math.floor(rng() * (m/2)) + 1;

            let state = BigInt(seed) % BigInt(m);
            const bigA = BigInt(a);
            const bigC = BigInt(c);
            const bigM = BigInt(m);
            const limitBI = BigInt(availableCount);

            let bitsEmbedded = 0;
            let iter = 0;
            const needed = dataBitsLength;
            const progressStep = Math.ceil(needed / 20);

            while(bitsEmbedded < needed) {
                // LCG Step
                state = (bigA * state + bigC) % bigM;

                // Cycle Walk
                if (state < limitBI) {
                    const logicalIdx = Number(state);
                    const targetIdx = getPhysicalIndex(logicalIdx);

                    // Embed bit
                    const byteIndex = Math.floor(bitsEmbedded / 8);
                    const bitIndex = 7 - (bitsEmbedded % 8);
                    const bit = (encryptedBytes[byteIndex] >>> bitIndex) & 1;

                    if (bit === 1) pixels[targetIdx] |= 1;
                    else pixels[targetIdx] &= ~1;

                    bitsEmbedded++;

                    if (bitsEmbedded % progressStep === 0) {
                        postMessage({ type: 'progress', progress: Math.round((bitsEmbedded / needed) * 100) });
                    }
                }
                iter++;
                // Safety break (should not trigger with correct LCG parameters)
                if (iter > needed * 100 && bitsEmbedded < needed) {
                     throw new Error("Scattering generator failed to converge");
                }
            }

            postMessage({ success: true, pixels: pixels.buffer }, { transfer: [pixels.buffer] });
        }

        if (type === 'decode') {
            const pixels = new Uint8ClampedArray(imageData);
            let ptr = 0;

            const readBits = (count: number) => {
                let bits = "";
                for(let i=0; i<count; i++) {
                    while ((ptr + 1) % 4 === 0) ptr++;
                    bits += (pixels[ptr] & 1).toString();
                    ptr++;
                }
                return bits;
            };

            // 1. Extract Header
            const sig = readBits(16);
            if (sig !== SIG_UNLOCKED && sig !== SIG_LOCKED) {
                throw new Error("No DontSee signature found");
            }

            const saltBits = readBits(128);
            const salt = new Uint8Array(16);
            for(let i=0; i<16; i++) salt[i] = parseInt(saltBits.slice(i*8, (i+1)*8), 2);

            const ivBits = readBits(96);
            const iv = new Uint8Array(12);
            for(let i=0; i<12; i++) iv[i] = parseInt(ivBits.slice(i*8, (i+1)*8), 2);

            const lenBits = readBits(32);
            const dataBitLength = parseInt(lenBits, 2);

            if (dataBitLength <= 0 || dataBitLength > pixels.length * 3) throw new Error("Corrupt header data");

            // 2. Reconstruct Scatter Logic (Mirroring Encode)
            const headerEndIndex = ptr;
            const saltView = new DataView(salt.buffer);
            let seed = saltView.getUint32(0, true);

            let availableCount = 0;
            for(let i = headerEndIndex; i < pixels.length; i++) {
                if ((i + 1) % 4 !== 0) availableCount++;
            }

            // Helper for Physical Index (Same as Encode)
            let validBytesBeforeHeader = Math.floor(headerEndIndex / 4) * 3;
            const rem = headerEndIndex % 4;
            if (rem > 0) validBytesBeforeHeader += rem;

            const getPhysicalIndex = (logicalIdx: number) => {
                const L_abs = logicalIdx + validBytesBeforeHeader;
                const P = Math.floor(L_abs / 3) * 4 + (L_abs % 3);
                return P;
            };

            // LCG Setup
            let limit = availableCount;
            let m = 1;
            while (m < limit) m <<= 1;

            const rng = mulberry32(seed);
            const a = 4 * Math.floor(rng() * (m/4)) + 1;
            const c = 2 * Math.floor(rng() * (m/2)) + 1;

            let state = BigInt(seed) % BigInt(m);
            const bigA = BigInt(a);
            const bigC = BigInt(c);
            const bigM = BigInt(m);
            const limitBI = BigInt(availableCount);

            const bodyBits = new Uint8Array(dataBitLength);
            let bitsExtracted = 0;

            const progressStep = Math.ceil(dataBitLength / 20);
            let iter = 0;

            while (bitsExtracted < dataBitLength) {
                state = (bigA * state + bigC) % bigM;

                if (state < limitBI) {
                    const logicalIdx = Number(state);
                    const targetIdx = getPhysicalIndex(logicalIdx);

                    bodyBits[bitsExtracted] = pixels[targetIdx] & 1;
                    bitsExtracted++;

                     if (bitsExtracted % progressStep === 0) {
                        postMessage({ type: 'progress', progress: Math.round((bitsExtracted / dataBitLength) * 100) });
                    }
                }
                iter++;
                 if (iter > dataBitLength * 100 && bitsExtracted < dataBitLength) {
                     throw new Error("Scattering generator failed to converge during decode");
                }
            }

            const encryptedBytes = new Uint8Array(dataBitLength / 8);
            for(let i=0; i<encryptedBytes.length; i++) {
                let byteVal = 0;
                for(let bit=0; bit<8; bit++) {
                    byteVal = (byteVal << 1) | bodyBits[i*8 + bit];
                }
                encryptedBytes[i] = byteVal;
            }

            // 3. Decrypt
            try {
                const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password || ""), "PBKDF2", false, ["deriveKey"]);

                const key = await crypto.subtle.deriveKey(
                    { name: "PBKDF2", salt: salt, iterations: 600000, hash: "SHA-256" },
                    keyMaterial,
                    { name: "AES-GCM", length: 256 },
                    false,
                    ["decrypt"]
                );

                const decryptedBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, encryptedBytes);
                const text = new TextDecoder().decode(decryptedBuf);

                postMessage({ success: true, text });
            } catch(e) {
                postMessage({ success: false, error: "Decryption failed" });
            }
        }

        if (type === 'scan') {
            const pixels = new Uint8ClampedArray(imageData);
            let ptr = 0;
            let sig = "";
            for(let i=0; i<16; i++) {
                while ((ptr + 1) % 4 === 0) ptr++;
                sig += (pixels[ptr] & 1).toString();
                ptr++;
            }

            let result = null;
            if (sig === SIG_LOCKED) result = 'locked';
            else if (sig === SIG_UNLOCKED) result = 'unlocked';

            postMessage({ success: true, signature: result });
        }

    } catch (err: any) {
        postMessage({ success: false, error: err.message });
    }
};
