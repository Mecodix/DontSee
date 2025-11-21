
export const workerScript = `
// Constants
const SIG_UNLOCKED = "0100010001010011"; // "DS"
const SIG_LOCKED = "0100010001001100";   // "DL"

// PRNG for Scattering (Mulberry32)
function mulberry32(a) {
    return function() {
        var t = a += 0x6D2B79F5;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
}

self.onmessage = async (e) => {
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
                { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
                keyMaterial,
                { name: "AES-GCM", length: 256 },
                false,
                ["encrypt"]
            );

            const encodedMsg = new TextEncoder().encode(message);
            const encryptedBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, encodedMsg);
            const encryptedBytes = new Uint8Array(encryptedBuffer);

            // 3. Header Construction (Sequential)
            // Header = [Sig 16b] [Salt 128b] [IV 96b] [Len 32b] = 272 bits
            let headerBits = "";
            headerBits += signature; 
            for(let b of salt) headerBits += b.toString(2).padStart(8, '0');
            for(let b of iv) headerBits += b.toString(2).padStart(8, '0');
            
            const dataBitsLength = encryptedBytes.length * 8;
            headerBits += dataBitsLength.toString(2).padStart(32, '0');

            // 4. Capacity Check
            const pixels = new Uint8ClampedArray(imageData);
            const totalPixels = pixels.length / 4; // Total RGBA pixels
            
            // We need space for Header + Body
            if ((headerBits.length + dataBitsLength) > totalPixels * 3) {
                    throw new Error("Message too long for this image size");
            }

            // 5. Embed Header (Sequential LSB in first N pixels)
            let ptr = 0;
            for (let i = 0; i < headerBits.length; i++) {
                while ((ptr + 1) % 4 === 0) ptr++; 
                if (headerBits[i] === '1') pixels[ptr] |= 1;
                else pixels[ptr] &= ~1;
                ptr++;
            }
            
            const headerEndIndex = ptr;

            // 6. Embed Body (Scattered LSB)
            let seed = 0;
            for(let b of salt) seed += b;
            
            // Calculate available channels first to use Uint32Array (Fixes invalid array length on large images)
            let availableCount = 0;
            for(let i = headerEndIndex; i < pixels.length; i++) {
                if ((i + 1) % 4 !== 0) availableCount++;
            }
            
            // Use Uint32Array to handle large amount of indices without 'Invalid array length' or memory overhead of standard Arrays
            const availableChannels = new Uint32Array(availableCount);
            let acPtr = 0;
            for(let i = headerEndIndex; i < pixels.length; i++) {
                if ((i + 1) % 4 !== 0) availableChannels[acPtr++] = i;
            }
            
            const random = mulberry32(seed);
            const needed = dataBitsLength;

            for (let i = 0; i < needed; i++) {
                // Fisher-Yates Swap
                const j = i + Math.floor(random() * (availableChannels.length - i));
                const temp = availableChannels[i];
                availableChannels[i] = availableChannels[j];
                availableChannels[j] = temp;
                
                // Optimization: Read bit directly from encryptedBytes instead of building a massive string
                const byteIndex = Math.floor(i / 8);
                const bitIndex = 7 - (i % 8);
                const bit = (encryptedBytes[byteIndex] >>> bitIndex) & 1;
                
                const targetIdx = availableChannels[i];
                if (bit === 1) pixels[targetIdx] |= 1;
                else pixels[targetIdx] &= ~1;
            }

            postMessage({ success: true, pixels: pixels.buffer }, [pixels.buffer]);
        }

        if (type === 'decode') {
            const pixels = new Uint8ClampedArray(imageData);
            let ptr = 0;

            const readBits = (count) => {
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
            let seed = 0;
            for(let b of salt) seed += b;
            
            // Calculate available channels first to use Uint32Array
            let availableCount = 0;
            for(let i = headerEndIndex; i < pixels.length; i++) {
                if ((i + 1) % 4 !== 0) availableCount++;
            }

            const availableChannels = new Uint32Array(availableCount);
            let acPtr = 0;
            for(let i = headerEndIndex; i < pixels.length; i++) {
                if ((i + 1) % 4 !== 0) availableChannels[acPtr++] = i;
            }
            
            const random = mulberry32(seed);
            
            // Optimization: Use TypedArray for body bits to save memory
            const bodyBits = new Uint8Array(dataBitLength);
            
            for (let i = 0; i < dataBitLength; i++) {
                const j = i + Math.floor(random() * (availableChannels.length - i));
                const temp = availableChannels[i];
                availableChannels[i] = availableChannels[j];
                availableChannels[j] = temp;
                
                const targetIdx = availableChannels[i];
                bodyBits[i] = pixels[targetIdx] & 1;
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
                    { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
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

    } catch (err) {
        postMessage({ success: false, error: err.message });
    }
};
`;
