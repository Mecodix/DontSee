import { argon2id } from 'hash-wasm';

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

// Compression Helpers
async function compress(text: string): Promise<Uint8Array> {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function decompress(data: Uint8Array): Promise<string> {
    const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("gzip"));
    return await new Response(stream).text();
}

// Crypto Helper (Argon2id)
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    // PERFORMANCE FIX: Only call argon2id ONCE.
    // hash-wasm's argon2id returns a Uint8Array if outputType is 'binary'.

    const rawKey = await argon2id({
        password: password,
        salt: salt,
        parallelism: 1,
        iterations: 16, // Security/Performance tradeoff for web
        memorySize: 16384, // 16MB
        hashLength: 32, // 256-bit key
        outputType: 'binary'
    });

    return await crypto.subtle.importKey(
        "raw",
        rawKey,
        "AES-GCM",
        false,
        ["encrypt", "decrypt"]
    );
}

self.onmessage = async (e: MessageEvent) => {
    const { type, imageData, imageBitmap, password, message } = e.data;

    try {
        // 1. Handle Image Source (OffscreenCanvas vs ArrayBuffer)
        let pixels: Uint8ClampedArray;
        let canvas: OffscreenCanvas | null = null;
        let ctx: OffscreenCanvasRenderingContext2D | null = null;

        if (imageBitmap) {
            canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
            ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error("OffscreenCanvas unavailable");

            ctx.drawImage(imageBitmap, 0, 0);
            pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        } else if (imageData) {
            pixels = new Uint8ClampedArray(imageData);
        } else {
            throw new Error("No image data provided");
        }

        if (type === 'encode') {
            // Determine Signature
            const hasPassword = password && password.length > 0;
            const signature = hasPassword ? SIG_LOCKED : SIG_UNLOCKED;

            // Crypto Setup
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv = crypto.getRandomValues(new Uint8Array(12));

            // Derive Key using Argon2id
            const key = await deriveKey(password || "", salt);

            // Compress before encrypting
            const compressedMsg = await compress(message);

            const encryptedBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, compressedMsg);
            const encryptedBytes = new Uint8Array(encryptedBuffer);

            // Header Construction
            let headerBits = "";
            headerBits += signature;
            for(let b of salt) headerBits += b.toString(2).padStart(8, '0');
            for(let b of iv) headerBits += b.toString(2).padStart(8, '0');

            const dataBitsLength = encryptedBytes.length * 8;
            headerBits += dataBitsLength.toString(2).padStart(32, '0');

            // Capacity Check
            const totalPixels = pixels.length / 4;
            if ((headerBits.length + dataBitsLength) > totalPixels * 3) {
                    throw new Error("Message too long for this image size");
            }

            // Embed Header (Sequential)
            let ptr = 0;
            for (let i = 0; i < headerBits.length; i++) {
                while ((ptr + 1) % 4 === 0) ptr++;
                if (headerBits[i] === '1') pixels[ptr] |= 1;
                else pixels[ptr] &= ~1;
                ptr++;
            }
            const headerEndIndex = ptr;

            // Embed Body (Scattered LCG)
            const headerValidCount = countValidBytes(headerEndIndex);
            const totalValidCount = (pixels.length / 4) * 3;
            const bodyValidCount = totalValidCount - headerValidCount;

            const saltView = new DataView(salt.buffer);
            let seed = saltView.getUint32(0, true);
            const random = mulberry32(seed);

            const start = Math.floor(random() * bodyValidCount);
            let step = Math.floor(random() * bodyValidCount);
            if (step === 0) step = 1;
            while (gcd(step, bodyValidCount) !== 1) {
                step = Math.floor(random() * bodyValidCount);
                if (step === 0) step = 1;
            }

            const needed = dataBitsLength;
            let lastReportTime = performance.now();

            for (let i = 0; i < needed; i++) {
                if (i % 1000 === 0) {
                    const now = performance.now();
                    if (now - lastReportTime > 33) {
                        const progress = Math.floor((i / needed) * 100);
                        postMessage({ success: true, progress });
                        await new Promise(r => setTimeout(r, 0));
                        lastReportTime = performance.now();
                    }
                }

                const logicalBodyIndex = (start + i * step) % bodyValidCount;
                const absoluteLogicalIndex = headerValidCount + logicalBodyIndex;
                const targetIdx = getPhysicalIndex(absoluteLogicalIndex);

                const byteIndex = Math.floor(i / 8);
                const bitIndex = 7 - (i % 8);
                const bit = (encryptedBytes[byteIndex] >>> bitIndex) & 1;

                if (bit === 1) pixels[targetIdx] |= 1;
                else pixels[targetIdx] &= ~1;
            }

            // Finalize
            postMessage({ success: true, progress: 100 });

            if (canvas && ctx) {
                // OffscreenCanvas Path: Convert directly to Blob
                const newImageData = new ImageData(pixels, canvas.width, canvas.height);
                ctx.putImageData(newImageData, 0, 0);
                const blob = await canvas.convertToBlob({ type: 'image/png' });
                postMessage({ success: true, blob });
            } else {
                // Legacy/Fallback Path: Return pixels
                postMessage({ success: true, pixels: pixels.buffer }, { transfer: [pixels.buffer] });
            }
        }

        if (type === 'decode') {
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

            // Extract Header
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

            // Reconstruct Scatter Logic
            const headerEndIndex = ptr;
            const headerValidCount = countValidBytes(headerEndIndex);
            const totalValidCount = (pixels.length / 4) * 3;
            const bodyValidCount = totalValidCount - headerValidCount;

            const saltView = new DataView(salt.buffer);
            let seed = saltView.getUint32(0, true);
            const random = mulberry32(seed);

            const start = Math.floor(random() * bodyValidCount);
            let step = Math.floor(random() * bodyValidCount);
            if (step === 0) step = 1;

            while (gcd(step, bodyValidCount) !== 1) {
                step = Math.floor(random() * bodyValidCount);
                if (step === 0) step = 1;
            }

            const bodyBits = new Uint8Array(dataBitLength);
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

            // Decrypt
            try {
                const key = await deriveKey(password || "", salt);

                const decryptedBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, encryptedBytes);

                const decryptedBytes = new Uint8Array(decryptedBuf);
                const text = await decompress(decryptedBytes);

                postMessage({ success: true, text });
            } catch(e) {
                postMessage({ success: false, error: "Decryption failed" });
            }
        }

        if (type === 'scan') {
            // Scan is fast, just check first pixels
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
