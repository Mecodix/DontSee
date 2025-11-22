// Constants
const SIG_UNLOCKED = "0100010001010011"; // "DS"
const SIG_LOCKED = "0100010001001100";   // "DL"

// PRNG (Mulberry32)
function mulberry32(a: number) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

// GCD helper for LCG
function gcd(a: number, b: number): number {
    while (b !== 0) {
        let t = b;
        b = a % b;
        a = t;
    }
    return a;
}

// Convert logical valid index (ignoring alphas) to physical RGBA index
function getPhysicalIndex(logicalIndex: number): number {
    // logicalIndex = 3 * q + r
    // physicalIndex = 4 * q + r
    const q = Math.floor(logicalIndex / 3);
    const r = logicalIndex % 3;
    return (q * 4) + r;
}

// Count valid bytes up to a physical index
function countValidBytes(physicalIndex: number): number {
    return (3 * Math.floor(physicalIndex / 4)) + (physicalIndex % 4);
}

self.onmessage = async (e: MessageEvent) => {
    const { type, imageData, password, message } = e.data;

    try {
        if (type === 'encode') {
            // 1. Determine Signature
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

            // 3. Header Construction
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

            // 6. Embed Body (Scattered LCG)
            // Determine valid bytes range for body
            const headerValidCount = countValidBytes(headerEndIndex);
            const totalValidCount = (pixels.length / 4) * 3;
            const bodyValidCount = totalValidCount - headerValidCount;

            // Init PRNG
            const saltView = new DataView(salt.buffer);
            let seed = saltView.getUint32(0, true);
            const random = mulberry32(seed);

            // Generate LCG parameters
            const start = Math.floor(random() * bodyValidCount);
            let step = Math.floor(random() * bodyValidCount);
            if (step === 0) step = 1;

            // Ensure step is coprime to bodyValidCount
            while (gcd(step, bodyValidCount) !== 1) {
                step = Math.floor(random() * bodyValidCount);
                if (step === 0) step = 1;
            }

            const needed = dataBitsLength;

            // BEST PRACTICE: Time-based throttling
            // Aim for ~30fps updates (33ms) to balance smoothness and performance
            let lastReportTime = performance.now();

            for (let i = 0; i < needed; i++) {
                // Check time every 1000 iterations to avoid overhead of performance.now()
                if (i % 1000 === 0) {
                    const now = performance.now();
                    if (now - lastReportTime > 33) {
                        const progress = Math.floor((i / needed) * 100);
                        postMessage({ success: true, progress });
                        // Yield to event loop
                        await new Promise(r => setTimeout(r, 0));
                        lastReportTime = performance.now();
                    }
                }

                // LCG Step: Generate logical index in body space
                const logicalBodyIndex = (start + i * step) % bodyValidCount;

                // Convert to absolute logical index (skip header)
                const absoluteLogicalIndex = headerValidCount + logicalBodyIndex;

                // Convert to physical index (skip alphas)
                const targetIdx = getPhysicalIndex(absoluteLogicalIndex);

                // Write Bit
                const byteIndex = Math.floor(i / 8);
                const bitIndex = 7 - (i % 8);
                const bit = (encryptedBytes[byteIndex] >>> bitIndex) & 1;

                if (bit === 1) pixels[targetIdx] |= 1;
                else pixels[targetIdx] &= ~1;
            }

            // Final progress
            postMessage({ success: true, progress: 100 });
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

            // 2. Reconstruct Scatter Logic
            const headerEndIndex = ptr;

            // Determine valid bytes range for body
            const headerValidCount = countValidBytes(headerEndIndex);
            const totalValidCount = (pixels.length / 4) * 3;
            const bodyValidCount = totalValidCount - headerValidCount;

            const saltView = new DataView(salt.buffer);
            let seed = saltView.getUint32(0, true);
            const random = mulberry32(seed);

            // Generate LCG parameters (must match encode)
            const start = Math.floor(random() * bodyValidCount);
            let step = Math.floor(random() * bodyValidCount);
            if (step === 0) step = 1;

            while (gcd(step, bodyValidCount) !== 1) {
                step = Math.floor(random() * bodyValidCount);
                if (step === 0) step = 1;
            }

            const bodyBits = new Uint8Array(dataBitLength);

            // BEST PRACTICE: Time-based throttling
            let lastReportTime = performance.now();

            for (let i = 0; i < dataBitLength; i++) {
                if (i % 1000 === 0) {
                    const now = performance.now();
                    if (now - lastReportTime > 33) {
                        const progress = Math.floor((i / dataBitLength) * 100);
                        postMessage({ success: true, progress });
                        await new Promise(r => setTimeout(r, 0));
                        lastReportTime = performance.now();
                    }
                }

                const logicalBodyIndex = (start + i * step) % bodyValidCount;
                const absoluteLogicalIndex = headerValidCount + logicalBodyIndex;
                const targetIdx = getPhysicalIndex(absoluteLogicalIndex);

                bodyBits[i] = pixels[targetIdx] & 1;
            }

            postMessage({ success: true, progress: 100 });

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
