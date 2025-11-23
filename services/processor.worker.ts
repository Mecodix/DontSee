import { argon2id } from 'hash-wasm';

// Constants
const SIG_UNLOCKED = "0100010001010011"; // "DS"
const SIG_UNLOCKED_RAW = "0100010001010101"; // "DU"

// Secure Scattering Signatures (V2)
const SIG_LOCKED_SECURE = "0100010001010000"; // "DP" (DontSee Password-secure)
const SIG_LOCKED_RAW_SECURE = "0100010001010001"; // "DQ" (DontSee Raw-secure)

// REMOVED: Legacy Locked Signatures (No Backward Compatibility)
// const SIG_LOCKED = "0100010001001100";   // "DL"
// const SIG_LOCKED_RAW = "0100010001001011";   // "DK"

// Internal Constant for "Empty Password"
const EMPTY_PASSWORD_SENTINEL = "___DONTSEE_EMPTY_PASSWORD_SENTINEL_V1___";

// Types
type PixelArray = Uint8ClampedArray;

// Feature Detection
function supportsCompression() {
    return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

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

// Shared LCG / Scatter Logic
function initLCG(seed: number, bodyValidCount: number) {
    const random = mulberry32(seed);

    const start = Math.floor(random() * bodyValidCount);
    let step = Math.floor(random() * bodyValidCount);
    if (step === 0) step = 1;
    while (gcd(step, bodyValidCount) !== 1) {
        step = Math.floor(random() * bodyValidCount);
        if (step === 0) step = 1;
    }
    return { start, step };
}

// Derive Scattering Seed from Salt + Password (SHA-256)
async function deriveScatteringSeed(salt: Uint8Array, password: string): Promise<number> {
    const enc = new TextEncoder();
    const passwordBytes = enc.encode(password);

    const buffer = new Uint8Array(salt.length + passwordBytes.length);
    buffer.set(salt, 0);
    buffer.set(passwordBytes, salt.length);

    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashView = new DataView(hashBuffer);
    return hashView.getUint32(0, true);
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
    // hash-wasm requires non-empty password.
    const effectivePassword = (!password || password.length === 0) ? EMPTY_PASSWORD_SENTINEL : password;

    const rawKey = await argon2id({
        password: effectivePassword,
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

async function handleEncode(
    id: string,
    pixels: PixelArray,
    canvas: OffscreenCanvas | null,
    ctx: OffscreenCanvasRenderingContext2D | null,
    width: number,
    height: number,
    message: string,
    password?: string
) {
    const hasPassword = password && password.length > 0;

    // Feature Check: Compression
    const canCompress = supportsCompression();

    // Determine Signature
    let signature;
    if (hasPassword) {
        // ALWAYS use secure signature
        signature = canCompress ? SIG_LOCKED_SECURE : SIG_LOCKED_RAW_SECURE;
    } else {
        signature = canCompress ? SIG_UNLOCKED : SIG_UNLOCKED_RAW;
    }

    // Crypto Setup
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Derive Key using Argon2id
    const key = await deriveKey(password || "", salt);

    // Compress OR Convert Raw
    let dataPayload: Uint8Array;
    if (canCompress) {
        dataPayload = await compress(message);
    } else {
        dataPayload = new TextEncoder().encode(message);
    }

    const encryptedBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, dataPayload);
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

    // Seed Derivation Logic
    let seed: number;
    if (hasPassword) {
        // Always Secure Logic
        seed = await deriveScatteringSeed(salt, password!);
    } else {
        // Legacy/Unlocked Logic: Salt only
        const saltView = new DataView(salt.buffer);
        seed = saltView.getUint32(0, true);
    }

    const { start, step } = initLCG(seed, bodyValidCount);

    const needed = dataBitsLength;
    let lastReportTime = performance.now();

    for (let i = 0; i < needed; i++) {
        if (i % 1000 === 0) {
            const now = performance.now();
            if (now - lastReportTime > 33) {
                const progress = Math.floor((i / needed) * 100);
                postMessage({ id, success: true, progress });
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
    postMessage({ id, success: true, progress: 100 });

    if (canvas && ctx) {
        // OffscreenCanvas Path: Convert directly to Blob
        const newImageData = new ImageData(pixels, canvas.width, canvas.height);
        ctx.putImageData(newImageData, 0, 0);
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        postMessage({ id, success: true, blob });
    } else {
        // Legacy/Fallback Path: Return pixels
        postMessage({ id, success: true, pixels: pixels.buffer, width, height }, { transfer: [pixels.buffer] });
    }
}

async function handleDecode(id: string, pixels: PixelArray, password?: string) {
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

    // Check Signature Type
    // REMOVED: Legacy Locked support
    const isSecureLocked = (sig === SIG_LOCKED_SECURE || sig === SIG_LOCKED_RAW_SECURE);
    const isUnlocked = (sig === SIG_UNLOCKED || sig === SIG_UNLOCKED_RAW);

    if (!isSecureLocked && !isUnlocked) {
        // If signature matches old locked signatures, specifically fail
        // The previous values were "DL" and "DK"
        // "DL" = 0100010001001100
        // "DK" = 0100010001001011
        if (sig === "0100010001001100" || sig === "0100010001001011") {
             throw new Error("Legacy format detected. This secure version does not support old images.");
        }
        throw new Error("No DontSee signature found");
    }

    const isCompressed = (sig === SIG_UNLOCKED || sig === SIG_LOCKED_SECURE);

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

    let seed: number;
    if (isSecureLocked) {
        // Always use Secure Logic for locked images
        seed = await deriveScatteringSeed(salt, password || "");
    } else {
        // Unlocked Logic
        const saltView = new DataView(salt.buffer);
        seed = saltView.getUint32(0, true);
    }

    const { start, step } = initLCG(seed, bodyValidCount);

    const bodyBits = new Uint8Array(dataBitLength);
    let lastReportTime = performance.now();

    for (let i = 0; i < dataBitLength; i++) {
        if (i % 1000 === 0) {
            const now = performance.now();
            if (now - lastReportTime > 33) {
                const progress = Math.floor((i / dataBitLength) * 100);
                postMessage({ id, success: true, progress });
                await new Promise(r => setTimeout(r, 0));
                lastReportTime = performance.now();
            }
        }

        const logicalBodyIndex = (start + i * step) % bodyValidCount;
        const absoluteLogicalIndex = headerValidCount + logicalBodyIndex;
        const targetIdx = getPhysicalIndex(absoluteLogicalIndex);

        bodyBits[i] = pixels[targetIdx] & 1;
    }

    postMessage({ id, success: true, progress: 100 });

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

        let text: string;
        if (isCompressed) {
            // If signature says compressed, we MUST decompress
            if (!supportsCompression()) {
                throw new Error("Message is compressed but browser doesn't support decompression.");
            }
            text = await decompress(decryptedBytes);
        } else {
            // Signature says Raw
            text = new TextDecoder().decode(decryptedBytes);
        }

        postMessage({ id, success: true, text });
    } catch(e) {
        const msg = e instanceof Error ? e.message : "Decryption failed";
        postMessage({ id, success: false, error: msg === "Decryption failed" ? "Decryption failed" : msg });
    }
}

function handleScan(id: string, pixels: PixelArray) {
    // Scan is fast, just check first pixels
    let ptr = 0;
    let sig = "";
    for(let i=0; i<16; i++) {
        while ((ptr + 1) % 4 === 0) ptr++;
        sig += (pixels[ptr] & 1).toString();
        ptr++;
    }

    let result = null;
    // Only new signatures are recognized
    if (sig === SIG_LOCKED_SECURE || sig === SIG_LOCKED_RAW_SECURE) {
        result = 'locked';
    } else if (sig === SIG_UNLOCKED || sig === SIG_UNLOCKED_RAW) {
        result = 'unlocked';
    }

    postMessage({ id, success: true, signature: result });
}

self.onmessage = async (e: MessageEvent) => {
    const { id, type, imageData, imageBitmap, password, message } = e.data;

    try {
        // 1. Handle Image Source (OffscreenCanvas vs ArrayBuffer)
        let pixels: Uint8ClampedArray;
        let canvas: OffscreenCanvas | null = null;
        let ctx: OffscreenCanvasRenderingContext2D | null = null;
        let width = 0;
        let height = 0;

        if (imageBitmap) {
            // We prefer OffscreenCanvas if available
            width = imageBitmap.width;
            height = imageBitmap.height;

            try {
                canvas = new OffscreenCanvas(width, height);
                ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (ctx) {
                    ctx.drawImage(imageBitmap, 0, 0);
                    pixels = ctx.getImageData(0, 0, width, height).data;
                } else {
                     throw new Error("Context creation failed");
                }
            } catch (e) {
                // Fallback if OffscreenCanvas fails but we have imageBitmap
                // We can't easily read pixels from ImageBitmap without a canvas (even on main thread).
                // So if OffscreenCanvas fails in worker, we are kinda stuck unless we assume
                // the browser supports ImageBitmap but NOT OffscreenCanvas (rare edge case).
                // But if we caught an error, let's throw, because 'pixels' isn't set.
                 throw new Error("OffscreenCanvas failed and no fallback pixel source.");
            }
        } else if (imageData) {
            pixels = new Uint8ClampedArray(imageData);
            // If using raw buffer, we might not know width/height unless encoded in buffer or passed.
            // But 'encode' needs it only for fallback.
            // 'decode'/'scan' don't strictly need width/height for bit extraction if they just iterate pixels.
            // But let's assume simple buffer usage is legacy or for scan (small buffer).
            width = 0;
            height = 0;
        } else {
            throw new Error("No image data provided");
        }

        if (type === 'encode') {
            await handleEncode(id, pixels, canvas, ctx, width, height, message, password);
        } else if (type === 'decode') {
            await handleDecode(id, pixels, password);
        } else if (type === 'scan') {
            handleScan(id, pixels);
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown worker error";
        postMessage({ id, success: false, error: errorMessage });
    }
};
